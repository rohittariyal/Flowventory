import { Router } from 'express';
import { authenticateApiKey, requireScopes, AuthenticatedRequest } from '../../middleware/auth';
import { rateLimitMiddleware } from '../../middleware/ratelimit';
import { auditMiddleware } from '../../middleware/audit';

const router = Router();

// Apply middleware to all routes
router.use(auditMiddleware);
router.use(authenticateApiKey);
router.use(rateLimitMiddleware());

// Mock inventory data
function getInventoryFromStorage() {
  if (typeof localStorage !== 'undefined') {
    try {
      return JSON.parse(localStorage.getItem('flowventory:inventory') || '[]');
    } catch {
      return [];
    }
  }
  return [
    {
      id: 'inv-001',
      productId: 'prod-001',
      locationId: 'loc-001',
      sku: 'SKU-001',
      stock: 5,
      reserved: 2,
      available: 3,
      reorderPoint: 20,
      maxStock: 100,
      lastUpdated: '2024-09-25T14:30:00Z'
    }
  ];
}

function saveInventoryToStorage(inventory: any[]) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('flowventory:inventory', JSON.stringify(inventory));
  }
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

// GET /api/v1/inventory - List inventory with filtering
router.get('/', requireScopes('read:inventory'), (req, res) => {
  try {
    let inventory = getInventoryFromStorage();
    const products = getProductsFromStorage();
    
    // Apply filters
    const { productId, locationId, sku, lowStock, limit = 50, offset = 0 } = req.query;
    
    if (productId) {
      inventory = inventory.filter((inv: any) => inv.productId === productId);
    }
    
    if (locationId) {
      inventory = inventory.filter((inv: any) => inv.locationId === locationId);
    }
    
    if (sku) {
      inventory = inventory.filter((inv: any) => inv.sku === sku);
    }
    
    if (lowStock === 'true') {
      inventory = inventory.filter((inv: any) => inv.available <= inv.reorderPoint);
    }
    
    // Enrich with product data
    const enrichedInventory = inventory.map((inv: any) => {
      const product = products.find((p: any) => p.id === inv.productId);
      return {
        ...inv,
        productName: product?.name || 'Unknown Product',
        category: product?.category || 'Uncategorized'
      };
    });
    
    // Pagination
    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);
    const paginatedInventory = enrichedInventory.slice(offsetNum, offsetNum + limitNum);
    
    res.json({
      data: paginatedInventory,
      pagination: {
        total: enrichedInventory.length,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < enrichedInventory.length
      }
    });
  } catch (error) {
    console.error('Inventory API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/v1/inventory/adjust - Adjust inventory levels
router.patch('/adjust', requireScopes('write:inventory'), (req: AuthenticatedRequest, res) => {
  try {
    const { productId, locationId, delta, reason } = req.body;
    
    // Validation
    if (!productId || !locationId || delta === undefined || !reason) {
      return res.status(400).json({ 
        error: 'productId, locationId, delta, and reason are required' 
      });
    }
    
    if (typeof delta !== 'number') {
      return res.status(400).json({ error: 'delta must be a number' });
    }
    
    const inventory = getInventoryFromStorage();
    const products = getProductsFromStorage();
    
    // Find or create inventory record
    let invRecord = inventory.find((inv: any) => 
      inv.productId === productId && inv.locationId === locationId
    );
    
    const product = products.find((p: any) => p.id === productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    if (!invRecord) {
      // Create new inventory record
      invRecord = {
        id: `inv-${Date.now()}`,
        productId,
        locationId,
        sku: product.sku,
        stock: 0,
        reserved: 0,
        available: 0,
        reorderPoint: product.reorderPoint || 10,
        maxStock: product.maxStock || 100,
        lastUpdated: new Date().toISOString()
      };
      inventory.push(invRecord);
    }
    
    // Apply adjustment
    const previousStock = invRecord.stock;
    invRecord.stock = Math.max(0, invRecord.stock + delta);
    invRecord.available = Math.max(0, invRecord.stock - (invRecord.reserved || 0));
    invRecord.lastUpdated = new Date().toISOString();
    
    saveInventoryToStorage(inventory);
    
    // Create adjustment record
    const adjustment = {
      id: `adj-${Date.now()}`,
      productId,
      locationId,
      sku: product.sku,
      previousStock,
      newStock: invRecord.stock,
      delta,
      reason,
      adjustedBy: req.apiKey?.keyPrefix || 'api',
      adjustedAt: new Date().toISOString()
    };
    
    // Trigger webhook events
    const { triggerWebhookEvent } = require('../../services/webhooks');
    
    // Inventory adjusted event
    triggerWebhookEvent('inventory.adjusted', {
      inventory: invRecord,
      adjustment
    }).catch(console.error);
    
    // Low stock alert if applicable
    if (invRecord.available <= invRecord.reorderPoint) {
      triggerWebhookEvent('inventory.low_stock', {
        inventory: invRecord,
        product: product
      }).catch(console.error);
    }
    
    res.json({ 
      data: {
        inventory: invRecord,
        adjustment
      }
    });
  } catch (error) {
    console.error('Inventory adjustment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;