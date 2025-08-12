import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Package, RefreshCw, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PurchaseOrder {
  id: string;
  sku: string;
  qty: number;
  supplierName: string;
  status: "DRAFT" | "SENT" | "RECEIVED" | "CANCELLED";
  date: string;
  createdAt: string;
}

function PurchaseOrdersPage() {
  const { toast } = useToast();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/simple-po");
      
      if (!response.ok) {
        throw new Error("Failed to fetch purchase orders");
      }
      
      const data = await response.json();
      setPurchaseOrders(data);
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      toast({
        title: "Error",
        description: "Failed to fetch purchase orders",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "secondary";
      case "SENT":
        return "default";
      case "RECEIVED":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Feature 1: Inline status updates
  const updatePOStatus = async (id: string, newStatus: string) => {
    try {
      // Optimistic update
      setPurchaseOrders(prev => 
        prev.map(po => po.id === id ? { ...po, status: newStatus as any } : po)
      );

      const response = await fetch(`/api/simple-po/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        // Revert on error
        setPurchaseOrders(prev => 
          prev.map(po => po.id === id ? { ...po, status: purchaseOrders.find(p => p.id === id)?.status || "DRAFT" } : po)
        );
        throw new Error("Failed to update status");
      }

      toast({
        title: "Status Updated",
        description: `Purchase order status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error("Error updating PO status:", error);
      toast({
        title: "Error",
        description: "Failed to update purchase order status",
        variant: "destructive"
      });
    }
  };

  // Feature 5: Export to CSV
  const exportToCSV = () => {
    const headers = ["Created At", "Supplier Name", "SKU", "Quantity", "Status"];
    const csvData = purchaseOrders.map(po => [
      formatDate(po.createdAt),
      po.supplierName,
      po.sku,
      po.qty.toString(),
      po.status
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `purchase-orders-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export Complete",
      description: `Exported ${purchaseOrders.length} purchase orders to CSV`,
    });
  };

  return (
    <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
              <div className="min-w-0">
                <CardTitle className="text-lg sm:text-xl">Purchase Orders</CardTitle>
                <CardDescription className="text-sm">
                  View and manage all purchase orders
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={exportToCSV}
                disabled={loading || purchaseOrders.length === 0}
                className="shrink-0"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Export CSV</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={fetchPurchaseOrders}
                disabled={loading}
                className="shrink-0"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline ml-2">Refresh</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading purchase orders...</span>
            </div>
          ) : purchaseOrders.length === 0 ? (
            <div className="text-center p-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No purchase orders found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Create purchase orders from the Inventory page
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Created</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(po.createdAt)}
                      </TableCell>
                      <TableCell className="font-medium">{po.sku}</TableCell>
                      <TableCell>{po.qty}</TableCell>
                      <TableCell>{po.supplierName}</TableCell>
                      <TableCell>
                        <Select
                          value={po.status}
                          onValueChange={(newStatus) => updatePOStatus(po.id, newStatus)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DRAFT">DRAFT</SelectItem>
                            <SelectItem value="SENT">SENT</SelectItem>
                            <SelectItem value="RECEIVED">RECEIVED</SelectItem>
                            <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PurchaseOrdersPage;