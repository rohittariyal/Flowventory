import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, UserMinus, Star, AlertTriangle, TrendingUp } from "lucide-react";

interface CustomerRadarPanelProps {
  className?: string;
}

export function CustomerRadarPanel({ className }: CustomerRadarPanelProps) {
  const customerStats = {
    totalCustomers: 12847,
    newCustomers: 342,
    returningCustomers: 1205,
    churnRisk: 89,
    averageRating: 4.2,
    reviewSentiment: "Positive"
  };

  const sentimentData = [
    { sentiment: "Positive", count: 245, percentage: 68, color: "text-primary" },
    { sentiment: "Neutral", count: 87, percentage: 24, color: "text-muted-foreground" },
    { sentiment: "Negative", count: 29, percentage: 8, color: "text-destructive" }
  ];

  const churnRiskCustomers = [
    { id: "C001", name: "Sarah Johnson", email: "sarah.j@email.com", riskLevel: "High", lastOrder: "45 days ago" },
    { id: "C002", name: "Mike Chen", email: "mike.c@email.com", riskLevel: "Medium", lastOrder: "28 days ago" },
    { id: "C003", name: "Emily Davis", email: "emily.d@email.com", riskLevel: "High", lastOrder: "52 days ago" }
  ];

  const getRiskColor = (level: string) => {
    switch (level) {
      case "High":
        return "text-destructive border-destructive";
      case "Medium":
        return "text-yellow-300 border-yellow-500";
      default:
        return "text-primary border-primary";
    }
  };

  return (
    <Card className={`dashboard-card ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Users className="h-5 w-5 text-primary" />
          <span>Customer Radar</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="dashboard-panel">
        {/* Customer Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{customerStats.totalCustomers.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Total Customers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{customerStats.newCustomers}</div>
            <div className="text-sm text-muted-foreground">New (30d)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{customerStats.returningCustomers}</div>
            <div className="text-sm text-muted-foreground">Returning (30d)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">{customerStats.churnRisk}</div>
            <div className="text-sm text-muted-foreground">At Risk</div>
          </div>
        </div>

        {/* New vs Returning */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-secondary rounded-lg p-4 border border-border">
            <h4 className="text-sm font-medium text-foreground mb-3 flex items-center space-x-2">
              <UserPlus className="h-4 w-4 text-primary" />
              <span>Customer Acquisition</span>
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">New Customers</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-primary">{customerStats.newCustomers}</span>
                  <TrendingUp className="h-3 w-3 text-primary" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Returning Rate</span>
                <span className="text-sm font-medium text-foreground">
                  {Math.round((customerStats.returningCustomers / customerStats.newCustomers) * 100)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg. Rating</span>
                <div className="flex items-center space-x-1">
                  <Star className="h-3 w-3 text-yellow-400 fill-current" />
                  <span className="text-sm font-medium text-foreground">{customerStats.averageRating}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-secondary rounded-lg p-4 border border-border">
            <h4 className="text-sm font-medium text-foreground mb-3 flex items-center space-x-2">
              <Star className="h-4 w-4 text-primary" />
              <span>Review Sentiment</span>
            </h4>
            <div className="space-y-3">
              {sentimentData.map((item) => (
                <div key={item.sentiment} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-foreground">{item.sentiment}</span>
                    <span className="text-xs text-muted-foreground">({item.count})</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`text-sm font-medium ${item.color}`}>
                      {item.percentage}%
                    </span>
                    <div className="w-12 h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Churn Risk Indicator */}
        <div className="bg-secondary rounded-lg p-4 border border-border">
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <span>Churn Risk Alert</span>
          </h4>
          <div className="space-y-3">
            {churnRiskCustomers.map((customer) => (
              <div key={customer.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg border border-border">
                <div className="flex items-center space-x-3">
                  <UserMinus className="h-4 w-4 text-yellow-400" />
                  <div>
                    <div className="text-sm font-medium text-foreground">{customer.name}</div>
                    <div className="text-xs text-muted-foreground">{customer.email}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-xs text-muted-foreground">{customer.lastOrder}</div>
                  <Badge className={`text-xs ${getRiskColor(customer.riskLevel)}`}>
                    {customer.riskLevel} Risk
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-yellow-500 border border-yellow-500 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Retention Opportunity</p>
                <p className="text-xs text-muted-foreground">
                  Consider targeted campaigns for customers with no orders in 30+ days
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}