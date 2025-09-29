import { Router } from 'express';
import { authenticateApiKey, requireScopes } from '../../middleware/auth';
import { rateLimitMiddleware } from '../../middleware/ratelimit';
import { auditMiddleware } from '../../middleware/audit';

const router = Router();

// Apply middleware to all routes
router.use(auditMiddleware);
router.use(authenticateApiKey);
router.use(rateLimitMiddleware());

// Mock customers data
function getCustomersFromStorage() {
  if (typeof localStorage !== 'undefined') {
    try {
      return JSON.parse(localStorage.getItem('flowventory:customers') || '[]');
    } catch {
      return [];
    }
  }
  return [
    {
      id: 'cust-001',
      name: 'Tech Solutions Inc',
      email: 'billing@techsolutions.com',
      phone: '+1-555-0100',
      address: '456 Business Blvd, Tech City, CA 90210',
      contactPerson: 'Jane Doe',
      customerType: 'Business',
      status: 'Active',
      regionId: 'US',
      state: 'CA',
      taxId: 'US-987654321',
      paymentTerms: 'Net 30',
      creditLimit: 50000,
      currency: 'USD',
      notes: 'Premium customer with excellent payment history',
      createdAt: '2024-01-10T09:00:00Z',
      updatedAt: '2024-09-20T15:45:00Z'
    }
  ];
}

// GET /api/v1/customers - List customers with filtering
router.get('/', requireScopes('read:customers'), (req, res) => {
  try {
    let customers = getCustomersFromStorage();
    
    // Apply filters
    const { 
      status, 
      customerType, 
      regionId,
      q,
      limit = 50, 
      offset = 0 
    } = req.query;
    
    if (status) {
      customers = customers.filter((customer: any) => customer.status === status);
    }
    
    if (customerType) {
      customers = customers.filter((customer: any) => customer.customerType === customerType);
    }
    
    if (regionId) {
      customers = customers.filter((customer: any) => customer.regionId === regionId);
    }
    
    if (q) {
      const searchTerm = (q as string).toLowerCase();
      customers = customers.filter((customer: any) => 
        customer.name.toLowerCase().includes(searchTerm) ||
        customer.email.toLowerCase().includes(searchTerm) ||
        (customer.contactPerson && customer.contactPerson.toLowerCase().includes(searchTerm))
      );
    }
    
    // Sort by name
    customers.sort((a: any, b: any) => a.name.localeCompare(b.name));
    
    // Pagination
    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);
    const paginatedCustomers = customers.slice(offsetNum, offsetNum + limitNum);
    
    res.json({
      data: paginatedCustomers,
      pagination: {
        total: customers.length,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < customers.length
      }
    });
  } catch (error) {
    console.error('Customers API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/customers/:id - Get single customer
router.get('/:id', requireScopes('read:customers'), (req, res) => {
  try {
    const customers = getCustomersFromStorage();
    const customer = customers.find((c: any) => c.id === req.params.id);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json({ data: customer });
  } catch (error) {
    console.error('Customer get error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;