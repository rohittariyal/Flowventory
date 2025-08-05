import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, PieChart, ShoppingBag, TrendingUp, TrendingDown } from "lucide-react";
import { type OnboardingData } from "@shared/schema";

interface SalesIntelligencePanelProps {
  className?: string;
  salesChannels: string[];
}

export function SalesIntelligencePanel({ className, salesChannels }: SalesIntelligencePanelProps) {
  // Mock channel performance data
  const channelData = [
    { name: "Amazon", sales: 45200, growth: 12.5, isPositive: true },
    { name: "Shopify", sales: 32800, growth: 8.2, isPositive: true },
    { name: "Flipkart", sales: 18900, growth: -3.1, isPositive: false },
    { name: "WooCommerce", sales: 12400, growth: 15.7, isPositive: true },
    { name: "Offline", sales: 8600, growth: -5.2, isPositive: false }
  ].filter(channel => 
    salesChannels.some(selected => 
      selected.toLowerCase().includes(channel.name.toLowerCase()) ||
      channel.name.toLowerCase().includes(selected.toLowerCase())
    )
  );

  const bestPerformers = [
    { sku: "ELC-001", name: "Wireless Earbuds Pro", sales: 245, revenue: 12250 },
    { sku: "ELC-004", name: "Bluetooth Speaker Mini", sales: 189, revenue: 9450 },
    { sku: "ELC-002", name: "Smart Watch Series X", sales: 156, revenue: 23400 }
  ];

  const worstPerformers = [
    { sku: "ELC-008", name: "Fitness Tracker Basic", sales: 12, revenue: 840 },
    { sku: "ELC-009", name: "Phone Case Clear", sales: 18, revenue: 360 },
    { sku: "ELC-010", name: "Screen Protector Set", sales: 23, revenue: 575 }
  ];

  const returnReasons = [
    { reason: "Defective", percentage: 35, color: "text-destructive" },
    { reason: "Not as described", percentage: 28, color: "text-yellow-400" },
    { reason: "Changed mind", percentage: 22, color: "text-blue-400" },
    { reason: "Wrong size", percentage: 15, color: "text-muted-foreground" }
  ];

  return (
    <Card className={`dashboard-card ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <span>Sales Intelligence</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="dashboard-panel">
        {/* Channel Performance Cards */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-3">Channel Performance</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {channelData.map((channel) => (
              <div key={channel.name} className="kpi-card">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{channel.name}</span>
                    <Badge variant="outline" className="text-xs">
                      Active
                    </Badge>
                  </div>
                  <div className="text-xl font-bold text-foreground">
                    ${channel.sales.toLocaleString()}
                  </div>
                  <div className={`flex items-center text-sm ${
                    channel.isPositive ? 'text-primary' : 'text-destructive'
                  }`}>
                    {channel.isPositive ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    <span>{channel.isPositive ? '+' : ''}{channel.growth}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Best & Worst Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Best Performers */}
          <div className="bg-secondary rounded-lg p-4 border border-border">
            <h4 className="text-sm font-medium text-foreground mb-3 flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span>Top Performers</span>
            </h4>
            <div className="space-y-3">
              {bestPerformers.map((product, index) => (
                <div key={product.sku} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-foreground">{product.name}</div>
                    <div className="text-xs text-muted-foreground">{product.sku}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-primary">${product.revenue.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">{product.sales} units</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Worst Performers */}
          <div className="bg-secondary rounded-lg p-4 border border-border">
            <h4 className="text-sm font-medium text-foreground mb-3 flex items-center space-x-2">
              <TrendingDown className="h-4 w-4 text-yellow-400" />
              <span>Needs Attention</span>
            </h4>
            <div className="space-y-3">
              {worstPerformers.map((product, index) => (
                <div key={product.sku} className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-foreground">{product.name}</div>
                    <div className="text-xs text-muted-foreground">{product.sku}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-muted-foreground">${product.revenue.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">{product.sales} units</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Return Reasons Analysis */}
        <div className="bg-secondary rounded-lg p-4 border border-border">
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center space-x-2">
            <PieChart className="h-4 w-4 text-primary" />
            <span>Return Reasons</span>
          </h4>
          <div className="space-y-3">
            {returnReasons.map((reason) => (
              <div key={reason.reason} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-sm font-medium text-foreground">{reason.reason}</div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className={`text-sm font-medium ${reason.color}`}>
                    {reason.percentage}%
                  </div>
                  <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${reason.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}