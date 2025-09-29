import { Router } from 'express';
import { authenticateApiKey, requireScopes } from '../../middleware/auth';
import { rateLimitMiddleware } from '../../middleware/ratelimit';
import { auditMiddleware } from '../../middleware/audit';

const router = Router();

// Apply middleware to all routes
router.use(auditMiddleware);
router.use(authenticateApiKey);
router.use(rateLimitMiddleware());

// Mock invoices data
function getInvoicesFromStorage() {
  if (typeof localStorage !== 'undefined') {
    try {
      return JSON.parse(localStorage.getItem('flowventory:invoices') || '[]');
    } catch {
      return [];
    }
  }
  return [
    {
      id: 'inv-001',
      number: 'INV-2024-001',
      customerId: 'cust-001',
      customerName: 'Tech Solutions Inc',
      issueDate: '2024-09-20T00:00:00Z',
      dueDate: '2024-10-20T00:00:00Z',
      paidDate: null,
      status: 'UNPAID',
      regionId: 'US',
      currency: 'USD',
      locale: 'en-US',
      lineItems: [
        {
          skuId: 'prod-001',
          name: 'Wireless Bluetooth Headphones',
          quantity: 2,
          price: 79.99
        }
      ],
      subtotal: 159.98,
      tax: 12.80,
      grandTotal: 172.78,
      taxBreakdown: [
        { name: 'Sales Tax', rate: 8, amount: 12.80 }
      ],
      notes: 'Payment due within 30 days',
      createdAt: '2024-09-20T10:00:00Z',
      updatedAt: '2024-09-20T10:00:00Z'
    }
  ];
}

function saveInvoicesToStorage(invoices: any[]) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('flowventory:invoices', JSON.stringify(invoices));
  }
}

// GET /api/v1/invoices - List invoices with filtering
router.get('/', requireScopes('read:invoices'), (req, res) => {
  try {
    let invoices = getInvoicesFromStorage();
    
    // Apply filters
    const { 
      status, 
      customerId, 
      dueBefore,
      issueDate,
      currency,
      overdue,
      limit = 50, 
      offset = 0 
    } = req.query;
    
    if (status) {
      invoices = invoices.filter((invoice: any) => invoice.status === status);
    }
    
    if (customerId) {
      invoices = invoices.filter((invoice: any) => invoice.customerId === customerId);
    }
    
    if (currency) {
      invoices = invoices.filter((invoice: any) => invoice.currency === currency);
    }
    
    if (dueBefore) {
      const beforeDate = new Date(dueBefore as string);
      invoices = invoices.filter((invoice: any) => new Date(invoice.dueDate) <= beforeDate);
    }
    
    if (issueDate) {
      const filterDate = new Date(issueDate as string);
      invoices = invoices.filter((invoice: any) => {
        const invDate = new Date(invoice.issueDate);
        return invDate.toDateString() === filterDate.toDateString();
      });
    }
    
    if (overdue === 'true') {
      const now = new Date();
      invoices = invoices.filter((invoice: any) => 
        invoice.status !== 'PAID' && new Date(invoice.dueDate) < now
      );
    }
    
    // Sort by issue date (newest first)
    invoices.sort((a: any, b: any) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
    
    // Pagination
    const limitNum = parseInt(limit as string, 10);
    const offsetNum = parseInt(offset as string, 10);
    const paginatedInvoices = invoices.slice(offsetNum, offsetNum + limitNum);
    
    res.json({
      data: paginatedInvoices,
      pagination: {
        total: invoices.length,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < invoices.length
      }
    });
  } catch (error) {
    console.error('Invoices API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/v1/invoices/:id - Get single invoice
router.get('/:id', requireScopes('read:invoices'), (req, res) => {
  try {
    const invoices = getInvoicesFromStorage();
    const invoice = invoices.find((inv: any) => inv.id === req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    res.json({ data: invoice });
  } catch (error) {
    console.error('Invoice get error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/v1/invoices/:id/status - Update invoice status
router.patch('/:id/status', requireScopes('write:invoices'), (req, res) => {
  try {
    const { status, paidDate, paymentMethod, paymentReference } = req.body;
    
    const validStatuses = ['UNPAID', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED'];
    
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: `Status must be one of: ${validStatuses.join(', ')}` 
      });
    }
    
    const invoices = getInvoicesFromStorage();
    const invoiceIndex = invoices.findIndex((inv: any) => inv.id === req.params.id);
    
    if (invoiceIndex === -1) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    const invoice = invoices[invoiceIndex];
    const previousStatus = invoice.status;
    
    // Update status and related fields
    invoice.status = status;
    invoice.updatedAt = new Date().toISOString();
    
    if (status === 'PAID') {
      invoice.paidDate = paidDate || new Date().toISOString();
      if (paymentMethod) invoice.paymentMethod = paymentMethod;
      if (paymentReference) invoice.paymentReference = paymentReference;
    } else if (status === 'UNPAID' || status === 'PARTIAL') {
      // Clear payment fields if moving back to unpaid
      if (previousStatus === 'PAID') {
        delete invoice.paidDate;
        delete invoice.paymentMethod;
        delete invoice.paymentReference;
      }
    }
    
    saveInvoicesToStorage(invoices);
    
    // Trigger webhook events
    const { triggerWebhookEvent } = require('../../services/webhooks');
    
    // General status change event
    triggerWebhookEvent('invoice.status_changed', {
      invoice,
      previousStatus,
      newStatus: status
    }).catch(console.error);
    
    // Specific paid event
    if (status === 'PAID' && previousStatus !== 'PAID') {
      triggerWebhookEvent('invoice.paid', {
        invoice,
        paymentDate: invoice.paidDate,
        paymentMethod: invoice.paymentMethod,
        amount: invoice.grandTotal
      }).catch(console.error);
    }
    
    res.json({ data: invoice });
  } catch (error) {
    console.error('Invoice status update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;