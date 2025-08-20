import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileText, Plus, Trash2 } from "lucide-react";
import { currencyFormat, calcInvoiceTotals, LineItem } from "@/utils/currency";
import { generateInvoiceNumber } from "@/helpers/invoiceNumber";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface Order {
  id: string;
  customerId: string;
  items: {
    skuId: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  regionId?: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
}

interface Region {
  id: string;
  name: string;
  currency: string;
  locale: string;
  taxRules: { name: string; rate: number }[];
}

interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  taxOverride?: number;
}

interface GenerateInvoiceModalProps {
  order: Order;
  trigger?: React.ReactNode;
}

const INVOICES_KEY = "flowventory:invoices";
const CUSTOMERS_KEY = "flowventory:customers";
const PRODUCTS_KEY = "flowventory:products";

export function GenerateInvoiceModal({ order, trigger }: GenerateInvoiceModalProps) {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [region, setRegion] = useState<Region | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [formData, setFormData] = useState({
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +30 days
    currency: 'USD',
    locale: 'en-US',
    notes: ''
  });
  
  const [lineItems, setLineItems] = useState<LineItem[]>([]);

  useEffect(() => {
    if (!open) return;

    // Load customer
    const customers = JSON.parse(localStorage.getItem(CUSTOMERS_KEY) || '[]');
    const foundCustomer = customers.find((c: Customer) => c.id === order.customerId);
    setCustomer(foundCustomer || null);

    // Load products
    const storedProducts = JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]');
    setProducts(storedProducts);

    // Load region and settings
    const settings = JSON.parse(localStorage.getItem('flowventory:settings') || '{}');
    const regions = settings.finance?.regions || [];
    const foundRegion = regions.find((r: Region) => r.id === order.regionId);
    
    if (foundRegion) {
      setRegion(foundRegion);
      setFormData(prev => ({
        ...prev,
        currency: foundRegion.currency,
        locale: foundRegion.locale
      }));
    } else {
      // Use base currency if no region
      const baseCurrency = settings.finance?.baseCurrency || 'USD';
      const displayLocale = settings.finance?.displayLocale || 'en-US';
      setFormData(prev => ({
        ...prev,
        currency: baseCurrency,
        locale: displayLocale
      }));
    }

    // Convert order items to line items
    const defaultTaxRate = foundRegion?.taxRules?.[0]?.rate || 0;
    const convertedLineItems: LineItem[] = order.items.map(item => {
      const product = storedProducts.find((p: Product) => p.id === item.skuId || p.sku === item.skuId);
      const taxRate = product?.taxOverride !== undefined ? product.taxOverride : defaultTaxRate;
      
      return {
        skuId: item.skuId,
        name: item.name,
        qty: item.quantity,
        unitPrice: item.price,
        taxRate: (taxRate || 0) / 100 // Convert percentage to decimal
      };
    });
    
    setLineItems(convertedLineItems);
  }, [open, order]);

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    setLineItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const removeLineItem = (index: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  const addLineItem = () => {
    const defaultTaxRate = region?.taxRules?.[0]?.rate || 0;
    setLineItems(prev => [...prev, {
      skuId: '',
      name: '',
      qty: 1,
      unitPrice: 0,
      taxRate: defaultTaxRate / 100
    }]);
  };

  const getAvailableTaxRates = () => {
    const rates = region?.taxRules || [];
    return [
      ...rates.map(rule => ({ name: rule.name, rate: rule.rate / 100 })),
      { name: 'Custom', rate: 0 }
    ];
  };

  const generateInvoice = () => {
    // Validation
    if (!customer) {
      toast({
        title: "Error",
        description: "Customer information is required.",
        variant: "destructive",
      });
      return;
    }

    if (lineItems.length === 0) {
      toast({
        title: "Error", 
        description: "At least one line item is required.",
        variant: "destructive",
      });
      return;
    }

    if (new Date(formData.dueDate) < new Date(formData.issueDate)) {
      toast({
        title: "Error",
        description: "Due date must be after issue date.",
        variant: "destructive",
      });
      return;
    }

    // Validate line items
    for (const item of lineItems) {
      if (item.qty <= 0) {
        toast({
          title: "Error",
          description: "All quantities must be greater than zero.",
          variant: "destructive",
        });
        return;
      }
      if (item.unitPrice < 0) {
        toast({
          title: "Error", 
          description: "Unit prices cannot be negative.",
          variant: "destructive",
        });
        return;
      }
      if (item.taxRate < 0 || item.taxRate > 1) {
        toast({
          title: "Error",
          description: "Tax rates must be between 0% and 100%.",
          variant: "destructive",
        });
        return;
      }
    }

    // Calculate totals
    const totals = calcInvoiceTotals(lineItems);

    // Create invoice
    const newInvoice = {
      id: Date.now().toString(),
      number: generateInvoiceNumber(),
      orderId: order.id,
      customerId: customer.id,
      issueDate: formData.issueDate,
      dueDate: formData.dueDate,
      currency: formData.currency,
      locale: formData.locale,
      lineItems,
      subtotal: totals.subtotal,
      taxTotal: totals.taxTotal,
      grandTotal: totals.grandTotal,
      payments: [],
      status: 'UNPAID' as const,
      notes: formData.notes
    };

    // Save to localStorage
    const invoices = JSON.parse(localStorage.getItem(INVOICES_KEY) || '[]');
    invoices.push(newInvoice);
    localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices));

    toast({
      title: "Invoice created",
      description: `Invoice ${newInvoice.number} has been generated successfully.`,
    });

    setOpen(false);
    setLocation(`/invoices/${newInvoice.id}`);
  };

  const totals = calcInvoiceTotals(lineItems);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            Generate Invoice
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Invoice</DialogTitle>
          <DialogDescription>
            Create a new invoice from order items with currency and tax calculations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer Information</CardTitle>
            </CardHeader>
            <CardContent>
              {customer ? (
                <div>
                  <p className="font-medium">{customer.name}</p>
                  <p className="text-sm text-gray-600">{customer.email}</p>
                </div>
              ) : (
                <p className="text-red-500">Customer not found</p>
              )}
            </CardContent>
          </Card>

          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="issueDate">Issue Date</Label>
                  <Input
                    id="issueDate"
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                    disabled
                  />
                </div>
                <div>
                  <Label htmlFor="locale">Locale</Label>
                  <Input
                    id="locale"
                    value={formData.locale}
                    onChange={(e) => setFormData(prev => ({ ...prev, locale: e.target.value }))}
                    disabled
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Line Items</CardTitle>
                <Button onClick={addLineItem} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Tax Rate</TableHead>
                    <TableHead>Line Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          value={item.name}
                          onChange={(e) => updateLineItem(index, 'name', e.target.value)}
                          placeholder="Item name"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => updateLineItem(index, 'qty', parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.taxRate.toString()}
                          onValueChange={(value) => updateLineItem(index, 'taxRate', parseFloat(value))}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableTaxRates().map((rate, rateIndex) => (
                              <SelectItem key={rateIndex} value={rate.rate.toString()}>
                                {rate.name} ({(rate.rate * 100).toFixed(1)}%)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {currencyFormat(item.qty * item.unitPrice, formData.currency, formData.locale)}
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => removeLineItem(index)}
                          variant="outline"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Totals Summary */}
              <div className="mt-6 space-y-2 text-right">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{currencyFormat(totals.subtotal, formData.currency, formData.locale)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>{currencyFormat(totals.taxTotal, formData.currency, formData.locale)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>{currencyFormat(totals.grandTotal, formData.currency, formData.locale)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Notes (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes for this invoice..."
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={generateInvoice}>
              Generate Invoice
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}