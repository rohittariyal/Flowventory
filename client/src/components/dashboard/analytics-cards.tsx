import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Receipt, AlertTriangle, TrendingUp } from "lucide-react";
import { getTotalActiveProducts, getOrdersThisMonth, getLowStockItems } from "@/utils/analytics";

interface AnalyticsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  href: string;
  trend?: string;
  variant?: "default" | "warning" | "success";
}

function AnalyticsCard({ title, value, icon, href, trend, variant = "default" }: AnalyticsCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "warning":
        return "border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700";
      case "success":
        return "border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700";
      default:
        return "border-border hover:border-green-200 dark:hover:border-green-800";
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case "warning":
        return "text-red-500 dark:text-red-400";
      case "success":
        return "text-green-500 dark:text-green-400";
      default:
        return "text-green-500 dark:text-green-400";
    }
  };

  return (
    <Link href={href}>
      <Card className={`
        cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 
        rounded-2xl border shadow-sm ${getVariantStyles()}
        focus-within:ring-2 focus-within:ring-green-500 focus-within:ring-offset-2 
        dark:focus-within:ring-offset-black
      `}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                {title}
              </p>
              <div className="flex items-center space-x-2">
                <p className="text-3xl font-bold text-foreground">
                  {value.toLocaleString()}
                </p>
                {trend && (
                  <Badge variant="secondary" className="text-xs">
                    {trend}
                  </Badge>
                )}
              </div>
            </div>
            <div className={`p-3 rounded-full bg-muted ${getIconColor()}`}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function AnalyticsCards() {
  const [analytics, setAnalytics] = useState({
    activeProducts: 0,
    ordersThisMonth: 0,
    lowStockItems: 0
  });

  const refreshData = () => {
    setAnalytics({
      activeProducts: getTotalActiveProducts(),
      ordersThisMonth: getOrdersThisMonth(),
      lowStockItems: getLowStockItems()
    });
  };

  useEffect(() => {
    refreshData();
    
    // Listen for storage changes to refresh data
    const handleStorageChange = () => {
      refreshData();
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also refresh when localStorage is modified by the same tab
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key: string, value: string) {
      originalSetItem.apply(this, [key, value]);
      if (key.startsWith('flowventory:')) {
        setTimeout(refreshData, 100); // Small delay to ensure data is saved
      }
    };
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      localStorage.setItem = originalSetItem;
    };
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <AnalyticsCard
        title="Active Products"
        value={analytics.activeProducts}
        icon={<Package className="h-6 w-6" />}
        href="/products?filter=active"
        trend="+3 vs last month"
        variant="success"
      />
      
      <AnalyticsCard
        title="Orders This Month"
        value={analytics.ordersThisMonth}
        icon={<Receipt className="h-6 w-6" />}
        href="/orders?filter=this-month"
        trend="+12% vs last month"
        variant="default"
      />
      
      <AnalyticsCard
        title="Low Stock Items"
        value={analytics.lowStockItems}
        icon={<AlertTriangle className="h-6 w-6" />}
        href="/inventory?filter=low-stock"
        trend={analytics.lowStockItems > 0 ? "Needs attention" : "All good"}
        variant={analytics.lowStockItems > 0 ? "warning" : "success"}
      />
    </div>
  );
}