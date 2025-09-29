import { Router } from 'express';
import { authenticateApiKey, requireScopes } from '../../middleware/auth';
import { rateLimitMiddleware } from '../../middleware/ratelimit';
import { auditMiddleware } from '../../middleware/audit';

const router = Router();

// Apply middleware to all routes
router.use(auditMiddleware);
router.use(authenticateApiKey);
router.use(rateLimitMiddleware());

// Mock suppliers data
function getSuppliersFromStorage() {
  if (typeof localStorage !== 'undefined') {
    try {
      return JSON.parse(localStorage.getItem('flowventory:suppliers') || '[]');
    } catch {
      return [];
    }
  }
  return [
    {
      id: 'supplier-001',
      name: 'TechSupply Global',
      email: 'orders@techsupplyglobal.com',
      phone: '+1-555-0123',
      region: 'US',
      currency: 'USD',
      leadTimeDays: 12,
      paymentTerms: 'Net 30',
      address: '123 Tech Avenue, San Francisco, CA 94105',
      status: 'active',
      contactPerson: 'John Smith',
      website: 'https://techsupplyglobal.com',
      taxId: 'US-123456789',
      skus: [
        { sku: 'SKU-001', unitCost: 25.50, packSize: 1, moq: 25, leadTimeDays: 12 },
        { sku: 'SKU-006', unitCost: 45.00, packSize: 1, moq: 20, leadTimeDays: 10 }
      ],
      notes: 'Reliable supplier with good quality products',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-09-25T14:30:00Z'
    }
  ];
}

// GET /api/v1/suppliers - List suppliers with filtering
router.get('/', requireScopes('read:suppliers'), (req, res) => {
  try {
    let suppliers = getSuppliersFromStorage();
    
    // Apply filters
    const { 
      status, 
      region, 
      currency,
      q,
      limit = 50, 
      offset = 0 
    } = req.query;
    
    if (status) {
      suppliers = suppliers.filter((supplier: any) => supplier.status === status);
    }
    
    if (region) {
      suppliers = suppliers.filter((supplier: any) => supplier.region === region);
    }
    
    if (currency) {
      suppliers = suppliers.filter((supplier: any) => supplier.currency === currency);
    }
    
    if (q) {
      const searchTerm = (q as string).toLowerCase();
      suppliers = suppliers.filter((supplier: any) => 
        supplier.name.toLowerCase().includes(searchTerm) ||
        supplier.email.toLowerCase().includes(searchTerm) ||
        (supplier.contactPerson && supplier.contactPerson.toLowerCase().includes(searchTerm))
      );
    }
    
    // Sort by name
    suppliers.sort((a: any, b: any) => a.name.localeCompare(b.name));
    
    // Pagination
    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);
    const paginatedSuppliers = suppliers.slice(offsetNum, offsetNum + limitNum);
    
    res.json({
      data: paginatedSuppliers,
      pagination: {
        total: suppliers.length,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < suppliers.length
      }
    });
  } catch (error) {
    console.error('Suppliers API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/suppliers/:id - Get single supplier
router.get('/:id', requireScopes('read:suppliers'), (req, res) => {
  try {
    const suppliers = getSuppliersFromStorage();
    const supplier = suppliers.find((s: any) => s.id === req.params.id);
    
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    
    res.json({ data: supplier });
  } catch (error) {
    console.error('Supplier get error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;