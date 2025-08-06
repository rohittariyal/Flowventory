import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, AlertTriangle, TrendingDown, Plus } from "lucide-react";
import { type User } from "@shared/schema";

interface InventoryBrainPanelProps {
  className?: string;
  user: User;
  importedData?: any[];
}

interface InventoryItem {
  sku: string;
  productName: string;
  stock: number;
  velocity: number;
  status: "healthy" | "low" | "critical";
  suggestedReorder: number;
}

export function InventoryBrainPanel({ className, user, importedData }: InventoryBrainPanelProps) {
  // Transform imported data or use default data
  const transformImportedData = (data: any[]): (InventoryItem & { daysLeft: number })[] => {
    return data.map((item, index) => ({
      sku: item.sku || item.SKU || `IMP-${index + 1}`,
      productName: item.name || item.product_name || item['Product Name'] || `Imported Item ${index + 1}`,
      stock: parseInt(item.stock || item.Stock || item.quantity || item.Quantity || '0'),
      velocity: parseFloat(item.velocity || item.Velocity || (Math.random() * 20 + 5).toFixed(1)), // Random velocity if not provided
      status: "healthy" as const,
      suggestedReorder: 0,
      daysLeft: Math.round((parseInt(item.stock || item.Stock || item.quantity || item.Quantity || '0')) / (parseFloat(item.velocity || item.Velocity || (Math.random() * 20 + 5).toFixed(1))))
    }));
  };

  // Smart inventory data with days left calculations
  const inventoryData: (InventoryItem & { daysLeft: number })[] = importedData ? transformImportedData(importedData) : [
    {
      sku: "ELC-001",
      productName: "Wireless Earbuds Pro",
      stock: 45,
      velocity: 12.5,
      status: "healthy",
      suggestedReorder: 0,
      daysLeft: Math.round(45 / 12.5) // 4 days
    },
    {
      sku: "ELC-002", 
      productName: "Smart Watch Series X",
      stock: 8,
      velocity: 15.2,
      status: "critical",
      suggestedReorder: 50,
      daysLeft: Math.round(8 / 15.2) // 1 day - CRITICAL!
    },
    {
      sku: "ELC-003",
      productName: "USB-C Power Bank",
      stock: 2,
      velocity: 22.1,
      status: "critical", 
      suggestedReorder: 100,
      daysLeft: Math.round(2 / 22.1) // 0 days - URGENT!
    },
    {
      sku: "ELC-004",
      productName: "Bluetooth Speaker Mini",
      stock: 67,
      velocity: 8.7,
      status: "healthy",
      suggestedReorder: 0,
      daysLeft: Math.round(67 / 8.7) // 8 days
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "critical":
        return "text-destructive border-destructive";
      case "low":
        return "text-yellow-300 border-yellow-500";
      default:
        return "text-primary border-primary";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "critical":
      case "low":
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <Package className="h-3 w-3" />;
    }
  };

  const lowStockItems = inventoryData.filter(item => item.status !== "healthy");
  const canManagePO = user.role === "admin";

  return (
    <Card className={`dashboard-card ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-primary" />
            <span>Inventory Brain</span>
            {importedData && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs ml-2">
                {importedData.length} imported
              </Badge>
            )}
          </CardTitle>
          {canManagePO && (
            <Button size="sm" className="bg-primary hover:bg-primary">
              <Plus className="h-4 w-4 mr-2" />
              Generate PO
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="dashboard-panel">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{inventoryData.length}</div>
            <div className="text-sm text-muted-foreground">Total SKUs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">{lowStockItems.length}</div>
            <div className="text-sm text-muted-foreground">Low Stock</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-destructive">
              {inventoryData.filter(item => item.status === "critical").length}
            </div>
            <div className="text-sm text-muted-foreground">Critical</div>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-secondary rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr className="text-left text-sm text-muted-foreground">
                  <th className="p-3 font-medium">SKU</th>
                  <th className="p-3 font-medium">Product</th>
                  <th className="p-3 font-medium">Stock</th>
                  <th className="p-3 font-medium">Velocity/Day</th>
                  <th className="p-3 font-medium">Days Left</th>
                  <th className="p-3 font-medium">Status</th>
                  {canManagePO && <th className="p-3 font-medium">Suggested PO</th>}
                </tr>
              </thead>
              <tbody>
                {inventoryData.map((item, index) => (
                  <tr key={item.sku} className={`border-t border-border hover:bg-secondary transition-colors ${
                    index % 2 === 0 ? 'bg-secondary' : ''
                  }`}>
                    <td className="p-3 font-mono text-sm text-foreground">{item.sku}</td>
                    <td className="p-3 text-sm text-foreground">{item.productName}</td>
                    <td className="p-3">
                      <span className={`text-sm font-medium ${
                        item.stock < 10 ? 'text-destructive' : 
                        item.stock < 20 ? 'text-yellow-400' : 'text-foreground'
                      }`}>
                        {item.stock}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">{item.velocity}</td>
                    <td className="p-3">
                      <div className="flex flex-col">
                        <span className={`text-sm font-medium ${
                          item.daysLeft <= 1 ? 'text-destructive' : 
                          item.daysLeft <= 3 ? 'text-yellow-400' : 'text-foreground'
                        }`}>
                          {item.daysLeft} days
                        </span>
                        {item.daysLeft <= 3 && (
                          <span className="text-xs text-muted-foreground">
                            {item.daysLeft <= 1 ? 'Stockout imminent!' : 'Reorder needed soon'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge className={`text-xs ${getStatusColor(item.status)}`}>
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(item.status)}
                          <span className="capitalize">{item.status}</span>
                        </div>
                      </Badge>
                    </td>
                    {canManagePO && (
                      <td className="p-3">
                        {item.suggestedReorder > 0 ? (
                          <span className="text-sm font-medium text-primary">+{item.suggestedReorder}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Highlights */}
        {lowStockItems.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-foreground mb-3 flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              <span>Requires Attention</span>
            </h4>
            <div className="space-y-2">
              {lowStockItems.map((item) => (
                <div key={item.sku} className="flex items-center justify-between p-3 bg-secondary rounded-lg border border-border">
                  <div className="flex items-center space-x-3">
                    <TrendingDown className="h-4 w-4 text-yellow-400" />
                    <div>
                      <span className="text-sm font-medium text-foreground">{item.productName}</span>
                      <span className="text-xs text-muted-foreground ml-2">({item.sku})</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">{item.stock} left</span>
                    {canManagePO && item.suggestedReorder > 0 && (
                      <Button size="sm" variant="outline" className="text-xs">
                        Order {item.suggestedReorder}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}