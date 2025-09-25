import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Package, Calendar, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

import { Product, BatchInventory } from "@/data/seedProductData";
import { 
  getBatchesByProduct, 
  updateProductBatchTracking, 
  receiveBatch, 
  getAllLocations,
  initializeBatchStorage 
} from "@/lib/batchStorage";
import { 
  statusFor, 
  formatDate, 
  calculateExpiryDate, 
  validateBatch, 
  getBatchSummary 
} from "@/lib/batchUtils";

interface BatchesTabProps {
  product: Product;
  onProductUpdate?: (updatedProduct: Product) => void;
}

const receiveBatchSchema = z.object({
  locationId: z.string().min(1, "Location is required"),
  batchNo: z.string().min(1, "Batch number is required"),
  qty: z.number().min(1, "Quantity must be greater than 0"),
  mfgDate: z.string().optional(),
  expiryDate: z.string().optional(),
  note: z.string().optional()
});

type ReceiveBatchForm = z.infer<typeof receiveBatchSchema>;

export function BatchesTab({ product, onProductUpdate }: BatchesTabProps) {
  const [batches, setBatches] = useState<BatchInventory[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const form = useForm<ReceiveBatchForm>({
    resolver: zodResolver(receiveBatchSchema),
    defaultValues: {
      locationId: "",
      batchNo: "",
      qty: 1,
      mfgDate: "",
      expiryDate: "",
      note: ""
    }
  });

  // Initialize storage and load data
  useEffect(() => {
    initializeBatchStorage();
    loadBatches();
    loadLocations();
  }, [product.id]);

  const loadBatches = () => {
    try {
      const productBatches = getBatchesByProduct(product.id);
      setBatches(productBatches);
    } catch (error) {
      console.error("Error loading batches:", error);
      toast({
        title: "Error",
        description: "Failed to load batch data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadLocations = () => {
    try {
      const availableLocations = getAllLocations();
      // Add current product location if not in list
      if (product.location && !availableLocations.includes(product.location)) {
        availableLocations.push(product.location);
      }
      // Add some default locations if none exist
      if (availableLocations.length === 0) {
        availableLocations.push("Warehouse A-1", "Warehouse B-2", "Store Front");
      }
      setLocations(availableLocations.sort());
    } catch (error) {
      console.error("Error loading locations:", error);
    }
  };

  const handleBatchTrackingToggle = async (enabled: boolean) => {
    try {
      const success = updateProductBatchTracking(
        product.id, 
        enabled, 
        enabled ? (product.shelfLifeDays || 365) : undefined
      );
      
      if (success) {
        const updatedProduct = { ...product, isBatchTracked: enabled };
        if (enabled && !product.shelfLifeDays) {
          updatedProduct.shelfLifeDays = 365;
        }
        
        onProductUpdate?.(updatedProduct);
        
        toast({
          title: enabled ? "Batch Tracking Enabled" : "Batch Tracking Disabled",
          description: enabled 
            ? "This product now tracks inventory by batches with expiry dates" 
            : "This product will use simple stock tracking"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update batch tracking setting",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error updating batch tracking:", error);
      toast({
        title: "Error", 
        description: "Failed to update batch tracking setting",
        variant: "destructive"
      });
    }
  };

  const handleReceiveBatch = async (data: ReceiveBatchForm) => {
    try {
      // Calculate expiry date if manufacturing date is provided but expiry is not
      let finalExpiryDate = data.expiryDate;
      if (data.mfgDate && !data.expiryDate && product.shelfLifeDays) {
        finalExpiryDate = calculateExpiryDate(data.mfgDate, product.shelfLifeDays);
      }

      // Validate batch data
      const validation = validateBatch({
        batchNo: data.batchNo,
        qty: data.qty,
        mfgDate: data.mfgDate,
        expiryDate: finalExpiryDate
      });

      if (!validation.isValid) {
        toast({
          title: "Validation Error",
          description: validation.errors.join(", "),
          variant: "destructive"
        });
        return;
      }

      // Receive the batch
      const result = receiveBatch(
        product.id,
        data.locationId,
        data.batchNo,
        data.qty,
        data.mfgDate,
        finalExpiryDate,
        "MANUAL",
        undefined,
        data.note
      );

      // Reload batches
      loadBatches();

      // Reset form and close modal
      form.reset();
      setReceiveModalOpen(false);

      toast({
        title: "Batch Received",
        description: `Successfully received ${data.qty} units of batch ${data.batchNo}`,
      });

    } catch (error) {
      console.error("Error receiving batch:", error);
      toast({
        title: "Error",
        description: "Failed to receive batch",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (batch: BatchInventory) => {
    const status = statusFor(batch.expiryDate);
    
    switch (status) {
      case "EXPIRED":
        return (
          <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Expired
          </Badge>
        );
      case "EXPIRING_SOON":
        return (
          <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Expiring Soon
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            OK
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-zinc-950 border-zinc-800">
        <CardContent className="py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-zinc-800 rounded w-1/4"></div>
            <div className="h-32 bg-zinc-800 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const batchSummary = getBatchSummary(batches);

  return (
    <div className="space-y-6">
      {/* Batch Tracking Configuration */}
      <Card className="bg-zinc-950 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Package className="w-5 h-5" />
            Batch Tracking Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="batch-tracking" className="text-white font-medium">
                Enable Batch Tracking
              </Label>
              <p className="text-sm text-zinc-400 mt-1">
                Track this product's inventory by individual batches with expiry dates
              </p>
            </div>
            <Switch
              id="batch-tracking"
              checked={product.isBatchTracked || false}
              onCheckedChange={handleBatchTrackingToggle}
              data-testid="toggle-batch-tracking"
            />
          </div>
          
          {product.isBatchTracked && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
              <div>
                <Label className="text-zinc-400 text-sm">Default Shelf Life</Label>
                <p className="text-white font-medium">{product.shelfLifeDays || 365} days</p>
              </div>
              <div>
                <Label className="text-zinc-400 text-sm">Total Batches</Label>
                <p className="text-white font-medium">{batchSummary.totalBatches}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Inventory Table */}
      {product.isBatchTracked && (
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Batch Inventory</CardTitle>
            <Dialog open={receiveModalOpen} onOpenChange={setReceiveModalOpen}>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-receive-batch"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Receive Batch
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md">
                <DialogHeader>
                  <DialogTitle>Receive New Batch</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(handleReceiveBatch)} className="space-y-4">
                  <div>
                    <Label htmlFor="locationId">Location</Label>
                    <Select value={form.watch("locationId")} onValueChange={(value) => form.setValue("locationId", value)}>
                      <SelectTrigger className="bg-zinc-900 border-zinc-700">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        {locations.map((location) => (
                          <SelectItem key={location} value={location}>
                            {location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="batchNo">Batch Number</Label>
                    <Input
                      id="batchNo"
                      {...form.register("batchNo")}
                      className="bg-zinc-900 border-zinc-700"
                      placeholder="Enter batch number"
                      data-testid="input-batch-number"
                    />
                  </div>

                  <div>
                    <Label htmlFor="qty">Quantity</Label>
                    <Input
                      id="qty"
                      type="number"
                      {...form.register("qty", { valueAsNumber: true })}
                      className="bg-zinc-900 border-zinc-700"
                      min="1"
                      data-testid="input-quantity"
                    />
                  </div>

                  <div>
                    <Label htmlFor="mfgDate">Manufacturing Date (Optional)</Label>
                    <Input
                      id="mfgDate"
                      type="date"
                      {...form.register("mfgDate")}
                      className="bg-zinc-900 border-zinc-700"
                      data-testid="input-mfg-date"
                    />
                  </div>

                  <div>
                    <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
                    <Input
                      id="expiryDate"
                      type="date"
                      {...form.register("expiryDate")}
                      className="bg-zinc-900 border-zinc-700"
                      data-testid="input-expiry-date"
                    />
                    {form.watch("mfgDate") && !form.watch("expiryDate") && product.shelfLifeDays && (
                      <p className="text-sm text-zinc-400 mt-1">
                        Will auto-calculate: {formatDate(calculateExpiryDate(form.watch("mfgDate") || "", product.shelfLifeDays))}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="note">Notes (Optional)</Label>
                    <Textarea
                      id="note"
                      {...form.register("note")}
                      className="bg-zinc-900 border-zinc-700"
                      placeholder="Add any notes about this batch"
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button 
                      type="submit" 
                      className="bg-green-600 hover:bg-green-700 flex-1"
                      data-testid="button-create-batch"
                    >
                      Receive Batch
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setReceiveModalOpen(false)}
                      className="border-zinc-700"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {batches.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <p className="text-zinc-400 mb-2">No batches found</p>
                <p className="text-sm text-zinc-500">
                  Receive your first batch to start tracking inventory by lot numbers and expiry dates
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800">
                    <TableHead className="text-zinc-400">Location</TableHead>
                    <TableHead className="text-zinc-400">Batch No.</TableHead>
                    <TableHead className="text-zinc-400">Mfg Date</TableHead>
                    <TableHead className="text-zinc-400">Expiry Date</TableHead>
                    <TableHead className="text-zinc-400">Qty</TableHead>
                    <TableHead className="text-zinc-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch) => (
                    <TableRow 
                      key={batch.id} 
                      className="border-zinc-800"
                      data-testid={`row-batch-${batch.batchNo}`}
                    >
                      <TableCell className="text-white">{batch.locationId}</TableCell>
                      <TableCell className="text-white font-medium">{batch.batchNo}</TableCell>
                      <TableCell className="text-zinc-400">
                        {batch.mfgDate ? formatDate(batch.mfgDate) : "—"}
                      </TableCell>
                      <TableCell className="text-zinc-400">
                        {batch.expiryDate ? formatDate(batch.expiryDate) : "—"}
                      </TableCell>
                      <TableCell className="text-white font-medium">{batch.qty}</TableCell>
                      <TableCell>{getStatusBadge(batch)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Batch Summary */}
      {product.isBatchTracked && batches.length > 0 && (
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">Batch Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-zinc-400 text-sm">Total Quantity</p>
                <p className="text-white font-medium text-lg">{batchSummary.totalQty} units</p>
              </div>
              <div>
                <p className="text-zinc-400 text-sm">OK Batches</p>
                <p className="text-green-400 font-medium">{batchSummary.ok.count} ({batchSummary.ok.qty} units)</p>
              </div>
              <div>
                <p className="text-zinc-400 text-sm">Expiring Soon</p>
                <p className="text-yellow-400 font-medium">{batchSummary.expiringSoon.count} ({batchSummary.expiringSoon.qty} units)</p>
              </div>
              <div>
                <p className="text-zinc-400 text-sm">Expired</p>
                <p className="text-red-400 font-medium">{batchSummary.expired.count} ({batchSummary.expired.qty} units)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}