import type { SalesOrderItem } from "@shared/schema";
import { getAllProducts } from "./seedProductData";
import { getLocations, initializeWarehouseData } from "@/utils/warehouse";
import { addSalesOrders, getSalesOrders, initializeForecastStorage } from "@/utils/forecastStorage";
import { formatDate, addDays } from "@/utils/forecasting";

// Product velocity patterns (daily sales rate)
const PRODUCT_VELOCITIES: Record<string, number> = {
  // Invoice data products (WIDGET-001, etc.)
  "prod-1": 2.5,    // WIDGET-001 - Premium Electronics Widget
  "prod-2": 1.8,    // GADGET-002 - Smart Gadget Pro  
  "prod-3": 0.9,    // TOOL-003 - Professional Tool Set
  "prod-4": 4.2,    // FOOD-001 - Essential Food Items
  "prod-5": 0.5,    // SOFTWARE-001 - Business Software License
  "prod-6": 1.3,    // TEXTILE-001 - Premium Textile Products
  
  // PRODUCT_DATA products (SKU-001, etc.)
  "prod-001": 2.5,  // SKU-001 - Wireless Bluetooth Headphones
  "prod-002": 1.8,  // SKU-002 - Smartphone Case - Clear
  "prod-003": 0.8,  // SKU-003 - USB-C Charging Cable
  "prod-004": 3.2,  // SKU-004 - Wireless Gaming Mouse
  "prod-005": 2.1,  // SKU-005 - Portable Phone Stand
  "prod-006": 1.5,  // SKU-006 - Bluetooth Speaker
  "prod-007": 2.8,  // SKU-007 - Screen Protector
  "prod-008": 1.2,  // SKU-008 - Power Bank
};

// Location distribution weights (how sales are distributed across locations)
const LOCATION_WEIGHTS: Record<string, number> = {
  "UK": 0.5,   // 50% of sales in UK
  "US": 0.3,   // 30% of sales in US
  "UAE": 0.2,  // 20% of sales in UAE
  "SG": 0.0,   // No Singapore location in current setup
  "IN": 0.0,   // No India location in current setup
};

// Generate random sales quantity with some variability
function generateDailySales(baseVelocity: number, date: Date): number {
  // Add day-of-week seasonality
  const dayOfWeek = date.getDay();
  let seasonalityMultiplier = 1.0;
  
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    // Weekend - 40% less sales
    seasonalityMultiplier = 0.6;
  } else if (dayOfWeek === 1) {
    // Monday - 20% more sales
    seasonalityMultiplier = 1.2;
  } else if (dayOfWeek === 5) {
    // Friday - 10% more sales
    seasonalityMultiplier = 1.1;
  }
  
  // Add random variation (±30%)
  const randomMultiplier = 0.7 + Math.random() * 0.6;
  
  // Calculate final quantity
  const quantity = baseVelocity * seasonalityMultiplier * randomMultiplier;
  
  // Convert to integer, ensuring at least some sales on most days
  if (quantity < 0.5 && Math.random() > 0.7) {
    return 0; // No sales on ~30% of low-velocity days
  }
  
  return Math.max(1, Math.round(quantity));
}

// Get location ID by region
function getLocationIdByRegion(regionId: string): string | undefined {
  const locations = getLocations();
  const location = locations.find(loc => loc.regionId === regionId);
  return location?.id;
}

// Generate historical sales data for all products
export function generateHistoricalSalesData(daysBack: number = 90): SalesOrderItem[] {
  const products = getAllProducts();
  const salesOrders: SalesOrderItem[] = [];
  
  // Ensure locations exist
  initializeWarehouseData();
  const locations = getLocations();
  
  if (locations.length === 0) {
    console.warn("No locations found, cannot generate location-specific sales data");
    return [];
  }
  
  // Generate sales for each day, going backwards from today
  for (let day = 1; day <= daysBack; day++) {
    const date = addDays(new Date(), -day);
    
    // Generate sales for each product
    for (const product of products) {
      const baseVelocity = PRODUCT_VELOCITIES[product.id] || 1.0;
      
      // Distribute sales across locations based on weights
      for (const location of locations) {
        const regionWeight = LOCATION_WEIGHTS[location.regionId] || 0;
        if (regionWeight === 0) continue;
        
        // Calculate location-specific velocity
        const locationVelocity = baseVelocity * regionWeight;
        
        // Generate sales for this product at this location on this date
        const quantity = generateDailySales(locationVelocity, date);
        
        if (quantity > 0) {
          salesOrders.push({
            productId: product.id,
            qty: quantity,
            createdAt: date.toISOString(),
            locationId: location.id
          });
        }
      }
    }
  }
  
  return salesOrders;
}

// Generate specific scenarios to ensure demo works
export function generateDemoScenarios(): SalesOrderItem[] {
  const demoOrders: SalesOrderItem[] = [];
  const products = getAllProducts();
  const locations = getLocations();
  
  if (products.length === 0 || locations.length === 0) return demoOrders;
  
  // Scenario 1: High-velocity product that needs reordering (WIDGET-001 or first product)
  const highVelocityProduct = products.find(p => p.sku === "WIDGET-001") || products[0];
  const primaryLocation = locations.find(l => l.isDefault) || locations[0];
  
  // Generate high sales for last 30 days to trigger reorder suggestion
  for (let day = 1; day <= 30; day++) {
    const date = addDays(new Date(), -day);
    demoOrders.push({
      productId: highVelocityProduct.id,
      qty: Math.floor(3 + Math.random() * 3), // 3-6 units per day
      createdAt: date.toISOString(),
      locationId: primaryLocation.id
    });
  }
  
  // Scenario 2: Seasonal spike for another product
  const seasonalProduct = products[1] || highVelocityProduct;
  if (seasonalProduct !== highVelocityProduct) {
    // High sales in last 7 days, lower before that
    for (let day = 1; day <= 7; day++) {
      const date = addDays(new Date(), -day);
      demoOrders.push({
        productId: seasonalProduct.id,
        qty: Math.floor(5 + Math.random() * 3), // 5-8 units per day recently
        createdAt: date.toISOString(),
        locationId: primaryLocation.id
      });
    }
    
    for (let day = 8; day <= 30; day++) {
      const date = addDays(new Date(), -day);
      if (Math.random() > 0.3) { // 70% chance of sales
        demoOrders.push({
          productId: seasonalProduct.id,
          qty: Math.floor(1 + Math.random() * 2), // 1-3 units per day before
          createdAt: date.toISOString(),
          locationId: primaryLocation.id
        });
      }
    }
  }
  
  return demoOrders;
}

// Main function to seed forecast data
export function seedForecastData(): void {
  // Initialize storage
  initializeForecastStorage();
  
  // Check if we already have sales data
  const existingOrders = getSalesOrders();
  if (existingOrders.length > 0) {
    console.log(`Found ${existingOrders.length} existing sales orders, skipping seed generation`);
    return;
  }
  
  console.log("Generating historical sales data for demand forecasting...");
  
  // Generate 90 days of historical data
  const historicalOrders = generateHistoricalSalesData(90);
  
  // Add demo scenarios
  const demoOrders = generateDemoScenarios();
  
  // Combine all orders
  const allOrders = [...historicalOrders, ...demoOrders];
  
  // Sort by date (oldest first)
  allOrders.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  
  // Save to storage
  addSalesOrders(allOrders);
  
  console.log(`Generated ${allOrders.length} sales orders across ${Math.ceil(90)} days`);
  console.log("Forecast seed data generation complete!");
}

// Helper function to get sales summary
export function getForecastDataSummary() {
  const orders = getSalesOrders();
  const products = getAllProducts();
  const locations = getLocations();
  
  const summary = {
    totalOrders: orders.length,
    dateRange: {
      earliest: orders.length > 0 ? 
        new Date(Math.min(...orders.map(o => new Date(o.createdAt).getTime()))).toISOString().split('T')[0] : null,
      latest: orders.length > 0 ? 
        new Date(Math.max(...orders.map(o => new Date(o.createdAt).getTime()))).toISOString().split('T')[0] : null
    },
    productsWithSales: new Set(orders.map(o => o.productId)).size,
    locationsWithSales: new Set(orders.map(o => o.locationId).filter(Boolean)).size,
    totalProducts: products.length,
    totalLocations: locations.length
  };
  
  return summary;
}

// Function to clear and regenerate forecast data (for testing)
export function resetForecastData(): void {
  localStorage.removeItem("flowventory:orders");
  localStorage.removeItem("flowventory:forecast");
  seedForecastData();
}