import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TrendingUp, Calendar, Package } from "lucide-react";

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

interface ForecastData {
  sku: string;
  productName: string;
  suggestedQty: number;
  avgDailySales: number;
  daysLeft: number;
  forecastDemand?: number;
  nextReorderDate?: string;
  currentStock?: number;
}

interface CreatePOModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  forecastData?: ForecastData; // Pre-filled data from forecast
}

const createPOSchema = z.object({
  supplierId: z.string().min(1, "Please select a supplier"),
  sku: z.string().min(1, "SKU is required"),
  qty: z.number().min(1, "Quantity must be at least 1"),
  notes: z.string().optional(),
});

export function CreatePOModal({ isOpen, onClose, onSuccess, forecastData }: CreatePOModalProps) {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof createPOSchema>>({
    resolver: zodResolver(createPOSchema),
    defaultValues: {
      supplierId: "",
      sku: forecastData?.sku || "",
      qty: forecastData?.suggestedQty || 1,
      notes: forecastData ? 
        `AI Forecast Suggestion:\n• Predicted daily sales: ${forecastData.avgDailySales.toFixed(1)} units\n• Current stock will last: ${forecastData.daysLeft} days\n• Suggested reorder quantity: ${forecastData.suggestedQty} units${forecastData.nextReorderDate ? `\n• Recommended reorder date: ${forecastData.nextReorderDate}` : ''}` 
        : "",
    },
  });

  const fetchSuppliers = async () => {
    try {
      const response = await fetch("/api/suppliers");
      if (!response.ok) {
        throw new Error("Failed to fetch suppliers");
      }
      const data = await response.json();
      setSuppliers(data);

      // Auto-select supplier if we have forecast data
      if (forecastData?.sku) {
        const supplierForSku = data.find((supplier: Supplier) => 
          supplier.skus.some(skuData => skuData.sku === forecastData.sku)
        );
        if (supplierForSku) {
          form.setValue("supplierId", supplierForSku.id);
          setSelectedSupplier(supplierForSku);
        }
      }
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
      setLoading(true);
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

      await response.json();
      
      toast({
        title: "Purchase Order Created",
        description: `Successfully created PO for ${data.qty} units of ${data.sku}`,
      });

      form.reset();
      setSelectedSupplier(null);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error creating purchase order:", error);
      toast({
        title: "Error",
        description: "Failed to create purchase order",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSuppliers();
    }
  }, [isOpen]);

  // Reset form when forecast data changes
  useEffect(() => {
    if (forecastData) {
      form.reset({
        supplierId: "",
        sku: forecastData.sku,
        qty: forecastData.suggestedQty,
        notes: `AI Forecast Suggestion:\n• Predicted daily sales: ${forecastData.avgDailySales.toFixed(1)} units\n• Current stock will last: ${forecastData.daysLeft} days\n• Suggested reorder quantity: ${forecastData.suggestedQty} units${forecastData.nextReorderDate ? `\n• Recommended reorder date: ${forecastData.nextReorderDate}` : ''}`,
      });
    }
  }, [forecastData, form]);

  const skuInSupplier = selectedSupplier?.skus.find(skuData => 
    skuData.sku === form.watch("sku")
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-green-400" />
            Create Purchase Order
            {forecastData && (
              <Badge className="bg-green-600 text-white ml-2">
                <TrendingUp className="h-3 w-3 mr-1" />
                AI Suggested
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {forecastData ? 
              `Create a purchase order based on AI forecast analysis for ${forecastData.productName}` :
              "Create a new purchase order for inventory restocking"
            }
          </DialogDescription>
        </DialogHeader>

        {forecastData && (
          <div className="bg-zinc-800 rounded-lg p-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Current Stock:</span>
              <span className="text-white font-medium">{forecastData.currentStock || 'N/A'} units</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Days Remaining:</span>
              <span className={`font-medium ${forecastData.daysLeft < 7 ? 'text-red-400' : forecastData.daysLeft < 14 ? 'text-yellow-400' : 'text-green-400'}`}>
                {forecastData.daysLeft} days
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Avg Daily Sales:</span>
              <span className="text-green-400 font-medium">{forecastData.avgDailySales.toFixed(1)} units/day</span>
            </div>
            {forecastData.nextReorderDate && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Reorder Date:
                </span>
                <span className="text-blue-400 font-medium">{forecastData.nextReorderDate}</span>
              </div>
            )}
          </div>
        )}

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
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white" data-testid="select-supplier">
                        <SelectValue placeholder="Select a supplier" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          <div className="flex flex-col">
                            <span>{supplier.name}</span>
                            <span className="text-xs text-zinc-400">
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
              <div className="text-xs text-zinc-400 bg-zinc-800 p-2 rounded">
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
                    <Input 
                      placeholder="Enter SKU" 
                      {...field}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      data-testid="input-sku"
                      readOnly={!!forecastData} // Make read-only if from forecast
                    />
                  </FormControl>
                  {skuInSupplier && (
                    <div className="text-xs text-green-400">
                      ✓ Available from {selectedSupplier?.name} • Unit Cost: £{skuInSupplier.unitCost} • MOQ: {skuInSupplier.moq}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="qty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Quantity
                    {forecastData && (
                      <Badge variant="outline" className="ml-2 text-green-400 border-green-400">
                        AI Suggested: {forecastData.suggestedQty}
                      </Badge>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Enter quantity"
                      {...field}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 1)}
                      data-testid="input-quantity"
                    />
                  </FormControl>
                  {skuInSupplier && field.value < skuInSupplier.moq && (
                    <div className="text-xs text-yellow-400">
                      ⚠️ Below minimum order quantity of {skuInSupplier.moq}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes {forecastData && "(AI Generated)"}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any notes for this purchase order"
                      {...field}
                      className="bg-zinc-800 border-zinc-700 text-white"
                      rows={forecastData ? 6 : 3}
                      data-testid="input-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="border-zinc-700 text-zinc-400 hover:text-white"
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white"
                data-testid="button-create-po"
              >
                {loading ? "Creating..." : "Create Purchase Order"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}