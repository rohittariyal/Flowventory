import { useState, useMemo, useEffect } from "react";
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
import { AlertTriangle, Package, Plus, FileText, CheckCircle, Search, Layers, Clock, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getAllProducts, type Product } from "@/data/seedProductData";
import { getBatchesByProduct, initializeBatchStorage } from "@/lib/batchStorage";
import { statusFor, getBatchSummary, fifoPick } from "@/lib/batchUtils";
interface BatchDrawerData {
  product: Product;
  batches: any[];
  summary: any;
}

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
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSku, setSelectedSku] = useState<string>("");
  const [poModalOpen, setPoModalOpen] = useState(false);
  const [batchDrawerOpen, setBatchDrawerOpen] = useState(false);
  const [batchDrawerData, setBatchDrawerData] = useState<BatchDrawerData | null>(null);
  const [poForm, setPoForm] = useState({
    supplier: "",
    quantity: "20",
    notes: ""
  });
  
  // Feature 2: Search and filter
  const [searchQuery, setSearchQuery] = useState("");

  // Initialize storage and load products
  useEffect(() => {
    initializeBatchStorage();
    const allProducts = getAllProducts();
    setProducts(allProducts);
  }, []);
  
  // Filter inventory data based on search query
  const filteredInventory = useMemo(() => {
    if (!searchQuery.trim()) return products;
    
    const query = searchQuery.toLowerCase().trim();
    return products.filter(product => 
      product.sku.toLowerCase().includes(query) ||
      product.name.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query) ||
      product.supplier.toLowerCase().includes(query) ||
      product.channels.some(channel => channel.toLowerCase().includes(query))
    );
  }, [searchQuery, products]);

  // Batch handling functions
  const handleOpenBatchDrawer = (product: Product) => {
    const batches = getBatchesByProduct(product.id);
    const summary = getBatchSummary(batches);
    
    setBatchDrawerData({
      product,
      batches,
      summary
    });
    setBatchDrawerOpen(true);
  };

  const getBatchStatusBadge = (product: Product) => {
    if (!product.isBatchTracked) {
      return (
        <Badge variant="outline" className="text-zinc-400 border-zinc-600">
          Simple Stock
        </Badge>
      );
    }

    const batches = getBatchesByProduct(product.id);
    if (batches.length === 0) {
      return (
        <Badge variant="outline" className="text-blue-400 border-blue-600">
          <Layers className="w-3 h-3 mr-1" />
          No Batches
        </Badge>
      );
    }

    const summary = getBatchSummary(batches);
    
    if (summary.expired.count > 0) {
      return (
        <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30 cursor-pointer hover:bg-red-500/30" 
               onClick={() => handleOpenBatchDrawer(product)}
               data-testid={`badge-batch-status-${product.sku}`}>
          <AlertTriangle className="w-3 h-3 mr-1" />
          {summary.expired.count} Expired
        </Badge>
      );
    } else if (summary.expiringSoon.count > 0) {
      return (
        <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 cursor-pointer hover:bg-yellow-500/30"
               onClick={() => handleOpenBatchDrawer(product)}
               data-testid={`badge-batch-status-${product.sku}`}>
          <Clock className="w-3 h-3 mr-1" />
          {summary.expiringSoon.count} Expiring
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 cursor-pointer hover:bg-green-500/30"
               onClick={() => handleOpenBatchDrawer(product)}
               data-testid={`badge-batch-status-${product.sku}`}>
          <Layers className="w-3 h-3 mr-1" />
          {summary.totalBatches} Batches
        </Badge>
      );
    }
  };

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
      const response = await fetch("/api/simple-po", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: poData.sku,
          qty: Number(poData.qty),
          supplierName: poData.supplierName
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error?.error || "Failed to create purchase order");
      }
      
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "PO Created",
        description: "Purchase order created successfully",
      });
      console.log("[PO] Frontend: Created PO", result.id, result.sku, result.qty, result.supplierName);
      setPoModalOpen(false);
      setPoForm({ supplier: "", quantity: "20", notes: "" });
    },
    onError: (error) => {
      console.error("Error creating purchase order:", error);
      toast({
        title: "Error",
        description: (error as any)?.message || "Failed to create purchase order",
        variant: "destructive"
      });
    }
  });

  // Feature 3: Low-stock highlight with accessibility
  const getRowClassName = (product: Product) => {
    const isLowStock = product.stock <= product.reorderPoint;
    if (isLowStock) {
      return "bg-red-50 dark:bg-red-950/20 border-l-4 border-l-red-500 dark:border-l-red-400";
    }
    if (product.daysCover <= 2) return "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800";
    if (product.daysCover <= 5) return "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800";
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
          {/* Feature 2: Search input */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search SKU / Supplier / Category"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[80px]">SKU</TableHead>
                  <TableHead className="min-w-[100px]">Channels</TableHead>
                  <TableHead className="text-right min-w-[60px]">Stock</TableHead>
                  <TableHead className="text-right min-w-[80px]">Threshold</TableHead>
                  <TableHead className="text-right min-w-[90px]">Days Cover</TableHead>
                  <TableHead className="min-w-[100px]">Batch Status</TableHead>
                  <TableHead className="min-w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.length === 0 && searchQuery.trim() ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No matches found for "{searchQuery}"
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInventory.map((product) => (
                  <TableRow 
                    key={product.sku} 
                    className={getRowClassName(product)}
                  >
                    <TableCell className="font-medium">
                      <Link 
                        href={`/products/${product.sku}`}
                        className="text-green-400 hover:text-green-300 hover:underline transition-colors"
                      >
                        {product.sku}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {product.channels.map((channel) => (
                          <Badge key={channel} variant="outline" className="text-xs">
                            {channel}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {product.stock}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {product.reorderPoint}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={getDaysCoverBadge(product.daysCover)}>
                        {product.daysCover.toFixed(1)} days
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {getBatchStatusBadge(product)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                        {product.stock <= 5 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSuggestReorder(product.sku)}
                            className="text-xs w-full sm:w-auto"
                          >
                            <Package className="h-3 w-3 sm:mr-1" />
                            <span className="hidden sm:inline ml-1">Suggest Reorder</span>
                          </Button>
                        )}
                        {product.stock <= product.reorderPoint && (
                          <>
                            {!product.hasLinkedTask && product.latestEventId ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCreateTask(product.latestEventId!)}
                                disabled={createTaskMutation.isPending}
                                className="text-xs w-full sm:w-auto"
                              >
                                <AlertTriangle className="h-3 w-3 sm:mr-1" />
                                <span className="hidden sm:inline ml-1">Create Task</span>
                              </Button>
                            ) : product.hasLinkedTask ? (
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
                  ))
                )}
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

      {/* Batch Details Drawer */}
      <Dialog open={batchDrawerOpen} onOpenChange={setBatchDrawerOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Batch Details - {batchDrawerData?.product.name}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              SKU: {batchDrawerData?.product.sku} | View and manage batch inventory
            </DialogDescription>
          </DialogHeader>
          
          {batchDrawerData && (
            <div className="space-y-6">
              {/* Batch Summary */}
              <Card className="bg-zinc-900 border-zinc-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Batch Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-zinc-400 text-sm">Total Batches</p>
                      <p className="text-white font-medium text-xl">{batchDrawerData.summary.totalBatches}</p>
                    </div>
                    <div>
                      <p className="text-zinc-400 text-sm">Total Quantity</p>
                      <p className="text-white font-medium text-xl">{batchDrawerData.summary.totalQty} units</p>
                    </div>
                    <div>
                      <p className="text-zinc-400 text-sm">Expiring Soon</p>
                      <p className="text-yellow-400 font-medium">{batchDrawerData.summary.expiringSoon.count} ({batchDrawerData.summary.expiringSoon.qty} units)</p>
                    </div>
                    <div>
                      <p className="text-zinc-400 text-sm">Expired</p>
                      <p className="text-red-400 font-medium">{batchDrawerData.summary.expired.count} ({batchDrawerData.summary.expired.qty} units)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* FIFO Allocation Preview */}
              {batchDrawerData.batches.length > 0 && (
                <Card className="bg-zinc-900 border-zinc-700">
                  <CardHeader>
                    <CardTitle className="text-white text-lg flex items-center gap-2">
                      <ChevronRight className="w-5 h-5" />
                      FIFO Allocation Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-zinc-400">Allocate Quantity:</Label>
                          <Input
                            type="number"
                            defaultValue="10"
                            className="bg-zinc-800 border-zinc-600 text-white mt-1"
                            onChange={(e) => {
                              const qty = parseInt(e.target.value) || 0;
                              const picks = fifoPick(batchDrawerData.batches, qty);
                              // Update FIFO preview (could add state for this)
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-zinc-400">Available for FIFO:</Label>
                          <p className="text-white font-medium text-lg mt-1">
                            {batchDrawerData.batches.filter(b => statusFor(b.expiryDate) !== "EXPIRED").reduce((sum, b) => sum + b.qty, 0)} units
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-zinc-800 rounded p-3">
                        <p className="text-zinc-400 text-sm mb-2">FIFO picks (earliest expiry first):</p>
                        <div className="space-y-1">
                          {fifoPick(batchDrawerData.batches, 10).map((pick, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="text-white">Batch {pick.batchNo}</span>
                              <span className="text-green-400">{pick.qty} units</span>
                              {pick.expiryDate && (
                                <span className="text-zinc-400">exp: {new Date(pick.expiryDate).toLocaleDateString()}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Batch List */}
              <Card className="bg-zinc-900 border-zinc-700">
                <CardHeader>
                  <CardTitle className="text-white text-lg">All Batches</CardTitle>
                </CardHeader>
                <CardContent>
                  {batchDrawerData.batches.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                      <p className="text-zinc-400">No batches found for this product</p>
                      <p className="text-zinc-500 text-sm">Enable batch tracking and receive batches to see them here</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-zinc-700">
                          <TableHead className="text-zinc-400">Batch No.</TableHead>
                          <TableHead className="text-zinc-400">Location</TableHead>
                          <TableHead className="text-zinc-400">Mfg Date</TableHead>
                          <TableHead className="text-zinc-400">Expiry Date</TableHead>
                          <TableHead className="text-zinc-400">Qty</TableHead>
                          <TableHead className="text-zinc-400">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {batchDrawerData.batches.map((batch) => {
                          const status = statusFor(batch.expiryDate);
                          return (
                            <TableRow key={batch.id} className="border-zinc-700">
                              <TableCell className="text-white font-medium">{batch.batchNo}</TableCell>
                              <TableCell className="text-white">{batch.locationId}</TableCell>
                              <TableCell className="text-zinc-400">
                                {batch.mfgDate ? new Date(batch.mfgDate).toLocaleDateString() : "—"}
                              </TableCell>
                              <TableCell className="text-zinc-400">
                                {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : "—"}
                              </TableCell>
                              <TableCell className="text-white font-medium">{batch.qty}</TableCell>
                              <TableCell>
                                {status === "EXPIRED" && (
                                  <Badge variant="destructive" className="bg-red-500/20 text-red-400">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Expired
                                  </Badge>
                                )}
                                {status === "EXPIRING_SOON" && (
                                  <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Expiring Soon
                                  </Badge>
                                )}
                                {status === "OK" && (
                                  <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    OK
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                {products.find(product => product.sku === selectedSku)?.stock || 0} units
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