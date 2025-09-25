import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Package, DollarSign, MapPin, Percent, X } from "lucide-react";
import { nanoid } from "nanoid";
import type { TaxProduct, TaxOverride, FinanceSettings } from "@shared/schema";
import { 
  getFinanceSettings, 
  getTaxProducts, 
  saveTaxProducts, 
  currencyFormat,
  getEffectiveTaxRate 
} from "@/utils/taxation";

interface ProductFormProps {
  product?: TaxProduct | null;
  onSave?: (product: TaxProduct) => void;
  onCancel?: () => void;
  isOpen?: boolean;
}

export function ProductForm({ product, onSave, onCancel, isOpen = true }: ProductFormProps) {
  const [formData, setFormData] = useState<Partial<TaxProduct>>({
    sku: "",
    name: "",
    regionId: "",
    price: 0
  });
  
  const [hasCustomTaxOverride, setHasCustomTaxOverride] = useState(false);
  const [taxOverride, setTaxOverride] = useState<Partial<TaxOverride>>({
    name: "",
    rate: 0
  });
  
  const [settings, setSettings] = useState<FinanceSettings | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const financeSettings = getFinanceSettings();
    setSettings(financeSettings);
  }, []);

  useEffect(() => {
    if (product) {
      setFormData({
        sku: product.sku,
        name: product.name,
        regionId: product.regionId,
        price: product.price
      });
      
      if (product.taxOverride) {
        setHasCustomTaxOverride(true);
        setTaxOverride({
          name: product.taxOverride.name,
          rate: product.taxOverride.rate
        });
      } else {
        setHasCustomTaxOverride(false);
        setTaxOverride({ name: "", rate: 0 });
      }
    }
  }, [product]);

  const handleSave = () => {
    if (!formData.sku || !formData.name || !formData.regionId || formData.price === undefined) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (hasCustomTaxOverride && (!taxOverride.name || taxOverride.rate === undefined)) {
      toast({
        title: "Validation Error",
        description: "Please complete the tax override information or disable it.",
        variant: "destructive",
      });
      return;
    }

    const productToSave: TaxProduct = {
      id: product?.id || nanoid(),
      sku: formData.sku!,
      name: formData.name!,
      regionId: formData.regionId!,
      price: formData.price!,
      taxOverride: hasCustomTaxOverride 
        ? {
            id: product?.taxOverride?.id || nanoid(),
            name: taxOverride.name!,
            rate: taxOverride.rate!
          }
        : undefined
    };

    // Save to localStorage
    const products = getTaxProducts();
    const existingIndex = products.findIndex(p => p.id === productToSave.id);
    
    if (existingIndex >= 0) {
      products[existingIndex] = productToSave;
    } else {
      products.push(productToSave);
    }
    
    saveTaxProducts(products);

    toast({
      title: "Product Saved",
      description: `Product "${productToSave.name}" has been saved successfully.`,
    });

    if (onSave) {
      onSave(productToSave);
    }
  };

  const getSelectedRegion = () => {
    if (!settings || !formData.regionId) return null;
    return settings.regions.find(r => r.id === formData.regionId);
  };

  const getCurrentEffectiveTaxRate = () => {
    if (hasCustomTaxOverride && taxOverride.rate !== undefined) {
      return taxOverride.rate;
    }
    
    if (formData.regionId && settings) {
      const region = settings.regions.find(r => r.id === formData.regionId);
      return region?.taxRules[0]?.rate || 0;
    }
    
    return 0;
  };

  const formatTaxRate = (rate: number): string => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  if (!isOpen || !settings) {
    return null;
  }

  const selectedRegion = getSelectedRegion();
  const effectiveTaxRate = getCurrentEffectiveTaxRate();
  const sampleTax = formData.price ? formData.price * effectiveTaxRate : 0;
  const sampleTotal = formData.price ? formData.price + sampleTax : 0;

  return (
    <Card className="rounded-2xl max-w-2xl mx-auto" data-testid="form-product">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Package className="h-5 w-5" />
          <span>{product ? "Edit Product" : "Add New Product"}</span>
        </CardTitle>
        <CardDescription>
          Configure product details, regional settings, and tax overrides
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Product Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Product Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="product-sku">SKU *</Label>
              <Input
                id="product-sku"
                data-testid="input-product-sku"
                placeholder="e.g., UK-WIDGET-001"
                value={formData.sku}
                onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-name">Product Name *</Label>
              <Input
                id="product-name"
                data-testid="input-product-name"
                placeholder="e.g., Premium Widget"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Regional Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center space-x-2">
            <MapPin className="h-4 w-4" />
            <span>Regional Settings</span>
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="product-region">Region *</Label>
              <Select 
                value={formData.regionId} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, regionId: value }))}
              >
                <SelectTrigger data-testid="select-product-region">
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
              <Label htmlFor="product-price">Price *</Label>
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <Input
                  id="product-price"
                  data-testid="input-product-price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                />
                {selectedRegion && (
                  <Badge variant="outline">{selectedRegion.currency}</Badge>
                )}
              </div>
            </div>
          </div>
          
          {selectedRegion && (
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="text-sm">
                <span className="font-medium">Default Tax:</span> {formatTaxRate(selectedRegion.taxRules[0]?.rate || 0)}
                {" "}({selectedRegion.taxRules[0]?.name || "No tax rule"})
              </div>
            </div>
          )}
        </div>

        {/* Tax Override Settings */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="has-tax-override"
              data-testid="checkbox-tax-override"
              checked={hasCustomTaxOverride}
              onCheckedChange={(checked) => setHasCustomTaxOverride(!!checked)}
            />
            <Label htmlFor="has-tax-override" className="flex items-center space-x-2">
              <Percent className="h-4 w-4" />
              <span>Custom Tax Override</span>
            </Label>
          </div>
          
          {hasCustomTaxOverride && (
            <div className="pl-6 space-y-4 border-l-2 border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tax-override-name">Override Name</Label>
                  <Input
                    id="tax-override-name"
                    data-testid="input-tax-override-name"
                    placeholder="e.g., Zero-rated, Export rate"
                    value={taxOverride.name}
                    onChange={(e) => setTaxOverride(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax-override-rate">Tax Rate (0.0 - 1.0)</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="tax-override-rate"
                      data-testid="input-tax-override-rate"
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      placeholder="0.00"
                      value={taxOverride.rate}
                      onChange={(e) => setTaxOverride(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                    />
                    <Badge variant="secondary">
                      {formatTaxRate(taxOverride.rate || 0)}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                This will override the default tax rate for this specific product.
              </div>
            </div>
          )}
        </div>

        {/* Price Preview */}
        {formData.price && formData.price > 0 && selectedRegion && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Price Preview</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 border rounded-lg">
                <div className="text-sm text-gray-600">Base Price</div>
                <div className="text-lg font-semibold" data-testid="preview-base-price">
                  {currencyFormat(formData.price, selectedRegion.currency, selectedRegion.locale)}
                </div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-sm text-gray-600">Tax ({formatTaxRate(effectiveTaxRate)})</div>
                <div className="text-lg font-semibold" data-testid="preview-tax-amount">
                  {currencyFormat(sampleTax, selectedRegion.currency, selectedRegion.locale)}
                </div>
              </div>
              <div className="text-center p-3 border rounded-lg bg-green-50 dark:bg-green-900/20">
                <div className="text-sm text-gray-600">Total Price</div>
                <div className="text-lg font-semibold text-green-600 dark:text-green-400" data-testid="preview-total-price">
                  {currencyFormat(sampleTotal, selectedRegion.currency, selectedRegion.locale)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} data-testid="button-cancel-product">
              Cancel
            </Button>
          )}
          <Button onClick={handleSave} data-testid="button-save-product">
            {product ? "Update Product" : "Add Product"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}