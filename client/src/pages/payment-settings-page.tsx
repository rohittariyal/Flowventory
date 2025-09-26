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
  CreditCard,
  Shield,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Banknote
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Types from the backend
interface PaymentProvider {
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

interface PaymentConnector {
  id: string;
  provider: string;
  name: string;
  status: 'inactive' | 'active' | 'error';
  createdAt: string;
  lastTestAt: string | null;
  lastTestStatus: 'success' | 'failed' | null;
}

// Form schemas
const connectorSchema = z.object({
  name: z.string().min(1, "Connector name is required"),
  provider: z.string().min(1, "Provider is required"),
  credentials: z.record(z.string().min(1, "This field is required")),
});

type ConnectorFormData = z.infer<typeof connectorSchema>;

export default function PaymentSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedConnector, setSelectedConnector] = useState<PaymentConnector | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider | null>(null);
  const [isTestingConnector, setIsTestingConnector] = useState<string | null>(null);

  // Fetch payment providers
  const { data: providers = [], isLoading: providersLoading } = useQuery({
    queryKey: ["/api/pay/providers"],
  });

  // Fetch payment connectors
  const { data: connectors = [], isLoading: connectorsLoading } = useQuery({
    queryKey: ["/api/pay/connectors"],
  });

  // Type-safe access to query data
  const typedProviders = providers as PaymentProvider[];
  const typedConnectors = connectors as PaymentConnector[];

  // Create connector mutation
  const createConnectorMutation = useMutation({
    mutationFn: (data: ConnectorFormData) =>
      apiRequest("POST", "/api/pay/connectors", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pay/connectors"] });
      setIsAddModalOpen(false);
      resetForm();
      toast({
        title: "Connector Created",
        description: "Payment connector has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create payment connector",
        variant: "destructive",
      });
    },
  });

  // Delete connector mutation
  const deleteConnectorMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/pay/connectors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pay/connectors"] });
      setIsDeleteDialogOpen(false);
      setSelectedConnector(null);
      toast({
        title: "Connector Deleted",
        description: "Payment connector has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete payment connector",
        variant: "destructive",
      });
    },
  });

  // Test connector mutation
  const testConnectorMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("POST", `/api/pay/connectors/${id}/test`),
    onSuccess: (result: any, id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pay/connectors"] });
      setIsTestingConnector(null);
      if (result.success) {
        toast({
          title: "Connection Successful",
          description: "Payment connector is working correctly.",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.error || "Connection test failed",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      setIsTestingConnector(null);
      toast({
        title: "Error",
        description: error.message || "Failed to test payment connector",
        variant: "destructive",
      });
    },
  });

  // Form handling
  const form = useForm<ConnectorFormData>({
    resolver: zodResolver(connectorSchema),
    defaultValues: {
      name: "",
      provider: "",
      credentials: {},
    },
  });

  const resetForm = () => {
    form.reset();
    setSelectedProvider(null);
  };

  const handleProviderChange = (providerId: string) => {
    const provider = typedProviders.find((p) => p.id === providerId);
    setSelectedProvider(provider || null);
    form.setValue("provider", providerId);
    
    // Initialize credentials object with empty strings
    if (provider) {
      const initialCredentials: Record<string, string> = {};
      provider.credentialFields.forEach((field) => {
        initialCredentials[field.key] = "";
      });
      form.setValue("credentials", initialCredentials);
    }
  };

  const onSubmit = (data: ConnectorFormData) => {
    createConnectorMutation.mutate(data);
  };

  const handleTestConnector = (connector: PaymentConnector) => {
    setIsTestingConnector(connector.id);
    testConnectorMutation.mutate(connector.id);
  };

  const handleDeleteConnector = (connector: PaymentConnector) => {
    setSelectedConnector(connector);
    setIsDeleteDialogOpen(true);
  };

  const getStatusIcon = (status: string, lastTestStatus: string | null) => {
    if (status === 'active' && lastTestStatus === 'success') {
      return <CheckCircle className="h-4 w-4 text-green-600" data-testid="status-active" />;
    } else if (status === 'active' && lastTestStatus === 'failed') {
      return <AlertCircle className="h-4 w-4 text-yellow-600" data-testid="status-warning" />;
    } else if (status === 'error') {
      return <XCircle className="h-4 w-4 text-red-600" data-testid="status-error" />;
    } else {
      return <Clock className="h-4 w-4 text-gray-400" data-testid="status-pending" />;
    }
  };

  const getStatusBadge = (status: string, lastTestStatus: string | null) => {
    if (status === 'active' && lastTestStatus === 'success') {
      return <Badge variant="default" className="bg-green-100 text-green-800" data-testid="badge-active">Active</Badge>;
    } else if (status === 'active' && lastTestStatus === 'failed') {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800" data-testid="badge-warning">Test Failed</Badge>;
    } else if (status === 'error') {
      return <Badge variant="destructive" data-testid="badge-error">Error</Badge>;
    } else {
      return <Badge variant="outline" data-testid="badge-inactive">Inactive</Badge>;
    }
  };

  if (providersLoading || connectorsLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-64 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="title-payment-settings">Payment Settings</h1>
          <p className="text-muted-foreground" data-testid="subtitle-payment-settings">
            Manage payment gateway connections and configure payment processing
          </p>
        </div>
        <Button 
          onClick={() => setIsAddModalOpen(true)} 
          className="bg-primary hover:bg-primary/90"
          data-testid="button-add-connector"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Payment Connector
        </Button>
      </div>

      {/* Payment Connectors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span data-testid="title-connectors">Payment Connectors</span>
          </CardTitle>
          <CardDescription data-testid="description-connectors">
            Active payment gateway integrations for processing customer payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {typedConnectors.length === 0 ? (
            <div className="text-center py-12">
              <Banknote className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2" data-testid="text-no-connectors">
                No payment connectors configured
              </h3>
              <p className="text-gray-500 mb-4" data-testid="text-no-connectors-description">
                Add your first payment gateway to start accepting customer payments
              </p>
              <Button onClick={() => setIsAddModalOpen(true)} data-testid="button-add-first-connector">
                <Plus className="h-4 w-4 mr-2" />
                Add Payment Connector
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead data-testid="header-name">Name</TableHead>
                  <TableHead data-testid="header-provider">Provider</TableHead>
                  <TableHead data-testid="header-status">Status</TableHead>
                  <TableHead data-testid="header-created">Created</TableHead>
                  <TableHead data-testid="header-actions">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {typedConnectors.map((connector) => {
                  const provider = typedProviders.find((p) => p.id === connector.provider);
                  return (
                    <TableRow key={connector.id} data-testid={`row-connector-${connector.id}`}>
                      <TableCell className="font-medium" data-testid={`text-name-${connector.id}`}>
                        {connector.name}
                      </TableCell>
                      <TableCell data-testid={`text-provider-${connector.id}`}>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(connector.status, connector.lastTestStatus)}
                          <span>{provider?.name || connector.provider}</span>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`badge-status-${connector.id}`}>
                        {getStatusBadge(connector.status, connector.lastTestStatus)}
                      </TableCell>
                      <TableCell data-testid={`text-created-${connector.id}`}>
                        {new Date(connector.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestConnector(connector)}
                            disabled={isTestingConnector === connector.id}
                            data-testid={`button-test-${connector.id}`}
                          >
                            {isTestingConnector === connector.id ? (
                              <Clock className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <TestTube className="h-4 w-4 mr-1" />
                            )}
                            Test
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteConnector(connector)}
                            data-testid={`button-delete-${connector.id}`}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Available Payment Providers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span data-testid="title-providers">Available Payment Providers</span>
          </CardTitle>
          <CardDescription data-testid="description-providers">
            Supported payment gateways and their configuration requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {typedProviders.map((provider) => (
              <Card key={provider.id} className={`border-2 ${provider.supported ? 'border-green-200' : 'border-gray-200'}`} data-testid={`card-provider-${provider.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-lg border bg-white flex items-center justify-center">
                        <CreditCard className="h-6 w-6 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg" data-testid={`text-provider-name-${provider.id}`}>
                          {provider.name}
                        </h3>
                        <p className="text-sm text-gray-500" data-testid={`text-provider-description-${provider.id}`}>
                          {provider.description}
                        </p>
                      </div>
                    </div>
                    {provider.supported ? (
                      <Badge variant="default" className="bg-green-100 text-green-800" data-testid={`badge-supported-${provider.id}`}>
                        Supported
                      </Badge>
                    ) : (
                      <Badge variant="secondary" data-testid={`badge-coming-soon-${provider.id}`}>
                        Coming Soon
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        SUPPORTED COUNTRIES
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {provider.countries.slice(0, 3).map((country) => (
                          <Badge key={country} variant="outline" className="text-xs" data-testid={`badge-country-${provider.id}-${country}`}>
                            {country}
                          </Badge>
                        ))}
                        {provider.countries.length > 3 && (
                          <Badge variant="outline" className="text-xs" data-testid={`badge-more-countries-${provider.id}`}>
                            +{provider.countries.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                        REQUIRED CREDENTIALS
                      </p>
                      <div className="text-xs text-gray-600">
                        {provider.credentialFields.map((field, index) => (
                          <span key={field.key} data-testid={`text-credential-${provider.id}-${field.key}`}>
                            {field.label}{index < provider.credentialFields.length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Payment Connector Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-2xl" data-testid="dialog-add-connector">
          <DialogHeader>
            <DialogTitle data-testid="title-add-connector">Add Payment Connector</DialogTitle>
            <DialogDescription data-testid="description-add-connector">
              Configure a new payment gateway integration to process customer payments
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" data-testid="label-connector-name">Connector Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Main Stripe Account"
                  {...form.register("name")}
                  data-testid="input-connector-name"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600" data-testid="error-connector-name">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="provider" data-testid="label-provider">Payment Provider</Label>
                <Select onValueChange={handleProviderChange} data-testid="select-provider">
                  <SelectTrigger data-testid="trigger-provider">
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent data-testid="content-provider">
                    {typedProviders
                      .filter((provider) => provider.supported)
                      .map((provider) => (
                        <SelectItem key={provider.id} value={provider.id} data-testid={`option-provider-${provider.id}`}>
                          {provider.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.provider && (
                  <p className="text-sm text-red-600" data-testid="error-provider">
                    {form.formState.errors.provider.message}
                  </p>
                )}
              </div>
            </div>

            {selectedProvider && (
              <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                <h4 className="font-medium" data-testid="title-credentials">
                  {selectedProvider.name} Credentials
                </h4>
                <div className="grid grid-cols-1 gap-4">
                  {selectedProvider.credentialFields.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={field.key} data-testid={`label-${field.key}`}>
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      <Input
                        id={field.key}
                        type={field.type}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        {...form.register(`credentials.${field.key}`)}
                        data-testid={`input-${field.key}`}
                      />
                      {form.formState.errors.credentials?.[field.key] && (
                        <p className="text-sm text-red-600" data-testid={`error-${field.key}`}>
                          {form.formState.errors.credentials[field.key]?.message}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md" data-testid="help-credentials">
                  <AlertCircle className="h-4 w-4 inline mr-2 text-blue-600" />
                  Your credentials are encrypted and stored securely. We'll test the connection before saving.
                </div>
              </div>
            )}

            <DialogFooter data-testid="footer-add-connector">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsAddModalOpen(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createConnectorMutation.isPending || !selectedProvider}
                data-testid="button-create"
              >
                {createConnectorMutation.isPending ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Connector
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-connector">
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="title-delete-connector">Delete Payment Connector</AlertDialogTitle>
            <AlertDialogDescription data-testid="description-delete-connector">
              Are you sure you want to delete the payment connector "{selectedConnector?.name}"?
              This action cannot be undone and will stop all payment processing for this gateway.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter data-testid="footer-delete-connector">
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedConnector && deleteConnectorMutation.mutate(selectedConnector.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              {deleteConnectorMutation.isPending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Connector
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}