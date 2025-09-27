import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, 
  ShoppingCart, 
  Users, 
  Truck, 
  CreditCard, 
  AlertCircle,
  Plus,
  Send,
  ArrowRight,
  ExternalLink
} from "lucide-react";

export interface InsightAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "destructive";
  icon?: React.ReactNode;
}

export interface Insight {
  id: string;
  category: "stock" | "supplier" | "logistics" | "finance" | "forecast";
  severity: "critical" | "high" | "medium" | "info";
  title: string;
  why: string;
  actions: InsightAction[];
  dataSource: string;
  magnitude?: number; // For sorting within severity
  locationId?: string;
  regionId?: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  stock: number;
  velocity: number;
  reorderPoint: number;
  location: string;
  supplier: string;
  daysLeft: number;
  shelfLifeDays?: number;
  isBatchTracked?: boolean;
  regionId?: string;
}

interface LocationInventory {
  id: string;
  productId: string;
  locationId: string;
  onHand: number;
  safetyStock: number;
  reorderPoint: number;
  reorderQty: number;
}

interface Order {
  id: string;
  createdAt: string;
  items: Array<{
    productId: string;
    qty: number;
  }>;
  locationId?: string;
  regionId?: string;
}

interface Shipment {
  id: string;
  status: string;
  createdAt: string;
  provider: string;
  trackingNumber?: string;
  estimatedDays?: number;
}

interface Supplier {
  id: string;
  name: string;
  leadTimeDays: number;
  onTimeRatePct: number;
  region: string;
  avgLeadTimeDays?: number;
}

interface Invoice {
  id: string;
  status: string;
  dueDate: string;
  customerId: string;
  grandTotal: number;
  currency: string;
  regionId?: string;
}

interface ForecastData {
  productId: string;
  locationId: string;
  result: {
    avgDaily: number;
    suggestedQty?: number;
  };
}

interface StockMove {
  id: string;
  productId: string;
  locationId: string;
  createdAt: string;
  type: "PICK" | "RECEIVE" | "TRANSFER" | "ADJUSTMENT";
}

interface Location {
  id: string;
  name: string;
  regionId: string;
}

export function useInsights() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Load data from localStorage
  const loadData = useMemo(() => {
    return {
      products: JSON.parse(localStorage.getItem("flowventory:products") || "[]") as Product[],
      inventory: JSON.parse(localStorage.getItem("flowventory:inventory") || "[]") as LocationInventory[],
      orders: JSON.parse(localStorage.getItem("flowventory:orders") || "[]") as Order[],
      shipments: JSON.parse(localStorage.getItem("flowventory:shipments") || "[]") as Shipment[],
      suppliers: JSON.parse(localStorage.getItem("flowventory:suppliers") || "[]") as Supplier[],
      invoices: JSON.parse(localStorage.getItem("flowventory:invoices") || "[]") as Invoice[],
      forecast: JSON.parse(localStorage.getItem("flowventory:forecast") || "[]") as ForecastData[],
      moves: JSON.parse(localStorage.getItem("flowventory:moves") || "[]") as StockMove[],
      locations: JSON.parse(localStorage.getItem("flowventory:locations") || "[]") as Location[]
    };
  }, []);

  // Helper functions
  const calculateCoverDays = (onHand: number, safetyStock: number, avgDaily: number): number => {
    const daily = Math.max(1, avgDaily || 0);
    return (onHand - safetyStock) / daily;
  };

  const findLocationName = (locationId: string): string => {
    return loadData.locations.find(loc => loc.id === locationId)?.name || locationId;
  };

  const findProductName = (productId: string): string => {
    return loadData.products.find(p => p.id === productId)?.name || productId;
  };

  const getSuggestedPOQty = (productId: string, locationId: string, deficit: number): number => {
    const forecastEntry = loadData.forecast.find(f => f.productId === productId && f.locationId === locationId);
    if (forecastEntry?.result.suggestedQty) {
      return forecastEntry.result.suggestedQty;
    }
    
    const inventory = loadData.inventory.find(i => i.productId === productId && i.locationId === locationId);
    const avgDaily = forecastEntry?.result.avgDaily || 1;
    const leadTimeDays = 14; // default
    const safetyStock = inventory?.safetyStock || 0;
    const onHand = inventory?.onHand || 0;
    
    return Math.max(1, Math.ceil((leadTimeDays + 14) * avgDaily + safetyStock - onHand));
  };

  const findSurplusLocations = (productId: string, need: number): Array<{locationId: string, surplus: number}> => {
    return loadData.inventory
      .filter(inv => inv.productId === productId)
      .map(inv => ({
        locationId: inv.locationId,
        surplus: Math.max(0, inv.onHand - inv.safetyStock)
      }))
      .filter(item => item.surplus > 0)
      .slice(0, 3); // Top 3 surplus locations
  };

  // Heuristic: Low Cover Risk
  const generateLowCoverRiskInsights = (): Insight[] => {
    const insights: Insight[] = [];
    
    loadData.inventory.forEach(inv => {
      const forecastEntry = loadData.forecast.find(f => f.productId === inv.productId && f.locationId === inv.locationId);
      const avgDaily = forecastEntry?.result.avgDaily || 1;
      const product = loadData.products.find(p => p.id === inv.productId);
      const location = loadData.locations.find(loc => loc.id === inv.locationId);
      const leadTimeDays = 14; // default lead time
      
      const coverDays = calculateCoverDays(inv.onHand, inv.safetyStock, avgDaily);
      
      if (coverDays < leadTimeDays) {
        const severity = coverDays <= 0 ? "critical" : coverDays < 5 ? "high" : "medium";
        const magnitude = leadTimeDays - coverDays;
        
        insights.push({
          id: `low-cover-${inv.productId}-${inv.locationId}`,
          category: "stock",
          severity: severity as "critical" | "high" | "medium",
          title: `Reorder soon: ${product?.sku || inv.productId} (${findLocationName(inv.locationId)})`,
          why: `Cover ${coverDays.toFixed(1)}d < lead time ${leadTimeDays}d; avg daily ${avgDaily.toFixed(1)}; on-hand ${inv.onHand}; safety ${inv.safetyStock}`,
          dataSource: "Forecast / Inventory",
          magnitude,
          locationId: inv.locationId,
          regionId: location?.regionId,
          actions: [
            {
              label: `Create PO (suggest ${getSuggestedPOQty(inv.productId, inv.locationId, magnitude)})`,
              icon: <Plus className="mr-1 h-3 w-3" />,
              onClick: () => {
                toast({ title: "Create Purchase Order", description: "Opening PO flow..." });
                setLocation("/purchase-orders");
              }
            },
            {
              label: "Nudge Supplier",
              icon: <Send className="mr-1 h-3 w-3" />,
              variant: "outline",
              onClick: () => {
                toast({ title: "Supplier Communication", description: "Opening supplier contact..." });
                setLocation("/suppliers");
              }
            }
          ]
        });
      }
    });
    
    return insights;
  };

  // Heuristic: Stagnant Stock
  const generateStagnantStockInsights = (): Insight[] => {
    const insights: Insight[] = [];
    const daysSinceThreshold = 45;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceThreshold);
    
    loadData.inventory.forEach(inv => {
      if (inv.onHand <= inv.safetyStock) return;
      
      // Check if there have been recent picks/orders for this SKU
      const recentMoves = loadData.moves.filter(move => 
        move.productId === inv.productId && 
        move.locationId === inv.locationId &&
        move.type === "PICK" &&
        new Date(move.createdAt) > cutoffDate
      );
      
      const recentOrders = loadData.orders.filter(order => 
        new Date(order.createdAt) > cutoffDate &&
        order.items.some(item => item.productId === inv.productId)
      );
      
      if (recentMoves.length === 0 && recentOrders.length === 0) {
        const product = loadData.products.find(p => p.id === inv.productId);
        const location = loadData.locations.find(loc => loc.id === inv.locationId);
        const excessStock = inv.onHand - inv.safetyStock;
        
        insights.push({
          id: `stagnant-${inv.productId}-${inv.locationId}`,
          category: "stock", 
          severity: excessStock > 100 ? "high" : "medium",
          title: `Stagnant stock: ${product?.sku || inv.productId} (${findLocationName(inv.locationId)})`,
          why: `No picks/orders for ${daysSinceThreshold} days; excess ${excessStock} units above safety stock`,
          dataSource: "Inventory / Orders",
          magnitude: excessStock,
          locationId: inv.locationId,
          regionId: location?.regionId,
          actions: [
            {
              label: "Create Transfer",
              icon: <ArrowRight className="mr-1 h-3 w-3" />,
              onClick: () => {
                toast({ title: "Create Transfer", description: "Opening transfer flow..." });
                setLocation("/inventory");
              }
            },
            {
              label: "View Product",
              icon: <Package className="mr-1 h-3 w-3" />,
              variant: "outline",
              onClick: () => {
                setLocation(`/products/${inv.productId}`);
              }
            }
          ]
        });
      }
    });
    
    return insights;
  };

  // Heuristic: Supplier At-Risk
  const generateSupplierRiskInsights = (): Insight[] => {
    const insights: Insight[] = [];
    
    loadData.suppliers.forEach(supplier => {
      if (supplier.onTimeRatePct < 85) {
        const severity = supplier.onTimeRatePct < 60 ? "critical" : supplier.onTimeRatePct < 75 ? "high" : "medium";
        
        insights.push({
          id: `supplier-risk-${supplier.id}`,
          category: "supplier",
          severity: severity as "critical" | "high" | "medium",
          title: `At-risk supplier: ${supplier.name}`,
          why: `On-time rate ${supplier.onTimeRatePct.toFixed(1)}% < 85% target; avg lead time ${supplier.avgLeadTimeDays || supplier.leadTimeDays}d`,
          dataSource: "Suppliers",
          magnitude: 85 - supplier.onTimeRatePct,
          regionId: supplier.region,
          actions: [
            {
              label: "Contact Supplier",
              icon: <Send className="mr-1 h-3 w-3" />,
              onClick: () => {
                toast({ title: "Supplier Contact", description: "Opening supplier details..." });
                setLocation("/suppliers");
              }
            },
            {
              label: "Find Alternative",
              icon: <Users className="mr-1 h-3 w-3" />,
              variant: "outline", 
              onClick: () => {
                toast({ title: "Alternative Suppliers", description: "Searching for alternatives..." });
                setLocation("/suppliers");
              }
            }
          ]
        });
      }
    });
    
    return insights;
  };

  // Heuristic: Late Shipments
  const generateLateShipmentInsights = (): Insight[] => {
    const insights: Insight[] = [];
    const lateThresholdDays = 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - lateThresholdDays);
    
    loadData.shipments.forEach(shipment => {
      if ((shipment.status === "IN_TRANSIT" || shipment.status === "OUT_FOR_DELIVERY") &&
          new Date(shipment.createdAt) < cutoffDate) {
        const daysLate = Math.floor((Date.now() - new Date(shipment.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        const severity = daysLate > 14 ? "critical" : daysLate > 10 ? "high" : "medium";
        
        insights.push({
          id: `late-shipment-${shipment.id}`,
          category: "logistics",
          severity: severity as "critical" | "high" | "medium", 
          title: `Late shipment: ${shipment.trackingNumber || shipment.id}`,
          why: `${daysLate} days in ${shipment.status.toLowerCase().replace('_', ' ')} via ${shipment.provider}`,
          dataSource: "Shipments",
          magnitude: daysLate,
          actions: [
            {
              label: "Track Shipment",
              icon: <Truck className="mr-1 h-3 w-3" />,
              onClick: () => {
                if (shipment.trackingNumber) {
                  window.open(`https://tracking.example.com/${shipment.trackingNumber}`, '_blank');
                } else {
                  toast({ title: "Track Shipment", description: "No tracking number available" });
                }
              }
            },
            {
              label: "Contact Carrier",
              icon: <ExternalLink className="mr-1 h-3 w-3" />,
              variant: "outline",
              onClick: () => {
                toast({ title: "Contact Carrier", description: `Contacting ${shipment.provider}...` });
              }
            }
          ]
        });
      }
    });
    
    return insights;
  };

  // Heuristic: Overdue Invoices
  const generateOverdueInvoiceInsights = (): Insight[] => {
    const insights: Insight[] = [];
    const today = new Date();
    
    loadData.invoices.forEach(invoice => {
      if (invoice.status !== "PAID" && new Date(invoice.dueDate) < today) {
        const daysOverdue = Math.floor((today.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24));
        const severity = daysOverdue > 30 ? "critical" : daysOverdue > 14 ? "high" : "medium";
        
        insights.push({
          id: `overdue-invoice-${invoice.id}`,
          category: "finance",
          severity: severity as "critical" | "high" | "medium",
          title: `Overdue invoice: ${invoice.id}`,
          why: `${daysOverdue} days overdue; ${invoice.currency} ${invoice.grandTotal.toFixed(2)} outstanding`,
          dataSource: "Invoices",
          magnitude: daysOverdue,
          regionId: invoice.regionId,
          actions: [
            {
              label: "Send Payment Link",
              icon: <CreditCard className="mr-1 h-3 w-3" />,
              onClick: () => {
                toast({ title: "Payment Link", description: "Sending payment reminder..." });
                setLocation(`/invoices/${invoice.id}`);
              }
            },
            {
              label: "Contact Customer",
              icon: <Send className="mr-1 h-3 w-3" />,
              variant: "outline",
              onClick: () => {
                toast({ title: "Customer Contact", description: "Opening customer details..." });
                setLocation("/customers");
              }
            }
          ]
        });
      }
    });
    
    return insights;
  };

  // Heuristic: Expiry Risk
  const generateExpiryRiskInsights = (): Insight[] => {
    const insights: Insight[] = [];
    const expiryThresholdDays = 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + expiryThresholdDays);
    
    // This would need batch tracking data which isn't fully implemented
    // For demo purposes, we'll use products marked as batch tracked
    loadData.products.forEach(product => {
      if (product.isBatchTracked && product.shelfLifeDays) {
        // Simulate some products nearing expiry
        const inventory = loadData.inventory.find(inv => inv.productId === product.id);
        if (inventory && inventory.onHand > 0) {
          const location = loadData.locations.find(loc => loc.id === inventory.locationId);
          
          insights.push({
            id: `expiry-risk-${product.id}-${inventory.locationId}`,
            category: "stock",
            severity: "medium",
            title: `Expiry risk: ${product.sku} (${findLocationName(inventory.locationId)})`,
            why: `${inventory.onHand} units expiring within ${expiryThresholdDays} days; shelf life ${product.shelfLifeDays} days`,
            dataSource: "Inventory / Batches", 
            magnitude: inventory.onHand,
            locationId: inventory.locationId,
            regionId: location?.regionId,
            actions: [
              {
                label: "Create Transfer",
                icon: <ArrowRight className="mr-1 h-3 w-3" />,
                onClick: () => {
                  toast({ title: "Create Transfer", description: "Moving stock to faster-moving location..." });
                  setLocation("/inventory");
                }
              },
              {
                label: "Mark Down Price",
                icon: <Package className="mr-1 h-3 w-3" />,
                variant: "outline",
                onClick: () => {
                  toast({ title: "Price Adjustment", description: "Consider promotional pricing..." });
                }
              }
            ]
          });
        }
      }
    });
    
    return insights;
  };

  // Heuristic: Forecast Surprises
  const generateForecastAnomaliesInsights = (): Insight[] => {
    const insights: Insight[] = [];
    
    // For demo purposes, simulate some forecast anomalies
    loadData.forecast.forEach(forecastEntry => {
      const recent14dAvg = forecastEntry.result.avgDaily * 1.2; // Simulate 20% higher
      const baseline60dAvg = forecastEntry.result.avgDaily;
      
      if (recent14dAvg > 1.4 * baseline60dAvg) {
        const product = loadData.products.find(p => p.id === forecastEntry.productId);
        const location = loadData.locations.find(loc => loc.id === forecastEntry.locationId);
        const spike = ((recent14dAvg / baseline60dAvg) - 1) * 100;
        
        insights.push({
          id: `forecast-spike-${forecastEntry.productId}-${forecastEntry.locationId}`,
          category: "forecast",
          severity: spike > 50 ? "high" : "medium",
          title: `Demand spike: ${product?.sku || forecastEntry.productId} (${findLocationName(forecastEntry.locationId)})`,
          why: `Recent 14d avg ${recent14dAvg.toFixed(1)} > 1.4× baseline ${baseline60dAvg.toFixed(1)} (+${spike.toFixed(1)}%)`,
          dataSource: "Forecast",
          magnitude: spike,
          locationId: forecastEntry.locationId,
          regionId: location?.regionId,
          actions: [
            {
              label: "Increase Stock",
              icon: <Plus className="mr-1 h-3 w-3" />,
              onClick: () => {
                toast({ title: "Stock Increase", description: "Consider increasing safety stock levels..." });
                setLocation("/purchase-orders");
              }
            },
            {
              label: "View Forecast",
              icon: <Package className="mr-1 h-3 w-3" />,
              variant: "outline",
              onClick: () => {
                setLocation("/forecast");
              }
            }
          ]
        });
      } else if (recent14dAvg < 0.6 * baseline60dAvg) {
        const product = loadData.products.find(p => p.id === forecastEntry.productId);
        const location = loadData.locations.find(loc => loc.id === forecastEntry.locationId);
        const drop = (1 - (recent14dAvg / baseline60dAvg)) * 100;
        
        insights.push({
          id: `forecast-drop-${forecastEntry.productId}-${forecastEntry.locationId}`,
          category: "forecast",
          severity: "info",
          title: `Demand drop: ${product?.sku || forecastEntry.productId} (${findLocationName(forecastEntry.locationId)})`,
          why: `Recent 14d avg ${recent14dAvg.toFixed(1)} < 0.6× baseline ${baseline60dAvg.toFixed(1)} (-${drop.toFixed(1)}%)`,
          dataSource: "Forecast",
          magnitude: drop,
          locationId: forecastEntry.locationId,
          regionId: location?.regionId,
          actions: [
            {
              label: "Review Stock",
              icon: <Package className="mr-1 h-3 w-3" />,
              onClick: () => {
                toast({ title: "Stock Review", description: "Consider reducing safety stock levels..." });
                setLocation("/inventory");
              }
            },
            {
              label: "View Forecast",
              icon: <Package className="mr-1 h-3 w-3" />,
              variant: "outline",
              onClick: () => {
                setLocation("/forecast");
              }
            }
          ]
        });
      }
    });
    
    return insights;
  };

  // Generate seed/dummy insights when there's little data
  const generateSeedInsights = (): Insight[] => {
    return [
      {
        id: "seed-critical-stock-1",
        category: "stock",
        severity: "critical",
        title: "Critical reorder: WIDGET-001 (London Warehouse)",
        why: "Cover 2.1d < lead time 7d; avg daily 8.3; on-hand 27; safety 10",
        dataSource: "Forecast / Inventory", 
        magnitude: 4.9,
        locationId: "loc-london",
        regionId: "region-uk",
        actions: [
          {
            label: "Create PO (suggest 75)",
            icon: <Plus className="mr-1 h-3 w-3" />,
            onClick: () => {
              toast({ title: "Create Purchase Order", description: "Opening PO flow for WIDGET-001..." });
              setLocation("/purchase-orders");
            }
          },
          {
            label: "Nudge Supplier",
            icon: <Send className="mr-1 h-3 w-3" />,
            variant: "outline",
            onClick: () => {
              toast({ title: "Supplier Communication", description: "Contacting supplier for WIDGET-001..." });
              setLocation("/suppliers");
            }
          }
        ]
      },
      {
        id: "seed-medium-stock-2",
        category: "stock",
        severity: "medium",
        title: "Low stock: GADGET-002 (Dubai Warehouse)",
        why: "Cover 4.8d < lead time 10d; avg daily 3.2; on-hand 25; safety 10",
        dataSource: "Forecast / Inventory",
        magnitude: 5.2,
        locationId: "loc-dubai",
        regionId: "region-uae",
        actions: [
          {
            label: "Create PO (suggest 45)",
            icon: <Plus className="mr-1 h-3 w-3" />,
            onClick: () => {
              toast({ title: "Create Purchase Order", description: "Opening PO flow for GADGET-002..." });
              setLocation("/purchase-orders");
            }
          }
        ]
      },
      {
        id: "seed-supplier-risk-1",
        category: "supplier",
        severity: "high",
        title: "At-risk supplier: TechSupply Co",
        why: "On-time rate 72.3% < 85% target; avg lead time 12d",
        dataSource: "Suppliers",
        magnitude: 12.7,
        regionId: "region-uk",
        actions: [
          {
            label: "Contact Supplier",
            icon: <Send className="mr-1 h-3 w-3" />,
            onClick: () => {
              toast({ title: "Supplier Contact", description: "Opening TechSupply Co details..." });
              setLocation("/suppliers");
            }
          },
          {
            label: "Find Alternative",
            icon: <Users className="mr-1 h-3 w-3" />,
            variant: "outline",
            onClick: () => {
              toast({ title: "Alternative Suppliers", description: "Searching for alternatives to TechSupply Co..." });
              setLocation("/suppliers");
            }
          }
        ]
      },
      {
        id: "seed-late-shipment-1",
        category: "logistics",
        severity: "medium",
        title: "Late shipment: TRK789012345",
        why: "10 days in transit via UPS Express",
        dataSource: "Shipments",
        magnitude: 10,
        actions: [
          {
            label: "Track Shipment",
            icon: <Truck className="mr-1 h-3 w-3" />,
            onClick: () => {
              window.open("https://tracking.ups.com/TRK789012345", '_blank');
            }
          },
          {
            label: "Contact UPS",
            icon: <ExternalLink className="mr-1 h-3 w-3" />,
            variant: "outline",
            onClick: () => {
              toast({ title: "Contact Carrier", description: "Contacting UPS Express..." });
            }
          }
        ]
      },
      {
        id: "seed-overdue-invoice-1", 
        category: "finance",
        severity: "high",
        title: "Overdue invoice: INV-2024-0892",
        why: "5 days overdue; GBP 2,450.00 outstanding",
        dataSource: "Invoices",
        magnitude: 5,
        regionId: "region-uk",
        actions: [
          {
            label: "Send Payment Link",
            icon: <CreditCard className="mr-1 h-3 w-3" />,
            onClick: () => {
              toast({ title: "Payment Link", description: "Sending payment reminder for INV-2024-0892..." });
              setLocation("/invoices");
            }
          },
          {
            label: "Contact Customer",
            icon: <Send className="mr-1 h-3 w-3" />,
            variant: "outline",
            onClick: () => {
              toast({ title: "Customer Contact", description: "Opening customer details..." });
              setLocation("/customers");
            }
          }
        ]
      },
      {
        id: "seed-forecast-spike-1",
        category: "forecast",
        severity: "medium",
        title: "Demand spike: TOOL-003 (Singapore Warehouse)",
        why: "Recent 14d avg 12.4 > 1.4× baseline 7.8 (+59.0%)",
        dataSource: "Forecast",
        magnitude: 59,
        locationId: "loc-singapore",
        regionId: "region-sg", 
        actions: [
          {
            label: "Increase Stock",
            icon: <Plus className="mr-1 h-3 w-3" />,
            onClick: () => {
              toast({ title: "Stock Increase", description: "Consider increasing safety stock for TOOL-003..." });
              setLocation("/purchase-orders");
            }
          },
          {
            label: "View Forecast", 
            icon: <Package className="mr-1 h-3 w-3" />,
            variant: "outline",
            onClick: () => {
              setLocation("/forecast");
            }
          }
        ]
      }
    ];
  };

  // Main insights generation
  const generateInsights = useMemo((): Insight[] => {
    const insights: Insight[] = [];
    
    // Check if we have enough data to generate meaningful insights
    const hasEnoughData = loadData.products.length > 3 && 
                         loadData.inventory.length > 3 && 
                         loadData.orders.length > 3;
    
    if (!hasEnoughData) {
      // Return seed insights if we don't have enough real data
      return generateSeedInsights();
    }
    
    // Generate insights from real data
    insights.push(...generateLowCoverRiskInsights());
    insights.push(...generateStagnantStockInsights());
    insights.push(...generateSupplierRiskInsights());
    insights.push(...generateLateShipmentInsights());
    insights.push(...generateOverdueInvoiceInsights());
    insights.push(...generateExpiryRiskInsights());
    insights.push(...generateForecastAnomaliesInsights());
    
    // If we still have very few insights, supplement with some seed data
    if (insights.length < 3) {
      insights.push(...generateSeedInsights().slice(0, 3));
    }
    
    return insights;
  }, [loadData]);

  return {
    insights: generateInsights,
    locations: loadData.locations,
    refreshInsights: () => {
      // Force refresh by clearing dismissed insights
      localStorage.removeItem("flowventory:insights:dismissed");
    }
  };
}