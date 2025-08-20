// Analytics utilities for Quick Analytics stat cards

export interface Product {
  id: string;
  name: string;
  onHand: number;
  reorderPoint: number;
  archived?: boolean;
}

export interface Order {
  id: string;
  createdAt: string;
  status: string;
  items: Array<{
    productId: string;
    qty: number;
    price: number;
  }>;
  regionId?: string;
}

export interface InventorySettings {
  defaultReorderPoint?: number;
}

// Date utilities
export function isSameMonth(dateA: Date, dateB: Date): boolean {
  return dateA.getFullYear() === dateB.getFullYear() && 
         dateA.getMonth() === dateB.getMonth();
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

// Analytics functions
export function getTotalActiveProducts(): number {
  try {
    const productsData = localStorage.getItem("flowventory:products");
    if (!productsData) return 0;
    
    const products: Product[] = JSON.parse(productsData);
    return products.filter(product => !product.archived).length;
  } catch (error) {
    console.error("Error loading products data:", error);
    return 0;
  }
}

export function getOrdersThisMonth(): number {
  try {
    const ordersData = localStorage.getItem("flowventory:orders");
    if (!ordersData) return 0;
    
    const orders: Order[] = JSON.parse(ordersData);
    const now = new Date();
    
    return orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return isSameMonth(orderDate, now);
    }).length;
  } catch (error) {
    console.error("Error loading orders data:", error);
    return 0;
  }
}

export function getLowStockItems(): number {
  try {
    const productsData = localStorage.getItem("flowventory:products");
    const settingsData = localStorage.getItem("flowventory:settings:inventory");
    
    if (!productsData) return 0;
    
    const products: Product[] = JSON.parse(productsData);
    let defaultReorderPoint = 0;
    
    if (settingsData) {
      try {
        const settings: InventorySettings = JSON.parse(settingsData);
        defaultReorderPoint = settings.defaultReorderPoint || 0;
      } catch (error) {
        console.error("Error parsing inventory settings:", error);
      }
    }
    
    return products.filter(product => {
      if (product.archived) return false;
      const reorderPoint = product.reorderPoint || defaultReorderPoint;
      return product.onHand <= reorderPoint;
    }).length;
  } catch (error) {
    console.error("Error calculating low stock items:", error);
    return 0;
  }
}

// Initialize sample data for demonstration
export function initializeAnalyticsData() {
  const productsKey = "flowventory:products";
  const ordersKey = "flowventory:orders";
  
  // Check if data already exists
  if (localStorage.getItem(productsKey) && localStorage.getItem(ordersKey)) {
    return; // Data already exists
  }
  
  // Sample products data
  const sampleProducts: Product[] = [
    { id: "prod-001", name: "Wireless Headphones", onHand: 15, reorderPoint: 20 },
    { id: "prod-002", name: "Smartphone Case", onHand: 8, reorderPoint: 15 },
    { id: "prod-003", name: "USB-C Cable", onHand: 3, reorderPoint: 25 },
    { id: "prod-004", name: "Gaming Mouse", onHand: 45, reorderPoint: 30 },
    { id: "prod-005", name: "Phone Stand", onHand: 12, reorderPoint: 18 },
    { id: "prod-006", name: "Bluetooth Speaker", onHand: 22, reorderPoint: 20 },
    { id: "prod-007", name: "Screen Protector", onHand: 1, reorderPoint: 50 },
    { id: "prod-008", name: "Power Bank", onHand: 35, reorderPoint: 25 },
    { id: "prod-009", name: "Wireless Charger", onHand: 18, reorderPoint: 20 },
    { id: "prod-010", name: "Laptop Stand", onHand: 6, reorderPoint: 12, archived: true }, // Archived product
  ];
  
  // Sample orders data for current month
  const now = new Date();
  const sampleOrders: Order[] = [
    {
      id: "ord-001",
      createdAt: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      status: "completed",
      items: [{ productId: "prod-001", qty: 2, price: 79.99 }]
    },
    {
      id: "ord-002", 
      createdAt: new Date(now.getFullYear(), now.getMonth(), 5).toISOString(),
      status: "shipped",
      items: [{ productId: "prod-002", qty: 1, price: 14.99 }]
    },
    {
      id: "ord-003",
      createdAt: new Date(now.getFullYear(), now.getMonth(), 8).toISOString(),
      status: "processing",
      items: [{ productId: "prod-003", qty: 3, price: 12.99 }]
    },
    {
      id: "ord-004",
      createdAt: new Date(now.getFullYear(), now.getMonth(), 12).toISOString(),
      status: "completed", 
      items: [{ productId: "prod-004", qty: 1, price: 49.99 }]
    },
    {
      id: "ord-005",
      createdAt: new Date(now.getFullYear(), now.getMonth(), 15).toISOString(),
      status: "completed",
      items: [{ productId: "prod-005", qty: 2, price: 19.99 }]
    },
    {
      id: "ord-006",
      createdAt: new Date(now.getFullYear(), now.getMonth(), 18).toISOString(),
      status: "shipped",
      items: [{ productId: "prod-006", qty: 1, price: 59.99 }]
    },
    {
      id: "ord-007",
      createdAt: new Date(now.getFullYear(), now.getMonth(), 22).toISOString(),
      status: "processing",
      items: [{ productId: "prod-007", qty: 5, price: 9.99 }]
    },
    // Previous month order (should not count)
    {
      id: "ord-008",
      createdAt: new Date(now.getFullYear(), now.getMonth() - 1, 25).toISOString(),
      status: "completed",
      items: [{ productId: "prod-008", qty: 1, price: 39.99 }]
    }
  ];
  
  localStorage.setItem(productsKey, JSON.stringify(sampleProducts));
  localStorage.setItem(ordersKey, JSON.stringify(sampleOrders));
  
  console.log("Initialized analytics sample data");
}