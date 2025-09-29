import { Router } from 'express';
import { 
  createWebhook, 
  updateWebhook, 
  deleteWebhook, 
  listWebhooks,
  testWebhook
} from '../../services/webhooks';
import { rateLimitMiddleware } from '../../middleware/ratelimit';
import { auditMiddleware } from '../../middleware/audit';

const router = Router();

// Apply middleware to all routes
router.use(auditMiddleware);
router.use(rateLimitMiddleware({ maxTokens: 30, refillRate: 30 })); // Lower limits for management API

// Available webhook events
const AVAILABLE_EVENTS = [
  'product.created',
  'product.updated',
  'inventory.adjusted',
  'inventory.low_stock',
  'order.created',
  'order.status_changed',
  'shipment.created',
  'shipment.status_changed',
  'invoice.created',
  'invoice.paid',
  'invoice.status_changed'
] as const;

// POST /mgmt/webhooks - Register new webhook
router.post('/', async (req, res) => {
  try {
    const { url, events, secret, name, description, workspaceId } = req.body;
    
    // Validation
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Validate URL format
    try {
      const parsedUrl = new URL(url);
      
      // In production, require HTTPS
      if (process.env.NODE_ENV === 'production' && parsedUrl.protocol !== 'https:') {
        return res.status(400).json({ error: 'HTTPS URLs are required in production' });
      }
      
      // Allow HTTP in development
      if (process.env.NODE_ENV !== 'production' && !['http:', 'https:'].includes(parsedUrl.protocol)) {
        return res.status(400).json({ error: 'Only HTTP and HTTPS URLs are supported' });
      }
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'At least one event is required' });
    }
    
    // Validate events
    const invalidEvents = events.filter(event => !AVAILABLE_EVENTS.includes(event));
    if (invalidEvents.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid events',
        invalidEvents,
        availableEvents: AVAILABLE_EVENTS
      });
    }
    
    // Create webhook
    const webhook = await createWebhook({
      url,
      events,
      secret,
      name,
      description,
      workspaceId
    });
    
    res.status(201).json({
      data: webhook,
      message: 'Webhook created successfully'
    });
  } catch (error) {
    console.error('Webhook creation error:', error);
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

// GET /mgmt/webhooks - List webhooks
router.get('/', async (req, res) => {
  try {
    const { workspaceId, active } = req.query;
    
    let webhooks = await listWebhooks(workspaceId as string);
    
    if (active !== undefined) {
      const isActive = active === 'true';
      webhooks = webhooks.filter(webhook => webhook.active === isActive);
    }
    
    // Don't expose secrets in the list response
    const safeWebhooks = webhooks.map(webhook => {
      const { secret, ...safeWebhook } = webhook;
      return {
        ...safeWebhook,
        hasSecret: !!secret
      };
    });
    
    res.json({
      data: safeWebhooks,
      total: safeWebhooks.length
    });
  } catch (error) {
    console.error('Webhooks list error:', error);
    res.status(500).json({ error: 'Failed to list webhooks' });
  }
});

// GET /mgmt/webhooks/:id - Get single webhook
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const webhooks = await listWebhooks();
    const webhook = webhooks.find(w => w.id === id);
    
    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    
    // Don't expose secret in response
    const { secret, ...safeWebhook } = webhook;
    
    res.json({
      data: {
        ...safeWebhook,
        hasSecret: !!secret
      }
    });
  } catch (error) {
    console.error('Webhook get error:', error);
    res.status(500).json({ error: 'Failed to get webhook' });
  }
});

// PATCH /mgmt/webhooks/:id - Update webhook
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { url, events, active, name, description } = req.body;
    
    const updates: any = {};
    
    if (url !== undefined) {
      // Validate URL if provided
      try {
        const parsedUrl = new URL(url);
        
        if (process.env.NODE_ENV === 'production' && parsedUrl.protocol !== 'https:') {
          return res.status(400).json({ error: 'HTTPS URLs are required in production' });
        }
        
        if (process.env.NODE_ENV !== 'production' && !['http:', 'https:'].includes(parsedUrl.protocol)) {
          return res.status(400).json({ error: 'Only HTTP and HTTPS URLs are supported' });
        }
        
        updates.url = url;
      } catch {
        return res.status(400).json({ error: 'Invalid URL format' });
      }
    }
    
    if (events !== undefined) {
      if (!Array.isArray(events) || events.length === 0) {
        return res.status(400).json({ error: 'At least one event is required' });
      }
      
      const invalidEvents = events.filter(event => !AVAILABLE_EVENTS.includes(event));
      if (invalidEvents.length > 0) {
        return res.status(400).json({ 
          error: 'Invalid events',
          invalidEvents,
          availableEvents: AVAILABLE_EVENTS
        });
      }
      
      updates.events = events;
    }
    
    if (active !== undefined) {
      updates.active = Boolean(active);
    }
    
    if (name !== undefined) {
      updates.name = name;
    }
    
    if (description !== undefined) {
      updates.description = description;
    }
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    const updatedWebhook = await updateWebhook(id, updates);
    
    if (!updatedWebhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    
    // Don't expose secret in response
    const { secret, ...safeWebhook } = updatedWebhook;
    
    res.json({
      data: {
        ...safeWebhook,
        hasSecret: !!secret
      },
      message: 'Webhook updated successfully'
    });
  } catch (error) {
    console.error('Webhook update error:', error);
    res.status(500).json({ error: 'Failed to update webhook' });
  }
});

// DELETE /mgmt/webhooks/:id - Delete webhook
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const success = await deleteWebhook(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Webhook not found' });
    }
    
    res.json({ 
      message: 'Webhook deleted successfully'
    });
  } catch (error) {
    console.error('Webhook deletion error:', error);
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

// POST /mgmt/webhooks/:id/test - Test webhook delivery
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await testWebhook(id);
    
    if (!result.success) {
      return res.status(400).json({
        error: 'Webhook test failed',
        details: result.error,
        statusCode: result.statusCode,
        responseTime: result.responseTime
      });
    }
    
    res.json({
      message: 'Webhook test successful',
      statusCode: result.statusCode,
      responseTime: result.responseTime
    });
  } catch (error) {
    console.error('Webhook test error:', error);
    res.status(500).json({ error: 'Failed to test webhook' });
  }
});

// GET /mgmt/webhooks/events/available - List available events
router.get('/events/available', (req, res) => {
  try {
    const eventCategories = {
      products: ['product.created', 'product.updated'],
      inventory: ['inventory.adjusted', 'inventory.low_stock'],
      orders: ['order.created', 'order.status_changed'],
      shipments: ['shipment.created', 'shipment.status_changed'],
      invoices: ['invoice.created', 'invoice.paid', 'invoice.status_changed']
    };
    
    res.json({
      data: {
        all: AVAILABLE_EVENTS,
        categories: eventCategories,
        descriptions: {
          'product.created': 'Triggered when a new product is created',
          'product.updated': 'Triggered when a product is updated',
          'inventory.adjusted': 'Triggered when inventory levels are adjusted',
          'inventory.low_stock': 'Triggered when inventory falls below reorder point',
          'order.created': 'Triggered when a new order is created',
          'order.status_changed': 'Triggered when an order status changes',
          'shipment.created': 'Triggered when a shipment is created',
          'shipment.status_changed': 'Triggered when shipment status changes',
          'invoice.created': 'Triggered when a new invoice is created',
          'invoice.paid': 'Triggered when an invoice is marked as paid',
          'invoice.status_changed': 'Triggered when invoice status changes'
        }
      }
    });
  } catch (error) {
    console.error('Events list error:', error);
    res.status(500).json({ error: 'Failed to list available events' });
  }
});

export default router;