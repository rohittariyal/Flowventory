import { KPICard } from "@/components/shared/kpi-card";
import { InsightCard } from "@/components/shared/insight-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingCart, RefreshCw, TrendingUp, Activity } from "lucide-react";

interface BusinessPulsePanelProps {
  className?: string;
}

export function BusinessPulsePanel({ className }: BusinessPulsePanelProps) {
  // Mock data - in real app, this would come from API
  const kpiData = [
    {
      title: "Total Sales",
      value: "$127,450",
      change: { value: 12.5, isPositive: true },
      icon: DollarSign,
      iconColor: "text-primary"
    },
    {
      title: "Orders",
      value: "2,847",
      change: { value: 8.2, isPositive: true },
      icon: ShoppingCart,
      iconColor: "text-blue-400"
    },
    {
      title: "Refunds",
      value: "$3,240",
      change: { value: -2.1, isPositive: false },
      icon: RefreshCw,
      iconColor: "text-yellow-400"
    },
    {
      title: "ROI",
      value: "24.6%",
      change: { value: 5.4, isPositive: true },
      icon: TrendingUp,
      iconColor: "text-primary"
    }
  ];

  const insights = [
    {
      title: "Sales Momentum",
      insight: "Your electronics category is outperforming by 23% this week. Consider increasing inventory for top-selling SKUs.",
      type: "positive" as const,
      confidence: 92
    },
    {
      title: "Seasonal Pattern",
      insight: "Historical data suggests 18% sales increase expected in the next 2 weeks. Prepare inventory accordingly.",
      type: "neutral" as const,
      confidence: 87
    }
  ];

  return (
    <Card className={`dashboard-card ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Activity className="h-5 w-5 text-primary" />
          <span>Business Pulse</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="dashboard-panel">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiData.map((kpi, index) => (
            <KPICard key={index} {...kpi} />
          ))}
        </div>

        {/* Weekly Trends Chart Placeholder */}
        <div className="rounded-lg p-6 border border-border" style={{ backgroundColor: 'hsl(var(--secondary) / 0.3)' }}>
          <h4 className="text-sm font-medium text-foreground mb-4">Weekly Trends</h4>
          <div className="h-32 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-sm">Chart visualization would render here</p>
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground">AI Insights</h4>
          {insights.map((insight, index) => (
            <InsightCard key={index} {...insight} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}