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

// === Advanced Caching and Auto-refresh Logic ===

const CACHE_REFRESH_SETTINGS_KEY = "flowventory:cache:refresh";
const CACHE_STATS_KEY = "flowventory:cache:stats";

interface CacheRefreshSettings {
  enabled: boolean;
  maxAgeHours: number;
  refreshIntervalMinutes: number;
  priorityProductIds: string[]; // Products to refresh more frequently
  backgroundRefresh: boolean;
}

interface CacheStats {
  lastRefresh: string;
  refreshCount: number;
  hitRate: number;
  missCount: number;
  hitCount: number;
}

const DEFAULT_CACHE_REFRESH_SETTINGS: CacheRefreshSettings = {
  enabled: true,
  maxAgeHours: 6, // Refresh forecasts older than 6 hours
  refreshIntervalMinutes: 30, // Check for stale forecasts every 30 minutes
  priorityProductIds: [],
  backgroundRefresh: true
};

const DEFAULT_CACHE_STATS: CacheStats = {
  lastRefresh: new Date().toISOString(),
  refreshCount: 0,
  hitRate: 0,
  missCount: 0,
  hitCount: 0
};

export function getCacheRefreshSettings(): CacheRefreshSettings {
  try {
    const stored = localStorage.getItem(CACHE_REFRESH_SETTINGS_KEY);
    if (stored) {
      return { ...DEFAULT_CACHE_REFRESH_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error("Error loading cache refresh settings:", error);
  }
  return DEFAULT_CACHE_REFRESH_SETTINGS;
}

export function saveCacheRefreshSettings(settings: CacheRefreshSettings): void {
  try {
    localStorage.setItem(CACHE_REFRESH_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Error saving cache refresh settings:", error);
  }
}

export function getCacheStats(): CacheStats {
  try {
    const stored = localStorage.getItem(CACHE_STATS_KEY);
    if (stored) {
      return { ...DEFAULT_CACHE_STATS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error("Error loading cache stats:", error);
  }
  return DEFAULT_CACHE_STATS;
}

export function updateCacheStats(updates: Partial<CacheStats>): void {
  try {
    const current = getCacheStats();
    const updated = { ...current, ...updates };
    
    // Calculate hit rate
    if (updated.hitCount > 0 || updated.missCount > 0) {
      updated.hitRate = updated.hitCount / (updated.hitCount + updated.missCount);
    }
    
    localStorage.setItem(CACHE_STATS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Error updating cache stats:", error);
  }
}

// Check if a forecast is stale based on settings
export function isForecastStale(forecast: ForecastData, customMaxAgeHours?: number): boolean {
  const settings = getCacheRefreshSettings();
  const maxAge = customMaxAgeHours || settings.maxAgeHours;
  const forecastTime = new Date(forecast.ts);
  const now = new Date();
  const ageHours = (now.getTime() - forecastTime.getTime()) / (1000 * 60 * 60);
  
  return ageHours >= maxAge;
}

// Enhanced forecast retrieval with auto-refresh and stats tracking
export async function getOrRefreshForecast(
  productId: string,
  locationId: string | undefined,
  horizon: ForecastHorizon,
  method: ForecastMethod,
  refreshCallback?: (productId: string, locationId: string | undefined, horizon: ForecastHorizon, method: ForecastMethod) => Promise<ForecastData>
): Promise<ForecastData | null> {
  const settings = getCacheRefreshSettings();
  const cached = getForecastFromCache(productId, locationId, horizon, method);
  
  // Cache hit
  if (cached && !isForecastStale(cached)) {
    updateCacheStats({ 
      hitCount: getCacheStats().hitCount + 1,
      lastRefresh: new Date().toISOString()
    });
    return cached;
  }
  
  // Cache miss or stale data
  updateCacheStats({ 
    missCount: getCacheStats().missCount + 1
  });
  
  // If no refresh callback provided, return stale data or null
  if (!refreshCallback) {
    return cached;
  }
  
  // Refresh forecast
  try {
    console.log(`Refreshing forecast for ${productId} (${locationId || 'all'}) - ${horizon}d ${method}`);
    const fresh = await refreshCallback(productId, locationId, horizon, method);
    addForecastToCache(fresh);
    
    updateCacheStats({ 
      refreshCount: getCacheStats().refreshCount + 1,
      lastRefresh: new Date().toISOString()
    });
    
    return fresh;
  } catch (error) {
    console.error("Error refreshing forecast:", error);
    // Return stale data if refresh fails
    return cached;
  }
}

// Background refresh for priority products
export function refreshPriorityForecasts(
  refreshCallback: (productId: string, locationId: string | undefined, horizon: ForecastHorizon, method: ForecastMethod) => Promise<ForecastData>
): void {
  const settings = getCacheRefreshSettings();
  
  if (!settings.enabled || !settings.backgroundRefresh) {
    return;
  }
  
  const cache = getForecastCache();
  const priorities = settings.priorityProductIds;
  
  // Find stale forecasts for priority products
  const staleForecasts = cache.filter(f => 
    priorities.includes(f.productId) && isForecastStale(f)
  );
  
  if (staleForecasts.length === 0) {
    return;
  }
  
  console.log(`Background refresh: ${staleForecasts.length} stale priority forecasts`);
  
  // Refresh in batches to avoid overwhelming the system
  const batchSize = 3;
  for (let i = 0; i < staleForecasts.length; i += batchSize) {
    const batch = staleForecasts.slice(i, i + batchSize);
    
    setTimeout(async () => {
      await Promise.all(
        batch.map(f => 
          getOrRefreshForecast(f.productId, f.locationId, f.horizon, f.method, refreshCallback)
        )
      );
    }, i * 1000); // Stagger batches by 1 second
  }
}

// Auto-refresh system initialization
let refreshInterval: NodeJS.Timeout | null = null;

export function startAutoRefresh(
  refreshCallback: (productId: string, locationId: string | undefined, horizon: ForecastHorizon, method: ForecastMethod) => Promise<ForecastData>
): void {
  const settings = getCacheRefreshSettings();
  
  if (!settings.enabled) {
    console.log("Auto-refresh disabled in settings");
    return;
  }
  
  // Clear existing interval
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  
  // Start new interval
  refreshInterval = setInterval(() => {
    // Clean up stale forecasts
    removeStaleForecastsFromCache(settings.maxAgeHours * 2); // Keep twice the refresh age
    
    // Refresh priority products
    refreshPriorityForecasts(refreshCallback);
    
    console.log("Auto-refresh cycle completed");
  }, settings.refreshIntervalMinutes * 60 * 1000);
  
  console.log(`Auto-refresh started: every ${settings.refreshIntervalMinutes} minutes`);
}

export function stopAutoRefresh(): void {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
    console.log("Auto-refresh stopped");
  }
}

// Smart cache prewarming for commonly accessed forecasts
export function prewarmCache(
  products: string[], 
  refreshCallback: (productId: string, locationId: string | undefined, horizon: ForecastHorizon, method: ForecastMethod) => Promise<ForecastData>
): void {
  const settings = getCacheRefreshSettings();
  const commonConfigs = [
    { horizon: "30" as ForecastHorizon, method: "moving_avg" as ForecastMethod },
    { horizon: "60" as ForecastHorizon, method: "moving_avg" as ForecastMethod },
  ];
  
  console.log(`Prewarming cache for ${products.length} products`);
  
  let delay = 0;
  products.forEach(productId => {
    commonConfigs.forEach(config => {
      setTimeout(() => {
        getOrRefreshForecast(productId, undefined, config.horizon, config.method, refreshCallback);
      }, delay);
      delay += 200; // Stagger requests by 200ms
    });
  });
}

// === Debug utilities ===

export function getForecastStorageStats() {
  const cache = getForecastCache();
  const orders = getSalesOrders();
  const stats = getCacheStats();
  const settings = getCacheRefreshSettings();
  
  const now = new Date();
  const staleCount = cache.filter(f => isForecastStale(f)).length;
  
  return {
    cache: {
      size: cache.length,
      staleCount,
      freshCount: cache.length - staleCount,
      maxSize: 100,
      utilizationPercent: (cache.length / 100) * 100
    },
    orders: {
      count: orders.length,
      oldestOrder: orders.length > 0 ? 
        Math.min(...orders.map(o => new Date(o.createdAt).getTime())) : null,
      newestOrder: orders.length > 0 ? 
        Math.max(...orders.map(o => new Date(o.createdAt).getTime())) : null
    },
    performance: {
      hitRate: Math.round(stats.hitRate * 100),
      hitCount: stats.hitCount,
      missCount: stats.missCount,
      refreshCount: stats.refreshCount,
      lastRefresh: stats.lastRefresh
    },
    autoRefresh: {
      enabled: settings.enabled,
      intervalMinutes: settings.refreshIntervalMinutes,
      maxAgeHours: settings.maxAgeHours,
      priorityProductsCount: settings.priorityProductIds.length,
      backgroundRefresh: settings.backgroundRefresh
    },
    cacheKeys: cache.map(f => `${f.productId}:${f.locationId || 'all'}:${f.horizon}:${f.method}`)
  };
}