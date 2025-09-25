import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Plus, Trash2, MapPin, Calculator, FileText, User } from "lucide-react";
import { nanoid } from "nanoid";
import type { TaxOrder, TaxProduct, FinanceSettings, TaxRegion, TaxRule, OrderItem } from "@shared/schema";
import { 
  getFinanceSettings, 
  getTaxProducts, 
  getTaxOrders, 
  saveTaxOrders, 
  calcTotals,
  currencyFormat,
  getEffectiveTaxRate 
} from "@/utils/taxation";

interface TaxOrderFormProps {
  order?: TaxOrder | null;
  onSave?: (order: TaxOrder) => void;
  onCancel?: () => void;
  isOpen?: boolean;
}

export function TaxOrderForm({ order, onSave, onCancel, isOpen = true }: TaxOrderFormProps) {
  const [formData, setFormData] = useState({
    regionId: "",
    customerId: "",
    customerName: "",
    taxRuleId: ""
  });
  
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [newItemForm, setNewItemForm] = useState({
    productId: "",
    qty: 1
  });
  
  const [settings, setSettings] = useState<FinanceSettings | null>(null);
  const [products, setProducts] = useState<TaxProduct[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const financeSettings = getFinanceSettings();
    const productList = getTaxProducts();
    setSettings(financeSettings);
    setProducts(productList);
  }, []);

  useEffect(() => {
    if (order) {
      setFormData({
        regionId: order.regionId,
        customerId: order.customerId || "",
        customerName: order.customerName || "",
        taxRuleId: order.taxRuleId || ""
      });
      setOrderItems(order.items);
    }
  }, [order]);

  // Get selected region
  const selectedRegion = useMemo(() => {
    if (!settings || !formData.regionId) return null;
    return settings.regions.find(r => r.id === formData.regionId);
  }, [settings, formData.regionId]);

  // Get filtered products for selected region
  const regionProducts = useMemo(() => {
    if (!formData.regionId) return products;
    return products.filter(p => p.regionId === formData.regionId);
  }, [products, formData.regionId]);

  // Get selected tax rule
  const selectedTaxRule = useMemo(() => {
    if (!selectedRegion || !formData.taxRuleId) return selectedRegion?.taxRules[0];
    return selectedRegion.taxRules.find(rule => rule.id === formData.taxRuleId);
  }, [selectedRegion, formData.taxRuleId]);

  // Calculate order totals
  const orderTotals = useMemo(() => {
    if (!selectedRegion || !selectedTaxRule || orderItems.length === 0) {
      return { sub: 0, tax: 0, grand: 0, currency: "USD" };
    }

    // Build tax overrides map
    const taxOverrides: Record<string, number> = {};
    orderItems.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product?.taxOverride) {
        taxOverrides[item.productId] = product.taxOverride.rate;
      }
    });

    const totals = calcTotals(orderItems, selectedTaxRule.rate, taxOverrides);
    return {
      ...totals,
      currency: selectedRegion.currency
    };
  }, [orderItems, selectedTaxRule, selectedRegion, products]);

  const handleRegionChange = (regionId: string) => {
    setFormData(prev => ({ 
      ...prev, 
      regionId, 
      taxRuleId: "" // Reset tax rule when region changes
    }));
    
    // Clear order items when region changes since products are region-specific
    setOrderItems([]);
    toast({
      title: "Region Changed",
      description: "Order items cleared due to region change. Please re-add items.",
    });
  };

  const handleAddItem = () => {
    if (!newItemForm.productId || newItemForm.qty <= 0) {
      toast({
        title: "Invalid Item",
        description: "Please select a product and enter a valid quantity.",
        variant: "destructive",
      });
      return;
    }

    const product = products.find(p => p.id === newItemForm.productId);
    if (!product) return;

    const newItem: OrderItem = {
      productId: product.id,
      name: product.name,
      qty: newItemForm.qty,
      unitPrice: product.price,
      effectiveTaxRate: getEffectiveTaxRate(product.id, formData.regionId, formData.taxRuleId)
    };

    setOrderItems(prev => [...prev, newItem]);
    setNewItemForm({ productId: "", qty: 1 });
    
    toast({
      title: "Item Added",
      description: `Added ${newItem.qty}x ${newItem.name} to order`,
    });
  };

  const handleRemoveItem = (index: number) => {
    const removedItem = orderItems[index];
    setOrderItems(prev => prev.filter((_, i) => i !== index));
    
    toast({
      title: "Item Removed",
      description: `Removed ${removedItem.name} from order`,
    });
  };

  const handleQuantityChange = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    
    setOrderItems(prev => prev.map((item, i) => 
      i === index ? { ...item, qty: newQty } : item
    ));
  };

  const handleSave = () => {
    if (!formData.regionId || !formData.customerName || orderItems.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in region, customer name, and add at least one item.",
        variant: "destructive",
      });
      return;
    }

    const orderToSave: TaxOrder = {
      id: order?.id || nanoid(),
      number: order?.number || `ORD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      regionId: formData.regionId,
      customerId: formData.customerId || undefined,
      customerName: formData.customerName,
      createdAt: order?.createdAt || new Date().toISOString(),
      items: orderItems,
      taxRuleId: formData.taxRuleId || selectedRegion?.taxRules[0]?.id,
      totals: orderTotals
    };

    // Save to localStorage
    const orders = getTaxOrders();
    const existingIndex = orders.findIndex(o => o.id === orderToSave.id);
    
    if (existingIndex >= 0) {
      orders[existingIndex] = orderToSave;
    } else {
      orders.push(orderToSave);
    }
    
    saveTaxOrders(orders);

    toast({
      title: "Order Saved",
      description: `Order ${orderToSave.number} has been saved successfully.`,
    });

    if (onSave) {
      onSave(orderToSave);
    }
  };

  if (!isOpen || !settings) {
    return null;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto" data-testid="form-tax-order">
      {/* Header */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ShoppingCart className="h-5 w-5" />
            <span>{order ? "Edit Order" : "Create New Order"}</span>
          </CardTitle>
          <CardDescription>
            Create orders with automatic tax calculations based on region and product settings
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Order Details */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Order Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="region">Region *</Label>
              <Select value={formData.regionId} onValueChange={handleRegionChange}>
                <SelectTrigger data-testid="select-order-region">
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {settings.regions.map((region) => (
                    <SelectItem key={region.id} value={region.id}>
                      {region.name} ({region.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="customer-name">Customer Name *</Label>
              <Input
                id="customer-name"
                data-testid="input-customer-name"
                placeholder="Enter customer name"
                value={formData.customerName}
                onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="customer-id">Customer ID (Optional)</Label>
              <Input
                id="customer-id"
                data-testid="input-customer-id"
                placeholder="Customer reference"
                value={formData.customerId}
                onChange={(e) => setFormData(prev => ({ ...prev, customerId: e.target.value }))}
              />
            </div>
          </div>
          
          {selectedRegion && (
            <div className="space-y-2">
              <Label htmlFor="tax-rule">Tax Rule</Label>
              <Select 
                value={formData.taxRuleId} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, taxRuleId: value }))}
              >
                <SelectTrigger data-testid="select-tax-rule">
                  <SelectValue placeholder="Use default tax rule" />
                </SelectTrigger>
                <SelectContent>
                  {selectedRegion.taxRules.map((rule) => (
                    <SelectItem key={rule.id} value={rule.id}>
                      {rule.name} ({(rule.rate * 100).toFixed(1)}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-sm text-gray-600">
                Current tax rule: {selectedTaxRule?.name} ({(selectedTaxRule?.rate || 0) * 100}%)
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Items */}
      {formData.regionId && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Add Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="product">Product</Label>
                <Select 
                  value={newItemForm.productId} 
                  onValueChange={(value) => setNewItemForm(prev => ({ ...prev, productId: value }))}
                >
                  <SelectTrigger data-testid="select-product">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {regionProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - {currencyFormat(product.price, selectedRegion!.currency, selectedRegion!.locale)}
                        {product.taxOverride && (
                          <Badge variant="secondary" className="ml-2">
                            Tax Override: {(product.taxOverride.rate * 100).toFixed(1)}%
                          </Badge>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="w-24 space-y-2">
                <Label htmlFor="quantity">Qty</Label>
                <Input
                  id="quantity"
                  data-testid="input-quantity"
                  type="number"
                  min="1"
                  value={newItemForm.qty}
                  onChange={(e) => setNewItemForm(prev => ({ ...prev, qty: parseInt(e.target.value) || 1 }))}
                />
              </div>
              
              <Button onClick={handleAddItem} data-testid="button-add-item">
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Items */}
      {orderItems.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Tax Rate</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderItems.map((item, index) => {
                  const product = products.find(p => p.id === item.productId);
                  const effectiveRate = getEffectiveTaxRate(item.productId, formData.regionId, formData.taxRuleId);
                  const subtotal = item.qty * item.unitPrice;
                  const tax = subtotal * effectiveRate;
                  const total = subtotal + tax;
                  
                  return (
                    <TableRow key={index} data-testid={`row-order-item-${index}`}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)}
                          className="w-16 text-center"
                          data-testid={`input-qty-${index}`}
                        />
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {currencyFormat(item.unitPrice, orderTotals.currency, selectedRegion!.locale)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={product?.taxOverride ? "secondary" : "default"}>
                          {(effectiveRate * 100).toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {currencyFormat(subtotal, orderTotals.currency, selectedRegion!.locale)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {currencyFormat(tax, orderTotals.currency, selectedRegion!.locale)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {currencyFormat(total, orderTotals.currency, selectedRegion!.locale)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                          data-testid={`button-remove-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Order Totals */}
      {orderItems.length > 0 && selectedRegion && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calculator className="h-4 w-4" />
              <span>Order Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-mono" data-testid="text-order-subtotal">
                  {currencyFormat(orderTotals.sub, orderTotals.currency, selectedRegion.locale)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tax ({selectedTaxRule?.name}):</span>
                <span className="font-mono" data-testid="text-order-tax">
                  {currencyFormat(orderTotals.tax, orderTotals.currency, selectedRegion.locale)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-semibold border-t pt-3">
                <span>Grand Total:</span>
                <span className="font-mono" data-testid="text-order-grand-total">
                  {currencyFormat(orderTotals.grand, orderTotals.currency, selectedRegion.locale)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} data-testid="button-cancel-order">
            Cancel
          </Button>
        )}
        <Button 
          onClick={handleSave} 
          disabled={orderItems.length === 0}
          data-testid="button-save-order"
        >
          {order ? "Update Order" : "Create Order"}
        </Button>
      </div>
    </div>
  );
}