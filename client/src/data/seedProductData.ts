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
    latestEventId: "event-1"
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
    hasLinkedTask: true
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
    latestEventId: "event-2"
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
    daysCover: 7.3
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
    daysCover: 11.7
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