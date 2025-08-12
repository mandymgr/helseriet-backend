# Helseriet Backend API

A scalable e-commerce backend built with Node.js, Express, TypeScript, and Prisma.

## Features

- **Authentication & Authorization**: JWT-based auth with role management
- **Product Management**: Full CRUD operations for products, categories, variants
- **Order Management**: Complete order lifecycle with payment integration
- **User Management**: Customer profiles, addresses, wishlists
- **Cart Management**: Shopping cart functionality
- **Review System**: Product reviews and ratings
- **Payment Integration**: Support for Stripe, Vipps, Klarna
- **File Upload**: Product image handling
- **Rate Limiting**: API protection
- **Comprehensive Logging**: Request/error logging
- **Type Safety**: Full TypeScript implementation

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT
- **Validation**: Express Validator
- **Security**: Helmet, CORS, Rate Limiting
- **Logging**: Custom logger with file output

## Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Route handlers
│   ├── auth/
│   ├── products/
│   ├── orders/
│   ├── users/
│   └── ...
├── middleware/      # Custom middleware
├── models/          # Data models (if needed)
├── routes/          # API routes
├── services/        # Business logic
├── utils/           # Utility functions
├── validations/     # Request validation schemas
└── types/           # TypeScript type definitions

prisma/
├── schema.prisma    # Database schema
├── migrations/      # Database migrations
└── seeds/           # Database seeders

uploads/             # File uploads
logs/                # Application logs
```

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

### Installation

1. **Clone and install dependencies**:
   ```bash
   cd helseriet-backend
   npm install
   ```

2. **Environment setup**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database setup**:
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database
   npm run db:push
   
   # Or run migrations (for production)
   npm run db:migrate
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run lint` - Type check with TypeScript

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh access token

### Products
- `GET /api/products` - List products
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product (Admin)
- `PUT /api/products/:id` - Update product (Admin)
- `DELETE /api/products/:id` - Delete product (Admin)

### Orders
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id/cancel` - Cancel order

### Cart
- `GET /api/cart` - Get user cart
- `POST /api/cart/items` - Add item to cart
- `PUT /api/cart/items/:productId` - Update cart item
- `DELETE /api/cart/items/:productId` - Remove from cart

*See individual route files for complete API documentation.*

## Environment Variables

Key environment variables (see `.env.example` for complete list):

```env
DATABASE_URL="postgresql://username:password@localhost:5432/helseriet_db"
JWT_SECRET="your-jwt-secret"
NODE_ENV="development"
PORT=5000
```

## Development

The project is set up with:
- Hot reload for development
- TypeScript compilation
- Path mapping for clean imports (`@/` prefix)
- Comprehensive error handling
- Request validation
- Security middleware

## Database Schema

The project includes a comprehensive e-commerce schema with:
- Users and authentication
- Product catalog with categories and variants
- Shopping cart functionality
- Order management with status tracking
- Payment integration
- Reviews and ratings
- Address management

## Production Deployment

1. Build the project: `npm run build`
2. Set production environment variables
3. Run database migrations: `npm run db:migrate`
4. Start the server: `npm start`

## Contributing

1. Follow TypeScript best practices
2. Use proper error handling
3. Add validation for all inputs
4. Write comprehensive tests
5. Follow the existing code structure

## License

ISC