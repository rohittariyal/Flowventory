import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Package, Plus, FileText, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface InventoryItem {
  sku: string;
  channels: string[];
  stock: number;
  threshold: number;
  daysCover: number;
  hasLinkedTask?: boolean;
  latestEventId?: string;
}

// Mock inventory data - in real app this would come from API
const INVENTORY_DATA: InventoryItem[] = [
  { sku: "SKU-001", channels: ["Shopify", "Amazon"], stock: 5, threshold: 20, daysCover: 2.0, hasLinkedTask: false, latestEventId: "event-1" },
  { sku: "SKU-002", channels: ["Shopify"], stock: 15, threshold: 25, daysCover: 8.3, hasLinkedTask: true },
  { sku: "SKU-003", channels: ["Amazon", "eBay"], stock: 3, threshold: 15, daysCover: 3.75, hasLinkedTask: false, latestEventId: "event-2" },
  { sku: "SKU-004", channels: ["Shopify", "Amazon", "Meta"], stock: 45, threshold: 30, daysCover: 14.1 },
  { sku: "SKU-005", channels: ["Shopify"], stock: 8, threshold: 18, daysCover: 3.8, hasLinkedTask: false, latestEventId: "event-3" },
  { sku: "SKU-006", channels: ["Amazon"], stock: 22, threshold: 20, daysCover: 7.3 },
  { sku: "SKU-007", channels: ["Shopify", "eBay"], stock: 1, threshold: 12, daysCover: 1.25, hasLinkedTask: false, latestEventId: "event-4" },
  { sku: "SKU-008", channels: ["Amazon", "Meta"], stock: 35, threshold: 25, daysCover: 11.7 }
];

const SUPPLIERS = [
  "Supplier A - Electronics",
  "Supplier B - Accessories", 
  "Supplier C - Apparel",
  "Global Manufacturing Co.",
  "Local Parts Distributor"
];

function InventoryPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSku, setSelectedSku] = useState<string>("");
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [poForm, setPoForm] = useState({
    supplier: "",
    quantity: "20",
    notes: ""
  });

  // Create task from event mutation
  const createTaskMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await apiRequest("POST", `/api/events/${eventId}/create-task`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Task Created",
        description: "Successfully created task for inventory alert",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create task from event",
        variant: "destructive"
      });
    }
  });

  // Simple PO mutation for manual restock feature
  const createSimplePoMutation = useMutation({
    mutationFn: async (poData: { sku: string; qty: number; supplierName: string }) => {
      const response = await apiRequest("POST", "/api/po", poData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "PO Created",
        description: "Purchase order created successfully",
      });
      setPoModalOpen(false);
      setPoForm({ supplier: "", quantity: "20", notes: "" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create purchase order",
        variant: "destructive"
      });
    }
  });

  const getRowClassName = (daysCover: number) => {
    if (daysCover <= 2) return "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800";
    if (daysCover <= 5) return "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800";
    return "";
  };

  const getDaysCoverBadge = (daysCover: number) => {
    if (daysCover <= 2) return "destructive";
    if (daysCover <= 5) return "default";
    return "secondary";
  };

  const handleCreateTask = (eventId: string) => {
    createTaskMutation.mutate(eventId);
  };

  const handleSuggestReorder = (sku: string) => {
    setSelectedSku(sku);
    setPoForm({ supplier: "", quantity: "20", notes: "" });
    setPoModalOpen(true);
  };

  const handleCreatePurchaseOrder = () => {
    if (!poForm.supplier || !poForm.quantity) {
      toast({
        title: "Validation Error",
        description: "Please fill in supplier name and quantity",
        variant: "destructive"
      });
      return;
    }

    createSimplePoMutation.mutate({
      sku: selectedSku,
      qty: parseInt(poForm.quantity),
      supplierName: poForm.supplier,
    });
  };

  return (
    <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 sm:gap-3">
            <Package className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
            <div className="min-w-0">
              <CardTitle className="text-lg sm:text-xl">Inventory Management</CardTitle>
              <CardDescription className="text-sm">
                Monitor stock levels, days cover, and manage reorder tasks
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[80px]">SKU</TableHead>
                  <TableHead className="min-w-[100px]">Channels</TableHead>
                  <TableHead className="text-right min-w-[60px]">Stock</TableHead>
                  <TableHead className="text-right min-w-[80px]">Threshold</TableHead>
                  <TableHead className="text-right min-w-[90px]">Days Cover</TableHead>
                  <TableHead className="min-w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {INVENTORY_DATA.map((item) => (
                  <TableRow 
                    key={item.sku} 
                    className={getRowClassName(item.daysCover)}
                  >
                    <TableCell className="font-medium">{item.sku}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {item.channels.map((channel) => (
                          <Badge key={channel} variant="outline" className="text-xs">
                            {channel}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.stock}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.threshold}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={getDaysCoverBadge(item.daysCover)}>
                        {item.daysCover.toFixed(1)} days
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                        {item.stock <= 5 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSuggestReorder(item.sku)}
                            className="text-xs w-full sm:w-auto"
                          >
                            <Package className="h-3 w-3 sm:mr-1" />
                            <span className="hidden sm:inline ml-1">Suggest Reorder</span>
                          </Button>
                        )}
                        {item.stock <= item.threshold && (
                          <>
                            {!item.hasLinkedTask && item.latestEventId ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCreateTask(item.latestEventId!)}
                                disabled={createTaskMutation.isPending}
                                className="text-xs w-full sm:w-auto"
                              >
                                <AlertTriangle className="h-3 w-3 sm:mr-1" />
                                <span className="hidden sm:inline ml-1">Create Task</span>
                              </Button>
                            ) : item.hasLinkedTask ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs w-full sm:w-auto"
                                disabled
                              >
                                <CheckCircle className="h-3 w-3 sm:mr-1" />
                                <span className="hidden sm:inline ml-1">Open Task</span>
                              </Button>
                            ) : null}
                          </>
                        )}

                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Color Legend
            </h4>
            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-200 dark:bg-red-800 rounded"></div>
                <span>Critical (≤2 days cover)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-200 dark:bg-amber-800 rounded"></div>
                <span>Low (≤5 days cover)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-muted-foreground/20 rounded"></div>
                <span>Healthy (&gt;5 days cover)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Simple Restock Modal */}
      <Dialog open={poModalOpen} onOpenChange={setPoModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Suggest Reorder</DialogTitle>
            <DialogDescription>
              Create a purchase order for {selectedSku}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>SKU Name</Label>
              <div className="p-2 bg-muted rounded text-sm font-medium">{selectedSku}</div>
            </div>
            <div className="grid gap-2">
              <Label>Current Stock</Label>
              <div className="p-2 bg-muted rounded text-sm">
                {INVENTORY_DATA.find(item => item.sku === selectedSku)?.stock || 0} units
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quantity">Recommended Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={poForm.quantity}
                onChange={(e) => setPoForm(prev => ({ ...prev, quantity: e.target.value }))}
                placeholder="20"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="supplier">Supplier Name</Label>
              <Input
                id="supplier"
                value={poForm.supplier}
                onChange={(e) => setPoForm(prev => ({ ...prev, supplier: e.target.value }))}
                placeholder="Enter supplier name"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setPoModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePurchaseOrder} disabled={createSimplePoMutation.isPending}>
              {createSimplePoMutation.isPending ? "Creating..." : "Create Purchase Order"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default InventoryPage;