import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calculator, MapPin, Percent, Settings, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getFinanceSettings, getEffectiveTaxRate, calculateRegionTax } from "@/utils/taxation";
import { getAllProducts, getProductBySku, type Product } from "@/data/seedProductData";

interface TaxTabProps {
  product: Product;
  onProductUpdate?: (updatedProduct: Product) => void;
}

interface TaxOverride {
  id: string;
  name: string;
  rate: number;
}

export function TaxTab({ product, onProductUpdate }: TaxTabProps) {
  const [settings, setSettings] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [editForm, setEditForm] = useState({
    regionId: product.regionId || "",
    taxCategory: product.taxCategory || "standard",
    taxOverride: product.taxOverride || null
  });
  const { toast } = useToast();

  // Load finance settings
  useEffect(() => {
    const financeSettings = getFinanceSettings();
    setSettings(financeSettings);
    setIsLoading(false);
  }, []);

  const handleSaveChanges = () => {
    try {
      // Update product in localStorage
      const products = getAllProducts();
      const updatedProducts = products.map(p => 
        p.id === product.id 
          ? {
              ...p,
              regionId: editForm.regionId,
              taxCategory: editForm.taxCategory as "standard" | "reduced" | "zero",
              taxOverride: editForm.taxOverride
            }
          : p
      );
      
      localStorage.setItem("flowventory:products", JSON.stringify(updatedProducts));
      
      // Update the current product object
      const updatedProduct = {
        ...product,
        regionId: editForm.regionId,
        taxCategory: editForm.taxCategory as "standard" | "reduced" | "zero",
        taxOverride: editForm.taxOverride || undefined
      };
      
      if (onProductUpdate) {
        onProductUpdate(updatedProduct);
      }
      
      setEditModalOpen(false);
      toast({
        title: "Tax Settings Updated",
        description: "Product tax configuration has been saved successfully.",
      });
    } catch (error) {
      console.error("Error updating tax settings:", error);
      toast({
        title: "Error",
        description: "Failed to update tax settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getRegionName = (regionId: string): string => {
    if (!settings) return regionId;
    const region = settings.regions.find((r: any) => r.id === regionId);
    return region ? region.name : regionId;
  };

  const getCurrentTaxRate = (): number => {
    if (!product.regionId || !settings) return 0;
    return getEffectiveTaxRate(product.id, product.regionId);
  };

  const getTaxCategoryBadgeColor = (category: string): "default" | "secondary" | "destructive" => {
    switch (category) {
      case "standard": return "default";
      case "reduced": return "secondary";
      case "zero": return "destructive";
      default: return "default";
    }
  };

  const calculateSampleTax = (): number => {
    if (!product.regionId || !settings) return 0;
    const taxRate = getCurrentTaxRate();
    return product.price * taxRate;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-800 rounded w-1/3"></div>
          <div className="h-32 bg-zinc-800 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="tax-tab">
      {/* Current Tax Configuration */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5" />
            <span>Tax Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-gray-400">Tax Region</Label>
              <div className="flex items-center space-x-2 mt-1">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span data-testid="text-tax-region">
                  {product.regionId ? getRegionName(product.regionId) : "Not set"}
                </span>
              </div>
            </div>
            <div>
              <Label className="text-sm text-gray-400">Tax Category</Label>
              <div className="mt-1">
                <Badge 
                  variant={getTaxCategoryBadgeColor(product.taxCategory || "standard")}
                  data-testid="badge-tax-category"
                >
                  {product.taxCategory || "standard"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-gray-400">Current Tax Rate</Label>
              <div className="flex items-center space-x-2 mt-1">
                <Percent className="h-4 w-4 text-green-500" />
                <span className="font-mono text-lg" data-testid="text-current-tax-rate">
                  {(getCurrentTaxRate() * 100).toFixed(2)}%
                </span>
              </div>
            </div>
            <div>
              <Label className="text-sm text-gray-400">Sample Tax on Price</Label>
              <div className="flex items-center space-x-2 mt-1">
                <Calculator className="h-4 w-4 text-blue-500" />
                <span className="font-mono text-lg" data-testid="text-sample-tax">
                  ${calculateSampleTax().toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {product.taxOverride && (
            <div className="p-3 bg-yellow-900/20 border border-yellow-600 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-yellow-300">Tax Override Active</span>
              </div>
              <div className="text-sm text-gray-300 mt-1">
                {product.taxOverride.name} - {(product.taxOverride.rate * 100).toFixed(2)}%
              </div>
            </div>
          )}
          
          <div className="flex justify-end">
            <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-edit-tax-settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Edit Tax Settings
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Tax Configuration</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tax-region">Tax Region</Label>
                    <Select 
                      value={editForm.regionId} 
                      onValueChange={(value) => setEditForm(prev => ({ ...prev, regionId: value }))}
                    >
                      <SelectTrigger data-testid="select-tax-region">
                        <SelectValue placeholder="Select tax region" />
                      </SelectTrigger>
                      <SelectContent>
                        {settings?.regions?.map((region: any) => (
                          <SelectItem key={region.id} value={region.id}>
                            {region.name} ({region.currency})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tax-category">Tax Category</Label>
                    <Select 
                      value={editForm.taxCategory} 
                      onValueChange={(value: "standard" | "reduced" | "zero") => setEditForm(prev => ({ ...prev, taxCategory: value }))}
                    >
                      <SelectTrigger data-testid="select-tax-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">Standard Rate</SelectItem>
                        <SelectItem value="reduced">Reduced Rate</SelectItem>
                        <SelectItem value="zero">Zero Rate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm text-gray-400">Tax Override (Optional)</Label>
                    <div className="text-xs text-gray-500">
                      Leave empty to use regional tax rules based on category
                    </div>
                    {editForm.taxOverride && (
                      <div className="space-y-2 p-3 bg-gray-800 rounded-lg">
                        <Input
                          placeholder="Override name"
                          value={editForm.taxOverride.name}
                          onChange={(e) => setEditForm(prev => ({
                            ...prev,
                            taxOverride: prev.taxOverride ? {
                              ...prev.taxOverride,
                              name: e.target.value
                            } : null
                          }))}
                          data-testid="input-override-name"
                        />
                        <Input
                          type="number"
                          placeholder="Override rate (0.20 for 20%)"
                          step="0.01"
                          value={editForm.taxOverride.rate}
                          onChange={(e) => setEditForm(prev => ({
                            ...prev,
                            taxOverride: prev.taxOverride ? {
                              ...prev.taxOverride,
                              rate: parseFloat(e.target.value) || 0
                            } : null
                          }))}
                          data-testid="input-override-rate"
                        />
                        <Button 
                          variant="outline" 
                          onClick={() => setEditForm(prev => ({ ...prev, taxOverride: null }))}
                          data-testid="button-remove-override"
                        >
                          Remove Override
                        </Button>
                      </div>
                    )}
                    {!editForm.taxOverride && (
                      <Button 
                        variant="outline" 
                        onClick={() => setEditForm(prev => ({ 
                          ...prev, 
                          taxOverride: { id: "custom", name: "", rate: 0 } 
                        }))}
                        data-testid="button-add-override"
                      >
                        Add Tax Override
                      </Button>
                    )}
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setEditModalOpen(false)}
                      data-testid="button-cancel-tax-edit"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSaveChanges}
                      data-testid="button-save-tax-changes"
                    >
                      Save Changes
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Available Tax Rules for Region */}
      {product.regionId && settings && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Available Tax Rules for {getRegionName(product.regionId)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {settings.regions
                .find((r: any) => r.id === product.regionId)
                ?.taxRules?.map((rule: any) => (
                  <div 
                    key={rule.id} 
                    className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                    data-testid={`tax-rule-${rule.id}`}
                  >
                    <div>
                      <div className="font-medium">{rule.name}</div>
                      <div className="text-sm text-gray-400">Category: {rule.category}</div>
                    </div>
                    <Badge variant="outline" className="font-mono">
                      {(rule.rate * 100).toFixed(2)}%
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}