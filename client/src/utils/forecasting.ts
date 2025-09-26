import type { 
  SalesOrderItem, 
  DailySales, 
  ForecastResult, 
  DemandSuggestion, 
  ForecastMethod,
  ForecastHorizon
} from "@shared/schema";

// Date utilities
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function startOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function endOfDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function getDaysAgo(days: number): Date {
  return addDays(new Date(), -days);
}

// Group orders by date for a specific product and optional location
export function groupDailySales(
  orders: SalesOrderItem[], 
  options: { productId: string; locationId?: string }
): Map<string, number> {
  const dailySales = new Map<string, number>();
  
  for (const order of orders) {
    // Filter by product
    if (order.productId !== options.productId) continue;
    
    // Filter by location if specified
    if (options.locationId && order.locationId !== options.locationId) continue;
    
    const orderDate = formatDate(new Date(order.createdAt));
    const currentQty = dailySales.get(orderDate) || 0;
    dailySales.set(orderDate, currentQty + order.qty);
  }
  
  return dailySales;
}

// Convert daily sales map to array and fill missing days with zeros
export function fillMissingDays(dailySalesMap: Map<string, number>, startDate: Date, endDate: Date): DailySales[] {
  const result: DailySales[] = [];
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const dateStr = formatDate(current);
    const qty = dailySalesMap.get(dateStr) || 0;
    result.push({ date: dateStr, qty });
    current.setDate(current.getDate() + 1);
  }
  
  return result;
}

// Moving average forecast
export function movingAvg(series: DailySales[], window: number = 28): ForecastResult {
  if (series.length === 0) {
    return { daily: [], avgDaily: 0, peakDaily: 0 };
  }
  
  // Calculate moving average from the last 'window' days
  const recentData = series.slice(-window);
  const totalQty = recentData.reduce((sum, day) => sum + day.qty, 0);
  const avgDaily = totalQty / window;
  
  // Peak daily is the maximum from the last 60 days (or available data)
  const peakWindow = Math.min(60, series.length);
  const peakData = series.slice(-peakWindow);
  const peakDaily = Math.max(...peakData.map(day => day.qty));
  
  // For forecast, use the average daily as the prediction for all future days
  const forecast: DailySales[] = [];
  const today = new Date();
  
  // Generate 30 days of forecast (can be extended)
  for (let i = 1; i <= 30; i++) {
    const futureDate = addDays(today, i);
    forecast.push({
      date: formatDate(futureDate),
      qty: Math.round(avgDaily * 10) / 10 // Round to 1 decimal
    });
  }
  
  return {
    daily: forecast,
    avgDaily: Math.round(avgDaily * 10) / 10,
    peakDaily
  };
}

// Exponential Weighted Moving Average (EWMA) forecast
export function ewma(series: DailySales[], alpha: number = 0.35): ForecastResult {
  if (series.length === 0) {
    return { daily: [], avgDaily: 0, peakDaily: 0 };
  }
  
  // Calculate EWMA smoothed values
  let smoothedValue = series[0].qty; // Start with first value
  
  for (let i = 1; i < series.length; i++) {
    smoothedValue = alpha * series[i].qty + (1 - alpha) * smoothedValue;
  }
  
  const avgDaily = smoothedValue;
  
  // Peak daily from last 60 days
  const peakWindow = Math.min(60, series.length);
  const peakData = series.slice(-peakWindow);
  const peakDaily = Math.max(...peakData.map(day => day.qty));
  
  // Generate forecast using the last smoothed value
  const forecast: DailySales[] = [];
  const today = new Date();
  
  for (let i = 1; i <= 30; i++) {
    const futureDate = addDays(today, i);
    forecast.push({
      date: formatDate(futureDate),
      qty: Math.round(avgDaily * 10) / 10
    });
  }
  
  return {
    daily: forecast,
    avgDaily: Math.round(avgDaily * 10) / 10,
    peakDaily
  };
}

// Calculate reorder suggestions based on forecast and inventory
export function calcSuggestion(params: {
  onHand: number;
  safetyStock: number;
  avgDaily: number;
  leadTimeDays: number;
  reorderQty?: number;
}): DemandSuggestion {
  const { onHand, safetyStock, avgDaily, leadTimeDays, reorderQty } = params;
  
  // Ensure minimum daily demand of 1
  const daily = Math.max(1, avgDaily);
  
  // Calculate how many days the current stock will last (excluding safety stock)
  const coverDays = Math.max(0, (onHand - safetyStock) / daily);
  
  // Calculate when to reorder: current cover days minus lead time
  const daysUntilReorder = Math.max(0, Math.floor(coverDays) - leadTimeDays);
  const nextReorderDate = formatDate(addDays(new Date(), daysUntilReorder));
  
  // Calculate suggested order quantity
  // Formula: (lead time + buffer period) * daily demand + safety stock - current on hand
  const bufferDays = 14; // 2 week buffer
  const totalNeed = (leadTimeDays + bufferDays) * daily + safetyStock;
  const rawSuggestedQty = totalNeed - onHand;
  
  // Use reorder quantity as minimum if specified
  const minQty = reorderQty || 0;
  const suggestedQty = Math.max(0, Math.max(minQty, Math.ceil(rawSuggestedQty)));
  
  return {
    onHand,
    safetyStock,
    avgDaily: daily,
    leadTimeDays,
    reorderQty,
    coverDays: Math.round(coverDays * 10) / 10,
    nextReorderDate,
    suggestedQty
  };
}

// Get forecast for a specific horizon (30/60/90 days)
export function getForecastForHorizon(
  orders: SalesOrderItem[],
  productId: string,
  locationId: string | undefined,
  horizon: ForecastHorizon,
  method: ForecastMethod,
  minHistoryDays: number = 30
): ForecastResult {
  // Get historical sales data
  const dailySalesMap = groupDailySales(orders, { productId, locationId });
  
  // Determine how much history to use
  const historyDays = Math.max(minHistoryDays, parseInt(horizon) + 30);
  const startDate = getDaysAgo(historyDays);
  const endDate = getDaysAgo(1); // Up to yesterday
  
  // Fill missing days with zeros
  const series = fillMissingDays(dailySalesMap, startDate, endDate);
  
  // Handle sparse history - fall back to 7-day average if insufficient data
  if (series.length < minHistoryDays) {
    const recentDays = Math.min(7, series.length);
    const recentSeries = series.slice(-recentDays);
    return movingAvg(recentSeries, recentDays);
  }
  
  // Apply the requested forecasting method
  switch (method) {
    case "ewma":
      return ewma(series);
    case "moving_avg":
    default:
      return movingAvg(series);
  }
}

// Seasonality adjustment (V1++ - basic implementation)
export function seasonalityAdjust(
  series: DailySales[], 
  pattern: "weekly" | "monthly" = "weekly"
): number[] {
  if (pattern === "weekly") {
    // Calculate average for each day of week
    const weeklyFactors = new Array(7).fill(0);
    const weeklyCounts = new Array(7).fill(0);
    
    for (const day of series) {
      const date = new Date(day.date);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
      weeklyFactors[dayOfWeek] += day.qty;
      weeklyCounts[dayOfWeek]++;
    }
    
    // Calculate factors relative to overall average
    const overallAvg = series.reduce((sum, day) => sum + day.qty, 0) / series.length;
    
    return weeklyFactors.map((total, index) => {
      const count = weeklyCounts[index];
      if (count === 0) return 1.0;
      const dayAvg = total / count;
      return overallAvg > 0 ? dayAvg / overallAvg : 1.0;
    });
  }
  
  // Monthly seasonality - simplified implementation
  return new Array(12).fill(1.0);
}

// Generate forecast cache key
export function getForecastCacheKey(
  productId: string, 
  locationId: string | undefined, 
  horizon: ForecastHorizon, 
  method: ForecastMethod
): string {
  const location = locationId || "all";
  return `forecast:${productId}:${location}:${horizon}:${method}`;
}

// Check if forecast is stale and needs recomputation
export function isForecastStale(timestamp: string, maxAgeHours: number = 24): boolean {
  const forecastTime = new Date(timestamp);
  const now = new Date();
  const ageHours = (now.getTime() - forecastTime.getTime()) / (1000 * 60 * 60);
  return ageHours > maxAgeHours;
}