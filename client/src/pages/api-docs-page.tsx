import { useState } from 'react';
import { Book, Copy, Check, Key, Zap, Shield, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

const API_BASE_URL = window.location.origin;

export default function ApiDocsPage() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(text);
      setTimeout(() => setCopiedCode(null), 2000);
      toast({
        title: 'Copied!',
        description: `${label} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Unable to copy to clipboard',
        variant: 'destructive'
      });
    }
  };

  const CopyButton = ({ text, label }: { text: string; label: string }) => (
    <Button
      variant="outline"
      size="sm"
      onClick={() => copyToClipboard(text, label)}
      className="h-8 w-8 p-0"
    >
      {copiedCode === text ? (
        <Check className="h-4 w-4" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );

  const CodeBlock = ({ code, language = 'bash', label }: { code: string; language?: string; label: string }) => (
    <div className="relative">
      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
        <code className={`language-${language}`}>{code}</code>
      </pre>
      <div className="absolute top-2 right-2">
        <CopyButton text={code} label={label} />
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Book className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">API Documentation</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Complete guide to integrating with the Flowventory REST API
          </p>
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="auth">Authentication</TabsTrigger>
            <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="examples">Examples</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  API Overview
                </CardTitle>
                <CardDescription>
                  The Flowventory API provides programmatic access to your inventory management data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
                      <h3 className="font-semibold">Secure</h3>
                      <p className="text-sm text-muted-foreground">API key authentication with scoped permissions</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Zap className="h-8 w-8 text-primary mx-auto mb-2" />
                      <h3 className="font-semibold">Real-time</h3>
                      <p className="text-sm text-muted-foreground">Webhook notifications for instant updates</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Book className="h-8 w-8 text-primary mx-auto mb-2" />
                      <h3 className="font-semibold">RESTful</h3>
                      <p className="text-sm text-muted-foreground">Standard HTTP methods and JSON responses</p>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-2">Base URL</h3>
                  <div className="flex items-center gap-2">
                    <code className="bg-muted px-2 py-1 rounded text-sm flex-1">{API_BASE_URL}/api/v1</code>
                    <CopyButton text={`${API_BASE_URL}/api/v1`} label="Base URL" />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Rate Limits</h3>
                  <p className="text-muted-foreground">
                    • 60 requests per minute per API key<br />
                    • Rate limit headers included in all responses<br />
                    • HTTP 429 status code when limit exceeded
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="auth" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Authentication
                </CardTitle>
                <CardDescription>
                  Secure your API requests with bearer token authentication
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">API Keys</h3>
                  <p className="text-muted-foreground mb-4">
                    All API requests must include an API key in the Authorization header using Bearer authentication.
                  </p>
                  
                  <CodeBlock
                    code={`Authorization: Bearer fv_abc12345_def67890...`}
                    language="http"
                    label="Authorization header"
                  />
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-2">Scopes</h3>
                  <p className="text-muted-foreground mb-4">
                    API keys are granted specific scopes that determine which resources they can access:
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Read Scopes</h4>
                      <div className="space-y-1">
                        <Badge variant="outline">read:products</Badge>
                        <Badge variant="outline">read:inventory</Badge>
                        <Badge variant="outline">read:orders</Badge>
                        <Badge variant="outline">read:suppliers</Badge>
                        <Badge variant="outline">read:customers</Badge>
                        <Badge variant="outline">read:invoices</Badge>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Write Scopes</h4>
                      <div className="space-y-1">
                        <Badge variant="outline">write:products</Badge>
                        <Badge variant="outline">write:inventory</Badge>
                        <Badge variant="outline">write:orders</Badge>
                        <Badge variant="outline">write:suppliers</Badge>
                        <Badge variant="outline">write:customers</Badge>
                        <Badge variant="outline">write:invoices</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-2">Error Responses</h3>
                  <CodeBlock
                    code={`{
  "error": "Invalid or revoked API key",
  "statusCode": 401
}`}
                    language="json"
                    label="Authentication error"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="endpoints" className="space-y-6">
            <div className="grid gap-6">
              {[
                {
                  title: 'Products',
                  description: 'Manage product catalog and information',
                  endpoints: [
                    { method: 'GET', path: '/products', description: 'List products with filtering' },
                    { method: 'GET', path: '/products/{id}', description: 'Get single product' },
                    { method: 'POST', path: '/products', description: 'Create new product' },
                    { method: 'PATCH', path: '/products/{id}', description: 'Update product' }
                  ]
                },
                {
                  title: 'Inventory',
                  description: 'Track stock levels and locations',
                  endpoints: [
                    { method: 'GET', path: '/inventory', description: 'List inventory with filtering' },
                    { method: 'PATCH', path: '/inventory/adjust', description: 'Adjust inventory levels' }
                  ]
                },
                {
                  title: 'Orders',
                  description: 'Manage customer orders and fulfillment',
                  endpoints: [
                    { method: 'GET', path: '/orders', description: 'List orders with filtering' },
                    { method: 'GET', path: '/orders/{id}', description: 'Get single order' },
                    { method: 'POST', path: '/orders', description: 'Create new order' },
                    { method: 'PATCH', path: '/orders/{id}/status', description: 'Update order status' }
                  ]
                },
                {
                  title: 'Suppliers',
                  description: 'Manage supplier information',
                  endpoints: [
                    { method: 'GET', path: '/suppliers', description: 'List suppliers with filtering' },
                    { method: 'GET', path: '/suppliers/{id}', description: 'Get single supplier' }
                  ]
                },
                {
                  title: 'Customers',
                  description: 'Manage customer information',
                  endpoints: [
                    { method: 'GET', path: '/customers', description: 'List customers with filtering' },
                    { method: 'GET', path: '/customers/{id}', description: 'Get single customer' }
                  ]
                },
                {
                  title: 'Invoices',
                  description: 'Handle billing and payments',
                  endpoints: [
                    { method: 'GET', path: '/invoices', description: 'List invoices with filtering' },
                    { method: 'GET', path: '/invoices/{id}', description: 'Get single invoice' },
                    { method: 'PATCH', path: '/invoices/{id}/status', description: 'Update invoice status' }
                  ]
                }
              ].map((resource) => (
                <Card key={resource.title}>
                  <CardHeader>
                    <CardTitle>{resource.title}</CardTitle>
                    <CardDescription>{resource.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {resource.endpoints.map((endpoint, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center gap-3">
                            <Badge variant={endpoint.method === 'GET' ? 'default' : endpoint.method === 'POST' ? 'secondary' : 'outline'}>
                              {endpoint.method}
                            </Badge>
                            <code className="text-sm">{endpoint.path}</code>
                          </div>
                          <span className="text-sm text-muted-foreground">{endpoint.description}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Webhook Integration</CardTitle>
                <CardDescription>
                  Receive real-time notifications when events occur in your Flowventory account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Event Types</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Product Events</h4>
                      <div className="space-y-1 text-sm">
                        <div><code>product.created</code> - New product created</div>
                        <div><code>product.updated</code> - Product updated</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Inventory Events</h4>
                      <div className="space-y-1 text-sm">
                        <div><code>inventory.adjusted</code> - Stock levels changed</div>
                        <div><code>inventory.low_stock</code> - Low stock alert</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Order Events</h4>
                      <div className="space-y-1 text-sm">
                        <div><code>order.created</code> - New order placed</div>
                        <div><code>order.status_changed</code> - Order status updated</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Invoice Events</h4>
                      <div className="space-y-1 text-sm">
                        <div><code>invoice.created</code> - New invoice generated</div>
                        <div><code>invoice.paid</code> - Invoice marked as paid</div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-2">Webhook Security</h3>
                  <p className="text-muted-foreground mb-4">
                    All webhook requests include a signature header for verification:
                  </p>
                  
                  <CodeBlock
                    code={`X-Flowventory-Signature: sha256=a1b2c3d4e5f6...`}
                    language="http"
                    label="Webhook signature"
                  />
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Payload Structure</h3>
                  <CodeBlock
                    code={`{
  "id": "evt_1234567890",
  "event": "product.created",
  "timestamp": "2024-09-29T10:00:00Z",
  "data": {
    "id": "prod-001",
    "sku": "SKU-001",
    "name": "Wireless Headphones",
    "price": 79.99,
    "stock": 50
  }
}`}
                    language="json"
                    label="Webhook payload"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="examples" className="space-y-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>cURL Examples</CardTitle>
                  <CardDescription>Ready-to-use command line examples</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">List Products</h4>
                    <CodeBlock
                      code={`curl -X GET "${API_BASE_URL}/api/v1/products" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}
                      language="bash"
                      label="List products cURL"
                    />
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Create Product</h4>
                    <CodeBlock
                      code={`curl -X POST "${API_BASE_URL}/api/v1/products" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sku": "NEW-001",
    "name": "New Product",
    "price": 29.99,
    "stock": 100
  }'`}
                      language="bash"
                      label="Create product cURL"
                    />
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Adjust Inventory</h4>
                    <CodeBlock
                      code={`curl -X PATCH "${API_BASE_URL}/api/v1/inventory/adjust" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "productId": "prod-001",
    "locationId": "loc-001",
    "delta": -5,
    "reason": "Sale"
  }'`}
                      language="bash"
                      label="Adjust inventory cURL"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>JavaScript Examples</CardTitle>
                  <CardDescription>Integration examples for web applications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Fetch Products</h4>
                    <CodeBlock
                      code={`const response = await fetch('${API_BASE_URL}/api/v1/products', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data.data); // Array of products`}
                      language="javascript"
                      label="Fetch products JavaScript"
                    />
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Create Order</h4>
                    <CodeBlock
                      code={`const order = await fetch('${API_BASE_URL}/api/v1/orders', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    customerId: 'cust-001',
    items: [
      {
        productId: 'prod-001',
        quantity: 2,
        unitPrice: 79.99
      }
    ]
  })
});

const newOrder = await order.json();`}
                      language="javascript"
                      label="Create order JavaScript"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}