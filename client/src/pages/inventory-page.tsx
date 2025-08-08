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
    quantity: "",
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

  // Create PO mutation
  const createPoMutation = useMutation({
    mutationFn: async (poData: any) => {
      const response = await apiRequest("POST", "/api/purchase-orders", poData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Draft PO Created",
        description: "Purchase order draft saved successfully",
      });
      setPoModalOpen(false);
      setPoForm({ supplier: "", quantity: "", notes: "" });
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

  const handleCreatePo = (sku: string) => {
    setSelectedSku(sku);
    setPoModalOpen(true);
  };

  const handleSubmitPo = () => {
    if (!poForm.supplier || !poForm.quantity) {
      toast({
        title: "Validation Error",
        description: "Please fill in supplier and quantity",
        variant: "destructive"
      });
      return;
    }

    createPoMutation.mutate({
      sku: selectedSku,
      supplier: poForm.supplier,
      quantity: parseInt(poForm.quantity),
      notes: poForm.notes,
      status: "draft"
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Inventory Management</CardTitle>
              <CardDescription>
                Monitor stock levels, days cover, and manage reorder tasks
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Channels</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Threshold</TableHead>
                  <TableHead className="text-right">Days Cover</TableHead>
                  <TableHead>Actions</TableHead>
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
                      <div className="flex gap-2">
                        {item.stock <= item.threshold && (
                          <>
                            {!item.hasLinkedTask && item.latestEventId ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCreateTask(item.latestEventId!)}
                                disabled={createTaskMutation.isPending}
                                className="text-xs"
                              >
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Create Task
                              </Button>
                            ) : item.hasLinkedTask ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                disabled
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Open Task
                              </Button>
                            ) : null}
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCreatePo(item.sku)}
                          className="text-xs"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Draft PO
                        </Button>
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

      {/* Draft PO Modal */}
      <Dialog open={poModalOpen} onOpenChange={setPoModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Draft Purchase Order</DialogTitle>
            <DialogDescription>
              Create a draft PO for SKU: {selectedSku}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Select value={poForm.supplier} onValueChange={(value) => setPoForm(prev => ({ ...prev, supplier: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPLIERS.map((supplier) => (
                    <SelectItem key={supplier} value={supplier}>
                      {supplier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={poForm.quantity}
                onChange={(e) => setPoForm(prev => ({ ...prev, quantity: e.target.value }))}
                placeholder="Enter quantity"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={poForm.notes}
                onChange={(e) => setPoForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any notes or requirements"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setPoModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitPo} disabled={createPoMutation.isPending}>
              {createPoMutation.isPending ? "Creating..." : "Create Draft PO"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default InventoryPage;