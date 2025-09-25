// Seed data for invoices and related entities
import { generateInvoiceNumber } from "@/helpers/invoiceNumber";

export function seedInvoiceData() {
  // Seed customers if not exist
  const existingCustomers = JSON.parse(localStorage.getItem('flowventory:customers') || '[]');
  if (existingCustomers.length === 0) {
    const customers = [
      // UK Customers
      {
        id: 'cust-uk-1',
        name: 'British Manufacturing Ltd',
        email: 'billing@britishmanufacturing.co.uk',
        phone: '+44-20-7123-4567',
        address: '45 Regent Street, London, W1B 4JH, United Kingdom',
        contactPerson: 'James Thompson',
        customerType: 'Business',
        status: 'Active',
        regionId: 'region-uk',
        state: null,
        notes: 'UK VAT registered company'
      },
      {
        id: 'cust-uk-2',
        name: 'TechStart UK',
        email: 'accounts@techstart.uk',
        phone: '+44-161-234-5678',
        address: '10 Oxford Road, Manchester, M1 5QA, United Kingdom',
        contactPerson: 'Sarah Wilson',
        customerType: 'Business',
        status: 'Active',
        regionId: 'region-uk',
        state: null,
        notes: 'Standard VAT rates apply'
      },

      // UAE Customers
      {
        id: 'cust-uae-1',
        name: 'Emirates Trading LLC',
        email: 'billing@emiratestrading.ae',
        phone: '+971-4-123-4567',
        address: 'Business Bay, Dubai, UAE',
        contactPerson: 'Ahmed Al-Mansouri',
        customerType: 'Business',
        status: 'Active',
        regionId: 'region-uae',
        state: null,
        notes: 'UAE VAT registered (TRN: 123456789012345)'
      },

      // Singapore Customers
      {
        id: 'cust-sg-1',
        name: 'Singapore Innovations Pte Ltd',
        email: 'billing@sginnovations.sg',
        phone: '+65-6123-4567',
        address: '1 Marina Bay, Singapore 018989',
        contactPerson: 'Li Wei Chen',
        customerType: 'Business',
        status: 'Active',
        regionId: 'region-sg',
        state: null,
        notes: 'GST registered company'
      },

      // India Customers (different states for CGST/SGST vs IGST testing)
      {
        id: 'cust-in-1',
        name: 'Maharashtra Tech Solutions Pvt Ltd',
        email: 'billing@maharashtratech.in',
        phone: '+91-22-1234-5678',
        address: 'Bandra Kurla Complex, Mumbai, Maharashtra 400051',
        contactPerson: 'Raj Patel',
        customerType: 'Business',
        status: 'Active',
        regionId: 'region-in',
        state: 'maharashtra',
        notes: 'GST registered - same state as business (CGST/SGST)'
      },
      {
        id: 'cust-in-2',
        name: 'Karnataka Software Ltd',
        email: 'accounts@karnatakasoft.in',
        phone: '+91-80-9876-5432',
        address: 'Electronic City, Bangalore, Karnataka 560100',
        contactPerson: 'Priya Sharma',
        customerType: 'Business',
        status: 'Active',
        regionId: 'region-in',
        state: 'karnataka',
        notes: 'GST registered - different state (IGST applies)'
      },

      // US Customers (different states for state tax testing)
      {
        id: 'cust-us-1',
        name: 'California Tech Corp',
        email: 'billing@caltech.com',
        phone: '+1-415-555-0123',
        address: '100 Market Street, San Francisco, CA 94105',
        contactPerson: 'John Anderson',
        customerType: 'Business',
        status: 'Active',
        regionId: 'region-us',
        state: 'california',
        notes: 'California sales tax applies'
      },
      {
        id: 'cust-us-2',
        name: 'Texas Manufacturing Inc',
        email: 'accounts@texasmfg.com',
        phone: '+1-512-555-0456',
        address: '200 Congress Ave, Austin, TX 78701',
        contactPerson: 'Maria Rodriguez',
        customerType: 'Business',
        status: 'Active',
        regionId: 'region-us',
        state: 'texas',
        notes: 'Texas sales tax applies'
      },
      {
        id: 'cust-us-3',
        name: 'Delaware Holdings LLC',
        email: 'billing@deholdings.com',
        phone: '+1-302-555-0789',
        address: '1209 Orange Street, Wilmington, DE 19801',
        contactPerson: 'Robert Johnson',
        customerType: 'Business',
        status: 'Active',
        regionId: 'region-us',
        state: 'delaware',
        notes: 'No state sales tax in Delaware'
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
        name: 'Premium Electronics Widget',
        price: 299.99,
        cost: 150.00,
        stock: 45,
        category: 'Electronics',
        regionId: 'region-uk',
        taxCategory: 'standard',
        taxOverride: null
      },
      {
        id: 'prod-2',
        sku: 'GADGET-002', 
        name: 'Smart Gadget Pro',
        price: 599.99,
        cost: 300.00,
        stock: 23,
        category: 'Electronics',
        regionId: 'region-us',
        taxCategory: 'state',
        taxOverride: null
      },
      {
        id: 'prod-3',
        sku: 'TOOL-003',
        name: 'Professional Tool Set',
        price: 149.99,
        cost: 75.00,
        stock: 67,
        category: 'Tools',
        regionId: 'region-uae',
        taxCategory: 'standard',
        taxOverride: null
      },
      {
        id: 'prod-4',
        sku: 'FOOD-001',
        name: 'Essential Food Items',
        price: 25.99,
        cost: 12.00,
        stock: 120,
        category: 'Food',
        regionId: 'region-uk',
        taxCategory: 'zero',
        taxOverride: null
      },
      {
        id: 'prod-5',
        sku: 'SOFTWARE-001',
        name: 'Business Software License',
        price: 199.99,
        cost: 50.00,
        stock: 15,
        category: 'Software',
        regionId: 'region-sg',
        taxCategory: 'standard',
        taxOverride: null
      },
      {
        id: 'prod-6',
        sku: 'TEXTILE-001',
        name: 'Premium Textile Products',
        price: 89.99,
        cost: 45.00,
        stock: 35,
        category: 'Textiles',
        regionId: 'region-in',
        taxCategory: 'reduced',
        taxOverride: null
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
      businessState: 'maharashtra', // For India GST calculations
      regions: [
        {
          id: 'region-uk',
          name: 'United Kingdom',
          currency: 'GBP',
          locale: 'en-GB',
          taxRules: [
            { name: 'Standard VAT', rate: 20, category: 'standard' },
            { name: 'Reduced VAT', rate: 5, category: 'reduced' },
            { name: 'Zero VAT', rate: 0, category: 'zero' }
          ]
        },
        {
          id: 'region-uae',
          name: 'United Arab Emirates',
          currency: 'AED',
          locale: 'en-AE',
          taxRules: [
            { name: 'Standard VAT', rate: 5, category: 'standard' },
            { name: 'Zero VAT', rate: 0, category: 'zero' }
          ]
        },
        {
          id: 'region-sg',
          name: 'Singapore',
          currency: 'SGD',
          locale: 'en-SG',
          taxRules: [
            { name: 'Standard GST', rate: 9, category: 'standard' },
            { name: 'Zero GST', rate: 0, category: 'zero' }
          ]
        },
        {
          id: 'region-in',
          name: 'India',
          currency: 'INR',
          locale: 'en-IN',
          taxRules: [
            { name: 'Standard GST', rate: 18, category: 'standard' },
            { name: 'Reduced GST', rate: 12, category: 'reduced' },
            { name: 'Zero GST', rate: 0, category: 'zero' }
          ],
          states: [
            { id: 'andhra-pradesh', name: 'Andhra Pradesh' },
            { id: 'arunachal-pradesh', name: 'Arunachal Pradesh' },
            { id: 'assam', name: 'Assam' },
            { id: 'bihar', name: 'Bihar' },
            { id: 'chhattisgarh', name: 'Chhattisgarh' },
            { id: 'goa', name: 'Goa' },
            { id: 'gujarat', name: 'Gujarat' },
            { id: 'haryana', name: 'Haryana' },
            { id: 'himachal-pradesh', name: 'Himachal Pradesh' },
            { id: 'jharkhand', name: 'Jharkhand' },
            { id: 'karnataka', name: 'Karnataka' },
            { id: 'kerala', name: 'Kerala' },
            { id: 'madhya-pradesh', name: 'Madhya Pradesh' },
            { id: 'maharashtra', name: 'Maharashtra' },
            { id: 'manipur', name: 'Manipur' },
            { id: 'meghalaya', name: 'Meghalaya' },
            { id: 'mizoram', name: 'Mizoram' },
            { id: 'nagaland', name: 'Nagaland' },
            { id: 'odisha', name: 'Odisha' },
            { id: 'punjab', name: 'Punjab' },
            { id: 'rajasthan', name: 'Rajasthan' },
            { id: 'sikkim', name: 'Sikkim' },
            { id: 'tamil-nadu', name: 'Tamil Nadu' },
            { id: 'telangana', name: 'Telangana' },
            { id: 'tripura', name: 'Tripura' },
            { id: 'uttar-pradesh', name: 'Uttar Pradesh' },
            { id: 'uttarakhand', name: 'Uttarakhand' },
            { id: 'west-bengal', name: 'West Bengal' },
            { id: 'delhi', name: 'Delhi' },
            { id: 'puducherry', name: 'Puducherry' }
          ]
        },
        {
          id: 'region-us',
          name: 'United States',
          currency: 'USD',
          locale: 'en-US',
          taxRules: [
            { name: 'Sales Tax', rate: 8.5, category: 'state' },
            { name: 'No Tax', rate: 0, category: 'zero' }
          ],
          states: [
            { id: 'alabama', name: 'Alabama', rate: 4.0 },
            { id: 'alaska', name: 'Alaska', rate: 0.0 },
            { id: 'arizona', name: 'Arizona', rate: 5.6 },
            { id: 'arkansas', name: 'Arkansas', rate: 6.5 },
            { id: 'california', name: 'California', rate: 7.25 },
            { id: 'colorado', name: 'Colorado', rate: 2.9 },
            { id: 'connecticut', name: 'Connecticut', rate: 6.35 },
            { id: 'delaware', name: 'Delaware', rate: 0.0 },
            { id: 'florida', name: 'Florida', rate: 6.0 },
            { id: 'georgia', name: 'Georgia', rate: 4.0 },
            { id: 'hawaii', name: 'Hawaii', rate: 4.0 },
            { id: 'idaho', name: 'Idaho', rate: 6.0 },
            { id: 'illinois', name: 'Illinois', rate: 6.25 },
            { id: 'indiana', name: 'Indiana', rate: 7.0 },
            { id: 'iowa', name: 'Iowa', rate: 6.0 },
            { id: 'kansas', name: 'Kansas', rate: 6.5 },
            { id: 'kentucky', name: 'Kentucky', rate: 6.0 },
            { id: 'louisiana', name: 'Louisiana', rate: 4.45 },
            { id: 'maine', name: 'Maine', rate: 5.5 },
            { id: 'maryland', name: 'Maryland', rate: 6.0 },
            { id: 'massachusetts', name: 'Massachusetts', rate: 6.25 },
            { id: 'michigan', name: 'Michigan', rate: 6.0 },
            { id: 'minnesota', name: 'Minnesota', rate: 6.875 },
            { id: 'mississippi', name: 'Mississippi', rate: 7.0 },
            { id: 'missouri', name: 'Missouri', rate: 4.225 },
            { id: 'montana', name: 'Montana', rate: 0.0 },
            { id: 'nebraska', name: 'Nebraska', rate: 5.5 },
            { id: 'nevada', name: 'Nevada', rate: 6.85 },
            { id: 'new-hampshire', name: 'New Hampshire', rate: 0.0 },
            { id: 'new-jersey', name: 'New Jersey', rate: 6.625 },
            { id: 'new-mexico', name: 'New Mexico', rate: 5.125 },
            { id: 'new-york', name: 'New York', rate: 8.0 },
            { id: 'north-carolina', name: 'North Carolina', rate: 4.75 },
            { id: 'north-dakota', name: 'North Dakota', rate: 5.0 },
            { id: 'ohio', name: 'Ohio', rate: 5.75 },
            { id: 'oklahoma', name: 'Oklahoma', rate: 4.5 },
            { id: 'oregon', name: 'Oregon', rate: 0.0 },
            { id: 'pennsylvania', name: 'Pennsylvania', rate: 6.0 },
            { id: 'rhode-island', name: 'Rhode Island', rate: 7.0 },
            { id: 'south-carolina', name: 'South Carolina', rate: 6.0 },
            { id: 'south-dakota', name: 'South Dakota', rate: 4.2 },
            { id: 'tennessee', name: 'Tennessee', rate: 7.0 },
            { id: 'texas', name: 'Texas', rate: 6.25 },
            { id: 'utah', name: 'Utah', rate: 6.1 },
            { id: 'vermont', name: 'Vermont', rate: 6.0 },
            { id: 'virginia', name: 'Virginia', rate: 5.3 },
            { id: 'washington', name: 'Washington', rate: 6.5 },
            { id: 'west-virginia', name: 'West Virginia', rate: 6.0 },
            { id: 'wisconsin', name: 'Wisconsin', rate: 5.0 },
            { id: 'wyoming', name: 'Wyoming', rate: 4.0 }
          ]
        }
      ],
      manualRates: {
        'GBP': 0.79, // 1 USD = 0.79 GBP
        'AED': 3.67, // 1 USD = 3.67 AED
        'EUR': 0.85, // 1 USD = 0.85 EUR
        'SGD': 1.35, // 1 USD = 1.35 SGD
        'INR': 83.50 // 1 USD = 83.50 INR
      }
    };
    
    const updatedSettings = { ...existingSettings, finance: financeSettings };
    localStorage.setItem('flowventory:settings', JSON.stringify(updatedSettings));
  }

  // Seed sample invoices for different regions
  const existingInvoices = JSON.parse(localStorage.getItem('flowventory:invoices') || '[]');
  if (existingInvoices.length === 0) {
    const sampleInvoices = [
      // UK Invoice with Standard VAT
      {
        id: 'inv-uk-1',
        number: 'INV-UK-202401-0001',
        customerId: 'cust-uk-1',
        issueDate: '2024-01-16',
        dueDate: '2024-02-15',
        regionId: 'region-uk',
        currency: 'GBP',
        locale: 'en-GB',
        placeOfSupply: 'United Kingdom',
        lineItems: [
          {
            name: 'Premium Electronics Widget',
            qty: 2,
            unitPrice: 239.99
          },
          {
            name: 'Essential Food Items',
            qty: 5,
            unitPrice: 20.99
          }
        ],
        subtotal: 584.93,
        tax: 95.99, // 20% on electronics, 0% on food
        grand: 680.92,
        taxBreakdown: {
          'Standard VAT (20%)': 95.99,
          'Zero VAT (0%)': 0.00
        },
        businessState: null,
        customerState: null,
        status: 'PAID',
        notes: 'UK VAT invoice - mixed tax rates'
      },

      // UAE Invoice with Standard VAT
      {
        id: 'inv-uae-1',
        number: 'INV-UAE-202401-0001',
        customerId: 'cust-uae-1',
        issueDate: '2024-01-18',
        dueDate: '2024-02-17',
        regionId: 'region-uae',
        currency: 'AED',
        locale: 'en-AE',
        placeOfSupply: 'United Arab Emirates',
        lineItems: [
          {
            name: 'Professional Tool Set',
            qty: 3,
            unitPrice: 550.47 // Converted to AED
          }
        ],
        subtotal: 1651.41,
        tax: 82.57, // 5% VAT
        grand: 1733.98,
        taxBreakdown: {
          'Standard VAT (5%)': 82.57
        },
        businessState: null,
        customerState: null,
        status: 'PENDING',
        notes: 'UAE VAT invoice - standard rate'
      },

      // Singapore Invoice with GST
      {
        id: 'inv-sg-1',
        number: 'INV-SG-202401-0001',
        customerId: 'cust-sg-1',
        issueDate: '2024-01-20',
        dueDate: '2024-02-19',
        regionId: 'region-sg',
        currency: 'SGD',
        locale: 'en-SG',
        placeOfSupply: 'Singapore',
        lineItems: [
          {
            name: 'Business Software License',
            qty: 1,
            unitPrice: 269.99 // Converted to SGD
          }
        ],
        subtotal: 269.99,
        tax: 24.30, // 9% GST
        grand: 294.29,
        taxBreakdown: {
          'Standard GST (9%)': 24.30
        },
        businessState: null,
        customerState: null,
        status: 'PAID',
        notes: 'Singapore GST invoice'
      },

      // India Invoice - Intrastate (CGST/SGST)
      {
        id: 'inv-in-1',
        number: 'INV-IN-202401-0001',
        customerId: 'cust-in-1',
        issueDate: '2024-01-22',
        dueDate: '2024-02-21',
        regionId: 'region-in',
        currency: 'INR',
        locale: 'en-IN',
        placeOfSupply: 'Maharashtra, India',
        lineItems: [
          {
            name: 'Premium Textile Products',
            qty: 4,
            unitPrice: 7515.92 // Converted to INR
          }
        ],
        subtotal: 30063.68,
        tax: 3607.64, // 12% GST (6% CGST + 6% SGST)
        grand: 33671.32,
        taxBreakdown: {
          'CGST (6%)': 1803.82,
          'SGST (6%)': 1803.82
        },
        businessState: 'maharashtra',
        customerState: 'maharashtra',
        status: 'PARTIAL',
        notes: 'India GST invoice - Intrastate transaction (CGST/SGST)'
      },

      // India Invoice - Interstate (IGST)
      {
        id: 'inv-in-2',
        number: 'INV-IN-202401-0002',
        customerId: 'cust-in-2',
        issueDate: '2024-01-25',
        dueDate: '2024-02-24',
        regionId: 'region-in',
        currency: 'INR',
        locale: 'en-IN',
        placeOfSupply: 'Karnataka, India',
        lineItems: [
          {
            name: 'Premium Textile Products',
            qty: 2,
            unitPrice: 7515.92 // Converted to INR
          }
        ],
        subtotal: 15031.84,
        tax: 1803.82, // 12% GST (12% IGST)
        grand: 16835.66,
        taxBreakdown: {
          'IGST (12%)': 1803.82
        },
        businessState: 'maharashtra',
        customerState: 'karnataka',
        status: 'PENDING',
        notes: 'India GST invoice - Interstate transaction (IGST)'
      },

      // US Invoice - California (high state tax)
      {
        id: 'inv-us-1',
        number: 'INV-US-202401-0001',
        customerId: 'cust-us-1',
        issueDate: '2024-01-28',
        dueDate: '2024-02-27',
        regionId: 'region-us',
        currency: 'USD',
        locale: 'en-US',
        placeOfSupply: 'California, USA',
        lineItems: [
          {
            name: 'Smart Gadget Pro',
            qty: 2,
            unitPrice: 599.99
          }
        ],
        subtotal: 1199.98,
        tax: 86.99, // 7.25% California sales tax
        grand: 1286.97,
        taxBreakdown: {
          'California Sales Tax (7.25%)': 86.99
        },
        businessState: 'california',
        customerState: 'california',
        status: 'PAID',
        notes: 'US Sales Tax invoice - California'
      },

      // US Invoice - Delaware (no state tax)
      {
        id: 'inv-us-2',
        number: 'INV-US-202401-0002',
        customerId: 'cust-us-3',
        issueDate: '2024-01-30',
        dueDate: '2024-03-01',
        regionId: 'region-us',
        currency: 'USD',
        locale: 'en-US',
        placeOfSupply: 'Delaware, USA',
        lineItems: [
          {
            name: 'Smart Gadget Pro',
            qty: 1,
            unitPrice: 599.99
          }
        ],
        subtotal: 599.99,
        tax: 0.00, // 0% Delaware sales tax
        grand: 599.99,
        taxBreakdown: {
          'Delaware Sales Tax (0%)': 0.00
        },
        businessState: 'delaware',
        customerState: 'delaware',
        status: 'PENDING',
        notes: 'US Sales Tax invoice - Delaware (no state tax)'
      }
    ];
    
    localStorage.setItem('flowventory:invoices', JSON.stringify(sampleInvoices));
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