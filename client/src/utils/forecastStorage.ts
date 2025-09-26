import type { 
  ForecastSettings, 
  ForecastData, 
  ForecastMethod, 
  ForecastHorizon,
  SalesOrderItem
} from "@shared/schema";

// localStorage keys
const FORECAST_SETTINGS_KEY = "flowventory:settings:forecast";
const FORECAST_CACHE_KEY = "flowventory:forecast";
const SALES_ORDERS_KEY = "flowventory:orders";

// Default forecast settings
const DEFAULT_FORECAST_SETTINGS: ForecastSettings = {
  defaultMethod: "moving_avg",
  ewmaAlpha: 0.35,
  minHistoryDays: 30
};

// === Forecast Settings Management ===

export function getForecastSettings(): ForecastSettings {
  try {
    const stored = localStorage.getItem(FORECAST_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults to ensure all fields are present
      return { ...DEFAULT_FORECAST_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error("Error loading forecast settings:", error);
  }
  
  return DEFAULT_FORECAST_SETTINGS;
}

export function saveForecastSettings(settings: ForecastSettings): void {
  try {
    localStorage.setItem(FORECAST_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Error saving forecast settings:", error);
  }
}

export function updateForecastSettings(updates: Partial<ForecastSettings>): ForecastSettings {
  const current = getForecastSettings();
  const updated = { ...current, ...updates };
  saveForecastSettings(updated);
  return updated;
}

// === Forecast Cache Management ===

export function getForecastCache(): ForecastData[] {
  try {
    const stored = localStorage.getItem(FORECAST_CACHE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error loading forecast cache:", error);
    return [];
  }
}

export function saveForecastCache(forecasts: ForecastData[]): void {
  try {
    localStorage.setItem(FORECAST_CACHE_KEY, JSON.stringify(forecasts));
  } catch (error) {
    console.error("Error saving forecast cache:", error);
  }
}

export function getForecastFromCache(
  productId: string, 
  locationId: string | undefined, 
  horizon: ForecastHorizon, 
  method: ForecastMethod
): ForecastData | null {
  const cache = getForecastCache();
  return cache.find(f => 
    f.productId === productId &&
    f.locationId === locationId &&
    f.horizon === horizon &&
    f.method === method
  ) || null;
}

export function addForecastToCache(forecast: ForecastData): void {
  const cache = getForecastCache();
  
  // Remove any existing forecast for the same combination
  const filtered = cache.filter(f => !(
    f.productId === forecast.productId &&
    f.locationId === forecast.locationId &&
    f.horizon === forecast.horizon &&
    f.method === forecast.method
  ));
  
  // Add the new forecast
  filtered.push(forecast);
  
  // Keep cache size manageable (max 100 entries)
  const trimmed = filtered.slice(-100);
  
  saveForecastCache(trimmed);
}

export function clearForecastCache(): void {
  try {
    localStorage.removeItem(FORECAST_CACHE_KEY);
  } catch (error) {
    console.error("Error clearing forecast cache:", error);
  }
}

export function removeStaleForecastsFromCache(maxAgeHours: number = 24): void {
  const cache = getForecastCache();
  const now = new Date();
  
  const fresh = cache.filter(forecast => {
    const forecastTime = new Date(forecast.ts);
    const ageHours = (now.getTime() - forecastTime.getTime()) / (1000 * 60 * 60);
    return ageHours <= maxAgeHours;
  });
  
  if (fresh.length !== cache.length) {
    saveForecastCache(fresh);
  }
}

// === Sales Orders Management ===

export function getSalesOrders(): SalesOrderItem[] {
  try {
    const stored = localStorage.getItem(SALES_ORDERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error loading sales orders:", error);
    return [];
  }
}

export function saveSalesOrders(orders: SalesOrderItem[]): void {
  try {
    localStorage.setItem(SALES_ORDERS_KEY, JSON.stringify(orders));
  } catch (error) {
    console.error("Error saving sales orders:", error);
  }
}

export function addSalesOrder(order: SalesOrderItem): void {
  const orders = getSalesOrders();
  orders.push(order);
  saveSalesOrders(orders);
}

export function addSalesOrders(newOrders: SalesOrderItem[]): void {
  const existing = getSalesOrders();
  const combined = [...existing, ...newOrders];
  saveSalesOrders(combined);
}

// === Product-specific helpers ===

export function getProductSalesHistory(
  productId: string, 
  locationId?: string, 
  daysBack: number = 90
): SalesOrderItem[] {
  const allOrders = getSalesOrders();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  
  return allOrders.filter(order => {
    // Filter by product
    if (order.productId !== productId) return false;
    
    // Filter by location if specified
    if (locationId && order.locationId !== locationId) return false;
    
    // Filter by date
    const orderDate = new Date(order.createdAt);
    return orderDate >= cutoffDate;
  });
}

// === Cache invalidation helpers ===

export function invalidateForecastsForProduct(productId: string): void {
  const cache = getForecastCache();
  const filtered = cache.filter(f => f.productId !== productId);
  saveForecastCache(filtered);
}

export function invalidateForecastsForLocation(locationId: string): void {
  const cache = getForecastCache();
  const filtered = cache.filter(f => f.locationId !== locationId);
  saveForecastCache(filtered);
}

export function invalidateAllForecasts(): void {
  clearForecastCache();
}

// === Initialization and seeding ===

export function initializeForecastStorage(): void {
  // Ensure settings exist
  const settings = getForecastSettings();
  if (!localStorage.getItem(FORECAST_SETTINGS_KEY)) {
    saveForecastSettings(settings);
  }
  
  // Clean up old forecasts on init
  removeStaleForecastsFromCache();
}

// === Export utility for getting all forecast-related data ===

export function getAllForecastData() {
  return {
    settings: getForecastSettings(),
    cache: getForecastCache(),
    orders: getSalesOrders()
  };
}

// === Debug utilities ===

export function getForecastStorageStats() {
  const cache = getForecastCache();
  const orders = getSalesOrders();
  
  return {
    cacheSize: cache.length,
    ordersCount: orders.length,
    oldestOrder: orders.length > 0 ? 
      Math.min(...orders.map(o => new Date(o.createdAt).getTime())) : null,
    newestOrder: orders.length > 0 ? 
      Math.max(...orders.map(o => new Date(o.createdAt).getTime())) : null,
    cacheKeys: cache.map(f => `${f.productId}:${f.locationId || 'all'}:${f.horizon}:${f.method}`)
  };
}