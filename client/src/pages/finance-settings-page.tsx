import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Settings, DollarSign, Globe, Percent } from "lucide-react";
import { nanoid } from "nanoid";
import type { FinanceSettings, TaxRegion, TaxRule, InsertTaxRule } from "@shared/schema";
import { 
  getFinanceSettings, 
  saveFinanceSettings, 
  addTaxRuleToRegion, 
  currencyFormat 
} from "@/utils/taxation";

export default function FinanceSettingsPage() {
  const [settings, setSettings] = useState<FinanceSettings | null>(null);
  const [isAddRuleModalOpen, setIsAddRuleModalOpen] = useState(false);
  const [selectedRegionId, setSelectedRegionId] = useState<string>("");
  const [newRule, setNewRule] = useState<InsertTaxRule>({
    name: "",
    rate: 0,
    scope: "all"
  });
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    const financeSettings = getFinanceSettings();
    setSettings(financeSettings);
  };

  const handleBaseCurrencyChange = (currency: string) => {
    if (!settings) return;
    
    const updatedSettings = {
      ...settings,
      baseCurrency: currency as any
    };
    
    setSettings(updatedSettings);
    saveFinanceSettings(updatedSettings);
    toast({
      title: "Base Currency Updated",
      description: `Base currency changed to ${currency}`,
    });
  };

  const handleDisplayLocaleChange = (locale: string) => {
    if (!settings) return;
    
    const updatedSettings = {
      ...settings,
      displayLocale: locale
    };
    
    setSettings(updatedSettings);
    saveFinanceSettings(updatedSettings);
    toast({
      title: "Display Locale Updated",
      description: `Display locale changed to ${locale}`,
    });
  };

  const handleAddTaxRule = () => {
    if (!selectedRegionId || !newRule.name || newRule.rate < 0 || newRule.rate > 1) {
      toast({
        title: "Invalid Input",
        description: "Please fill in all fields with valid values. Tax rate must be between 0 and 1.",
        variant: "destructive",
      });
      return;
    }

    const ruleWithId: TaxRule = {
      id: nanoid(),
      ...newRule
    };

    addTaxRuleToRegion(selectedRegionId, ruleWithId);
    loadSettings(); // Reload to get updated data
    
    // Reset form
    setNewRule({ name: "", rate: 0, scope: "all" });
    setSelectedRegionId("");
    setIsAddRuleModalOpen(false);
    
    toast({
      title: "Tax Rule Added",
      description: `Added "${ruleWithId.name}" to the selected region`,
    });
  };

  const formatTaxRate = (rate: number): string => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  const getScopeColor = (scope: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (scope) {
      case "all": return "default";
      case "category": return "secondary";
      case "sku": return "outline";
      default: return "outline";
    }
  };

  if (!settings) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center space-x-2">
          <Settings className="h-6 w-6" />
          <h1 className="text-2xl font-semibold">Finance & Tax Settings</h1>
        </div>
        <div className="text-center">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-finance-settings">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-semibold">Finance & Tax Settings</h1>
      </div>

      {/* Global Settings */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Globe className="h-5 w-5" />
            <span>Global Settings</span>
          </CardTitle>
          <CardDescription>
            Configure base currency and display locale for your workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="base-currency">Base Currency</Label>
              <Select value={settings.baseCurrency} onValueChange={handleBaseCurrencyChange}>
                <SelectTrigger data-testid="select-base-currency">
                  <SelectValue placeholder="Select base currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                  <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                  <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="display-locale">Display Locale</Label>
              <Select value={settings.displayLocale} onValueChange={handleDisplayLocaleChange}>
                <SelectTrigger data-testid="select-display-locale">
                  <SelectValue placeholder="Select display locale" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-US">en-US (United States)</SelectItem>
                  <SelectItem value="en-GB">en-GB (United Kingdom)</SelectItem>
                  <SelectItem value="en-AE">en-AE (United Arab Emirates)</SelectItem>
                  <SelectItem value="en-SG">en-SG (Singapore)</SelectItem>
                  <SelectItem value="en-IN">en-IN (India)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regional Tax Rules */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Percent className="h-5 w-5" />
              <span>Regional Tax Rules</span>
            </div>
            <Dialog open={isAddRuleModalOpen} onOpenChange={setIsAddRuleModalOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-tax-rule">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Tax Rule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Tax Rule</DialogTitle>
                  <DialogDescription>
                    Create a new tax rule for a specific region. The rate should be entered as a decimal (e.g., 0.2 for 20%).
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="select-region">Region</Label>
                    <Select value={selectedRegionId} onValueChange={setSelectedRegionId}>
                      <SelectTrigger data-testid="select-region">
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
                    <Label htmlFor="rule-name">Tax Rule Name</Label>
                    <Input
                      id="rule-name"
                      data-testid="input-tax-rule-name"
                      placeholder="e.g., VAT 20%"
                      value={newRule.name}
                      onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rule-rate">Tax Rate (0.0 - 1.0)</Label>
                    <Input
                      id="rule-rate"
                      data-testid="input-tax-rate"
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      placeholder="0.20"
                      value={newRule.rate}
                      onChange={(e) => setNewRule(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                    />
                    <div className="text-sm text-gray-500">
                      Preview: {formatTaxRate(newRule.rate)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rule-scope">Scope</Label>
                    <Select value={newRule.scope} onValueChange={(value: any) => setNewRule(prev => ({ ...prev, scope: value }))}>
                      <SelectTrigger data-testid="select-tax-scope">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Products</SelectItem>
                        <SelectItem value="category">By Category</SelectItem>
                        <SelectItem value="sku">By SKU</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddRuleModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddTaxRule} data-testid="button-save-tax-rule">
                    Add Tax Rule
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardTitle>
          <CardDescription>
            Manage tax rules for different regions and currencies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Region</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Locale</TableHead>
                <TableHead>Tax Rules</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settings.regions.map((region) => (
                <TableRow key={region.id} data-testid={`row-region-${region.id}`}>
                  <TableCell className="font-medium">{region.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{region.currency}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">{region.locale}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {region.taxRules.map((rule) => (
                        <div key={rule.id} className="flex items-center space-x-2">
                          <Badge variant={getScopeColor(rule.scope)} data-testid={`badge-tax-rule-${rule.id}`}>
                            {rule.name} - {formatTaxRate(rule.rate)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Currency Preview */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Currency Format Preview</span>
          </CardTitle>
          <CardDescription>
            Preview how amounts will be displayed in different regions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {settings.regions.map((region) => (
              <div key={region.id} className="text-center p-3 border rounded-lg" data-testid={`preview-${region.id}`}>
                <div className="font-medium text-sm">{region.name}</div>
                <div className="text-lg font-semibold mt-1">
                  {currencyFormat(1234.56, region.currency, region.locale)}
                </div>
                <div className="text-xs text-gray-500">{region.currency} - {region.locale}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}