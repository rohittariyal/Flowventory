import { Router } from 'express';
import { authenticateApiKey, requireScopes } from '../../middleware/auth';
import { rateLimitMiddleware } from '../../middleware/ratelimit';
import { auditMiddleware } from '../../middleware/audit';

const router = Router();

// Apply middleware to all routes
router.use(auditMiddleware);
router.use(authenticateApiKey);
router.use(rateLimitMiddleware());

// Mock data for demonstration (in real app, would connect to database)
function getProductsFromStorage() {
  if (typeof localStorage !== 'undefined') {
    try {
      return JSON.parse(localStorage.getItem('flowventory:products') || '[]');
    } catch {
      return [];
    }
  }
  return [
    {
      id: 'prod-001',
      sku: 'SKU-001',
      name: 'Wireless Bluetooth Headphones',
      category: 'Electronics',
      cost: 25.50,
      price: 79.99,
      stock: 5,
      reserved: 2,
      available: 3,
      supplier: 'TechSupply Global',
      location: 'Warehouse A-1',
      status: 'Low Stock',
      velocity: 2.5,
      daysLeft: 2,
      reorderPoint: 20,
      maxStock: 100,
      channels: ['Shopify', 'Amazon'],
      daysCover: 2.0,
      regionId: 'UK',
      taxCategory: 'standard',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-09-25T14:30:00Z'
    }
  ];
}

function saveProductsToStorage(products: any[]) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('flowventory:products', JSON.stringify(products));
  }
}

// GET /api/v1/products - List products with filtering
router.get('/', requireScopes('read:products'), (req, res) => {
  try {
    let products = getProductsFromStorage();
    
    // Apply filters
    const { q, category, sku, status, updatedSince, limit = 50, offset = 0 } = req.query;
    
    if (q) {
      const searchTerm = (q as string).toLowerCase();
      products = products.filter((p: any) => 
        p.name.toLowerCase().includes(searchTerm) ||
        p.sku.toLowerCase().includes(searchTerm) ||
        (p.category && p.category.toLowerCase().includes(searchTerm))
      );
    }
    
    if (category) {
      products = products.filter((p: any) => p.category === category);
    }
    
    if (sku) {
      products = products.filter((p: any) => p.sku === sku);
    }
    
    if (status) {
      products = products.filter((p: any) => p.status === status);
    }
    
    if (updatedSince) {
      const since = new Date(updatedSince as string);
      products = products.filter((p: any) => new Date(p.updatedAt) > since);
    }
    
    // Pagination
    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);
    const paginatedProducts = products.slice(offsetNum, offsetNum + limitNum);
    
    res.json({
      data: paginatedProducts,
      pagination: {
        total: products.length,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < products.length
      }
    });
  } catch (error) {
    console.error('Products API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/products/:id - Get single product
router.get('/:id', requireScopes('read:products'), (req, res) => {
  try {
    const products = getProductsFromStorage();
    const product = products.find((p: any) => p.id === req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ data: product });
  } catch (error) {
    console.error('Product get error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/v1/products - Create product
router.post('/', requireScopes('write:products'), (req, res) => {
  try {
    const { sku, name, category, cost, price, stock, supplier, location, reorderPoint, maxStock } = req.body;
    
    // Validation
    if (!sku || !name) {
      return res.status(400).json({ error: 'SKU and name are required' });
    }
    
    const products = getProductsFromStorage();
    
    // Check for duplicate SKU
    if (products.some((p: any) => p.sku === sku)) {
      return res.status(409).json({ error: 'Product with this SKU already exists' });
    }
    
    const newProduct = {
      id: `prod-${Date.now()}`,
      sku,
      name,
      category: category || 'Uncategorized',
      cost: cost || 0,
      price: price || 0,
      stock: stock || 0,
      reserved: 0,
      available: stock || 0,
      supplier: supplier || '',
      location: location || '',
      status: (stock || 0) < (reorderPoint || 0) ? 'Low Stock' : 'In Stock',
      velocity: 0,
      daysLeft: 0,
      reorderPoint: reorderPoint || 10,
      maxStock: maxStock || 100,
      channels: [],
      daysCover: 0,
      regionId: 'UK',
      taxCategory: 'standard',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    products.push(newProduct);
    saveProductsToStorage(products);
    
    // Trigger webhook event
    const { triggerWebhookEvent } = require('../../services/webhooks');
    triggerWebhookEvent('product.created', newProduct).catch(console.error);
    
    res.status(201).json({ data: newProduct });
  } catch (error) {
    console.error('Product creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/v1/products/:id - Update product
router.patch('/:id', requireScopes('write:products'), (req, res) => {
  try {
    const products = getProductsFromStorage();
    const productIndex = products.findIndex((p: any) => p.id === req.params.id);
    
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const allowedFields = ['name', 'category', 'cost', 'price', 'stock', 'supplier', 'location', 'reorderPoint', 'maxStock'];
    const updates: any = {};
    
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    const originalProduct = { ...products[productIndex] };
    
    // Apply updates
    products[productIndex] = {
      ...products[productIndex],
      ...updates,
      available: updates.stock !== undefined ? (updates.stock - (products[productIndex].reserved || 0)) : products[productIndex].available,
      status: updates.stock !== undefined && updates.stock < (products[productIndex].reorderPoint || 0) ? 'Low Stock' : 'In Stock',
      updatedAt: new Date().toISOString()
    };
    
    saveProductsToStorage(products);
    
    // Trigger webhook event
    const { triggerWebhookEvent } = require('../../services/webhooks');
    triggerWebhookEvent('product.updated', {
      before: originalProduct,
      after: products[productIndex]
    }).catch(console.error);
    
    res.json({ data: products[productIndex] });
  } catch (error) {
    console.error('Product update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;