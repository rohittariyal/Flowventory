import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Package, RefreshCw, Download, Plus, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface PurchaseOrder {
  id: string;
  sku: string;
  qty: number;
  supplierName: string;
  status: "DRAFT" | "SENT" | "RECEIVED" | "CANCELLED";
  date: string;
  createdAt: string;
}

interface Supplier {
  id: string;
  name: string;
  email: string;
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

const createPOSchema = z.object({
  supplierId: z.string().min(1, "Please select a supplier"),
  sku: z.string().min(1, "SKU is required"),
  qty: z.number().min(1, "Quantity must be at least 1"),
  notes: z.string().optional(),
});

function PurchaseOrdersPage() {
  const { toast } = useToast();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const form = useForm<z.infer<typeof createPOSchema>>({
    resolver: zodResolver(createPOSchema),
    defaultValues: {
      supplierId: "",
      sku: "",
      qty: 1,
      notes: "",
    },
  });

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

  const fetchSuppliers = async () => {
    try {
      const response = await fetch("/api/suppliers");
      if (!response.ok) {
        throw new Error("Failed to fetch suppliers");
      }
      const data = await response.json();
      setSuppliers(data);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      toast({
        title: "Error",
        description: "Failed to fetch suppliers",
        variant: "destructive"
      });
    }
  };

  const createPurchaseOrder = async (data: z.infer<typeof createPOSchema>) => {
    try {
      const supplier = suppliers.find(s => s.id === data.supplierId);
      if (!supplier) throw new Error("Supplier not found");

      const response = await fetch("/api/simple-po", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sku: data.sku,
          qty: data.qty,
          supplierName: supplier.name,
          notes: data.notes,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create purchase order");
      }

      const newPO = await response.json();
      setPurchaseOrders(prev => [newPO, ...prev]);
      setCreateModalOpen(false);
      form.reset();
      setSelectedSupplier(null);
      
      toast({
        title: "Success",
        description: `Purchase order created for ${data.sku}`,
      });
    } catch (error) {
      console.error("Error creating purchase order:", error);
      toast({
        title: "Error",
        description: "Failed to create purchase order",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
    fetchSuppliers();
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
              <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="shrink-0">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">Create PO</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Create Purchase Order</DialogTitle>
                    <DialogDescription>
                      Create a new purchase order with supplier integration
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(createPurchaseOrder)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="supplierId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Supplier</FormLabel>
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value);
                                const supplier = suppliers.find(s => s.id === value);
                                setSelectedSupplier(supplier || null);
                              }}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a supplier" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {suppliers.map((supplier) => (
                                  <SelectItem key={supplier.id} value={supplier.id}>
                                    <div className="flex flex-col">
                                      <span>{supplier.name}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {supplier.region} • {supplier.leadTimeDays}d lead time
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {selectedSupplier && (
                        <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                          <strong>Contact:</strong> {selectedSupplier.email} • <strong>Terms:</strong> {selectedSupplier.paymentTerms}
                        </div>
                      )}

                      <FormField
                        control={form.control}
                        name="sku"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SKU</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter SKU" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="qty"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                placeholder="Enter quantity"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notes (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Add any notes for this purchase order"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <DialogFooter>
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                          {form.formState.isSubmitting ? "Creating..." : "Create Purchase Order"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>

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
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.map((po) => {
                    const supplier = suppliers.find(s => s.name === po.supplierName);
                    return (
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
                        <TableCell>
                          {supplier && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(`/suppliers?id=${supplier.id}`, '_blank')}
                              className="text-primary hover:text-primary/80"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
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