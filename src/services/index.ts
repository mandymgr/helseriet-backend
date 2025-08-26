// Service Layer Index
// Export all services for easy importing

export { BaseService } from './base.service';
export { productService } from './product.service';
export { userService } from './user.service';
export { cartService } from './cart.service';
export { authService } from './auth/auth.service';
export { orderService } from './order.service';

// Export service types and interfaces
export type { 
  // Add service interface exports as needed
} from './product.service';

export type {
  // Add user service interface exports as needed
} from './user.service';

export type {
  // Add cart service interface exports as needed
} from './cart.service';

export type {
  // Add auth service interface exports as needed
} from './auth/auth.service';