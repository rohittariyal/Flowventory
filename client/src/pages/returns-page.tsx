import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Package, Eye, Edit, AlertCircle, CheckCircle, Clock, Truck, Search } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ReturnItem {
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface Return {
  id: string;
  rmaId: string;
  customerName: string;
  customerEmail: string;
  orderReference: string;
  items: ReturnItem[];
  reason: string;
  reasonDescription?: string;
  status: "requested" | "approved" | "in_transit" | "received" | "inspected" | "resolved";
  totalValue: number;
  currency: string;
  resolution: "refund" | "replace" | "credit" | "none";
  inspectionNotes?: string;
  inspectionPhotos: string[];
  createdAt: string;
  updatedAt: string;
}

const statusColors = {
  requested: "bg-gray-500",
  approved: "bg-blue-500",
  in_transit: "bg-yellow-500",
  received: "bg-orange-500",
  inspected: "bg-purple-500",
  resolved: "bg-green-500",
};

const statusIcons = {
  requested: AlertCircle,
  approved: CheckCircle,
  in_transit: Truck,
  received: Package,
  inspected: Search,
  resolved: CheckCircle,
};

const reasonLabels = {
  damaged: "Damaged",
  wrong_item: "Wrong Item",
  customer_remorse: "Customer Remorse",
  quality_issue: "Quality Issue",
  other: "Other",
};

const updateStatusSchema = z.object({
  status: z.enum(["requested", "approved", "in_transit", "received", "inspected", "resolved"]),
  inspectionNotes: z.string().optional(),
  resolution: z.enum(["refund", "replace", "credit", "none"]).optional(),
});

export default function ReturnsPage() {
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: returns = [], isLoading } = useQuery<Return[]>({
    queryKey: ["/api/returns"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const updateReturnMutation = useMutation({
    mutationFn: async (data: { id: string; updates: any }) => {
      const response = await fetch(`/api/returns/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data.updates),
      });
      if (!response.ok) throw new Error("Update failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/returns"] });
      setIsUpdateDialogOpen(false);
      setSelectedReturn(null);
      toast({
        title: "Return updated",
        description: "Return status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update return status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const form = useForm<z.infer<typeof updateStatusSchema>>({
    resolver: zodResolver(updateStatusSchema),
    defaultValues: {
      status: "requested",
      inspectionNotes: "",
      resolution: "none",
    },
  });

  const handleUpdateReturn = (returnItem: Return) => {
    setSelectedReturn(returnItem);
    form.reset({
      status: returnItem.status,
      inspectionNotes: returnItem.inspectionNotes || "",
      resolution: returnItem.resolution || "none",
    });
    setIsUpdateDialogOpen(true);
  };

  const onSubmit = (data: z.infer<typeof updateStatusSchema>) => {
    if (!selectedReturn) return;
    
    updateReturnMutation.mutate({
      id: selectedReturn.id,
      updates: data,
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    const value = amount / 100; // Convert from cents
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(value);
  };

  const getStatusIcon = (status: string) => {
    const Icon = statusIcons[status as keyof typeof statusIcons] || AlertCircle;
    return <Icon className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Returns & RMA</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage customer returns and warranty claims
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {returns.length} Returns
          </Badge>
        </div>
      </div>

      {/* Status Pipeline Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Return Status Pipeline
          </CardTitle>
          <CardDescription>
            Track the progress of returns through our processing workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between space-x-2 overflow-x-auto pb-2">
            {Object.entries(statusColors).map(([status, color], index) => {
              const count = returns.filter((r) => r.status === status).length;
              const Icon = statusIcons[status as keyof typeof statusIcons];
              return (
                <div key={status} className="flex items-center space-x-2 min-w-0 flex-1">
                  <div className="flex flex-col items-center space-y-1 min-w-0">
                    <div className={`${color} text-white p-2 rounded-lg flex items-center justify-center min-w-[40px] h-10`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="text-center min-w-0">
                      <p className="text-xs font-medium capitalize text-gray-900 dark:text-gray-100 truncate">
                        {status.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{count}</p>
                    </div>
                  </div>
                  {index < Object.keys(statusColors).length - 1 && (
                    <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1 min-w-[20px]" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Returns Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Returns</CardTitle>
          <CardDescription>
            Complete list of customer returns and RMA requests
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 dark:border-gray-700">
                <tr className="text-left">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    RMA ID
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Value
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {returns.map((returnItem) => (
                  <tr key={returnItem.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {returnItem.rmaId}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(returnItem.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {returnItem.customerName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {returnItem.customerEmail}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {returnItem.orderReference}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {returnItem.items.map((item, index) => (
                          <div key={index} className="mb-1 last:mb-0">
                            <span className="font-medium">{item.sku}</span>
                            <span className="text-gray-500 dark:text-gray-400 ml-1">
                              × {item.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {reasonLabels[returnItem.reason as keyof typeof reasonLabels]}
                      </div>
                      {returnItem.reasonDescription && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-32 truncate">
                          {returnItem.reasonDescription}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        className={`${statusColors[returnItem.status]} text-white flex items-center gap-1`}
                      >
                        {getStatusIcon(returnItem.status)}
                        {returnItem.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {formatCurrency(returnItem.totalValue, returnItem.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateReturn(returnItem)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Update Return Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Return Status</DialogTitle>
            <DialogDescription>
              Update the status and details for RMA {selectedReturn?.rmaId}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="requested">Requested</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="in_transit">In Transit</SelectItem>
                        <SelectItem value="received">Received</SelectItem>
                        <SelectItem value="inspected">Inspected</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {(["inspected", "resolved"] as const).includes(form.watch("status")) && (
                <FormField
                  control={form.control}
                  name="inspectionNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inspection Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add inspection notes..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {form.watch("status") === "resolved" && (
                <FormField
                  control={form.control}
                  name="resolution"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resolution</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select resolution" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="refund">Refund</SelectItem>
                          <SelectItem value="replace">Replace</SelectItem>
                          <SelectItem value="credit">Store Credit</SelectItem>
                          <SelectItem value="none">No Action</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsUpdateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateReturnMutation.isPending}>
                  {updateReturnMutation.isPending ? "Updating..." : "Update Return"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}