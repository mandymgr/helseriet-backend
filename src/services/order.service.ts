// @ts-nocheck - Temporary disable for Prisma strict typing
import { BaseService } from './base.service';

interface CreateOrderData {
  billingAddress: {
    firstName: string;
    lastName: string;
    company?: string;
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  shippingAddress?: {
    firstName: string;
    lastName: string;
    company?: string;
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  email: string;
  phone?: string;
  notes?: string;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
}

interface OrderFilters {
  status?: string;
  paymentStatus?: string;
  search?: string;
}

interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
  totalPrice: number;
  productName: string;
  productSku: string;
  productImage: string | null;
}

interface CreateSessionOrderData extends CreateOrderData {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  paymentIntentId: string;
  totalAmount: number;
}

interface CreateOrderFromCartData extends CreateOrderData {
  paymentIntentId: string;
  totalAmount: number;
}

class OrderService extends BaseService {
  /**
   * Get user's orders with pagination
   */
  async getUserOrders(userId: string, pagination: PaginationOptions = {}) {
    this.validateId(userId, 'User');

    const { page = 1, limit = 10 } = pagination;
    const skip = (Number(page) - 1) * Number(limit);

    return this.handleDatabaseOperation(async () => {
      const [orders, totalCount] = await Promise.all([
        this.db.order.findMany({
          where: { userId },
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: {
                product: {
                  include: {
                    images: {
                      take: 1,
                      orderBy: { sortOrder: 'asc' }
                    }
                  }
                }
              }
            }
          }
        }),
        this.db.order.count({ where: { userId } })
      ]);

      return {
        orders,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / Number(limit))
        }
      };
    }, 'Failed to fetch user orders');
  }

  /**
   * Get single order by ID (user-specific)
   */
  async getUserOrder(userId: string, orderId: string) {
    this.validateId(userId, 'User');
    this.validateId(orderId, 'Order');

    return this.handleDatabaseOperation(async () => {
      const order = await this.ensureExists(
        () => this.db.order.findFirst({
          where: { 
            id: orderId,
            userId 
          },
          include: {
            items: {
              include: {
                product: {
                  include: {
                    images: {
                      take: 1,
                      orderBy: { sortOrder: 'asc' }
                    }
                  }
                }
              }
            },
            payments: true,
            shipments: true
          }
        }),
        'Order'
      );

      return order;
    }, 'Failed to fetch order');
  }

  /**
   * Create new order from user's cart
   */
  async createOrder(userId: string, orderData: CreateOrderData) {
    this.validateId(userId, 'User');
    this.validateRequiredFields(orderData, ['billingAddress', 'email']);

    return this.handleDatabaseOperation(async () => {
      // Get user's cart
      const cart = await this.db.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });

      if (!cart || cart.items.length === 0) {
        throw this.createValidationError('Handlekurven er tom');
      }

      // Validate stock and calculate totals
      const { orderItems, subtotal } = await this.validateCartAndCalculateTotals(cart.items);

      // Calculate shipping (free over 1500 kr)
      const shippingAmount = subtotal >= 1500 ? 0 : 99;
      const totalAmount = subtotal + shippingAmount;

      // Generate unique order number
      const orderNumber = this.generateOrderNumber();

      // Create order in transaction
      const order = await this.db.$transaction(async (tx) => {
        // Create order
        const newOrder = await (tx.order as any).create({
          data: {
            orderNumber,
            userId,
            status: 'PENDING',
            paymentStatus: 'PENDING',
            fulfillmentStatus: 'UNFULFILLED',
            
            subtotal,
            shippingAmount,
            totalAmount,
            
            email: orderData.email,
            phone: orderData.phone || null,
            
            // Billing address
            billingFirstName: orderData.billingAddress.firstName,
            billingLastName: orderData.billingAddress.lastName,
            billingCompany: orderData.billingAddress.company || null,
            billingStreet: orderData.billingAddress.street,
            billingCity: orderData.billingAddress.city,
            billingState: orderData.billingAddress.state || null,
            billingPostalCode: orderData.billingAddress.postalCode,
            billingCountry: orderData.billingAddress.country,
            
            // Shipping address (same as billing if not provided)
            shippingFirstName: orderData.shippingAddress?.firstName || orderData.billingAddress.firstName,
            shippingLastName: orderData.shippingAddress?.lastName || orderData.billingAddress.lastName,
            shippingCompany: orderData.shippingAddress?.company || orderData.billingAddress.company || null,
            shippingStreet: orderData.shippingAddress?.street || orderData.billingAddress.street,
            shippingCity: orderData.shippingAddress?.city || orderData.billingAddress.city,
            shippingState: orderData.shippingAddress?.state || orderData.billingAddress.state || null,
            shippingPostalCode: orderData.shippingAddress?.postalCode || orderData.billingAddress.postalCode,
            shippingCountry: orderData.shippingAddress?.country || orderData.billingAddress.country,
            
            notes: orderData.notes || null
          }
        });

        // Create order items
        await tx.orderItem.createMany({
          data: orderItems.map(item => ({
            orderId: newOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            totalPrice: item.totalPrice,
            productName: item.productName,
            productSku: item.productSku,
            productImage: item.productImage
          }))
        });

        // Update product quantities
        await this.updateProductQuantities(tx, cart.items, 'decrement');

        // Clear cart
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id }
        });

        return newOrder;
      });

      return { orderId: order.id, orderNumber: order.orderNumber };
    }, 'Failed to create order');
  }

  /**
   * Cancel order and restore inventory
   */
  async cancelOrder(userId: string, orderId: string) {
    this.validateId(userId, 'User');
    this.validateId(orderId, 'Order');

    return this.handleDatabaseOperation(async () => {
      const order = await this.ensureExists(
        () => this.db.order.findFirst({
          where: { 
            id: orderId,
            userId
          },
          include: {
            items: true
          }
        }),
        'Order'
      );

      if (order.status !== 'PENDING') {
        throw this.createValidationError('Kan ikke kansellere ordre som ikke er pending');
      }

      // Cancel order and restore inventory
      await this.db.$transaction(async (tx) => {
        // Update order status
        await tx.order.update({
          where: { id: orderId },
          data: { 
            status: 'CANCELLED',
            fulfillmentStatus: 'UNFULFILLED'
          }
        });

        // Restore product quantities
        await this.updateProductQuantities(tx, order.items, 'increment');
      });
    }, 'Failed to cancel order');
  }

  /**
   * Get all orders (admin only)
   */
  async getAllOrders(filters: OrderFilters = {}, pagination: PaginationOptions = {}) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (Number(page) - 1) * Number(limit);

    return this.handleDatabaseOperation(async () => {
      const where = this.buildOrderFilters(filters);

      const [orders, totalCount] = await Promise.all([
        this.db.order.findMany({
          where,
          skip,
          take: Number(limit),
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    name: true,
                    images: {
                      take: 1,
                      orderBy: { sortOrder: 'asc' }
                    }
                  }
                }
              }
            }
          }
        }),
        this.db.order.count({ where })
      ]);

      return {
        orders,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / Number(limit))
        }
      };
    }, 'Failed to fetch all orders');
  }

  /**
   * Update order status (admin only)
   */
  async updateOrderStatus(orderId: string, updateData: {
    status?: string;
    paymentStatus?: string;
    fulfillmentStatus?: string;
  }) {
    this.validateId(orderId, 'Order');

    return this.handleDatabaseOperation(async () => {
      await this.ensureExists(
        () => this.db.order.findUnique({ where: { id: orderId } }),
        'Order'
      );

      const filteredUpdateData = Object.entries(updateData)
        .filter(([_, value]) => value !== undefined)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

      if (Object.keys(filteredUpdateData).length === 0) {
        throw this.createValidationError('No valid fields to update');
      }

      const updatedOrder = await this.db.order.update({
        where: { id: orderId },
        data: filteredUpdateData,
        include: {
          items: {
            include: {
              product: {
                select: { name: true }
              }
            }
          }
        }
      });

      return updatedOrder;
    }, 'Failed to update order status');
  }

  /**
   * Validate cart items and calculate totals
   */
  private async validateCartAndCalculateTotals(cartItems: any[]): Promise<{
    orderItems: OrderItem[];
    subtotal: number;
  }> {
    let subtotal = 0;
    const orderItems: OrderItem[] = [];

    for (const item of cartItems) {
      // Check stock availability
      if (item.product.quantity < item.quantity) {
        throw this.createValidationError(`Ikke nok på lager av ${item.product.name}`);
      }

      const itemTotal = Number(item.product.price) * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: Number(item.product.price),
        totalPrice: itemTotal,
        productName: item.product.name,
        productSku: item.product.sku,
        productImage: null // Images will be handled separately
      });
    }

    return { orderItems, subtotal };
  }

  /**
   * Update product quantities (increment or decrement)
   */
  private async updateProductQuantities(
    tx: any,
    items: any[],
    operation: 'increment' | 'decrement'
  ) {
    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          quantity: {
            [operation]: item.quantity
          }
        }
      });
    }
  }

  /**
   * Build order filters for admin queries
   */
  private buildOrderFilters(filters: OrderFilters) {
    const where: any = {};

    if (filters.status && filters.status !== 'all') {
      where.status = filters.status;
    }

    if (filters.paymentStatus && filters.paymentStatus !== 'all') {
      where.paymentStatus = filters.paymentStatus;
    }

    if (filters.search) {
      where.OR = [
        { orderNumber: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { billingFirstName: { contains: filters.search, mode: 'insensitive' } },
        { billingLastName: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    return where;
  }

  /**
   * Create order from session cart (no user authentication required)
   */
  async createSessionOrder(orderData: CreateSessionOrderData) {
    this.validateRequiredFields(orderData, ['billingAddress', 'email', 'items', 'paymentIntentId', 'totalAmount']);

    return this.handleDatabaseOperation(async () => {
      // Validate session cart items and get products
      const productIds = orderData.items.map(item => item.productId);
      const products = await this.db.product.findMany({
        where: { id: { in: productIds } },
        include: { images: { take: 1, orderBy: { sortOrder: 'asc' } } }
      });

      if (products.length !== productIds.length) {
        throw this.createValidationError('Some products in cart are no longer available');
      }

      // Validate stock and calculate totals
      let calculatedTotal = 0;
      const orderItems: OrderItem[] = [];

      for (const cartItem of orderData.items) {
        const product = products.find(p => p.id === cartItem.productId);
        if (!product) {
          throw this.createValidationError(`Product ${cartItem.productId} not found`);
        }

        if (product.quantity < cartItem.quantity) {
          throw this.createValidationError(`Not enough stock for ${product.name}`);
        }

        const itemTotal = Number(product.price) * cartItem.quantity;
        calculatedTotal += itemTotal;

        orderItems.push({
          productId: cartItem.productId,
          quantity: cartItem.quantity,
          price: Number(product.price),
          totalPrice: itemTotal,
          productName: product.name,
          productSku: product.sku,
          productImage: product.images[0]?.url || null
        });
      }

      // Create order
      const orderNumber = this.generateOrderNumber();
      const order = await this.db.$transaction(async (tx) => {
        // Create the order
        const newOrder = await (tx.order as any).create({
          data: {
            user: { connect: { id: 'session_user' } }, // Dummy user connection for session orders
            userId: 'session_user', // Placeholder for session orders
            orderNumber,
            email: orderData.email,
            phone: orderData.phone || null,
            notes: orderData.notes || null,
            status: 'CONFIRMED',
            paymentStatus: 'PAID',
            fulfillmentStatus: 'PENDING' as any,
            billingFirstName: orderData.billingAddress.firstName,
            billingLastName: orderData.billingAddress.lastName,
            billingCompany: orderData.billingAddress.company || null,
            billingStreet: orderData.billingAddress.street,
            billingCity: orderData.billingAddress.city,
            billingState: orderData.billingAddress.state || null,
            billingPostalCode: orderData.billingAddress.postalCode || '',
            billingCountry: orderData.billingAddress.country || 'Norge',
            shippingFirstName: orderData.shippingAddress?.firstName || orderData.billingAddress.firstName,
            shippingLastName: orderData.shippingAddress?.lastName || orderData.billingAddress.lastName,
            shippingCompany: orderData.shippingAddress?.company || orderData.billingAddress.company || null,
            shippingStreet: orderData.shippingAddress?.street || orderData.billingAddress.street,
            shippingCity: orderData.shippingAddress?.city || orderData.billingAddress.city,
            shippingState: orderData.shippingAddress?.state || orderData.billingAddress.state || null,
            shippingPostalCode: orderData.shippingAddress?.postalCode || orderData.billingAddress.postalCode || null,
            shippingCountry: orderData.shippingAddress?.country || orderData.billingAddress.country || null,
            subtotal: calculatedTotal,
            totalAmount: orderData.totalAmount,
            items: {
              create: orderItems.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
                totalPrice: item.totalPrice,
                productName: item.productName,
                productSku: item.productSku,
                product: {
                  connect: { id: item.productId }
                }
              }))
            },
            payments: {
              create: {
                amount: orderData.totalAmount,
                status: 'COMPLETED',
                method: 'STRIPE' as any
              }
            }
          } as any,
          include: {
            items: true,
            payments: true
          }
        });

        // Update product quantities
        await this.updateProductQuantities(tx, orderItems, 'decrement');

        return newOrder;
      });

      return { orderId: order.id, orderNumber: order.orderNumber, order };
    }, 'Failed to create session order');
  }

  /**
   * Create order from user cart
   */
  async createOrderFromCart(userId: string, orderData: CreateOrderFromCartData) {
    this.validateId(userId, 'User');
    this.validateRequiredFields(orderData, ['billingAddress', 'email', 'paymentIntentId', 'totalAmount']);

    return this.handleDatabaseOperation(async () => {
      // Get user's cart
      const cart = await this.db.cart.findUnique({
        where: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: { take: 1, orderBy: { sortOrder: 'asc' } }
                }
              }
            }
          }
        }
      });

      if (!cart || cart.items.length === 0) {
        throw this.createValidationError('Cart is empty or not found');
      }

      // Validate cart and calculate totals
      const { orderItems, subtotal } = await this.validateCartAndCalculateTotals(cart.items);

      // Create order
      const orderNumber = this.generateOrderNumber();
      const order = await this.db.$transaction(async (tx) => {
        // Create the order
        const newOrder = await (tx.order as any).create({
          data: {
            userId,
            orderNumber,
            email: orderData.email,
            phone: orderData.phone || null,
            notes: orderData.notes || null,
            status: 'CONFIRMED',
            paymentStatus: 'PAID',
            fulfillmentStatus: 'PENDING' as any,
            billingFirstName: orderData.billingAddress.firstName,
            billingLastName: orderData.billingAddress.lastName,
            billingCompany: orderData.billingAddress.company || null,
            billingStreet: orderData.billingAddress.street,
            billingCity: orderData.billingAddress.city,
            billingState: orderData.billingAddress.state || null,
            billingPostalCode: orderData.billingAddress.postalCode || '',
            billingCountry: orderData.billingAddress.country || 'Norge',
            shippingFirstName: orderData.shippingAddress?.firstName || orderData.billingAddress.firstName,
            shippingLastName: orderData.shippingAddress?.lastName || orderData.billingAddress.lastName,
            shippingCompany: orderData.shippingAddress?.company || orderData.billingAddress.company || null,
            shippingStreet: orderData.shippingAddress?.street || orderData.billingAddress.street,
            shippingCity: orderData.shippingAddress?.city || orderData.billingAddress.city,
            shippingState: orderData.shippingAddress?.state || orderData.billingAddress.state || null,
            shippingPostalCode: orderData.shippingAddress?.postalCode || orderData.billingAddress.postalCode || null,
            shippingCountry: orderData.shippingAddress?.country || orderData.billingAddress.country || null,
            subtotal: subtotal,
            totalAmount: orderData.totalAmount,
            items: {
              create: orderItems.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
                totalPrice: item.totalPrice,
                productName: item.productName,
                productSku: item.productSku,
                product: {
                  connect: { id: item.productId }
                }
              }))
            },
            payments: {
              create: {
                amount: orderData.totalAmount,
                status: 'COMPLETED',
                method: 'STRIPE' as any
              }
            }
          } as any,
          include: {
            items: true,
            payments: true
          }
        });

        // Update product quantities
        await this.updateProductQuantities(tx, cart.items, 'decrement');

        // Clear user's cart
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id }
        });

        return newOrder;
      });

      return { orderId: order.id, orderNumber: order.orderNumber, order };
    }, 'Failed to create order from cart');
  }

  /**
   * Generate unique order number
   */
  private generateOrderNumber(): string {
    return `HS-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
}

export const orderService = new OrderService();