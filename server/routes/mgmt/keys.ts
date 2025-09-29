import { Router } from 'express';
import { 
  createApiKey, 
  listApiKeys, 
  revokeApiKey, 
  AVAILABLE_SCOPES,
  type ApiScope 
} from '../../middleware/auth';
import { rateLimitMiddleware } from '../../middleware/ratelimit';
import { auditMiddleware } from '../../middleware/audit';

const router = Router();

// Apply middleware to all routes
router.use(auditMiddleware);
router.use(rateLimitMiddleware({ maxTokens: 30, refillRate: 30 })); // Lower limits for management API

// POST /mgmt/keys - Create new API key
router.post('/', async (req, res) => {
  try {
    const { name, scopes, workspaceId } = req.body;
    
    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    if (!scopes || !Array.isArray(scopes) || scopes.length === 0) {
      return res.status(400).json({ error: 'At least one scope is required' });
    }
    
    // Validate scopes
    const invalidScopes = scopes.filter(scope => !AVAILABLE_SCOPES.includes(scope as ApiScope));
    if (invalidScopes.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid scopes',
        invalidScopes,
        availableScopes: AVAILABLE_SCOPES
      });
    }
    
    // Create API key
    const result = await createApiKey({
      name: name.trim(),
      scopes,
      workspaceId
    });
    
    res.status(201).json({
      data: {
        id: result.id,
        keyPrefix: result.keyPrefix,
        fullKey: result.fullKey, // Only shown once
        name: name.trim(),
        scopes,
        workspaceId,
        createdAt: new Date().toISOString()
      },
      message: 'API key created successfully. Make sure to copy the full key - it will not be shown again.'
    });
  } catch (error) {
    console.error('API key creation error:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

// GET /mgmt/keys - List API keys
router.get('/', async (req, res) => {
  try {
    const { workspaceId } = req.query;
    
    const apiKeys = await listApiKeys(workspaceId as string);
    
    // Don't return the hashed key in the response
    const safeKeys = apiKeys.map(key => ({
      id: key.id,
      keyPrefix: key.keyPrefix,
      name: key.name,
      scopes: key.scopes,
      workspaceId: key.workspaceId,
      createdAt: key.createdAt,
      revokedAt: key.revokedAt,
      status: key.revokedAt ? 'revoked' : 'active'
    }));
    
    res.json({
      data: safeKeys,
      total: safeKeys.length
    });
  } catch (error) {
    console.error('API keys list error:', error);
    res.status(500).json({ error: 'Failed to list API keys' });
  }
});

// DELETE /mgmt/keys/:id - Revoke API key
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'API key ID is required' });
    }
    
    const success = await revokeApiKey(id);
    
    if (!success) {
      return res.status(404).json({ error: 'API key not found' });
    }
    
    res.json({ 
      message: 'API key revoked successfully',
      revokedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('API key revocation error:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

// GET /mgmt/keys/scopes - List available scopes
router.get('/scopes', (req, res) => {
  try {
    const scopeCategories = {
      products: ['read:products', 'write:products'],
      inventory: ['read:inventory', 'write:inventory'],
      orders: ['read:orders', 'write:orders'],
      suppliers: ['read:suppliers', 'write:suppliers'],
      customers: ['read:customers', 'write:customers'],
      invoices: ['read:invoices', 'write:invoices']
    };
    
    res.json({
      data: {
        all: AVAILABLE_SCOPES,
        categories: scopeCategories,
        descriptions: {
          'read:products': 'View product information and search products',
          'write:products': 'Create and update products',
          'read:inventory': 'View inventory levels and locations',
          'write:inventory': 'Adjust inventory levels and stock',
          'read:orders': 'View orders and order history',
          'write:orders': 'Create orders and update order status',
          'read:suppliers': 'View supplier information',
          'write:suppliers': 'Create and update suppliers',
          'read:customers': 'View customer information',
          'write:customers': 'Create and update customers',
          'read:invoices': 'View invoices and payment status',
          'write:invoices': 'Create invoices and update payment status'
        }
      }
    });
  } catch (error) {
    console.error('Scopes list error:', error);
    res.status(500).json({ error: 'Failed to list scopes' });
  }
});

// POST /mgmt/keys/demo - Generate demo key (development only)
router.post('/demo', async (req, res) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Demo keys are not available in production' });
    }
    
    const demoScopes = ['read:products', 'read:inventory', 'read:orders', 'read:suppliers', 'read:customers', 'read:invoices'];
    
    const result = await createApiKey({
      name: 'Demo API Key (Read Only)',
      scopes: demoScopes,
      workspaceId: 'demo'
    });
    
    res.status(201).json({
      data: {
        id: result.id,
        keyPrefix: result.keyPrefix,
        fullKey: result.fullKey,
        name: 'Demo API Key (Read Only)',
        scopes: demoScopes,
        workspaceId: 'demo',
        createdAt: new Date().toISOString()
      },
      message: 'Demo API key created with read-only access to all resources'
    });
  } catch (error) {
    console.error('Demo key creation error:', error);
    res.status(500).json({ error: 'Failed to create demo API key' });
  }
});

export default router;