import { useState, useEffect } from 'react';
import { Plus, Webhook, Play, Pause, TestTube, Globe, Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  name?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  lastStatus?: number;
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  failureCount: number;
  hasSecret: boolean;
}

interface WebhookEvent {
  id: string;
  name: string;
  description: string;
  category: string;
}

const WEBHOOK_EVENTS: WebhookEvent[] = [
  { id: 'product.created', name: 'Product Created', description: 'Triggered when a new product is created', category: 'products' },
  { id: 'product.updated', name: 'Product Updated', description: 'Triggered when a product is updated', category: 'products' },
  { id: 'inventory.adjusted', name: 'Inventory Adjusted', description: 'Triggered when inventory levels are adjusted', category: 'inventory' },
  { id: 'inventory.low_stock', name: 'Low Stock Alert', description: 'Triggered when inventory falls below reorder point', category: 'inventory' },
  { id: 'order.created', name: 'Order Created', description: 'Triggered when a new order is created', category: 'orders' },
  { id: 'order.status_changed', name: 'Order Status Changed', description: 'Triggered when an order status changes', category: 'orders' },
  { id: 'shipment.created', name: 'Shipment Created', description: 'Triggered when a shipment is created', category: 'shipments' },
  { id: 'shipment.status_changed', name: 'Shipment Status Changed', description: 'Triggered when shipment status changes', category: 'shipments' },
  { id: 'invoice.created', name: 'Invoice Created', description: 'Triggered when a new invoice is created', category: 'invoices' },
  { id: 'invoice.paid', name: 'Invoice Paid', description: 'Triggered when an invoice is marked as paid', category: 'invoices' },
  { id: 'invoice.status_changed', name: 'Invoice Status Changed', description: 'Triggered when invoice status changes', category: 'invoices' }
];

const EVENT_CATEGORIES = {
  products: 'Products',
  inventory: 'Inventory',
  orders: 'Orders',
  shipments: 'Shipments',
  invoices: 'Invoices'
};

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [formData, setFormData] = useState({
    url: '',
    events: [] as string[],
    name: '',
    description: '',
    active: true
  });
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  // Load webhooks on component mount
  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    try {
      const response = await fetch('/mgmt/webhooks');
      if (response.ok) {
        const data = await response.json();
        setWebhooks(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load webhooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const createWebhook = async () => {
    if (!formData.url.trim() || formData.events.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a URL and select at least one event.',
        variant: 'destructive'
      });
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/mgmt/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast({
          title: 'Webhook Created',
          description: 'Your webhook has been created successfully.',
        });

        await loadWebhooks();
        closeCreateDialog();
      } else {
        const errorData = await response.json();
        toast({
          title: 'Creation Failed',
          description: errorData.error || 'Failed to create webhook',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create webhook',
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };

  const updateWebhook = async () => {
    if (!editingWebhook) return;

    setUpdating(true);
    try {
      const response = await fetch(`/mgmt/webhooks/${editingWebhook.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast({
          title: 'Webhook Updated',
          description: 'Your webhook has been updated successfully.',
        });

        await loadWebhooks();
        closeEditDialog();
      } else {
        const errorData = await response.json();
        toast({
          title: 'Update Failed',
          description: errorData.error || 'Failed to update webhook',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update webhook',
        variant: 'destructive'
      });
    } finally {
      setUpdating(false);
    }
  };

  const deleteWebhook = async (webhookId: string, webhookName: string) => {
    try {
      const response = await fetch(`/mgmt/webhooks/${webhookId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: 'Webhook Deleted',
          description: `Webhook "${webhookName}" has been deleted successfully.`,
        });
        await loadWebhooks();
      } else {
        const errorData = await response.json();
        toast({
          title: 'Deletion Failed',
          description: errorData.error || 'Failed to delete webhook',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete webhook',
        variant: 'destructive'
      });
    }
  };

  const testWebhook = async (webhookId: string, webhookName: string) => {
    try {
      const response = await fetch(`/mgmt/webhooks/${webhookId}/test`, {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Test Successful',
          description: `Webhook "${webhookName}" responded with status ${data.statusCode} in ${data.responseTime}ms.`,
        });
      } else {
        const errorData = await response.json();
        toast({
          title: 'Test Failed',
          description: errorData.details || 'Webhook test failed',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to test webhook',
        variant: 'destructive'
      });
    }
  };

  const toggleWebhookStatus = async (webhook: Webhook) => {
    try {
      const response = await fetch(`/mgmt/webhooks/${webhook.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ active: !webhook.active })
      });

      if (response.ok) {
        toast({
          title: webhook.active ? 'Webhook Paused' : 'Webhook Activated',
          description: `Webhook "${webhook.name || webhook.url}" has been ${webhook.active ? 'paused' : 'activated'}.`,
        });
        await loadWebhooks();
      } else {
        const errorData = await response.json();
        toast({
          title: 'Update Failed',
          description: errorData.error || 'Failed to update webhook status',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update webhook status',
        variant: 'destructive'
      });
    }
  };

  const handleEventToggle = (eventId: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(eventId) 
        ? prev.events.filter(e => e !== eventId)
        : [...prev.events, eventId]
    }));
  };

  const selectAllInCategory = (category: string) => {
    const categoryEvents = WEBHOOK_EVENTS
      .filter(event => event.category === category)
      .map(event => event.id);
    
    const allSelected = categoryEvents.every(event => formData.events.includes(event));
    
    if (allSelected) {
      setFormData(prev => ({
        ...prev,
        events: prev.events.filter(event => !categoryEvents.includes(event))
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        events: Array.from(new Set([...prev.events, ...categoryEvents]))
      }));
    }
  };

  const closeCreateDialog = () => {
    setCreateDialogOpen(false);
    setFormData({
      url: '',
      events: [],
      name: '',
      description: '',
      active: true
    });
  };

  const openEditDialog = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setFormData({
      url: webhook.url,
      events: webhook.events,
      name: webhook.name || '',
      description: webhook.description || '',
      active: webhook.active
    });
    setEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditingWebhook(null);
    setFormData({
      url: '',
      events: [],
      name: '',
      description: '',
      active: true
    });
  };

  const getStatusColor = (webhook: Webhook) => {
    if (!webhook.active) return 'secondary';
    if (webhook.failureCount > 0) return 'destructive';
    if (webhook.lastSuccessAt) return 'default';
    return 'secondary';
  };

  const getStatusText = (webhook: Webhook) => {
    if (!webhook.active) return 'Paused';
    if (webhook.failureCount > 0) return `${webhook.failureCount} failures`;
    if (webhook.lastSuccessAt) return 'Healthy';
    return 'Pending';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Webhooks</h1>
          <p className="text-muted-foreground">
            Configure webhook endpoints to receive real-time notifications
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-webhook">
              <Plus className="h-4 w-4 mr-2" />
              Create Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Webhook</DialogTitle>
              <DialogDescription>
                Configure a webhook endpoint to receive real-time notifications from Flowventory.
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="events">Events</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4">
                <div>
                  <Label htmlFor="webhookUrl">Endpoint URL *</Label>
                  <Input
                    id="webhookUrl"
                    placeholder="https://api.yourapp.com/webhooks/flowventory"
                    value={formData.url}
                    onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                    data-testid="input-webhook-url"
                  />
                </div>

                <div>
                  <Label htmlFor="webhookName">Name</Label>
                  <Input
                    id="webhookName"
                    placeholder="e.g., Production Webhook"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    data-testid="input-webhook-name"
                  />
                </div>

                <div>
                  <Label htmlFor="webhookDescription">Description</Label>
                  <Textarea
                    id="webhookDescription"
                    placeholder="Optional description of this webhook's purpose"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    data-testid="textarea-webhook-description"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="webhookActive"
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                    data-testid="switch-webhook-active"
                  />
                  <Label htmlFor="webhookActive">Active</Label>
                </div>
              </TabsContent>

              <TabsContent value="events" className="space-y-4">
                <div>
                  <Label>Event Types *</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Select which events should trigger this webhook
                  </p>

                  <div className="space-y-4">
                    {Object.entries(EVENT_CATEGORIES).map(([category, categoryName]) => {
                      const categoryEvents = WEBHOOK_EVENTS.filter(event => event.category === category);
                      const selectedInCategory = categoryEvents.filter(event => formData.events.includes(event.id)).length;
                      
                      return (
                        <div key={category} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{categoryName}</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => selectAllInCategory(category)}
                              data-testid={`button-select-${category}`}
                            >
                              {selectedInCategory === categoryEvents.length ? 'Deselect All' : 'Select All'}
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-2">
                            {categoryEvents.map(event => (
                              <div key={event.id} className="flex items-start space-x-2">
                                <Checkbox
                                  id={event.id}
                                  checked={formData.events.includes(event.id)}
                                  onCheckedChange={() => handleEventToggle(event.id)}
                                  data-testid={`checkbox-${event.id}`}
                                />
                                <div className="flex-1 min-w-0">
                                  <Label htmlFor={event.id} className="text-sm font-medium cursor-pointer">
                                    {event.name}
                                  </Label>
                                  <p className="text-xs text-muted-foreground">{event.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={closeCreateDialog}>
                Cancel
              </Button>
              <Button 
                onClick={createWebhook} 
                disabled={creating || !formData.url.trim() || formData.events.length === 0}
                data-testid="button-create-confirm"
              >
                {creating ? 'Creating...' : 'Create Webhook'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Webhook className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No Webhooks</h3>
                <p className="text-muted-foreground text-center">
                  You haven't created any webhooks yet. Create your first webhook to start receiving notifications.
                </p>
              </CardContent>
            </Card>
          ) : (
            webhooks.map(webhook => (
              <Card key={webhook.id} className={!webhook.active ? 'opacity-60' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        {webhook.name || 'Unnamed Webhook'}
                        <Badge variant={getStatusColor(webhook)}>
                          {getStatusText(webhook)}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="truncate">
                        {webhook.url}
                      </CardDescription>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => testWebhook(webhook.id, webhook.name || webhook.url)}
                        data-testid={`button-test-${webhook.id}`}
                      >
                        <TestTube className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleWebhookStatus(webhook)}
                        data-testid={`button-toggle-${webhook.id}`}
                      >
                        {webhook.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(webhook)}
                        data-testid={`button-edit-${webhook.id}`}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" data-testid={`button-delete-${webhook.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this webhook? 
                              This action cannot be undone and will stop all notifications to this endpoint.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteWebhook(webhook.id, webhook.name || webhook.url)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete Webhook
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Events ({webhook.events.length})</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {webhook.events.slice(0, 6).map(event => (
                          <Badge key={event} variant="outline" className="text-xs">
                            {event}
                          </Badge>
                        ))}
                        {webhook.events.length > 6 && (
                          <Badge variant="outline" className="text-xs">
                            +{webhook.events.length - 6} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {(webhook.lastAttemptAt || webhook.lastSuccessAt) && (
                      <>
                        <Separator />
                        <div className="text-sm text-muted-foreground">
                          {webhook.lastSuccessAt ? (
                            `Last successful delivery: ${new Date(webhook.lastSuccessAt).toLocaleString()}`
                          ) : webhook.lastAttemptAt ? (
                            `Last attempt: ${new Date(webhook.lastAttemptAt).toLocaleString()}`
                          ) : (
                            'No delivery attempts yet'
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Webhook</DialogTitle>
            <DialogDescription>
              Update your webhook configuration and event subscriptions.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <div>
                <Label htmlFor="editWebhookUrl">Endpoint URL *</Label>
                <Input
                  id="editWebhookUrl"
                  placeholder="https://api.yourapp.com/webhooks/flowventory"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  data-testid="input-edit-webhook-url"
                />
              </div>

              <div>
                <Label htmlFor="editWebhookName">Name</Label>
                <Input
                  id="editWebhookName"
                  placeholder="e.g., Production Webhook"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  data-testid="input-edit-webhook-name"
                />
              </div>

              <div>
                <Label htmlFor="editWebhookDescription">Description</Label>
                <Textarea
                  id="editWebhookDescription"
                  placeholder="Optional description of this webhook's purpose"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  data-testid="textarea-edit-webhook-description"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="editWebhookActive"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                  data-testid="switch-edit-webhook-active"
                />
                <Label htmlFor="editWebhookActive">Active</Label>
              </div>
            </TabsContent>

            <TabsContent value="events" className="space-y-4">
              <div>
                <Label>Event Types *</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Select which events should trigger this webhook
                </p>

                <div className="space-y-4">
                  {Object.entries(EVENT_CATEGORIES).map(([category, categoryName]) => {
                    const categoryEvents = WEBHOOK_EVENTS.filter(event => event.category === category);
                    const selectedInCategory = categoryEvents.filter(event => formData.events.includes(event.id)).length;
                    
                    return (
                      <div key={category} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{categoryName}</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => selectAllInCategory(category)}
                            data-testid={`button-edit-select-${category}`}
                          >
                            {selectedInCategory === categoryEvents.length ? 'Deselect All' : 'Select All'}
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-2">
                          {categoryEvents.map(event => (
                            <div key={event.id} className="flex items-start space-x-2">
                              <Checkbox
                                id={`edit-${event.id}`}
                                checked={formData.events.includes(event.id)}
                                onCheckedChange={() => handleEventToggle(event.id)}
                                data-testid={`checkbox-edit-${event.id}`}
                              />
                              <div className="flex-1 min-w-0">
                                <Label htmlFor={`edit-${event.id}`} className="text-sm font-medium cursor-pointer">
                                  {event.name}
                                </Label>
                                <p className="text-xs text-muted-foreground">{event.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeEditDialog}>
              Cancel
            </Button>
            <Button 
              onClick={updateWebhook} 
              disabled={updating || !formData.url.trim() || formData.events.length === 0}
              data-testid="button-update-confirm"
            >
              {updating ? 'Updating...' : 'Update Webhook'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}