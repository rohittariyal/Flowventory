import { Router } from 'express';
import productsRouter from './products';
import inventoryRouter from './inventory';
import ordersRouter from './orders';
import suppliersRouter from './suppliers';
import customersRouter from './customers';
import invoicesRouter from './invoices';

const router = Router();

// Mount all API v1 routes
router.use('/v1/products', productsRouter);
router.use('/v1/inventory', inventoryRouter);
router.use('/v1/orders', ordersRouter);
router.use('/v1/suppliers', suppliersRouter);
router.use('/v1/customers', customersRouter);
router.use('/v1/invoices', invoicesRouter);

// API health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API info endpoint
router.get('/info', (req, res) => {
  res.json({
    name: 'Flowventory API',
    version: '1.0.0',
    description: 'REST API for Flowventory inventory management system',
    documentation: '/settings/developers',
    endpoints: {
      products: '/api/v1/products',
      inventory: '/api/v1/inventory',
      orders: '/api/v1/orders',
      suppliers: '/api/v1/suppliers',
      customers: '/api/v1/customers',
      invoices: '/api/v1/invoices'
    },
    authentication: 'Bearer token',
    rateLimit: '60 requests per minute'
  });
});

export default router;