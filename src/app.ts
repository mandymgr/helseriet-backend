import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import { errorHandler } from '@/middleware/errorHandler';
import { notFoundHandler } from '@/middleware/notFoundHandler';
import { rateLimiter } from '@/middleware/rateLimiter';
import { setupSwagger } from '@/config/swagger';

// Import routes
import authRoutes from '@/routes/auth.routes';
import userRoutes from '@/routes/user.routes';
import productRoutes from '@/routes/product.routes';
import orderRoutes from '@/routes/order.routes';
import categoryRoutes from '@/routes/category.routes';
import cartRoutes from '@/routes/cart.routes';
import reviewRoutes from '@/routes/review.routes';
import paymentRoutes from '@/routes/payments';
import homepageRoutes from '@/routes/homepage';
import adminProtectionRoutes from '@/routes/admin-protection';
import emailRoutes from '@/routes/email.routes';
import { productController } from '@/controllers/products';

const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Session middleware (before body parsing)
app.use(session({
  secret: process.env.SESSION_SECRET || 'helseriet-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(rateLimiter);

// Setup Swagger documentation
setupSwagger(app);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/homepage', homepageRoutes);
app.use('/api/admin-protection', adminProtectionRoutes);
app.use('/api/email', emailRoutes);

// Bundles endpoint (filter products by isBundle=true)
app.get('/api/bundles', (req, res, next) => {
  req.query.isBundle = 'true';
  return productController.getProducts(req, res, next);
});

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;