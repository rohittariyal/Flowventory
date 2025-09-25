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
import { FileText, Plus, Trash2, MapPin, Calculator } from "lucide-react";
import { 
  currencyFormat, 
  getFinanceSettings, 
  getTaxCustomers, 
  calculateRegionTax,
  initializeTaxationData
} from "@/utils/taxation";
import type { TaxCustomer, OrderItem, TaxBreakup } from "@shared/schema";
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

// Updated interfaces for comprehensive taxation
interface TaxRegion {
  id: string;
  name: string;
  currency: string;
  locale: string;
  taxRules: { id: string; name: string; rate: number; category: string }[];
  states?: string[];
  stateRates?: { code: string; rate: number }[];
}

interface TaxProduct {
  id: string;
  sku: string;
  name: string;
  price: number;
  regionId?: string;
  taxCategory?: "standard" | "reduced" | "zero";
  taxOverride?: {
    id: string;
    name: string;
    rate: number;
  };
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
  
  const [customer, setCustomer] = useState<TaxCustomer | null>(null);
  const [region, setRegion] = useState<TaxRegion | null>(null);
  const [products, setProducts] = useState<TaxProduct[]>([]);
  const [availableRegions, setAvailableRegions] = useState<TaxRegion[]>([]);
  const [settings, setSettings] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +30 days
    currency: 'USD',
    locale: 'en-US',
    regionId: '',
    placeOfSupply: '',
    businessState: '',
    customerState: '',
    notes: ''
  });
  
  const [lineItems, setLineItems] = useState<OrderItem[]>([]);
  const [taxBreakdown, setTaxBreakdown] = useState<TaxBreakup | null>(null);

  useEffect(() => {
    if (!open) return;

    // Initialize comprehensive taxation data
    initializeTaxationData();

    // Load finance settings
    const financeSettings = getFinanceSettings();
    if (!financeSettings) return;
    
    setSettings(financeSettings);
    setAvailableRegions(financeSettings.regions || []);

    // Load customer
    const customers = getTaxCustomers();
    const foundCustomer = customers.find((c: TaxCustomer) => c.id === order.customerId);
    setCustomer(foundCustomer || null);

    // Load products from storage
    const storedProducts = JSON.parse(localStorage.getItem('flowventory:products') || '[]');
    setProducts(storedProducts);

    // Find region
    const foundRegion = financeSettings.regions?.find((r: TaxRegion) => r.id === order.regionId);
    
    if (foundRegion) {
      setRegion(foundRegion);
      setFormData(prev => ({
        ...prev,
        currency: foundRegion.currency,
        locale: foundRegion.locale,
        regionId: foundRegion.id,
        businessState: financeSettings.businessState || '',
        customerState: foundCustomer?.state || ''
      }));
    } else {
      // Use base currency if no region
      setFormData(prev => ({
        ...prev,
        currency: financeSettings.baseCurrency || 'USD',
        locale: financeSettings.displayLocale || 'en-US',
        businessState: financeSettings.businessState || ''
      }));
    }

    // Convert order items to line items using new schema
    const convertedLineItems: OrderItem[] = order.items.map(item => {
      return {
        productId: item.skuId,
        name: item.name,
        qty: item.quantity,
        unitPrice: item.price
      };
    });
    
    setLineItems(convertedLineItems);
  }, [open, order]);

  const updateLineItem = (index: number, field: keyof OrderItem, value: any) => {
    setLineItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const removeLineItem = (index: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  const addLineItem = () => {
    setLineItems(prev => [...prev, {
      productId: '',
      name: '',
      qty: 1,
      unitPrice: 0
    }]);
  };

  // Calculate totals using the new comprehensive taxation system
  const calculateTotals = () => {
    if (!formData.regionId || lineItems.length === 0) {
      return { subtotal: 0, tax: 0, grand: 0, taxBreakdown: null };
    }

    const result = calculateRegionTax(
      formData.regionId,
      formData.customerState,
      formData.businessState,
      lineItems
    );

    return {
      subtotal: result.totals.sub,
      tax: result.totals.tax,
      grand: result.totals.grand,
      taxBreakdown: result.taxBreakup
    };
  };

  // Update tax breakdown when form data or line items change
  useEffect(() => {
    const totals = calculateTotals();
    setTaxBreakdown(totals.taxBreakdown || null);
  }, [formData.regionId, formData.customerState, formData.businessState, lineItems]);

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
    }

    if (!formData.regionId) {
      toast({
        title: "Error",
        description: "Please select a tax region.",
        variant: "destructive",
      });
      return;
    }

    // Calculate totals using new taxation system
    const totals = calculateTotals();

    // Create invoice with comprehensive tax data
    const newInvoice = {
      id: Date.now().toString(),
      number: generateInvoiceNumber(),
      orderId: order.id,
      customerId: customer.id,
      regionId: formData.regionId,
      issueDate: formData.issueDate,
      dueDate: formData.dueDate,
      currency: formData.currency,
      locale: formData.locale,
      placeOfSupply: formData.placeOfSupply,
      customerState: formData.customerState,
      businessState: formData.businessState,
      lineItems,
      subtotal: totals.subtotal,
      taxTotal: totals.tax,
      grandTotal: totals.grand,
      taxBreakdown: totals.taxBreakdown,
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

  const totals = calculateTotals();

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
                  <span>{currencyFormat(totals.tax, formData.currency, formData.locale)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>{currencyFormat(totals.grand, formData.currency, formData.locale)}</span>
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