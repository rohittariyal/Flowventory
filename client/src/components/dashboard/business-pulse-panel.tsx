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

        {/* Weekly Trends Chart */}
        <div className="chart-container">
          <h3 className="text-lg font-semibold text-foreground mb-4">7-Day Sales Trend</h3>
          <div className="h-40 flex items-end justify-between space-x-2">
            {/* Simple bar chart representation */}
            {[65, 78, 52, 89, 95, 71, 83].map((height, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div 
                  className="w-full bg-primary/80 rounded-t transition-all hover:bg-primary"
                  style={{ height: `${height}%` }}
                />
                <span className="text-xs text-muted-foreground mt-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>$0</span>
            <span>$50k</span>
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