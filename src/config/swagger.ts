import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Helseriet API',
    version: '1.0.0',
    description: `
      Helseriet e-commerce API for health and wellness products.
      
      This API provides comprehensive functionality for:
      - Product catalog management
      - User authentication and management
      - Shopping cart operations  
      - Order processing and tracking
      - Payment integration (Stripe, Vipps, Klarna)
      - Content management (blog, reviews)
      - Admin panel operations
    `,
    contact: {
      name: 'Helseriet Development Team',
      email: 'dev@helseriet.no',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Development server',
    },
    {
      url: 'https://api.helseriet.no',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Bearer token authentication',
      },
      refreshToken: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Refresh-Token',
        description: 'Refresh token for generating new access tokens',
      },
    },
    schemas: {
      // Common response schemas
      ApiResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Indicates if the request was successful',
          },
          message: {
            type: 'string',
            description: 'Human-readable message',
          },
          data: {
            type: 'object',
            description: 'Response data payload',
          },
        },
        required: ['success'],
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          message: {
            type: 'string',
            description: 'Error message',
          },
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'Error code',
              },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    message: {
                      type: 'string',
                    },
                    field: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
        required: ['success', 'message'],
      },
      // Pagination schema
      Pagination: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            minimum: 1,
            description: 'Current page number',
          },
          limit: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            description: 'Number of items per page',
          },
          total: {
            type: 'integer',
            minimum: 0,
            description: 'Total number of items',
          },
          pages: {
            type: 'integer',
            minimum: 0,
            description: 'Total number of pages',
          },
        },
      },
      // Product schemas
      Product: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Unique product identifier',
          },
          name: {
            type: 'string',
            description: 'Product name',
          },
          slug: {
            type: 'string',
            description: 'URL-friendly product identifier',
          },
          description: {
            type: 'string',
            nullable: true,
            description: 'Full product description',
          },
          shortDescription: {
            type: 'string',
            nullable: true,
            description: 'Brief product description',
          },
          sku: {
            type: 'string',
            description: 'Stock Keeping Unit',
          },
          price: {
            type: 'number',
            format: 'float',
            minimum: 0,
            description: 'Product price in NOK',
          },
          comparePrice: {
            type: 'number',
            format: 'float',
            nullable: true,
            description: 'Original price for comparison (strike-through)',
          },
          quantity: {
            type: 'integer',
            minimum: 0,
            description: 'Available stock quantity',
          },
          isBundle: {
            type: 'boolean',
            description: 'Whether this is a product bundle',
          },
          isFeatured: {
            type: 'boolean',
            description: 'Whether this product is featured',
          },
          status: {
            type: 'string',
            enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'],
            description: 'Product status',
          },
          category: {
            $ref: '#/components/schemas/Category',
          },
          images: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/ProductImage',
            },
          },
          avgRating: {
            type: 'number',
            format: 'float',
            minimum: 0,
            maximum: 5,
            nullable: true,
            description: 'Average customer rating',
          },
          reviewCount: {
            type: 'integer',
            minimum: 0,
            description: 'Number of customer reviews',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      ProductImage: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          url: {
            type: 'string',
            format: 'url',
            description: 'Image URL',
          },
          altText: {
            type: 'string',
            nullable: true,
            description: 'Alt text for accessibility',
          },
          imageType: {
            type: 'string',
            enum: ['FRONT', 'BACK', 'SIDE', 'GENERAL'],
            description: 'Type of product image',
          },
          isPrimary: {
            type: 'boolean',
            description: 'Whether this is the primary product image',
          },
          sortOrder: {
            type: 'integer',
            minimum: 0,
            description: 'Display order',
          },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          name: {
            type: 'string',
            description: 'Category name',
          },
          slug: {
            type: 'string',
            description: 'URL-friendly category identifier',
          },
        },
      },
      // User schemas
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          email: {
            type: 'string',
            format: 'email',
          },
          firstName: {
            type: 'string',
            nullable: true,
          },
          lastName: {
            type: 'string',
            nullable: true,
          },
          role: {
            type: 'string',
            enum: ['CUSTOMER', 'ADMIN', 'SUPER_ADMIN'],
          },
          isActive: {
            type: 'boolean',
          },
          isVerified: {
            type: 'boolean',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      // Auth schemas
      LoginRequest: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address',
          },
          password: {
            type: 'string',
            minLength: 6,
            description: 'User password',
          },
        },
        required: ['email', 'password'],
      },
      RegisterRequest: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
          },
          password: {
            type: 'string',
            minLength: 6,
          },
          firstName: {
            type: 'string',
            nullable: true,
          },
          lastName: {
            type: 'string',
            nullable: true,
          },
        },
        required: ['email', 'password'],
      },
      AuthResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true,
          },
          message: {
            type: 'string',
          },
          data: {
            type: 'object',
            properties: {
              user: {
                $ref: '#/components/schemas/User',
              },
              accessToken: {
                type: 'string',
                description: 'JWT access token',
              },
              refreshToken: {
                type: 'string',
                description: 'Refresh token for renewing access',
              },
            },
          },
        },
      },
      // Order schemas
      Order: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          orderNumber: {
            type: 'string',
            description: 'Human-readable order number',
          },
          status: {
            type: 'string',
            enum: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
          },
          paymentStatus: {
            type: 'string',
            enum: ['PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'REFUNDED'],
          },
          fulfillmentStatus: {
            type: 'string',
            enum: ['UNFULFILLED', 'PARTIAL', 'FULFILLED'],
          },
          subtotal: {
            type: 'number',
            format: 'float',
            description: 'Order subtotal in NOK',
          },
          shippingAmount: {
            type: 'number',
            format: 'float',
            description: 'Shipping cost in NOK',
          },
          totalAmount: {
            type: 'number',
            format: 'float',
            description: 'Total order amount in NOK',
          },
          email: {
            type: 'string',
            format: 'email',
          },
          phone: {
            type: 'string',
            nullable: true,
          },
          billingFirstName: {
            type: 'string',
          },
          billingLastName: {
            type: 'string',
          },
          billingStreet: {
            type: 'string',
          },
          billingCity: {
            type: 'string',
          },
          billingPostalCode: {
            type: 'string',
          },
          billingCountry: {
            type: 'string',
          },
          items: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/OrderItem',
            },
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      OrderItem: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          productId: {
            type: 'string',
            format: 'uuid',
          },
          productName: {
            type: 'string',
          },
          productSku: {
            type: 'string',
          },
          quantity: {
            type: 'integer',
            minimum: 1,
          },
          price: {
            type: 'number',
            format: 'float',
            description: 'Unit price at time of order',
          },
          totalPrice: {
            type: 'number',
            format: 'float',
            description: 'Total price for this line item',
          },
        },
      },
    },
  },
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and authorization endpoints',
    },
    {
      name: 'Products',
      description: 'Product catalog operations',
    },
    {
      name: 'Cart',
      description: 'Shopping cart management',
    },
    {
      name: 'Orders',
      description: 'Order processing and management',
    },
    {
      name: 'Users',
      description: 'User account management',
    },
    {
      name: 'Admin',
      description: 'Administrative operations',
    },
    {
      name: 'Payments',
      description: 'Payment processing integration',
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: [], // Temporarily empty to test
};

const swaggerSpec = swaggerJSDoc(options);

export const setupSwagger = (app: Express): void => {
  // Serve Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info .title { color: #9CAF88; }
    `,
    customSiteTitle: 'Helseriet API Documentation',
    customfavIcon: '/favicon.ico',
  }));

  // Serve raw OpenAPI JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};

export default swaggerSpec;