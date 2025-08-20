// Seed data for invoices and related entities
import { generateInvoiceNumber } from "@/helpers/invoiceNumber";

export function seedInvoiceData() {
  // Seed customers if not exist
  const existingCustomers = JSON.parse(localStorage.getItem('flowventory:customers') || '[]');
  if (existingCustomers.length === 0) {
    const customers = [
      {
        id: 'cust-1',
        name: 'Acme Corporation',
        email: 'billing@acme.com',
        phone: '+1-555-0123',
        address: '123 Business Ave, City, State 12345',
        contactPerson: 'John Smith',
        customerType: 'Business',
        status: 'Active',
        notes: 'Premium customer with net-30 terms'
      },
      {
        id: 'cust-2', 
        name: 'Global Tech Solutions',
        email: 'accounts@globaltech.com',
        phone: '+1-555-0456',
        address: '456 Tech Park Dr, Innovation City, State 67890',
        contactPerson: 'Sarah Johnson',
        customerType: 'Business',
        status: 'Active',
        notes: 'High-volume customer'
      },
      {
        id: 'cust-3',
        name: 'Small Business Inc',
        email: 'owner@smallbiz.com', 
        phone: '+1-555-0789',
        address: '789 Main St, Smalltown, State 11111',
        contactPerson: 'Mike Wilson',
        customerType: 'Business',
        status: 'Active',
        notes: 'Local business partner'
      }
    ];
    localStorage.setItem('flowventory:customers', JSON.stringify(customers));
  }

  // Seed products if not exist
  const existingProducts = JSON.parse(localStorage.getItem('flowventory:products') || '[]');
  if (existingProducts.length === 0) {
    const products = [
      {
        id: 'prod-1',
        sku: 'WIDGET-001',
        name: 'Premium Widget',
        price: 299.99,
        cost: 150.00,
        stock: 45,
        category: 'Electronics',
        taxOverride: 20 // 20% VAT for UK
      },
      {
        id: 'prod-2',
        sku: 'GADGET-002', 
        name: 'Smart Gadget Pro',
        price: 599.99,
        cost: 300.00,
        stock: 23,
        category: 'Electronics'
        // No tax override - uses region default
      },
      {
        id: 'prod-3',
        sku: 'TOOL-003',
        name: 'Professional Tool Set',
        price: 149.99,
        cost: 75.00,
        stock: 67,
        category: 'Tools',
        taxOverride: 5 // 5% VAT for UAE
      }
    ];
    localStorage.setItem('flowventory:products', JSON.stringify(products));
  }

  // Seed orders if not exist
  const existingOrders = JSON.parse(localStorage.getItem('flowventory:orders') || '[]');
  if (existingOrders.length === 0) {
    const orders = [
      {
        id: 'order-1',
        customerId: 'cust-1',
        regionId: 'region-uk',
        orderDate: '2024-01-15',
        status: 'Completed',
        items: [
          { skuId: 'prod-1', name: 'Premium Widget', quantity: 2, price: 299.99 },
          { skuId: 'prod-2', name: 'Smart Gadget Pro', quantity: 1, price: 599.99 }
        ],
        total: 1199.97
      },
      {
        id: 'order-2',
        customerId: 'cust-2',
        regionId: 'region-uae',
        orderDate: '2024-01-18',
        status: 'Completed',
        items: [
          { skuId: 'prod-3', name: 'Professional Tool Set', quantity: 3, price: 149.99 },
          { skuId: 'prod-1', name: 'Premium Widget', quantity: 1, price: 299.99 }
        ],
        total: 749.96
      }
    ];
    localStorage.setItem('flowventory:orders', JSON.stringify(orders));
  }

  // Seed finance settings if not exist
  const existingSettings = JSON.parse(localStorage.getItem('flowventory:settings') || '{}');
  if (!existingSettings.finance) {
    const financeSettings = {
      baseCurrency: 'USD',
      displayLocale: 'en-US',
      regions: [
        {
          id: 'region-uk',
          name: 'United Kingdom',
          currency: 'GBP',
          locale: 'en-GB',
          taxRules: [
            { name: 'Standard VAT', rate: 20 },
            { name: 'Reduced VAT', rate: 5 },
            { name: 'Zero VAT', rate: 0 }
          ]
        },
        {
          id: 'region-uae',
          name: 'United Arab Emirates',
          currency: 'AED',
          locale: 'en-AE',
          taxRules: [
            { name: 'Standard VAT', rate: 5 },
            { name: 'Zero VAT', rate: 0 }
          ]
        },
        {
          id: 'region-us',
          name: 'United States',
          currency: 'USD',
          locale: 'en-US',
          taxRules: [
            { name: 'Sales Tax', rate: 8.5 },
            { name: 'No Tax', rate: 0 }
          ]
        }
      ],
      manualRates: {
        'GBP': 0.79, // 1 USD = 0.79 GBP
        'AED': 3.67, // 1 USD = 3.67 AED
        'EUR': 0.85, // 1 USD = 0.85 EUR
        'SGD': 1.35  // 1 USD = 1.35 SGD
      }
    };
    
    const updatedSettings = { ...existingSettings, finance: financeSettings };
    localStorage.setItem('flowventory:settings', JSON.stringify(updatedSettings));
  }

  // Seed one existing invoice for demo
  const existingInvoices = JSON.parse(localStorage.getItem('flowventory:invoices') || '[]');
  if (existingInvoices.length === 0) {
    const sampleInvoice = {
      id: 'inv-1',
      number: 'INV-202401-0001',
      orderId: 'order-1',
      customerId: 'cust-1',
      issueDate: '2024-01-16',
      dueDate: '2024-02-15',
      currency: 'GBP',
      locale: 'en-GB',
      lineItems: [
        {
          skuId: 'prod-1',
          name: 'Premium Widget',
          qty: 2,
          unitPrice: 239.99, // Converted to GBP
          taxRate: 0.20
        },
        {
          skuId: 'prod-2', 
          name: 'Smart Gadget Pro',
          qty: 1,
          unitPrice: 479.99, // Converted to GBP
          taxRate: 0.20
        }
      ],
      subtotal: 959.97,
      taxTotal: 191.99,
      grandTotal: 1151.96,
      payments: [
        {
          id: 'pay-1',
          date: '2024-01-20',
          amount: 500.00,
          method: 'Bank Transfer'
        }
      ],
      status: 'PARTIAL',
      notes: 'Payment terms: Net 30 days'
    };
    
    localStorage.setItem('flowventory:invoices', JSON.stringify([sampleInvoice]));
  }
}

// Call this function to initialize seed data
export function initializeSeedData() {
  // Only seed if we don't have existing data
  const hasInvoices = JSON.parse(localStorage.getItem('flowventory:invoices') || '[]').length > 0;
  const hasCustomers = JSON.parse(localStorage.getItem('flowventory:customers') || '[]').length > 0;
  
  if (!hasInvoices || !hasCustomers) {
    seedInvoiceData();
    console.log('Seeded invoice demo data');
  }
}