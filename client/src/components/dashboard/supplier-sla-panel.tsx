import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Clock, TrendingUp, TrendingDown, CheckCircle } from "lucide-react";

interface SupplierSLAMetrics {
  totalSuppliers: number;
  avgOnTimeRate: number;
  avgDeliveryTime: number;
  breachCount: number;
  topPerformers: Array<{
    name: string;
    onTimeRatePct: number;
    avgDeliveryTime: number;
  }>;
  underPerformers: Array<{
    name: string;
    onTimeRatePct: number;
    avgDeliveryTime: number;
    breachCount: number;
  }>;
}

export function SupplierSLAPanel() {
  const { data: metrics, isLoading } = useQuery<SupplierSLAMetrics>({
    queryKey: ["/api/suppliers/metrics"],
  });

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Supplier SLA Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Supplier SLA Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No supplier data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPerformanceColor = (rate: number) => {
    if (rate >= 95) return "text-green-500";
    if (rate >= 85) return "text-yellow-500";
    return "text-red-500";
  };

  const getPerformanceBadge = (rate: number) => {
    if (rate >= 95) return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Excellent</Badge>;
    if (rate >= 85) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">Good</Badge>;
    return <Badge variant="destructive">Needs Attention</Badge>;
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-500" />
          Supplier SLA Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{metrics.totalSuppliers}</div>
            <div className="text-xs text-muted-foreground">Total Suppliers</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${getPerformanceColor(metrics.avgOnTimeRate)}`}>
              {metrics.avgOnTimeRate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Avg On-Time Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{metrics.avgDeliveryTime.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">Avg Delivery (days)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">{metrics.breachCount}</div>
            <div className="text-xs text-muted-foreground">SLA Breaches</div>
          </div>
        </div>

        <Separator />

        {/* Performance Overview */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-2">Overall Performance</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">On-Time Rate</span>
              {getPerformanceBadge(metrics.avgOnTimeRate)}
            </div>
            <Progress value={metrics.avgOnTimeRate} className="h-2" />
          </div>
        </div>

        {/* Top Performers */}
        {metrics.topPerformers && metrics.topPerformers.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Top Performers
            </h4>
            <div className="space-y-2">
              {metrics.topPerformers.slice(0, 3).map((supplier, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{supplier.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-green-500 font-medium">{supplier.onTimeRatePct.toFixed(1)}%</span>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Underperformers */}
        {metrics.underPerformers && metrics.underPerformers.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Needs Attention
            </h4>
            <div className="space-y-2">
              {metrics.underPerformers.slice(0, 3).map((supplier, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{supplier.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-red-500 font-medium">{supplier.onTimeRatePct.toFixed(1)}%</span>
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SLA Breach Alert */}
        {metrics.breachCount > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-700 dark:text-red-300">
                {metrics.breachCount} SLA breach{metrics.breachCount > 1 ? 'es' : ''} detected
              </span>
            </div>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              Review supplier performance and consider renegotiating delivery terms.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}