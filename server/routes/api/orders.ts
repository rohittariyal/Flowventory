import { Router } from 'express';
import { authenticateApiKey, requireScopes } from '../../middleware/auth';
import { rateLimitMiddleware } from '../../middleware/ratelimit';
import { auditMiddleware } from '../../middleware/audit';

const router = Router();

// Apply middleware to all routes
router.use(auditMiddleware);
router.use(authenticateApiKey);
router.use(rateLimitMiddleware());

// Mock orders data
function getOrdersFromStorage() {
  if (typeof localStorage !== 'undefined') {
    try {
      return JSON.parse(localStorage.getItem('flowventory:orders') || '[]');
    } catch {
      return [];
    }
  }
  return [
    {
      id: 'order-001',
      orderNumber: 'ORD-2024-001',
      customerId: 'cust-001',
      customerName: 'Tech Solutions Inc',
      status: 'processing',
      orderDate: '2024-09-20T10:00:00Z',
      requiredDate: '2024-09-25T10:00:00Z',
      shippedDate: null,
      deliveredDate: null,
      items: [
        {
          productId: 'prod-001',
          sku: 'SKU-001',
          name: 'Wireless Bluetooth Headphones',
          quantity: 2,
          unitPrice: 79.99,
          totalPrice: 159.98
        }
      ],
      subtotal: 159.98,
      tax: 32.00,
      shipping: 9.99,
      total: 201.97,
      currency: 'USD',
      shippingAddress: {
        street: '123 Business Ave',
        city: 'Tech City',
        state: 'CA',
        zip: '90210',
        country: 'US'
      },
      createdAt: '2024-09-20T10:00:00Z',
      updatedAt: '2024-09-20T10:00:00Z'
    }
  ];
}

function saveOrdersToStorage(orders: any[]) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('flowventory:orders', JSON.stringify(orders));
  }
}

function getCustomersFromStorage() {
  if (typeof localStorage !== 'undefined') {
    try {
      return JSON.parse(localStorage.getItem('flowventory:customers') || '[]');
    } catch {
      return [];
    }
  }
  return [];
}

function getProductsFromStorage() {
  if (typeof localStorage !== 'undefined') {
    try {
      return JSON.parse(localStorage.getItem('flowventory:products') || '[]');
    } catch {
      return [];
    }
  }
  return [];
}

// GET /api/v1/orders - List orders with filtering
router.get('/', requireScopes('read:orders'), (req, res) => {
  try {
    let orders = getOrdersFromStorage();
    
    // Apply filters
    const { 
      status, 
      customerId, 
      dateFrom, 
      dateTo, 
      orderNumber,
      limit = 50, 
      offset = 0 
    } = req.query;
    
    if (status) {
      orders = orders.filter((order: any) => order.status === status);
    }
    
    if (customerId) {
      orders = orders.filter((order: any) => order.customerId === customerId);
    }
    
    if (orderNumber) {
      orders = orders.filter((order: any) => 
        order.orderNumber.toLowerCase().includes((orderNumber as string).toLowerCase())
      );
    }
    
    if (dateFrom) {
      const fromDate = new Date(dateFrom as string);
      orders = orders.filter((order: any) => new Date(order.orderDate) >= fromDate);
    }
    
    if (dateTo) {
      const toDate = new Date(dateTo as string);
      orders = orders.filter((order: any) => new Date(order.orderDate) <= toDate);
    }
    
    // Sort by order date (newest first)
    orders.sort((a: any, b: any) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
    
    // Pagination
    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);
    const paginatedOrders = orders.slice(offsetNum, offsetNum + limitNum);
    
    res.json({
      data: paginatedOrders,
      pagination: {
        total: orders.length,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < orders.length
      }
    });
  } catch (error) {
    console.error('Orders API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/orders/:id - Get single order
router.get('/:id', requireScopes('read:orders'), (req, res) => {
  try {
    const orders = getOrdersFromStorage();
    const order = orders.find((o: any) => o.id === req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({ data: order });
  } catch (error) {
    console.error('Order get error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/orders - Create order
router.post('/', requireScopes('write:orders'), (req, res) => {
  try {
    const { 
      customerId, 
      items, 
      shippingAddress, 
      requiredDate,
      notes 
    } = req.body;
    
    // Validation
    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        error: 'customerId and items array are required' 
      });
    }
    
    const customers = getCustomersFromStorage();
    const products = getProductsFromStorage();
    const orders = getOrdersFromStorage();
    
    // Validate customer exists
    const customer = customers.find((c: any) => c.id === customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Validate and enrich items
    const enrichedItems = [];
    let subtotal = 0;
    
    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({ 
          error: 'Each item must have productId and positive quantity' 
        });
      }
      
      const product = products.find((p: any) => p.id === item.productId);
      if (!product) {
        return res.status(404).json({ 
          error: `Product not found: ${item.productId}` 
        });
      }
      
      const unitPrice = item.unitPrice || product.price || 0;
      const totalPrice = unitPrice * item.quantity;
      
      enrichedItems.push({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        quantity: item.quantity,
        unitPrice,
        totalPrice
      });
      
      subtotal += totalPrice;
    }
    
    // Calculate totals (simplified tax calculation)
    const taxRate = 0.08; // 8% default tax rate
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const shipping = subtotal > 100 ? 0 : 9.99; // Free shipping over $100
    const total = Math.round((subtotal + tax + shipping) * 100) / 100;
    
    // Generate order number
    const orderNumber = `ORD-${new Date().getFullYear()}-${String(orders.length + 1).padStart(3, '0')}`;
    
    const newOrder = {
      id: `order-${Date.now()}`,
      orderNumber,
      customerId,
      customerName: customer.name,
      status: 'pending',
      orderDate: new Date().toISOString(),
      requiredDate: requiredDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      shippedDate: null,
      deliveredDate: null,
      items: enrichedItems,
      subtotal,
      tax,
      shipping,
      total,
      currency: 'USD',
      shippingAddress: shippingAddress || customer.address,
      notes: notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    orders.push(newOrder);
    saveOrdersToStorage(orders);
    
    // Trigger webhook event
    const { triggerWebhookEvent } = require('../../services/webhooks');
    triggerWebhookEvent('order.created', newOrder).catch(console.error);
    
    res.status(201).json({ data: newOrder });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/v1/orders/:id/status - Update order status
router.patch('/:id/status', requireScopes('write:orders'), (req, res) => {
  try {
    const { status } = req.body;
    
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Status must be one of: ${validStatuses.join(', ')}` 
      });
    }
    
    const orders = getOrdersFromStorage();
    const orderIndex = orders.findIndex((o: any) => o.id === req.params.id);
    
    if (orderIndex === -1) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const order = orders[orderIndex];
    const previousStatus = order.status;
    
    // Update status and related fields
    order.status = status;
    order.updatedAt = new Date().toISOString();
    
    if (status === 'shipped' && !order.shippedDate) {
      order.shippedDate = new Date().toISOString();
    }
    
    if (status === 'delivered') {
      order.deliveredDate = new Date().toISOString();
      if (!order.shippedDate) {
        order.shippedDate = new Date().toISOString();
      }
    }
    
    saveOrdersToStorage(orders);
    
    // Trigger webhook event
    const { triggerWebhookEvent } = require('../../services/webhooks');
    triggerWebhookEvent('order.status_changed', {
      order,
      previousStatus,
      newStatus: status
    }).catch(console.error);
    
    res.json({ data: order });
  } catch (error) {
    console.error('Order status update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;