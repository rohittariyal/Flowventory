import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, TrendingUp, AlertTriangle, Package, ShoppingCart, Filter, FileText } from "lucide-react";
import { getAllProducts } from "@/data/seedProductData";
import { getForecastForHorizon, calcSuggestion } from "@/utils/forecasting";
import { getSalesOrders } from "@/utils/forecastStorage";

interface ForecastSummary {
  productId: string;
  sku: string;
  name: string;
  location: string;
  currentStock: number;
  forecastDemand30: number;
  forecastDemand60: number;
  forecastDemand90: number;
  suggestedQty: number;
  daysLeft: number;
  riskLevel: "low" | "medium" | "high";
  avgDailySales: number;
}

export default function ForecastsPage() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedHorizon, setSelectedHorizon] = useState("30");
  const [riskFilter, setRiskFilter] = useState("all");

  // Get all products and generate forecast summaries
  const forecastSummaries = useMemo(() => {
    const products = getAllProducts();
    const summaries: ForecastSummary[] = [];

    products.forEach(product => {
      const locations = selectedLocation === "all" 
        ? ["main"] // Simplified to main warehouse for now
        : [selectedLocation];

      locations.forEach(location => {
        // Get stock for this location
        const currentStock = product.stock || 0;
        
        // Generate forecast data
        const allOrders = getSalesOrders();
        const forecastData = getForecastForHorizon(
          allOrders,
          product.id,
          location === "main" ? undefined : location,
          "30",
          "moving_avg"
        );
        
        // Calculate metrics
        const avgDailySales = forecastData.avgDaily;
        const forecastDemand30 = forecastData.daily.reduce((sum: number, day: any) => sum + day.qty, 0);
        const forecastDemand60 = forecastData.daily.slice(0, 60).reduce((sum: number, day: any) => sum + day.qty, 0);
        const forecastDemand90 = forecastData.daily.slice(0, 90).reduce((sum: number, day: any) => sum + day.qty, 0);
        
        const daysLeft = avgDailySales > 0 ? Math.floor(currentStock / avgDailySales) : 999;
        
        // Determine risk level
        let riskLevel: "low" | "medium" | "high" = "low";
        if (daysLeft < 7) riskLevel = "high";
        else if (daysLeft < 14) riskLevel = "medium";

        // Calculate reorder suggestion
        const suggestion = calcSuggestion({
          onHand: currentStock,
          safetyStock: 50, // Default safety stock
          avgDaily: avgDailySales,
          leadTimeDays: 14, // Default lead time
          reorderQty: 100 // Default reorder quantity
        });

        summaries.push({
          productId: product.id,
          sku: product.sku,
          name: product.name,
          location: location === "main" ? "Main Warehouse" : location,
          currentStock,
          forecastDemand30,
          forecastDemand60,
          forecastDemand90,
          suggestedQty: suggestion.suggestedQty,
          daysLeft,
          riskLevel,
          avgDailySales
        });
      });
    });

    return summaries;
  }, [selectedLocation]);

  // Filter summaries based on search and filters
  const filteredSummaries = useMemo(() => {
    return forecastSummaries.filter(summary => {
      const matchesSearch = summary.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           summary.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRisk = riskFilter === "all" || summary.riskLevel === riskFilter;
      return matchesSearch && matchesRisk;
    });
  }, [forecastSummaries, searchTerm, riskFilter]);

  // Calculate overview stats
  const overviewStats = useMemo(() => {
    const totalItems = filteredSummaries.length;
    const itemsNeedingRestock = filteredSummaries.filter(s => s.suggestedQty > 0).length;
    const highRiskItems = filteredSummaries.filter(s => s.riskLevel === "high").length;
    const totalSuggestedQty = filteredSummaries.reduce((sum, s) => sum + s.suggestedQty, 0);

    return {
      totalItems,
      itemsNeedingRestock,
      highRiskItems,
      totalSuggestedQty
    };
  }, [filteredSummaries]);

  const handleCreateBulkPOs = () => {
    const itemsWithSuggestions = filteredSummaries.filter(s => s.suggestedQty > 0);
    console.log("Creating bulk POs for", itemsWithSuggestions.length, "items");
    // This would integrate with the existing PO creation flow
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case "high": return "bg-red-600 text-white";
      case "medium": return "bg-yellow-600 text-white";
      default: return "bg-green-600 text-white";
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/")}
          className="text-zinc-400 hover:text-white"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white" data-testid="text-page-title">
            Demand Forecasting
          </h1>
          <p className="text-zinc-400 mt-1" data-testid="text-page-description">
            AI-powered demand forecasting and restock recommendations
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm" data-testid="text-total-items-label">Total Items</p>
                <p className="text-2xl font-bold text-white" data-testid="text-total-items-value">
                  {overviewStats.totalItems}
                </p>
              </div>
              <Package className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm" data-testid="text-restock-needed-label">Need Restock</p>
                <p className="text-2xl font-bold text-yellow-400" data-testid="text-restock-needed-value">
                  {overviewStats.itemsNeedingRestock}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm" data-testid="text-high-risk-label">High Risk</p>
                <p className="text-2xl font-bold text-red-400" data-testid="text-high-risk-value">
                  {overviewStats.highRiskItems}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm" data-testid="text-suggested-units-label">Suggested Units</p>
                <p className="text-2xl font-bold text-green-400" data-testid="text-suggested-units-value">
                  {overviewStats.totalSuggestedQty.toLocaleString()}
                </p>
              </div>
              <ShoppingCart className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Filter className="h-5 w-5" />
            Filters & Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Search</label>
              <Input
                placeholder="Search by SKU or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
                data-testid="input-search"
              />
            </div>
            
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Location</label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white" data-testid="select-location">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="main">Main Warehouse</SelectItem>
                  <SelectItem value="uk">UK Warehouse</SelectItem>
                  <SelectItem value="eu">EU Warehouse</SelectItem>
                  <SelectItem value="us">US Warehouse</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Risk Level</label>
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white" data-testid="select-risk">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  <SelectItem value="all">All Risk Levels</SelectItem>
                  <SelectItem value="high">High Risk</SelectItem>
                  <SelectItem value="medium">Medium Risk</SelectItem>
                  <SelectItem value="low">Low Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={handleCreateBulkPOs}
                className="bg-green-600 hover:bg-green-700 text-white w-full"
                disabled={overviewStats.itemsNeedingRestock === 0}
                data-testid="button-create-bulk-pos"
              >
                <FileText className="h-4 w-4 mr-2" />
                Create POs ({overviewStats.itemsNeedingRestock})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Forecast Table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Forecast Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800">
                  <TableHead className="text-zinc-400">SKU</TableHead>
                  <TableHead className="text-zinc-400">Product</TableHead>
                  <TableHead className="text-zinc-400">Location</TableHead>
                  <TableHead className="text-zinc-400">Current Stock</TableHead>
                  <TableHead className="text-zinc-400">Avg Daily Sales</TableHead>
                  <TableHead className="text-zinc-400">30d Forecast</TableHead>
                  <TableHead className="text-zinc-400">Days Left</TableHead>
                  <TableHead className="text-zinc-400">Risk</TableHead>
                  <TableHead className="text-zinc-400">Suggested Qty</TableHead>
                  <TableHead className="text-zinc-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSummaries.map((summary, index) => (
                  <TableRow key={`${summary.productId}-${summary.location}`} className="border-zinc-800">
                    <TableCell className="text-white font-mono" data-testid={`text-sku-${index}`}>
                      {summary.sku}
                    </TableCell>
                    <TableCell className="text-white" data-testid={`text-name-${index}`}>
                      {summary.name}
                    </TableCell>
                    <TableCell className="text-zinc-400" data-testid={`text-location-${index}`}>
                      {summary.location}
                    </TableCell>
                    <TableCell className="text-white" data-testid={`text-stock-${index}`}>
                      {summary.currentStock.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-zinc-400" data-testid={`text-daily-sales-${index}`}>
                      {summary.avgDailySales.toFixed(1)}
                    </TableCell>
                    <TableCell className="text-green-400" data-testid={`text-forecast-${index}`}>
                      {summary.forecastDemand30.toFixed(0)}
                    </TableCell>
                    <TableCell className="text-white" data-testid={`text-days-left-${index}`}>
                      {summary.daysLeft === 999 ? "∞" : summary.daysLeft}
                    </TableCell>
                    <TableCell data-testid={`text-risk-${index}`}>
                      <Badge className={getRiskBadgeColor(summary.riskLevel)}>
                        {summary.riskLevel.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-yellow-400" data-testid={`text-suggested-${index}`}>
                      {summary.suggestedQty > 0 ? summary.suggestedQty.toLocaleString() : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-green-400 border-green-400 hover:bg-green-400 hover:text-black"
                          onClick={() => setLocation(`/product/${summary.sku}`)}
                          data-testid={`button-view-details-${index}`}
                        >
                          View Details
                        </Button>
                        {summary.suggestedQty > 0 && (
                          <Button 
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => console.log("Create PO for", summary.sku)}
                            data-testid={`button-create-po-${index}`}
                          >
                            Create PO
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredSummaries.length === 0 && (
              <div className="text-center py-8 text-zinc-400" data-testid="text-no-results">
                No forecast data found matching your filters.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}