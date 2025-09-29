// Seed data for supplier benchmarking - Purchase Orders and Returns
import { addDays, subDays, format } from 'date-fns';

// Sample Purchase Orders for benchmarking
const PURCHASE_ORDERS = [
  // TechSupply Global (good performer) - Multiple POs
  {
    id: "po-001",
    number: "PO-2024-001",
    supplierId: "supplier-tech-global",
    createdAt: format(subDays(new Date(), 15), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    expectedAt: format(subDays(new Date(), 5), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    receivedAt: format(subDays(new Date(), 3), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"), // Early delivery
    items: [
      { productId: "prod-001", qty: 50, unitPrice: 25.50 },
      { productId: "prod-006", qty: 30, unitPrice: 45.00 }
    ],
    status: "RECEIVED"
  },
  {
    id: "po-002", 
    number: "PO-2024-002",
    supplierId: "supplier-tech-global",
    createdAt: format(subDays(new Date(), 45), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    expectedAt: format(subDays(new Date(), 35), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    receivedAt: format(subDays(new Date(), 35), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"), // On time
    items: [
      { productId: "prod-002", qty: 100, unitPrice: 12.99 },
      { productId: "prod-003", qty: 25, unitPrice: 89.99 }
    ],
    status: "RECEIVED"
  },
  {
    id: "po-003",
    number: "PO-2024-003", 
    supplierId: "supplier-tech-global",
    createdAt: format(subDays(new Date(), 75), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    expectedAt: format(subDays(new Date(), 65), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    receivedAt: format(subDays(new Date(), 64), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"), // On time
    items: [
      { productId: "prod-004", qty: 75, unitPrice: 34.95 }
    ],
    status: "RECEIVED"
  },

  // Global Electronics Inc (average performer) - Mixed performance
  {
    id: "po-004",
    number: "PO-2024-004",
    supplierId: "supplier-global-electronics", 
    createdAt: format(subDays(new Date(), 20), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    expectedAt: format(subDays(new Date(), 10), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    receivedAt: format(subDays(new Date(), 7), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"), // Late delivery
    items: [
      { productId: "prod-001", qty: 40, unitPrice: 27.00 }, // Price variance
      { productId: "prod-005", qty: 20, unitPrice: 15.99 }
    ],
    status: "RECEIVED"
  },
  {
    id: "po-005",
    number: "PO-2024-005",
    supplierId: "supplier-global-electronics",
    createdAt: format(subDays(new Date(), 50), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    expectedAt: format(subDays(new Date(), 40), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    receivedAt: format(subDays(new Date(), 40), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"), // On time
    items: [
      { productId: "prod-007", qty: 60, unitPrice: 19.99 },
      { productId: "prod-008", qty: 35, unitPrice: 39.95 }
    ],
    status: "RECEIVED"
  },
  {
    id: "po-006",
    number: "PO-2024-006",
    supplierId: "supplier-global-electronics",
    createdAt: format(subDays(new Date(), 80), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    expectedAt: format(subDays(new Date(), 70), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    receivedAt: format(subDays(new Date(), 67), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"), // Late delivery
    items: [
      { productId: "prod-009", qty: 80, unitPrice: 28.50 },
      { productId: "prod-010", qty: 15, unitPrice: 65.00 }
    ],
    status: "RECEIVED"
  },

  // Premium Components Ltd (poor performer) - Often late
  {
    id: "po-007",
    number: "PO-2024-007", 
    supplierId: "supplier-premium-components",
    createdAt: format(subDays(new Date(), 25), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    expectedAt: format(subDays(new Date(), 15), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    receivedAt: format(subDays(new Date(), 8), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"), // Very late
    items: [
      { productId: "prod-002", qty: 30, unitPrice: 15.99 }, // Higher price
      { productId: "prod-004", qty: 50, unitPrice: 38.99 }  // Higher price
    ],
    status: "RECEIVED"
  },
  {
    id: "po-008",
    number: "PO-2024-008",
    supplierId: "supplier-premium-components",
    createdAt: format(subDays(new Date(), 55), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    expectedAt: format(subDays(new Date(), 45), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    receivedAt: format(subDays(new Date(), 38), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"), // Very late
    items: [
      { productId: "prod-006", qty: 25, unitPrice: 48.00 }, // Higher price
      { productId: "prod-011", qty: 40, unitPrice: 22.95 }
    ],
    status: "RECEIVED"
  },
  {
    id: "po-009",
    number: "PO-2024-009",
    supplierId: "supplier-premium-components",
    createdAt: format(subDays(new Date(), 85), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    expectedAt: format(subDays(new Date(), 75), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    receivedAt: format(subDays(new Date(), 70), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"), // Late
    items: [
      { productId: "prod-012", qty: 20, unitPrice: 55.99 }
    ],
    status: "RECEIVED"
  },

  // Asian Manufacturing Co (mixed performer)
  {
    id: "po-010",
    number: "PO-2024-010",
    supplierId: "supplier-asian-manufacturing", 
    createdAt: format(subDays(new Date(), 30), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    expectedAt: format(subDays(new Date(), 20), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    receivedAt: format(subDays(new Date(), 18), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"), // On time
    items: [
      { productId: "prod-001", qty: 100, unitPrice: 24.00 }, // Good price
      { productId: "prod-003", qty: 45, unitPrice: 87.50 }
    ],
    status: "RECEIVED"
  },
  {
    id: "po-011",
    number: "PO-2024-011",
    supplierId: "supplier-asian-manufacturing",
    createdAt: format(subDays(new Date(), 65), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    expectedAt: format(subDays(new Date(), 55), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    receivedAt: format(subDays(new Date(), 52), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"), // Late
    items: [
      { productId: "prod-005", qty: 80, unitPrice: 14.95 },
      { productId: "prod-007", qty: 55, unitPrice: 18.99 }
    ],
    status: "RECEIVED"
  },

  // Recent POs still pending/in progress
  {
    id: "po-012",
    number: "PO-2024-012",
    supplierId: "supplier-tech-global",
    createdAt: format(subDays(new Date(), 5), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    expectedAt: format(addDays(new Date(), 5), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    items: [
      { productId: "prod-008", qty: 60, unitPrice: 38.99 },
      { productId: "prod-009", qty: 40, unitPrice: 27.50 }
    ],
    status: "SENT"
  },
  {
    id: "po-013", 
    number: "PO-2024-013",
    supplierId: "supplier-global-electronics",
    createdAt: format(subDays(new Date(), 3), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    expectedAt: format(addDays(new Date(), 7), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    items: [
      { productId: "prod-010", qty: 35, unitPrice: 63.99 }
    ],
    status: "SENT"
  }
];

// Sample Returns data for defect rate calculation
const RETURNS = [
  // Returns from Premium Components Ltd (poor quality)
  {
    id: "ret-001",
    ts: format(subDays(new Date(), 12), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    productId: "prod-002", 
    supplierId: "supplier-premium-components",
    qty: 3,
    reason: "Defective - non-functional on arrival"
  },
  {
    id: "ret-002",
    ts: format(subDays(new Date(), 28), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    productId: "prod-004",
    supplierId: "supplier-premium-components", 
    qty: 5,
    reason: "Quality issue - damaged packaging and product"
  },
  {
    id: "ret-003",
    ts: format(subDays(new Date(), 42), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    productId: "prod-006",
    supplierId: "supplier-premium-components",
    qty: 2,
    reason: "Defective components"
  },

  // Few returns from Global Electronics Inc (moderate quality)
  {
    id: "ret-004",
    ts: format(subDays(new Date(), 35), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    productId: "prod-001",
    supplierId: "supplier-global-electronics",
    qty: 2,
    reason: "Customer complaint - functionality issue"
  },
  {
    id: "ret-005",
    ts: format(subDays(new Date(), 68), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    productId: "prod-007",
    supplierId: "supplier-global-electronics",
    qty: 1,
    reason: "Wrong specification"
  },

  // Very few returns from TechSupply Global (good quality)
  {
    id: "ret-006",
    ts: format(subDays(new Date(), 55), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
    productId: "prod-003", 
    supplierId: "supplier-tech-global",
    qty: 1,
    reason: "Customer changed mind - no defect"
  }
];

// Sample suppliers data (basic structure)
const SUPPLIERS = [
  {
    id: "supplier-tech-global",
    workspaceId: "workspace-1",
    name: "TechSupply Global",
    email: "orders@techsupplyglobal.com",
    phone: "+1-555-0123",
    region: "US",
    currency: "USD",
    leadTimeDays: 12,
    paymentTerms: "Net 30",
    address: "123 Tech Avenue, San Francisco, CA 94105",
    status: "active",
    skus: [
      { sku: "SKU-001", unitCost: 25.50, packSize: 1, moq: 25, leadTimeDays: 12 },
      { sku: "SKU-006", unitCost: 45.00, packSize: 1, moq: 20, leadTimeDays: 10 }
    ],
    notes: "Reliable supplier with good quality products",
    onTimeRatePct: 92.5,
    defectRatePct: 0.5,
    avgLeadTimeDays: 11.2,
    onTimeTargetPct: 90.0,
    defectTargetPct: 2.0,
    totalDeliveries: 45,
    breachCount: 2,
    lastBreachDate: "2024-08-15",
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-09-25T14:30:00Z"
  },
  {
    id: "supplier-global-electronics",
    workspaceId: "workspace-1", 
    name: "Global Electronics Inc",
    email: "procurement@globalelec.com",
    phone: "+1-555-0456",
    region: "US",
    currency: "USD", 
    leadTimeDays: 15,
    paymentTerms: "Net 45",
    address: "456 Electronics Blvd, Austin, TX 78701",
    status: "active",
    skus: [
      { sku: "SKU-001", unitCost: 27.00, packSize: 1, moq: 30, leadTimeDays: 15 },
      { sku: "SKU-005", unitCost: 15.99, packSize: 1, moq: 50, leadTimeDays: 14 }
    ],
    notes: "Average performance, competitive pricing",
    onTimeRatePct: 78.3,
    defectRatePct: 1.8,
    avgLeadTimeDays: 16.5,
    onTimeTargetPct: 85.0,
    defectTargetPct: 2.5,
    totalDeliveries: 38,
    breachCount: 8,
    lastBreachDate: "2024-09-10",
    createdAt: "2024-02-01T09:00:00Z",
    updatedAt: "2024-09-22T16:45:00Z"
  },
  {
    id: "supplier-premium-components",
    workspaceId: "workspace-1",
    name: "Premium Components Ltd", 
    email: "sales@premiumcomp.uk",
    phone: "+44-20-1234-5678",
    region: "UK",
    currency: "GBP",
    leadTimeDays: 18,
    paymentTerms: "Net 60", 
    address: "789 Industrial Park, Manchester M1 1AA, UK",
    status: "active",
    skus: [
      { sku: "SKU-002", unitCost: 15.99, packSize: 1, moq: 20, leadTimeDays: 20 },
      { sku: "SKU-004", unitCost: 38.99, packSize: 1, moq: 25, leadTimeDays: 18 }
    ],
    notes: "Higher prices but claims premium quality - performance has been disappointing",
    onTimeRatePct: 65.2,
    defectRatePct: 4.5,
    avgLeadTimeDays: 22.8,
    onTimeTargetPct: 85.0,
    defectTargetPct: 2.0,
    totalDeliveries: 31,
    breachCount: 12,
    lastBreachDate: "2024-09-20",
    createdAt: "2024-01-20T11:00:00Z",
    updatedAt: "2024-09-26T12:15:00Z"
  },
  {
    id: "supplier-asian-manufacturing",
    workspaceId: "workspace-1",
    name: "Asian Manufacturing Co",
    email: "export@asianmfg.sg", 
    phone: "+65-6123-4567",
    region: "Singapore",
    currency: "SGD",
    leadTimeDays: 25,
    paymentTerms: "Net 30",
    address: "12 Industrial Road, Singapore 629082",
    status: "active",
    skus: [
      { sku: "SKU-001", unitCost: 24.00, packSize: 10, moq: 100, leadTimeDays: 25 },
      { sku: "SKU-003", unitCost: 87.50, packSize: 1, moq: 20, leadTimeDays: 28 }
    ],
    notes: "Good value for bulk orders, longer lead times due to distance",
    onTimeRatePct: 81.7,
    defectRatePct: 1.2,
    avgLeadTimeDays: 26.3,
    onTimeTargetPct: 80.0,
    defectTargetPct: 3.0, 
    totalDeliveries: 24,
    breachCount: 4,
    lastBreachDate: "2024-08-28",
    createdAt: "2024-03-01T08:00:00Z",
    updatedAt: "2024-09-18T10:30:00Z"
  }
];

// Sample SLA data (optional)
const SLA_DATA = [
  {
    supplierId: "supplier-tech-global",
    targetLeadTimeDays: 12,
    targetOnTimePct: 90
  },
  {
    supplierId: "supplier-global-electronics", 
    targetLeadTimeDays: 15,
    targetOnTimePct: 85
  },
  {
    supplierId: "supplier-premium-components",
    targetLeadTimeDays: 18,
    targetOnTimePct: 85
  },
  {
    supplierId: "supplier-asian-manufacturing",
    targetLeadTimeDays: 25,
    targetOnTimePct: 80
  }
];

// Initialize purchase orders data in localStorage
export function initializePurchaseOrdersData() {
  const purchaseOrdersKey = "flowventory:purchaseOrders";
  
  // Check if purchase orders already exist
  const existingPOs = localStorage.getItem(purchaseOrdersKey);
  if (existingPOs) {
    return; // Purchase orders already exist, don't overwrite
  }
  
  localStorage.setItem(purchaseOrdersKey, JSON.stringify(PURCHASE_ORDERS));
  console.log("Seeded purchase orders data");
}

// Initialize returns data in localStorage  
export function initializeReturnsData() {
  const returnsKey = "flowventory:returns";
  
  // Check if returns already exist
  const existingReturns = localStorage.getItem(returnsKey);
  if (existingReturns) {
    return; // Returns already exist, don't overwrite
  }
  
  localStorage.setItem(returnsKey, JSON.stringify(RETURNS));
  console.log("Seeded returns data");
}

// Initialize suppliers data in localStorage
export function initializeSuppliersData() {
  const suppliersKey = "flowventory:suppliers";
  
  // Check if suppliers already exist
  const existingSuppliers = localStorage.getItem(suppliersKey);
  if (existingSuppliers) {
    return; // Suppliers already exist, don't overwrite
  }
  
  localStorage.setItem(suppliersKey, JSON.stringify(SUPPLIERS));
  console.log("Seeded suppliers data");
}

// Initialize SLA data in localStorage
export function initializeSLAData() {
  const slaKey = "flowventory:sla";
  
  // Check if SLA data already exists
  const existingSLA = localStorage.getItem(slaKey);
  if (existingSLA) {
    return; // SLA data already exists, don't overwrite
  }
  
  localStorage.setItem(slaKey, JSON.stringify(SLA_DATA));
  console.log("Seeded SLA data");
}

// Initialize all supplier-related seed data at once
export function initializeSupplierBenchmarkData() {
  initializeSuppliersData();
  initializePurchaseOrdersData();
  initializeReturnsData();
  initializeSLAData();
  console.log("All supplier benchmark data initialized");
}