// Comprehensive product data for both inventory and product detail pages
export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  cost: number;
  price: number;
  stock: number;
  reserved: number;
  available: number;
  supplier: string;
  location: string;
  status: string;
  velocity: number;
  daysLeft: number;
  reorderPoint: number;
  maxStock: number;
  channels: string[];
  daysCover: number;
  hasLinkedTask?: boolean;
  latestEventId?: string;
  // Batch tracking properties
  isBatchTracked?: boolean;
  shelfLifeDays?: number;
  // Tax properties
  regionId?: string;
  taxCategory?: "standard" | "reduced" | "zero";
  taxOverride?: {
    id: string;
    name: string;
    rate: number;
  };
}

// Batch inventory data model
export interface BatchInventory {
  id: string;
  productId: string;
  locationId: string;
  batchNo: string;
  mfgDate?: string;
  expiryDate?: string;
  qty: number;
}

// Batch events data model
export interface BatchEvent {
  id: string;
  timestamp: string;
  type: "RECEIPT" | "TRANSFER" | "SALE" | "RETURN" | "ADJUST";
  productId: string;
  locationId: string;
  batchNo: string;
  qty: number;
  refType?: "PO" | "ORDER" | "RMA" | "MANUAL";
  refId?: string;
  note?: string;
}

// Batch status types
export type BatchStatus = "OK" | "EXPIRING_SOON" | "EXPIRED";

// FIFO pick result
export interface FifoPick {
  batchNo: string;
  qty: number;
  expiryDate?: string;
}

export const PRODUCT_DATA: Product[] = [
  {
    id: "prod-001",
    sku: "SKU-001",
    name: "Wireless Bluetooth Headphones",
    category: "Electronics",
    cost: 25.50,
    price: 79.99,
    stock: 5,
    reserved: 2,
    available: 3,
    supplier: "TechSupply Global",
    location: "Warehouse A-1",
    status: "Low Stock",
    velocity: 2.5,
    daysLeft: 2,
    reorderPoint: 20,
    maxStock: 100,
    channels: ["Shopify", "Amazon"],
    daysCover: 2.0,
    hasLinkedTask: false,
    latestEventId: "event-1",
    regionId: "UK",
    taxCategory: "standard"
  },
  {
    id: "prod-002", 
    sku: "SKU-002",
    name: "Smartphone Case - Clear",
    category: "Accessories",
    cost: 3.20,
    price: 14.99,
    stock: 15,
    reserved: 5,
    available: 10,
    supplier: "AccessoryMart",
    location: "Warehouse B-2",
    status: "Active",
    velocity: 1.8,
    daysLeft: 8,
    reorderPoint: 25,
    maxStock: 200,
    channels: ["Shopify"],
    daysCover: 8.3,
    hasLinkedTask: true,
    isBatchTracked: true,
    shelfLifeDays: 90,
    regionId: "US",
    taxCategory: "standard"
  },
  {
    id: "prod-003",
    sku: "SKU-003", 
    name: "USB-C Charging Cable",
    category: "Electronics",
    cost: 2.75,
    price: 12.99,
    stock: 3,
    reserved: 1,
    available: 2,
    supplier: "Cable Connect Ltd",
    location: "Warehouse A-3",
    status: "Out of Stock",
    velocity: 0.8,
    daysLeft: 4,
    reorderPoint: 15,
    maxStock: 150,
    channels: ["Amazon", "eBay"],
    daysCover: 3.75,
    hasLinkedTask: false,
    latestEventId: "event-2",
    regionId: "UAE",
    taxCategory: "zero",
    taxOverride: {
      id: "uae_zero_override",
      name: "UAE VAT 0% (Zero)",
      rate: 0
    }
  },
  {
    id: "prod-004",
    sku: "SKU-004",
    name: "Wireless Gaming Mouse",
    category: "Electronics",
    cost: 18.90,
    price: 49.99,
    stock: 45,
    reserved: 8,
    available: 37,
    supplier: "Gaming Gear Pro",
    location: "Warehouse C-1",
    status: "Active", 
    velocity: 3.2,
    daysLeft: 14,
    reorderPoint: 30,
    maxStock: 80,
    channels: ["Shopify", "Amazon", "Meta"],
    daysCover: 14.1
  },
  {
    id: "prod-005",
    sku: "SKU-005",
    name: "Portable Phone Stand",
    category: "Accessories",
    cost: 4.50,
    price: 19.99,
    stock: 8,
    reserved: 3,
    available: 5,
    supplier: "Stand & Support Co",
    location: "Warehouse B-1",
    status: "Low Stock",
    velocity: 2.1,
    daysLeft: 4,
    reorderPoint: 18,
    maxStock: 120,
    channels: ["Shopify"],
    daysCover: 3.8,
    hasLinkedTask: false,
    latestEventId: "event-3"
  },
  {
    id: "prod-006",
    sku: "SKU-006",
    name: "Bluetooth Speaker - Compact",
    category: "Electronics",
    cost: 22.30,
    price: 59.99,
    stock: 22,
    reserved: 4,
    available: 18,
    supplier: "Audio Solutions Inc",
    location: "Warehouse A-2",
    status: "Active",
    velocity: 3.0,
    daysLeft: 7,
    reorderPoint: 20,
    maxStock: 60,
    channels: ["Amazon"],
    daysCover: 7.3,
    isBatchTracked: true,
    shelfLifeDays: 365
  },
  {
    id: "prod-007",
    sku: "SKU-007",
    name: "Screen Protector - Glass",
    category: "Accessories", 
    cost: 1.80,
    price: 9.99,
    stock: 1,
    reserved: 0,
    available: 1,
    supplier: "ProtectTech Ltd",
    location: "Warehouse B-3",
    status: "Critical Stock",
    velocity: 0.8,
    daysLeft: 1,
    reorderPoint: 12,
    maxStock: 300,
    channels: ["Shopify", "eBay"],
    daysCover: 1.25,
    hasLinkedTask: false,
    latestEventId: "event-4"
  },
  {
    id: "prod-008",
    sku: "SKU-008",
    name: "Power Bank - 10000mAh",
    category: "Electronics",
    cost: 15.60,
    price: 39.99,
    stock: 35,
    reserved: 6,
    available: 29,
    supplier: "PowerTech Global",
    location: "Warehouse A-4",
    status: "Active",
    velocity: 3.0,
    daysLeft: 12,
    reorderPoint: 25,
    maxStock: 75,
    channels: ["Amazon", "Meta"],
    daysCover: 11.7,
    isBatchTracked: true,
    shelfLifeDays: 730
  }
];

// Seed batch inventory data
export const BATCH_INVENTORY_DATA: BatchInventory[] = [
  // SKU-002 (Smartphone Case) - 90 day shelf life
  {
    id: "batch-001",
    productId: "prod-002",
    locationId: "WH-B2-A1",
    batchNo: "SC240815",
    mfgDate: "2024-08-15",
    expiryDate: "2024-11-13", // Expired (90 days from mfg)
    qty: 5
  },
  {
    id: "batch-002", 
    productId: "prod-002",
    locationId: "WH-B2-A2",
    batchNo: "SC240920",
    mfgDate: "2024-09-20",
    expiryDate: "2024-12-19", // Expiring soon (90 days from mfg)
    qty: 7
  },
  {
    id: "batch-003",
    productId: "prod-002", 
    locationId: "WH-B2-B1",
    batchNo: "SC241201",
    mfgDate: "2024-12-01",
    expiryDate: "2025-03-01", // OK (90 days from mfg)
    qty: 3
  },

  // SKU-006 (Bluetooth Speaker) - 365 day shelf life
  {
    id: "batch-004",
    productId: "prod-006",
    locationId: "WH-A2-A1",
    batchNo: "BS231201",
    mfgDate: "2023-12-01", 
    expiryDate: "2024-11-30", // Expired (365 days from mfg)
    qty: 4
  },
  {
    id: "batch-005",
    productId: "prod-006",
    locationId: "WH-A2-A2", 
    batchNo: "BS240515",
    mfgDate: "2024-05-15",
    expiryDate: "2025-05-15", // Expiring soon (365 days from mfg)
    qty: 8
  },
  {
    id: "batch-006",
    productId: "prod-006",
    locationId: "WH-A2-B1",
    batchNo: "BS241001",
    mfgDate: "2024-10-01",
    expiryDate: "2025-09-30", // OK (365 days from mfg)
    qty: 10
  },

  // SKU-008 (Power Bank) - 730 day shelf life  
  {
    id: "batch-007",
    productId: "prod-008",
    locationId: "WH-A4-A1",
    batchNo: "PB231215",
    mfgDate: "2023-12-15",
    expiryDate: "2025-12-15", // OK (730 days from mfg)
    qty: 15
  },
  {
    id: "batch-008",
    productId: "prod-008",
    locationId: "WH-A4-A2",
    batchNo: "PB240301",
    mfgDate: "2024-03-01", 
    expiryDate: "2026-02-28", // OK (730 days from mfg)
    qty: 20
  }
];

// Seed batch events data
export const BATCH_EVENTS_DATA: BatchEvent[] = [
  // Receipt events for the batches above
  {
    id: "event-batch-001",
    timestamp: "2024-08-15T10:00:00Z",
    type: "RECEIPT",
    productId: "prod-002",
    locationId: "WH-B2-A1",
    batchNo: "SC240815",
    qty: 5,
    refType: "PO",
    refId: "PO-2024-0815",
    note: "Initial receipt from supplier"
  },
  {
    id: "event-batch-002",
    timestamp: "2024-09-20T14:30:00Z",
    type: "RECEIPT",
    productId: "prod-002",
    locationId: "WH-B2-A2",
    batchNo: "SC240920",
    qty: 7,
    refType: "PO",
    refId: "PO-2024-0920",
    note: "Second batch receipt"
  },
  {
    id: "event-batch-003",
    timestamp: "2024-12-01T09:15:00Z",
    type: "RECEIPT",
    productId: "prod-002",
    locationId: "WH-B2-B1",
    batchNo: "SC241201",
    qty: 3,
    refType: "PO",
    refId: "PO-2024-1201",
    note: "Latest batch receipt"
  },
  {
    id: "event-batch-004",
    timestamp: "2023-12-01T11:00:00Z",
    type: "RECEIPT",
    productId: "prod-006",
    locationId: "WH-A2-A1",
    batchNo: "BS231201",
    qty: 4,
    refType: "PO",
    refId: "PO-2023-1201",
    note: "Old batch now expired"
  },
  {
    id: "event-batch-005",
    timestamp: "2024-05-15T08:45:00Z",
    type: "RECEIPT",
    productId: "prod-006",
    locationId: "WH-A2-A2",
    batchNo: "BS240515",
    qty: 8,
    refType: "PO",
    refId: "PO-2024-0515",
    note: "Spring batch receipt"
  },
  {
    id: "event-batch-006",
    timestamp: "2024-10-01T13:20:00Z",
    type: "RECEIPT",
    productId: "prod-006",
    locationId: "WH-A2-B1",
    batchNo: "BS241001",
    qty: 10,
    refType: "PO",
    refId: "PO-2024-1001",
    note: "Fresh batch receipt"
  },
  {
    id: "event-batch-007",
    timestamp: "2023-12-15T16:30:00Z",
    type: "RECEIPT",
    productId: "prod-008",
    locationId: "WH-A4-A1",
    batchNo: "PB231215",
    qty: 15,
    refType: "PO",
    refId: "PO-2023-1215",
    note: "Long shelf life batch"
  },
  {
    id: "event-batch-008",
    timestamp: "2024-03-01T12:00:00Z",
    type: "RECEIPT",
    productId: "prod-008",
    locationId: "WH-A4-A2",
    batchNo: "PB240301",
    qty: 20,
    refType: "PO", 
    refId: "PO-2024-0301",
    note: "Latest power bank batch"
  },
  
  // Some adjustment and sale events for testing
  {
    id: "event-batch-009",
    timestamp: "2024-12-20T10:30:00Z",
    type: "ADJUST",
    productId: "prod-002",
    locationId: "WH-B2-A1",
    batchNo: "SC240815",
    qty: -2, // Adjustment down
    refType: "MANUAL",
    note: "Cycle count adjustment - expired product"
  },
  {
    id: "event-batch-010",
    timestamp: "2024-12-22T15:45:00Z",
    type: "SALE",
    productId: "prod-006",
    locationId: "WH-A2-B1",
    batchNo: "BS241001",
    qty: -3, // Sale allocation
    refType: "ORDER",
    refId: "ORD-2024-1222",
    note: "FIFO sale allocation"
  }
];

// Initialize product data in localStorage
export function initializeProductData() {
  const productKey = "flowventory:products";
  
  // Check if products already exist
  const existingProducts = localStorage.getItem(productKey);
  if (existingProducts) {
    return; // Products already exist, don't overwrite
  }
  
  localStorage.setItem(productKey, JSON.stringify(PRODUCT_DATA));
  console.log("Seeded product data");
}

// Initialize batch inventory data in localStorage
export function initializeBatchInventoryData() {
  const batchInventoryKey = "flowventory:batch-inventory";
  
  // Check if batch inventory already exists
  const existingBatchInventory = localStorage.getItem(batchInventoryKey);
  if (existingBatchInventory) {
    return; // Batch inventory already exists, don't overwrite
  }
  
  localStorage.setItem(batchInventoryKey, JSON.stringify(BATCH_INVENTORY_DATA));
  console.log("Seeded batch inventory data");
}

// Initialize batch events data in localStorage
export function initializeBatchEventsData() {
  const batchEventsKey = "flowventory:batch-events";
  
  // Check if batch events already exist
  const existingBatchEvents = localStorage.getItem(batchEventsKey);
  if (existingBatchEvents) {
    return; // Batch events already exist, don't overwrite
  }
  
  localStorage.setItem(batchEventsKey, JSON.stringify(BATCH_EVENTS_DATA));
  console.log("Seeded batch events data");
}

// Initialize all seed data at once
export function initializeAllSeedData() {
  initializeProductData();
  initializeBatchInventoryData();
  initializeBatchEventsData();
  console.log("All seed data initialized");
}

// Get product by SKU or ID
export function getProductBySku(sku: string): Product | undefined {
  try {
    const storedProducts = localStorage.getItem("flowventory:products");
    if (storedProducts) {
      const products: Product[] = JSON.parse(storedProducts);
      return products.find(p => p.sku === sku || p.id === sku);
    }
  } catch (error) {
    console.error("Error loading product:", error);
  }
  
  // Fallback to hardcoded data
  return PRODUCT_DATA.find(p => p.sku === sku || p.id === sku);
}

// Get all products
export function getAllProducts(): Product[] {
  try {
    const storedProducts = localStorage.getItem("flowventory:products");
    if (storedProducts) {
      return JSON.parse(storedProducts);
    }
  } catch (error) {
    console.error("Error loading products:", error);
  }
  
  // Fallback to hardcoded data
  return PRODUCT_DATA;
}

// Update product stock
export function updateProductStock(sku: string, newStock: number): boolean {
  try {
    let products: Product[] = getAllProducts();
    const productIndex = products.findIndex(p => p.sku === sku || p.id === sku);
    
    if (productIndex === -1) {
      console.error(`Product with SKU ${sku} not found`);
      return false;
    }
    
    // Update the product stock
    products[productIndex] = {
      ...products[productIndex],
      stock: newStock,
      available: Math.max(0, newStock - (products[productIndex].reserved || 0)),
    };
    
    // Save back to localStorage
    localStorage.setItem("flowventory:products", JSON.stringify(products));
    
    console.log(`Updated product ${sku} stock to ${newStock}`);
    return true;
  } catch (error) {
    console.error("Error updating product stock:", error);
    return false;
  }
}