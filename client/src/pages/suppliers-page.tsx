import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Building2, 
  Clock, 
  CreditCard, 
  Eye, 
  Edit, 
  Archive,
  Truck,
  Package
} from "lucide-react";

// Schema for supplier form
const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  region: z.enum(["US", "UK", "UAE", "Singapore", "India", "Other"]),
  currency: z.enum(["USD", "GBP", "AED", "SGD"]),
  leadTimeDays: z.number().min(1, "Lead time must be at least 1 day"),
  paymentTerms: z.string().min(1, "Payment terms are required"),
  notes: z.string().optional().or(z.literal("")),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  region: string;
  currency: string;
  leadTimeDays: number;
  paymentTerms: string;
  notes?: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

interface SupplierStats {
  topSuppliers: Array<{ name: string; poCount: number }>;
  avgLeadTime: number;
  pendingPOs: number;
}

export default function SuppliersPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch suppliers
  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
    refetchInterval: 30000,
  });

  // Fetch supplier stats
  const { data: stats } = useQuery<SupplierStats>({
    queryKey: ["/api/suppliers/stats"],
    refetchInterval: 30000,
  });

  // Add supplier mutation
  const addSupplierMutation = useMutation({
    mutationFn: async (data: SupplierFormData) => {
      const response = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to add supplier");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers/stats"] });
      setIsAddDialogOpen(false);
      toast({
        title: "Success",
        description: "Supplier added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add supplier",
        variant: "destructive",
      });
    },
  });

  // Update supplier mutation
  const updateSupplierMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SupplierFormData }) => {
      const response = await fetch(`/api/suppliers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update supplier");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers/stats"] });
      setIsEditDialogOpen(false);
      toast({
        title: "Success",
        description: "Supplier updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update supplier",
        variant: "destructive",
      });
    },
  });

  // Archive supplier mutation
  const archiveSupplierMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/suppliers/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to archive supplier");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers/stats"] });
      toast({
        title: "Success",
        description: "Supplier archived successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to archive supplier",
        variant: "destructive",
      });
    },
  });

  // Form setup
  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      region: "US",
      currency: "USD",
      leadTimeDays: 7,
      paymentTerms: "Net 30",
      notes: "",
    },
  });

  const editForm = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
  });

  const handleAddSupplier = (data: SupplierFormData) => {
    addSupplierMutation.mutate(data);
  };

  const handleUpdateSupplier = (data: SupplierFormData) => {
    if (selectedSupplier) {
      updateSupplierMutation.mutate({ id: selectedSupplier.id, data });
    }
  };

  const handleArchiveSupplier = (id: string) => {
    archiveSupplierMutation.mutate(id);
  };

  const handleViewSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsViewDialogOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    editForm.reset({
      name: supplier.name,
      email: supplier.email || "",
      phone: supplier.phone || "",
      region: supplier.region as any,
      currency: supplier.currency as any,
      leadTimeDays: supplier.leadTimeDays,
      paymentTerms: supplier.paymentTerms,
      notes: supplier.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    return status === "active" 
      ? <Badge className="bg-green-900/30 text-green-400 border-green-500/30">Active</Badge>
      : <Badge className="bg-gray-700/30 text-gray-400 border-gray-500/30">Archived</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-8 bg-gray-800 rounded animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-800 rounded animate-pulse"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-800 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Truck className="h-8 w-8 text-primary" />
              Supplier Management
            </h1>
            <p className="text-gray-400 mt-1">
              Manage your suppliers, track performance, and optimize supply chain operations
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/80">
                <Plus className="h-4 w-4 mr-2" />
                Add Supplier
              </Button>
            </DialogTrigger>
            <AddSupplierDialog
              form={form}
              onSubmit={handleAddSupplier}
              isLoading={addSupplierMutation.isPending}
            />
          </Dialog>
        </div>

        {/* Dashboard Widgets */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Top Active Suppliers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.topSuppliers.slice(0, 3).map((supplier, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-foreground truncate flex-1 mr-2">
                        {supplier.name}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {supplier.poCount} POs
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Average Lead Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {stats.avgLeadTime} days
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all active suppliers
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Pending Purchase Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-400">
                  {stats.pendingPOs}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Awaiting fulfillment
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Suppliers Table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              All Suppliers ({suppliers.length})
            </CardTitle>
            <CardDescription>
              Manage your supplier relationships and track key metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Lead Time</TableHead>
                    <TableHead>Payment Terms</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-foreground">
                            {supplier.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {supplier.currency}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {supplier.region}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {supplier.email && (
                            <div className="text-muted-foreground">{supplier.email}</div>
                          )}
                          {supplier.phone && (
                            <div className="text-muted-foreground">{supplier.phone}</div>
                          )}
                          {!supplier.email && !supplier.phone && (
                            <span className="text-muted-foreground">No contact info</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{supplier.leadTimeDays} days</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <span>{supplier.paymentTerms}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(supplier.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewSupplier(supplier)}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSupplier(supplier)}
                            className="text-yellow-400 hover:text-yellow-300"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleArchiveSupplier(supplier.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {suppliers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No suppliers found. Add your first supplier to get started.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* View Supplier Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          {selectedSupplier && (
            <ViewSupplierDialog
              supplier={selectedSupplier}
              onClose={() => setIsViewDialogOpen(false)}
            />
          )}
        </Dialog>

        {/* Edit Supplier Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          {selectedSupplier && (
            <EditSupplierDialog
              form={editForm}
              supplier={selectedSupplier}
              onSubmit={handleUpdateSupplier}
              isLoading={updateSupplierMutation.isPending}
            />
          )}
        </Dialog>
      </div>
    </div>
  );
}

// Add Supplier Dialog Component
function AddSupplierDialog({ 
  form, 
  onSubmit, 
  isLoading 
}: { 
  form: any; 
  onSubmit: (data: SupplierFormData) => void; 
  isLoading: boolean;
}) {
  return (
    <DialogContent className="sm:max-w-[425px] bg-card border-border">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-foreground">
          <Plus className="h-5 w-5 text-primary" />
          Add New Supplier
        </DialogTitle>
        <DialogDescription className="text-muted-foreground">
          Add a new supplier to your network. Fill in the required information below.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Supplier Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter supplier name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="contact@supplier.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 555 123 4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select region" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="UK">United Kingdom</SelectItem>
                      <SelectItem value="UAE">UAE</SelectItem>
                      <SelectItem value="Singapore">Singapore</SelectItem>
                      <SelectItem value="India">India</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="AED">AED (د.إ)</SelectItem>
                      <SelectItem value="SGD">SGD (S$)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="leadTimeDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lead Time (Days) *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="7" 
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="paymentTerms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Terms *</FormLabel>
                  <FormControl>
                    <Input placeholder="Net 30" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Additional notes about this supplier..."
                    className="resize-none"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
              disabled={isLoading}
            >
              Reset
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/80">
              {isLoading ? "Adding..." : "Add Supplier"}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}

// View Supplier Dialog Component
function ViewSupplierDialog({ 
  supplier, 
  onClose 
}: { 
  supplier: Supplier; 
  onClose: () => void;
}) {
  return (
    <DialogContent className="sm:max-w-[500px] bg-card border-border">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-foreground">
          <Eye className="h-5 w-5 text-blue-400" />
          Supplier Details
        </DialogTitle>
        <DialogDescription className="text-muted-foreground">
          View detailed information about this supplier
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-muted-foreground">Supplier Name</Label>
            <p className="text-foreground font-medium">{supplier.name}</p>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Status</Label>
            <div className="mt-1">
              {supplier.status === "active" 
                ? <Badge className="bg-green-900/30 text-green-400 border-green-500/30">Active</Badge>
                : <Badge className="bg-gray-700/30 text-gray-400 border-gray-500/30">Archived</Badge>
              }
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-muted-foreground">Email</Label>
            <p className="text-foreground">{supplier.email || "Not provided"}</p>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Phone</Label>
            <p className="text-foreground">{supplier.phone || "Not provided"}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-muted-foreground">Region</Label>
            <Badge variant="outline" className="mt-1">{supplier.region}</Badge>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Currency</Label>
            <p className="text-foreground font-mono">{supplier.currency}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-muted-foreground">Lead Time</Label>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">{supplier.leadTimeDays} days</span>
            </div>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Payment Terms</Label>
            <div className="flex items-center gap-2 mt-1">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-foreground">{supplier.paymentTerms}</span>
            </div>
          </div>
        </div>

        {supplier.notes && (
          <div>
            <Label className="text-sm text-muted-foreground">Notes</Label>
            <p className="text-foreground mt-1 text-sm bg-muted/10 p-3 rounded-md">
              {supplier.notes}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
          <div>
            <Label className="text-sm text-muted-foreground">Created</Label>
            <p>{new Date(supplier.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">Last Updated</Label>
            <p>{new Date(supplier.updatedAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={onClose}>Close</Button>
      </div>
    </DialogContent>
  );
}

// Edit Supplier Dialog Component  
function EditSupplierDialog({ 
  form, 
  supplier, 
  onSubmit, 
  isLoading 
}: { 
  form: any; 
  supplier: Supplier;
  onSubmit: (data: SupplierFormData) => void; 
  isLoading: boolean;
}) {
  return (
    <DialogContent className="sm:max-w-[425px] bg-card border-border">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-foreground">
          <Edit className="h-5 w-5 text-yellow-400" />
          Edit Supplier
        </DialogTitle>
        <DialogDescription className="text-muted-foreground">
          Update supplier information. Changes will be saved automatically.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Supplier Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter supplier name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="contact@supplier.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 555 123 4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="UK">United Kingdom</SelectItem>
                      <SelectItem value="UAE">UAE</SelectItem>
                      <SelectItem value="Singapore">Singapore</SelectItem>
                      <SelectItem value="India">India</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currency *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="AED">AED (د.إ)</SelectItem>
                      <SelectItem value="SGD">SGD (S$)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="leadTimeDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lead Time (Days) *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="7" 
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="paymentTerms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Terms *</FormLabel>
                  <FormControl>
                    <Input placeholder="Net 30" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Additional notes about this supplier..."
                    className="resize-none"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
              disabled={isLoading}
            >
              Reset
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/80">
              {isLoading ? "Updating..." : "Update Supplier"}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}