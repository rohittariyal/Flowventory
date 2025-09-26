import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, Package, Calendar, AlertTriangle, MapPin, BarChart3, ShoppingCart } from "lucide-react";
import { CreatePOModal } from "@/components/CreatePOModal";
import type { Product } from "@/data/seedProductData";
import type { 
  ForecastHorizon, 
  ForecastMethod, 
  ForecastData, 
  DemandSuggestion,
  ForecastStatus
} from "@shared/schema";
import { 
  getForecastForHorizon, 
  calcSuggestion, 
  formatDate, 
  addDays 
} from "@/utils/forecasting";
import {
  getForecastSettings,
  getSalesOrders,
  getForecastFromCache,
  addForecastToCache,
  getProductSalesHistory,
  getOrRefreshForecast,
  startAutoRefresh,
  prewarmCache,
  getCacheRefreshSettings
} from "@/utils/forecastStorage";
import { getLocations, getLocationInventory } from "@/utils/warehouse";

interface ForecastTabProps {
  product: Product;
  onProductUpdate?: (product: Product) => void;
}

export function ForecastTab({ product, onProductUpdate }: ForecastTabProps) {
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedHorizon, setSelectedHorizon] = useState<ForecastHorizon>("30");
  const [selectedMethod, setSelectedMethod] = useState<ForecastMethod>("moving_avg");
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [demandSuggestion, setDemandSuggestion] = useState<DemandSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [createPOModalOpen, setCreatePOModalOpen] = useState(false);

  // Get available locations
  const locations = getLocations();
  const forecastSettings = getForecastSettings();

  // Initialize method from settings
  useEffect(() => {
    setSelectedMethod(forecastSettings.defaultMethod);
  }, [forecastSettings.defaultMethod]);

  // Compute forecast when parameters change
  useEffect(() => {
    computeForecast();
  }, [product.id, selectedLocation, selectedHorizon, selectedMethod]);

  const computeForecast = async () => {
    setLoading(true);
    try {
      const locationId = selectedLocation === "all" ? undefined : selectedLocation;
      
      // Use enhanced caching with auto-refresh
      const forecast = await getOrRefreshForecast(
        product.id,
        locationId,
        selectedHorizon,
        selectedMethod,
        async (productId, locId, horizon, method) => {
          // Refresh callback - compute new forecast
          const orders = getSalesOrders();
          const result = getForecastForHorizon(
            orders,
            productId,
            locId,
            horizon,
            method,
            forecastSettings.minHistoryDays
          );

          // Create forecast data object
          return {
            productId,
            locationId: locId,
            horizon,
            method,
            ts: new Date().toISOString(),
            result
          };
        }
      );

      if (forecast) {
        setForecastData(forecast);
        computeDemandSuggestion(forecast);
      } else {
        console.warn("No forecast data available");
      }
    } catch (error) {
      console.error("Error computing forecast:", error);
    } finally {
      setLoading(false);
    }
  };

  const computeDemandSuggestion = (forecast: ForecastData) => {
    try {
      // Get current inventory for the location
      const inventory = getLocationInventory();
      let onHand = 0;
      let safetyStock = 0;
      let leadTimeDays = 7; // Default lead time
      let reorderQty = 0;

      if (forecast.locationId) {
        // Specific location
        const locationInv = inventory.find(
          inv => inv.productId === product.id && inv.locationId === forecast.locationId
        );
        onHand = locationInv?.onHand || 0;
        safetyStock = locationInv?.safetyStock || 0;
        reorderQty = locationInv?.reorderQty || 0;
      } else {
        // All locations combined
        const productInventory = inventory.filter(inv => inv.productId === product.id);
        onHand = productInventory.reduce((sum, inv) => sum + inv.onHand, 0);
        safetyStock = Math.max(...productInventory.map(inv => inv.safetyStock), 0);
        reorderQty = Math.max(...productInventory.map(inv => inv.reorderQty), 0);
      }

      // If no warehouse data, fall back to product data
      if (onHand === 0 && product.stock) {
        onHand = product.stock;
      }

      const suggestion = calcSuggestion({
        onHand,
        safetyStock,
        avgDaily: forecast.result.avgDaily,
        leadTimeDays,
        reorderQty
      });

      setDemandSuggestion(suggestion);
    } catch (error) {
      console.error("Error computing demand suggestion:", error);
    }
  };

  // Initialize auto-refresh system on component mount
  useEffect(() => {
    const refreshCallback = async (productId: string, locationId: string | undefined, horizon: ForecastHorizon, method: ForecastMethod) => {
      const orders = getSalesOrders();
      const result = getForecastForHorizon(
        orders,
        productId,
        locationId,
        horizon,
        method,
        forecastSettings.minHistoryDays
      );

      return {
        productId,
        locationId,
        horizon,
        method,
        ts: new Date().toISOString(),
        result
      };
    };

    // Start auto-refresh for this session
    startAutoRefresh(refreshCallback);

    // Cleanup on unmount
    return () => {
      // Auto-refresh will be cleaned up when the application unmounts
    };
  }, [forecastSettings.minHistoryDays]);

  const getForecastStatus = (): ForecastStatus => {
    if (!demandSuggestion) return "healthy";
    
    if (demandSuggestion.coverDays <= demandSuggestion.leadTimeDays) {
      return "critical";
    }
    if (demandSuggestion.suggestedQty > 0) {
      return "action_needed";
    }
    return "healthy";
  };

  const getStatusColor = (status: ForecastStatus) => {
    switch (status) {
      case "critical":
        return "text-red-400 bg-red-500/20 border-red-500/30";
      case "action_needed":
        return "text-yellow-400 bg-yellow-500/20 border-yellow-500/30";
      default:
        return "text-green-400 bg-green-500/20 border-green-500/30";
    }
  };

  const handleCreatePO = () => {
    if (!demandSuggestion || !forecastData) return;
    
    // Open the Create PO modal with forecast data pre-filled
    setCreatePOModalOpen(true);
  };

  const prepareForecastData = () => {
    if (!demandSuggestion || !forecastData) return undefined;
    
    return {
      sku: product.sku,
      productName: product.name,
      suggestedQty: demandSuggestion.suggestedQty,
      avgDailySales: demandSuggestion.avgDaily,
      daysLeft: Math.floor(demandSuggestion.coverDays),
      forecastDemand: forecastData.result.totalDemand,
      nextReorderDate: demandSuggestion.nextReorderDate,
      currentStock: demandSuggestion.onHand
    };
  };

  const chartData = useMemo(() => {
    if (!forecastData) return null;

    // Get historical data for comparison
    const historicalOrders = getProductSalesHistory(
      product.id,
      selectedLocation === "all" ? undefined : selectedLocation,
      60 // Last 60 days
    );

    // Group by date
    const historicalByDate = new Map<string, number>();
    historicalOrders.forEach(order => {
      const date = formatDate(new Date(order.createdAt));
      historicalByDate.set(date, (historicalByDate.get(date) || 0) + order.qty);
    });

    // Create chart data combining historical and forecast
    const chartPoints: Array<{
      date: string;
      historical: number | null;
      forecast: number | null;
      type: "historical" | "forecast";
    }> = [];
    
    // Add historical data (last 30 days)
    for (let i = 30; i >= 1; i--) {
      const date = addDays(new Date(), -i);
      const dateStr = formatDate(date);
      chartPoints.push({
        date: dateStr,
        historical: historicalByDate.get(dateStr) || 0,
        forecast: null,
        type: "historical"
      });
    }

    // Add forecast data (next horizon days)
    const horizonDays = parseInt(selectedHorizon);
    forecastData.result.daily.slice(0, horizonDays).forEach(point => {
      chartPoints.push({
        date: point.date,
        historical: null,
        forecast: point.qty,
        type: "forecast"
      });
    });

    return chartPoints;
  }, [forecastData, product.id, selectedLocation, selectedHorizon]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-green-400" />
            Demand Forecast Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Location</label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map(location => (
                    <SelectItem key={location.id} value={location.id}>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {location.name} ({location.regionId})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Forecast Horizon</label>
              <Select value={selectedHorizon} onValueChange={(value: ForecastHorizon) => setSelectedHorizon(value)}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 Days</SelectItem>
                  <SelectItem value="60">60 Days</SelectItem>
                  <SelectItem value="90">90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Method</label>
              <Select value={selectedMethod} onValueChange={(value: ForecastMethod) => setSelectedMethod(value)}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="moving_avg">Moving Average</SelectItem>
                  <SelectItem value="ewma">Exponential Smoothing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Tiles */}
      {forecastData && demandSuggestion && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-zinc-950 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-zinc-400">Avg Daily Demand</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {forecastData.result.avgDaily.toFixed(1)}
              </div>
              <div className="text-xs text-zinc-500">units/day</div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-zinc-400">Peak Daily</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {forecastData.result.peakDaily}
              </div>
              <div className="text-xs text-zinc-500">units (last 60d)</div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-green-400" />
                <span className="text-sm text-zinc-400">Days Cover</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {demandSuggestion.coverDays.toFixed(1)}
              </div>
              <div className="text-xs text-zinc-500">days remaining</div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-950 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-zinc-400">Suggested Qty</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {demandSuggestion.suggestedQty}
              </div>
              <div className="text-xs text-zinc-500">units to order</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Forecast Status & Actions */}
      {demandSuggestion && (
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <span>Reorder Recommendation</span>
              <Badge 
                variant="outline" 
                className={`${getStatusColor(getForecastStatus())} border`}
              >
                {getForecastStatus().replace('_', ' ')}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-zinc-400">Current On-Hand</p>
                  <p className="text-lg font-medium text-white">{demandSuggestion.onHand} units</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Safety Stock</p>
                  <p className="text-lg font-medium text-white">{demandSuggestion.safetyStock} units</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Lead Time</p>
                  <p className="text-lg font-medium text-white">{demandSuggestion.leadTimeDays} days</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-zinc-400">Next Reorder Date</p>
                  <p className="text-lg font-medium text-white">
                    {new Date(demandSuggestion.nextReorderDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400">Suggested Order Quantity</p>
                  <p className="text-lg font-medium text-green-400">{demandSuggestion.suggestedQty} units</p>
                </div>
                
                {demandSuggestion.suggestedQty > 0 && (
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={handleCreatePO}
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Create Purchase Order
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Simple Chart Visualization */}
      {chartData && (
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Demand Forecast Chart</CardTitle>
            <p className="text-sm text-zinc-400">
              Historical demand vs predicted demand for next {selectedHorizon} days
            </p>
          </CardHeader>
          <CardContent>
            {/* Simple text-based chart for now - can be enhanced with actual charting library */}
            <div className="space-y-2">
              <div className="text-sm text-zinc-400 mb-4">
                Recent historical data shows average {forecastData?.result.avgDaily.toFixed(1)} units/day, 
                with peak of {forecastData?.result.peakDaily} units/day
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-white font-medium mb-2">Historical (Last 7 days)</h4>
                  <div className="space-y-1">
                    {chartData.slice(-7).filter(p => p.type === "historical").map((point, index) => (
                      <div key={index} className="flex justify-between">
                        <span className="text-zinc-400">{new Date(point.date).toLocaleDateString()}</span>
                        <span className="text-white">{point.historical} units</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-white font-medium mb-2">Forecast (Next 7 days)</h4>
                  <div className="space-y-1">
                    {chartData.filter(p => p.type === "forecast").slice(0, 7).map((point, index) => (
                      <div key={index} className="flex justify-between">
                        <span className="text-zinc-400">{new Date(point.date).toLocaleDateString()}</span>
                        <span className="text-green-400">{point.forecast?.toFixed(1) || '0.0'} units</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-zinc-400 mt-2">Computing forecast...</p>
        </div>
      )}

      {/* Create PO Modal */}
      <CreatePOModal
        isOpen={createPOModalOpen}
        onClose={() => setCreatePOModalOpen(false)}
        forecastData={prepareForecastData()}
        onSuccess={() => {
          // Optionally refresh forecast data or show success message
          console.log("PO created successfully from forecast suggestion");
        }}
      />
    </div>
  );
}