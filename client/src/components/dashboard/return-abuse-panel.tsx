import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield, AlertTriangle, RefreshCw, Flag, TrendingUp, Eye } from "lucide-react";

interface ReturnAbusePanelProps {
  className?: string;
}

interface SuspiciousCustomer {
  customerId: string;
  name: string;
  email: string;
  returnRate: number;
  totalReturns: number;
  riskScore: number;
  flags: string[];
  lastReturn: string;
}

export function ReturnAbusePanel({ className }: ReturnAbusePanelProps) {
  const returnStats = {
    totalReturns: 284,
    suspiciousReturns: 23,
    abuseDetected: 7,
    preventedLosses: 2840
  };

  const suspiciousCustomers: SuspiciousCustomer[] = [
    {
      customerId: "C891",
      name: "Anonymous Customer",
      email: "multiple.emails@detected.com",
      returnRate: 89,
      totalReturns: 17,
      riskScore: 95,
      flags: ["High frequency", "Multiple emails", "Same address"],
      lastReturn: "2 days ago"
    },
    {
      customerId: "C442",
      name: "John Marcus",
      email: "j.marcus@email.com",
      returnRate: 72,
      totalReturns: 13,
      riskScore: 82,
      flags: ["Serial returner", "Always defective claim"],
      lastReturn: "1 week ago"
    },
    {
      customerId: "C156",
      name: "Sarah Kim",
      email: "s.kim@email.com",
      returnRate: 65,
      totalReturns: 9,
      riskScore: 71,
      flags: ["Bulk returns", "Short ownership"],
      lastReturn: "3 days ago"
    }
  ];

  const returnPatterns = [
    { pattern: "Same Day Returns", count: 12, trend: "up", severity: "high" },
    { pattern: "Multiple Same Product", count: 8, trend: "stable", severity: "medium" },
    { pattern: "High Value Items Only", count: 5, trend: "up", severity: "high" },
    { pattern: "Fraudulent Claims", count: 3, trend: "down", severity: "critical" }
  ];

  const getRiskColor = (score: number) => {
    if (score >= 90) return "text-destructive border-destructive";
    if (score >= 70) return "text-yellow-300 border-yellow-500";
    return "text-primary border-primary";
  };

  const getPatternSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-destructive";
      case "high":
        return "text-yellow-400";
      case "medium":
        return "text-blue-400";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Card className={`dashboard-card ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-primary" />
          <span>Return Abuse Detection</span>
          <Badge variant="outline" className="text-destructive border-destructive">
            7 Active Alerts
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="dashboard-panel">
        {/* Statistics Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{returnStats.totalReturns}</div>
            <div className="text-sm text-muted-foreground">Total Returns</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">{returnStats.suspiciousReturns}</div>
            <div className="text-sm text-muted-foreground">Suspicious</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-destructive">{returnStats.abuseDetected}</div>
            <div className="text-sm text-muted-foreground">Confirmed Abuse</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">${returnStats.preventedLosses}</div>
            <div className="text-sm text-muted-foreground">Losses Prevented</div>
          </div>
        </div>

        {/* Suspicious Customers */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span>High Risk Customers</span>
          </h4>
          <div className="space-y-3">
            {suspiciousCustomers.map((customer) => (
              <div key={customer.customerId} className="bg-secondary rounded-lg p-4 border border-border">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="text-sm font-medium text-foreground">{customer.name}</span>
                      <Badge className={`text-xs ${getRiskColor(customer.riskScore)}`}>
                        Risk: {customer.riskScore}%
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      {customer.email} • {customer.customerId}
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <span>Return Rate: {customer.returnRate}%</span>
                      <span>Total Returns: {customer.totalReturns}</span>
                      <span>Last: {customer.lastReturn}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" className="text-xs">
                      <Eye className="h-3 w-3 mr-1" />
                      Review
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs text-destructive border-destructive">
                      <Flag className="h-3 w-3 mr-1" />
                      Flag
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {customer.flags.map((flag, index) => (
                    <Badge key={index} variant="outline" className="text-xs text-destructive border-destructive">
                      {flag}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Return Patterns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-secondary rounded-lg p-4 border border-border">
            <h4 className="text-sm font-medium text-foreground mb-3 flex items-center space-x-2">
              <RefreshCw className="h-4 w-4 text-primary" />
              <span>Abuse Patterns</span>
            </h4>
            <div className="space-y-3">
              {returnPatterns.map((pattern, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className={`h-4 w-4 ${getPatternSeverityColor(pattern.severity)}`} />
                    <div>
                      <div className="text-sm font-medium text-foreground">{pattern.pattern}</div>
                      <div className="text-xs text-muted-foreground capitalize">{pattern.severity} severity</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-foreground">{pattern.count}</span>
                    <TrendingUp className={`h-3 w-3 ${
                      pattern.trend === 'up' ? 'text-destructive' : 
                      pattern.trend === 'down' ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-secondary rounded-lg p-4 border border-border">
            <h4 className="text-sm font-medium text-foreground mb-3 flex items-center space-x-2">
              <Shield className="h-4 w-4 text-primary" />
              <span>Protection Actions</span>
            </h4>
            <div className="space-y-3">
              <div className="p-3 bg-primary border border-primary rounded-lg">
                <div className="text-sm font-medium text-foreground mb-1">Auto-flagging Active</div>
                <div className="text-xs text-muted-foreground">
                  Customers with over 60% return rate are automatically flagged for review
                </div>
              </div>
              <div className="p-3 bg-yellow-500 border border-yellow-500 rounded-lg">
                <div className="text-sm font-medium text-foreground mb-1">Return Limits</div>
                <div className="text-xs text-muted-foreground">
                  High-risk customers limited to 2 returns per 30-day period
                </div>
              </div>
              <div className="p-3 bg-destructive border border-destructive rounded-lg">
                <div className="text-sm font-medium text-foreground mb-1">Blacklist Protection</div>
                <div className="text-xs text-muted-foreground">
                  7 customers currently blocked from making purchases
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}