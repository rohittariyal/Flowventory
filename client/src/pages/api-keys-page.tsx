import { useState, useEffect } from 'react';
import { Plus, Key, Eye, EyeOff, Trash2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface ApiKey {
  id: string;
  keyPrefix: string;
  name: string;
  scopes: string[];
  workspaceId?: string;
  createdAt: string;
  revokedAt?: string;
  status: 'active' | 'revoked';
}

interface Scope {
  id: string;
  name: string;
  description: string;
  category: string;
}

const SCOPE_CATEGORIES = {
  products: 'Products',
  inventory: 'Inventory',
  orders: 'Orders',
  suppliers: 'Suppliers',
  customers: 'Customers',
  invoices: 'Invoices'
};

const AVAILABLE_SCOPES: Scope[] = [
  { id: 'read:products', name: 'Read Products', description: 'View product information and search products', category: 'products' },
  { id: 'write:products', name: 'Write Products', description: 'Create and update products', category: 'products' },
  { id: 'read:inventory', name: 'Read Inventory', description: 'View inventory levels and locations', category: 'inventory' },
  { id: 'write:inventory', name: 'Write Inventory', description: 'Adjust inventory levels and stock', category: 'inventory' },
  { id: 'read:orders', name: 'Read Orders', description: 'View orders and order history', category: 'orders' },
  { id: 'write:orders', name: 'Write Orders', description: 'Create orders and update order status', category: 'orders' },
  { id: 'read:suppliers', name: 'Read Suppliers', description: 'View supplier information', category: 'suppliers' },
  { id: 'write:suppliers', name: 'Write Suppliers', description: 'Create and update suppliers', category: 'suppliers' },
  { id: 'read:customers', name: 'Read Customers', description: 'View customer information', category: 'customers' },
  { id: 'write:customers', name: 'Write Customers', description: 'Create and update customers', category: 'customers' },
  { id: 'read:invoices', name: 'Read Invoices', description: 'View invoices and payment status', category: 'invoices' },
  { id: 'write:invoices', name: 'Write Invoices', description: 'Create invoices and update payment status', category: 'invoices' }
];

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [newKeyData, setNewKeyData] = useState<{fullKey: string; keyPrefix: string} | null>(null);
  const [showFullKey, setShowFullKey] = useState<{[key: string]: boolean}>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const { toast } = useToast();

  // Load API keys on component mount
  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const response = await fetch('/mgmt/keys');
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim() || selectedScopes.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please provide a name and select at least one scope.',
        variant: 'destructive'
      });
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/mgmt/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newKeyName.trim(),
          scopes: selectedScopes
        })
      });

      if (response.ok) {
        const data = await response.json();
        setNewKeyData({
          fullKey: data.data.fullKey,
          keyPrefix: data.data.keyPrefix
        });
        
        toast({
          title: 'API Key Created',
          description: 'Your API key has been created successfully. Make sure to copy it now - you won\'t be able to see it again.',
        });

        // Reload keys list
        await loadApiKeys();
        
        // Reset form
        setNewKeyName('');
        setSelectedScopes([]);
      } else {
        const errorData = await response.json();
        toast({
          title: 'Creation Failed',
          description: errorData.error || 'Failed to create API key',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create API key',
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };

  const revokeApiKey = async (keyId: string, keyName: string) => {
    try {
      const response = await fetch(`/mgmt/keys/${keyId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: 'API Key Revoked',
          description: `API key "${keyName}" has been revoked successfully.`,
        });
        await loadApiKeys();
      } else {
        const errorData = await response.json();
        toast({
          title: 'Revocation Failed',
          description: errorData.error || 'Failed to revoke API key',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to revoke API key',
        variant: 'destructive'
      });
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(text);
      setTimeout(() => setCopiedKey(null), 2000);
      toast({
        title: 'Copied!',
        description: `${type} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Unable to copy to clipboard',
        variant: 'destructive'
      });
    }
  };

  const generateDemoKey = async () => {
    try {
      const response = await fetch('/mgmt/keys/demo', {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        setNewKeyData({
          fullKey: data.data.fullKey,
          keyPrefix: data.data.keyPrefix
        });
        
        toast({
          title: 'Demo API Key Created',
          description: 'A demo API key with read-only access has been created.',
        });

        await loadApiKeys();
      } else {
        const errorData = await response.json();
        toast({
          title: 'Demo Key Creation Failed',
          description: errorData.error || 'Failed to create demo API key',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create demo API key',
        variant: 'destructive'
      });
    }
  };

  const handleScopeToggle = (scopeId: string) => {
    setSelectedScopes(prev => 
      prev.includes(scopeId) 
        ? prev.filter(s => s !== scopeId)
        : [...prev, scopeId]
    );
  };

  const selectAllInCategory = (category: string) => {
    const categoryScopes = AVAILABLE_SCOPES
      .filter(scope => scope.category === category)
      .map(scope => scope.id);
    
    const allSelected = categoryScopes.every(scope => selectedScopes.includes(scope));
    
    if (allSelected) {
      setSelectedScopes(prev => prev.filter(scope => !categoryScopes.includes(scope)));
    } else {
      setSelectedScopes(prev => Array.from(new Set([...prev, ...categoryScopes])));
    }
  };

  const closeCreateDialog = () => {
    setCreateDialogOpen(false);
    setNewKeyData(null);
    setNewKeyName('');
    setSelectedScopes([]);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">
            Manage API keys for accessing Flowventory's REST API
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={generateDemoKey}
            data-testid="button-demo-key"
          >
            <Key className="h-4 w-4 mr-2" />
            Demo Key
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-key">
                <Plus className="h-4 w-4 mr-2" />
                Create API Key
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New API Key</DialogTitle>
                <DialogDescription>
                  Create a new API key with specific scopes. Choose only the permissions you need.
                </DialogDescription>
              </DialogHeader>

              {newKeyData ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                      API Key Created Successfully!
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                      Make sure to copy your API key now. You won't be able to see it again!
                    </p>
                    
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">API Key</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            value={newKeyData.fullKey}
                            readOnly
                            className="font-mono text-sm"
                            data-testid="input-created-key"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(newKeyData.fullKey, 'API key')}
                            data-testid="button-copy-key"
                          >
                            {copiedKey === newKeyData.fullKey ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button onClick={closeCreateDialog} data-testid="button-close-dialog">
                      Done
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="keyName">API Key Name</Label>
                    <Input
                      id="keyName"
                      placeholder="e.g., Production API Access"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      data-testid="input-key-name"
                    />
                  </div>

                  <div>
                    <Label>Permissions</Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Select the API scopes this key should have access to
                    </p>

                    <div className="space-y-4">
                      {Object.entries(SCOPE_CATEGORIES).map(([category, categoryName]) => {
                        const categoryScopes = AVAILABLE_SCOPES.filter(scope => scope.category === category);
                        const selectedInCategory = categoryScopes.filter(scope => selectedScopes.includes(scope.id)).length;
                        
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
                                {selectedInCategory === categoryScopes.length ? 'Deselect All' : 'Select All'}
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-2">
                              {categoryScopes.map(scope => (
                                <div key={scope.id} className="flex items-start space-x-2">
                                  <Checkbox
                                    id={scope.id}
                                    checked={selectedScopes.includes(scope.id)}
                                    onCheckedChange={() => handleScopeToggle(scope.id)}
                                    data-testid={`checkbox-${scope.id}`}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <Label htmlFor={scope.id} className="text-sm font-medium cursor-pointer">
                                      {scope.name}
                                    </Label>
                                    <p className="text-xs text-muted-foreground">{scope.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={closeCreateDialog}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={createApiKey} 
                      disabled={creating || !newKeyName.trim() || selectedScopes.length === 0}
                      data-testid="button-create-confirm"
                    >
                      {creating ? 'Creating...' : 'Create API Key'}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {apiKeys.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Key className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No API Keys</h3>
                <p className="text-muted-foreground text-center">
                  You haven't created any API keys yet. Create your first key to start using the API.
                </p>
              </CardContent>
            </Card>
          ) : (
            apiKeys.map(key => (
              <Card key={key.id} className={key.status === 'revoked' ? 'opacity-60' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {key.name}
                        <Badge variant={key.status === 'active' ? 'default' : 'secondary'}>
                          {key.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Key: {key.keyPrefix}••••••••
                        {key.revokedAt && ` • Revoked ${new Date(key.revokedAt).toLocaleDateString()}`}
                      </CardDescription>
                    </div>
                    
                    {key.status === 'active' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" data-testid={`button-revoke-${key.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to revoke the API key "{key.name}"? 
                              This action cannot be undone and will immediately stop all access using this key.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => revokeApiKey(key.id, key.name)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Revoke Key
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Scopes</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {key.scopes.map(scope => (
                          <Badge key={scope} variant="outline" className="text-xs">
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="text-sm text-muted-foreground">
                      Created {new Date(key.createdAt).toLocaleDateString()} at {new Date(key.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}