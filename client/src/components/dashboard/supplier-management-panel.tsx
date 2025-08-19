import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, Clock, Package, ExternalLink } from "lucide-react";

interface Supplier {
  id: string;
  name: string;
  region: string;
  leadTimeDays: number;
  paymentTerms: string;
  currency: string;
  status: "active" | "archived";
  skus: Array<{
    sku: string;
    unitCost: number;
    moq: number;
  }>;
}

interface SupplierStats {
  totalActiveSuppliers: number;
  averageLeadTime: number;
  pendingPOs: number;
  topSuppliers: Supplier[];
}

export function SupplierManagementPanel() {
  const [stats, setStats] = useState<SupplierStats>({
    totalActiveSuppliers: 0,
    averageLeadTime: 0,
    pendingPOs: 0,
    topSuppliers: []
  });
  const [loading, setLoading] = useState(true);

  const fetchSupplierStats = async () => {
    try {
      const [suppliersResponse, posResponse] = await Promise.all([
        fetch("/api/suppliers"),
        fetch("/api/simple-po")
      ]);

      if (suppliersResponse.ok) {
        const suppliers: Supplier[] = await suppliersResponse.json();
        const activeSuppliers = suppliers.filter(s => s.status === "active");
        
        // Calculate average lead time
        const avgLeadTime = activeSuppliers.length > 0 
          ? Math.round(activeSuppliers.reduce((sum, s) => sum + s.leadTimeDays, 0) / activeSuppliers.length)
          : 0;

        // Get top 5 suppliers (by active status and region diversity)
        const topSuppliers = activeSuppliers.slice(0, 5);

        let pendingPOs = 0;
        if (posResponse.ok) {
          const pos = await posResponse.json();
          pendingPOs = pos.filter((po: any) => po.status === "DRAFT" || po.status === "SENT").length;
        }

        setStats({
          totalActiveSuppliers: activeSuppliers.length,
          averageLeadTime: avgLeadTime,
          pendingPOs,
          topSuppliers
        });
      }
    } catch (error) {
      console.error("Error fetching supplier stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupplierStats();
  }, []);

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Supplier Management
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

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Supplier Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-lg font-bold text-primary">{stats.totalActiveSuppliers}</div>
            <div className="text-xs text-muted-foreground">Active Suppliers</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-lg font-bold text-primary flex items-center justify-center gap-1">
              <Clock className="h-4 w-4" />
              {stats.averageLeadTime}d
            </div>
            <div className="text-xs text-muted-foreground">Avg Lead Time</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-lg font-bold text-primary flex items-center justify-center gap-1">
              <Package className="h-4 w-4" />
              {stats.pendingPOs}
            </div>
            <div className="text-xs text-muted-foreground">Pending POs</div>
          </div>
        </div>

        {/* Top 5 Active Suppliers */}
        <div>
          <h4 className="font-medium mb-2 text-sm">Top Active Suppliers</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {stats.topSuppliers.length > 0 ? (
              stats.topSuppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{supplier.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {supplier.region} • {supplier.leadTimeDays}d • {supplier.currency}
                    </div>
                  </div>
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {supplier.status}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground text-center py-4">
                No active suppliers found
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('/suppliers', '_blank')}
            className="flex-1 text-xs"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Manage Suppliers
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('/purchase-orders', '_blank')}
            className="flex-1 text-xs"
          >
            <Package className="h-3 w-3 mr-1" />
            View POs
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}