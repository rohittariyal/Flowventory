import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, AlertTriangle, Timer, ShoppingCart } from "lucide-react";
import type { AnalyticsSummary } from "@shared/schema";

interface AnalyticsPanelProps {
  className?: string;
}

export function AnalyticsPanel({ className }: AnalyticsPanelProps) {
  const { data: analytics, isLoading, error } = useQuery<AnalyticsSummary>({
    queryKey: ["/api/analytics/summary"],
    refetchInterval: 60000, // Refetch every minute
  });

  if (isLoading) {
    return (
      <div className={className}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className={className}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Analytics Unavailable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Unable to load analytics data.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalOpenTasks = Object.values(analytics.openTasksByType).reduce((sum, count) => sum + count, 0);
  const totalOpenByPriority = Object.values(analytics.openByPriority).reduce((sum, count) => sum + count, 0);

  // Generate SVG line chart for 30-day sales
  const maxValue = Math.max(...analytics.sales30d);
  const minValue = Math.min(...analytics.sales30d);
  const range = maxValue - minValue || 1;
  
  const points = analytics.sales30d.map((value, index) => {
    const x = (index / (analytics.sales30d.length - 1)) * 280; // SVG width - padding
    const y = 80 - ((value - minValue) / range) * 60; // Invert Y and scale
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* KPI Tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Sales (7d) */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Sales (7d)</p>
              <p className="text-2xl font-bold">₹{analytics.sales7d.toLocaleString()}</p>
            </div>

            {/* Open Tasks */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Open Tasks</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{totalOpenTasks}</p>
                <div className="text-xs space-x-1">
                  {analytics.openTasksByType.RESTOCK > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      R:{analytics.openTasksByType.RESTOCK}
                    </Badge>
                  )}
                  {analytics.openTasksByType.RETRY_SYNC > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      S:{analytics.openTasksByType.RETRY_SYNC}
                    </Badge>
                  )}
                  {analytics.openTasksByType.RECONCILE > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      RC:{analytics.openTasksByType.RECONCILE}
                    </Badge>
                  )}
                  {analytics.openTasksByType.ADJUST_BUDGET > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      B:{analytics.openTasksByType.ADJUST_BUDGET}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Stockouts (7d) */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Stockouts (7d)</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{analytics.stockouts7d}</p>
                {analytics.stockouts7d > 0 && (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
              </div>
            </div>

            {/* Median TTR */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Median TTR</p>
              <p className="text-2xl font-bold">{analytics.ttrMedianHours.toFixed(1)}h</p>
            </div>
          </div>

          {/* 30-day Sales Chart */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">30-Day Sales Trend</h4>
            <div className="h-20 w-full bg-muted/20 rounded border p-2">
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 300 80"
                className="overflow-visible"
              >
                {/* Chart line */}
                <polyline
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  points={points}
                />
                {/* Data points */}
                {analytics.sales30d.map((value, index) => {
                  const x = (index / (analytics.sales30d.length - 1)) * 280;
                  const y = 80 - ((value - minValue) / range) * 60;
                  return (
                    <circle
                      key={index}
                      cx={x}
                      cy={y}
                      r="2"
                      fill="hsl(var(--primary))"
                    />
                  );
                })}
              </svg>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>30 days ago</span>
              <span>Today</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}