import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Settings, 
  Trash2, 
  Edit, 
  TestTube, 
  Truck, 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Types from the backend
interface ShippingProvider {
  id: string;
  name: string;
  description: string;
  logo: string;
  supported: boolean;
  countries: string[];
  credentialFields: Array<{
    key: string;
    label: string;
    type: string;
    required: boolean;
  }>;
}

interface ShippingConnector {
  id: string;
  organizationId: string;
  provider: string;
  name: string;
  status: 'inactive' | 'active' | 'error';
  encryptedCredentials: string;
  config: Record<string, any>;
  lastTestAt: Date | null;
  lastTestStatus: 'success' | 'failed' | null;
  createdAt: Date;
  updatedAt: Date;
}

// Form schemas
const connectorSchema = z.object({
  name: z.string().min(1, "Connector name is required"),
  provider: z.string().min(1, "Provider is required"),
  credentials: z.record(z.string().min(1, "This field is required")),
  config: z.record(z.any()).optional(),
});

type ConnectorFormData = z.infer<typeof connectorSchema>;

export default function ShippingSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState<ShippingConnector | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ShippingProvider | null>(null);
  const [isTestingConnector, setIsTestingConnector] = useState<string | null>(null);

  // Fetch shipping providers
  const { data: providers = [], isLoading: providersLoading } = useQuery({
    queryKey: ["/api/shipping/providers"],
  });

  // Fetch shipping connectors
  const { data: connectors = [], isLoading: connectorsLoading } = useQuery({
    queryKey: ["/api/shipping/connectors"],
  });

  // Type-safe access to query data
  const typedProviders = providers as ShippingProvider[];
  const typedConnectors = connectors as ShippingConnector[];

  // Create connector mutation
  const createConnectorMutation = useMutation({
    mutationFn: (data: ConnectorFormData) =>
      apiRequest("POST", "/api/shipping/connectors", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipping/connectors"] });
      setIsAddModalOpen(false);
      resetForm();
      toast({
        title: "Connector Created",
        description: "Shipping connector has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create shipping connector",
        variant: "destructive",
      });
    },
  });

  // Update connector mutation
  const updateConnectorMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Partial<ConnectorFormData>) =>
      apiRequest("PUT", `/api/shipping/connectors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipping/connectors"] });
      setIsEditModalOpen(false);
      resetForm();
      toast({
        title: "Connector Updated",
        description: "Shipping connector has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update shipping connector",
        variant: "destructive",
      });
    },
  });

  // Delete connector mutation
  const deleteConnectorMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/shipping/connectors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipping/connectors"] });
      setIsDeleteDialogOpen(false);
      setSelectedConnector(null);
      toast({
        title: "Connector Deleted",
        description: "Shipping connector has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete shipping connector",
        variant: "destructive",
      });
    },
  });

  // Test connector mutation
  const testConnectorMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("POST", `/api/shipping/connectors/${id}/test`),
    onSuccess: (data: any, id: string) => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipping/connectors"] });
      setIsTestingConnector(null);
      toast({
        title: data.success ? "Connection Successful" : "Connection Failed",
        description: data.success 
          ? "Shipping connector is working properly." 
          : data.error || "Connection test failed.",
        variant: data.success ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      setIsTestingConnector(null);
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test shipping connector",
        variant: "destructive",
      });
    },
  });

  // Form setup
  const form = useForm<ConnectorFormData>({
    resolver: zodResolver(connectorSchema),
    defaultValues: {
      name: "",
      provider: "",
      credentials: {},
      config: {},
    },
  });

  const resetForm = () => {
    form.reset();
    setSelectedProvider(null);
    setSelectedConnector(null);
  };

  const handleProviderSelect = (providerId: string) => {
    const provider = typedProviders.find((p: ShippingProvider) => p.id === providerId);
    setSelectedProvider(provider || null);
    form.setValue("provider", providerId);
    
    // Reset credentials when provider changes
    const emptyCredentials: Record<string, string> = {};
    provider?.credentialFields.forEach((field: any) => {
      emptyCredentials[field.key] = "";
    });
    form.setValue("credentials", emptyCredentials);
  };

  const handleAddConnector = () => {
    setSelectedConnector(null);
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleEditConnector = (connector: ShippingConnector) => {
    setSelectedConnector(connector);
    const provider = typedProviders.find((p: ShippingProvider) => p.id === connector.provider);
    setSelectedProvider(provider || null);
    
    form.setValue("name", connector.name);
    form.setValue("provider", connector.provider);
    // Note: We don't populate credentials for security reasons - they're encrypted
    const emptyCredentials: Record<string, string> = {};
    provider?.credentialFields.forEach((field: any) => {
      emptyCredentials[field.key] = "";
    });
    form.setValue("credentials", emptyCredentials);
    
    setIsEditModalOpen(true);
  };

  const handleDeleteConnector = (connector: ShippingConnector) => {
    setSelectedConnector(connector);
    setIsDeleteDialogOpen(true);
  };

  const handleTestConnection = async (connector: ShippingConnector) => {
    setIsTestingConnector(connector.id);
    testConnectorMutation.mutate(connector.id);
  };

  const onSubmit = (data: ConnectorFormData) => {
    if (selectedConnector) {
      updateConnectorMutation.mutate({ id: selectedConnector.id, ...data });
    } else {
      createConnectorMutation.mutate(data);
    }
  };

  const getStatusIcon = (status: ShippingConnector['status'], lastTestStatus: ShippingConnector['lastTestStatus']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'inactive':
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: ShippingConnector['status'], lastTestStatus: ShippingConnector['lastTestStatus']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Active</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Error</Badge>;
      case 'inactive':
      default:
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300">Inactive</Badge>;
    }
  };

  if (providersLoading || connectorsLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Shipping Integrations</h1>
            <p className="text-muted-foreground">Loading shipping providers and connectors...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6" data-testid="shipping-settings-page">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Shipping Integrations</h1>
          <p className="text-muted-foreground">
            Configure shipping providers to automatically calculate rates and create shipments.
          </p>
        </div>

        {/* Active Connectors */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Active Connectors
                </CardTitle>
                <CardDescription>
                  Manage your configured shipping provider connections.
                </CardDescription>
              </div>
              <Button onClick={handleAddConnector} data-testid="button-add-connector">
                <Plus className="h-4 w-4 mr-2" />
                Add Connector
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {typedConnectors.length === 0 ? (
              <div className="text-center py-8">
                <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No shipping connectors</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Get started by adding your first shipping provider integration.
                </p>
                <Button onClick={handleAddConnector} data-testid="button-add-first-connector">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Connector
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Test</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {typedConnectors.map((connector: ShippingConnector) => (
                    <TableRow key={connector.id} data-testid={`row-connector-${connector.id}`}>
                      <TableCell className="font-medium" data-testid={`text-connector-name-${connector.id}`}>
                        {connector.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {typedProviders.find((p: ShippingProvider) => p.id === connector.provider)?.name || connector.provider}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(connector.status, connector.lastTestStatus)}
                          {getStatusBadge(connector.status, connector.lastTestStatus)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {connector.lastTestAt ? (
                          <div className="flex items-center gap-2">
                            {connector.lastTestStatus === 'success' ? (
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            ) : (
                              <XCircle className="h-3 w-3 text-red-600" />
                            )}
                            <span className="text-sm text-gray-600">
                              {new Date(connector.lastTestAt).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Never tested</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {new Date(connector.createdAt).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestConnection(connector)}
                            disabled={isTestingConnector === connector.id}
                            data-testid={`button-test-${connector.id}`}
                          >
                            {isTestingConnector === connector.id ? (
                              <>
                                <Clock className="h-3 w-3 mr-1 animate-spin" />
                                Testing
                              </>
                            ) : (
                              <>
                                <TestTube className="h-3 w-3 mr-1" />
                                Test
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditConnector(connector)}
                            data-testid={`button-edit-${connector.id}`}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteConnector(connector)}
                            data-testid={`button-delete-${connector.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Available Providers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Available Providers
            </CardTitle>
            <CardDescription>
              Shipping providers that can be integrated with your system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {typedProviders.map((provider: ShippingProvider) => (
                <Card key={provider.id} className="relative">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center">
                          <Truck className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{provider.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {provider.description}
                          </p>
                        </div>
                      </div>
                      {provider.supported ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          Supported
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Coming Soon</Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <span>Countries: {provider.countries.join(", ")}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Connector Modal */}
        <Dialog open={isAddModalOpen || isEditModalOpen} onOpenChange={(open) => {
          if (!open) {
            setIsAddModalOpen(false);
            setIsEditModalOpen(false);
            resetForm();
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedConnector ? "Edit Shipping Connector" : "Add Shipping Connector"}
              </DialogTitle>
              <DialogDescription>
                {selectedConnector 
                  ? "Update your shipping provider connection settings."
                  : "Connect to a shipping provider to enable rate calculation and shipment creation."
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="connector-name">Connector Name</Label>
                <Input
                  id="connector-name"
                  {...form.register("name")}
                  placeholder="e.g., Primary Shiprocket Account"
                  data-testid="input-connector-name"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider-select">Shipping Provider</Label>
                <Select
                  value={form.watch("provider")}
                  onValueChange={handleProviderSelect}
                  disabled={!!selectedConnector} // Can't change provider when editing
                >
                  <SelectTrigger data-testid="select-provider">
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {typedProviders
                      .filter((provider: ShippingProvider) => provider.supported)
                      .map((provider: ShippingProvider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.provider && (
                  <p className="text-sm text-red-600">{form.formState.errors.provider.message}</p>
                )}
              </div>

              {selectedProvider && (
                <div className="space-y-4">
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-3">Credentials</h4>
                    {selectedConnector && (
                      <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
                        <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
                          <AlertCircle className="h-4 w-4" />
                          Leave fields empty to keep existing credentials
                        </div>
                      </div>
                    )}
                    {selectedProvider.credentialFields.map((field: any) => (
                      <div key={field.key} className="space-y-2">
                        <Label htmlFor={`credential-${field.key}`}>
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        <Input
                          id={`credential-${field.key}`}
                          type={field.type}
                          {...form.register(`credentials.${field.key}`)}
                          placeholder={selectedConnector ? "Leave empty to keep existing" : `Enter ${field.label.toLowerCase()}`}
                          data-testid={`input-credential-${field.key}`}
                        />
                        {form.formState.errors.credentials?.[field.key] && (
                          <p className="text-sm text-red-600">
                            {form.formState.errors.credentials[field.key]?.message}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                    resetForm();
                  }}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createConnectorMutation.isPending || updateConnectorMutation.isPending}
                  data-testid="button-save-connector"
                >
                  {createConnectorMutation.isPending || updateConnectorMutation.isPending ? (
                    "Saving..."
                  ) : selectedConnector ? (
                    "Update Connector"
                  ) : (
                    "Create Connector"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Shipping Connector</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedConnector?.name}"? This action cannot be undone.
                Any existing shipments using this connector will no longer sync status updates.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedConnector && deleteConnectorMutation.mutate(selectedConnector.id)}
                className="bg-red-600 hover:bg-red-700 text-white"
                data-testid="button-confirm-delete"
              >
                Delete Connector
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}