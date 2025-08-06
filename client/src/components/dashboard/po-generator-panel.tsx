import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Package, AlertTriangle, Send, Clock } from "lucide-react";
import { type User } from "@shared/schema";

interface POGeneratorPanelProps {
  className?: string;
  user: User;
}

export function POGeneratorPanel({ className, user }: POGeneratorPanelProps) {
  // Mock data for SKUs below reorder threshold
  const reorderSKUs = [
    {
      sku: "ELEC-001",
      name: "Wireless Headphones Pro",
      currentStock: 12,
      threshold: 50,
      suggestedQty: 300,
      eta: "5 days",
      priority: "high" as const,
      cost: "$3,600"
    },
    {
      sku: "ELEC-007",
      name: "Smart Watch Series X",
      currentStock: 8,
      threshold: 30,
      suggestedQty: 150,
      eta: "7 days", 
      priority: "medium" as const,
      cost: "$2,250"
    },
    {
      sku: "ELEC-015",
      name: "USB-C Cable 6ft",
      currentStock: 25,
      threshold: 100,
      suggestedQty: 500,
      eta: "3 days",
      priority: "high" as const,
      cost: "$750"
    }
  ];

  const totalPOValue = reorderSKUs.reduce((sum, item) => {
    return sum + parseFloat(item.cost.replace('$', '').replace(',', ''));
  }, 0);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "medium":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      default:
        return "bg-green-500/10 text-green-400 border-green-500/20";
    }
  };

  // Only show for admin users
  if (user.role !== "admin") {
    return null;
  }

  return (
    <Card className={`dashboard-card ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-primary" />
          <span>PO Generator</span>
          <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
            Admin Only
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="dashboard-panel">
        {/* Low Stock Alert */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <span className="text-red-400 font-medium">
              {reorderSKUs.length} SKUs below reorder threshold
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Generate purchase orders to maintain optimal inventory levels
          </p>
        </div>

        {/* SKUs Below Threshold */}
        <div className="space-y-4 mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">SKUs Requiring Reorder</h3>
          {reorderSKUs.map((item) => (
            <div key={item.sku} className="kpi-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Package className="h-8 w-8 text-primary" />
                  <div>
                    <h4 className="font-medium text-foreground">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className="text-xs text-muted-foreground">
                        Stock: {item.currentStock} / {item.threshold}
                      </span>
                      <Badge className={`text-xs ${getPriorityColor(item.priority)}`}>
                        {item.priority.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Suggested Qty</p>
                  <p className="text-lg font-bold text-primary">{item.suggestedQty}</p>
                  <p className="text-xs text-muted-foreground">{item.cost}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Suggested PO Summary */}
        <div className="insight-card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Suggested PO Draft</h3>
            <Badge className="bg-primary/20 text-primary border-primary/30">
              Ready to Send
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Total SKUs</p>
              <p className="text-xl font-bold text-foreground">{reorderSKUs.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Units</p>
              <p className="text-xl font-bold text-foreground">
                {reorderSKUs.reduce((sum, item) => sum + item.suggestedQty, 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-xl font-bold text-primary">
                ${totalPOValue.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg ETA</p>
              <p className="text-xl font-bold text-foreground flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                5 days
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              <p>Next delivery window: Jan 15-20, 2025</p>
              <p>Supplier: ElectroVendor Inc.</p>
            </div>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Send className="h-4 w-4 mr-2" />
              Send PO
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="border-border hover:bg-muted/50">
            Edit PO
          </Button>
          <Button variant="outline" size="sm" className="border-border hover:bg-muted/50">
            Schedule Delivery
          </Button>
          <Button variant="outline" size="sm" className="border-border hover:bg-muted/50">
            Export PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}