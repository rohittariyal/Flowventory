import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { LocationGuard } from "@/components/LocationGuard";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Clock, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2, 
  Eye, 
  Plus, 
  Send, 
  Download,
  ArrowUpDown,
  Filter,
  Star,
  Award,
  AlertCircle
} from "lucide-react";

// Types
interface Supplier {
  id: string;
  workspaceId: string;
  name: string;
  email?: string;
  phone?: string;
  region: string;
  currency: string;
  leadTimeDays: number;
  paymentTerms: string;
  address?: string;
  status: string;
  skus: Array<{
    sku: string;
    unitCost: number;
    packSize: number;
    moq: number;
    leadTimeDays: number;
  }>;
  notes?: string;
  onTimeRatePct: number;
  defectRatePct: number;
  avgLeadTimeDays: number;
  onTimeTargetPct: number;
  defectTargetPct: number;
  totalDeliveries: number;
  breachCount: number;
  lastBreachDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface PurchaseOrder {
  id: string;
  number: string;
  supplierId: string;
  createdAt: string;
  expectedAt: string;
  receivedAt?: string;
  items: Array<{
    productId: string;
    qty: number;
    unitPrice: number;
  }>;
  status: "DRAFT" | "SENT" | "RECEIVED" | "CANCELLED";
}

interface ReturnRecord {
  id: string;
  ts: string;
  productId: string;
  supplierId?: string;
  qty: number;
  reason: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  category?: string;
}

interface SLA {
  supplierId: string;
  targetLeadTimeDays: number;
  targetOnTimePct: number;
}

interface BenchmarkFilters {
  dateRange: number; // days
  category: string;
  sku: string;
  region: string;
}

interface SupplierMetrics {
  supplierId: string;
  supplierName: string;
  region: string;
  onTimePct: number;
  avgLeadTime: number;
  priceVariance: number;
  defectRate: number;
  poCount: number;
  score: number;
  scoreLabel: "Top Choice" | "Consider" | "Watchlist";
  totalQty: number;
  avgPrice: number;
}

const DEFAULT_FILTERS: BenchmarkFilters = {
  dateRange: 90,
  category: "all",
  sku: "all", 
  region: "all"
};

const FILTERS_STORAGE_KEY = "flowventory:views:supplierBenchmark";

function NudgeSupplierModal({ 
  supplier, 
  isOpen, 
  onClose 
}: { 
  supplier: Supplier | null; 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (supplier && isOpen) {
      setSubject(`Performance Review - ${supplier.name}`);
      setMessage(`Dear ${supplier.name} team,

We hope this message finds you well. We are reaching out to discuss recent performance metrics and explore ways to enhance our partnership.

Recent Performance:
- On-time delivery rate: ${supplier.onTimeRatePct.toFixed(1)}%
- Average lead time: ${supplier.avgLeadTimeDays} days

We value our partnership and would appreciate the opportunity to discuss how we can work together to improve these metrics.

Best regards,
Supply Chain Team`);
    }
  }, [supplier, isOpen]);

  const handleSend = () => {
    if (!supplier) return;
    
    // In a real app, this would send an email
    toast({
      title: "Message sent",
      description: `Follow-up message sent to ${supplier.name}`,
    });
    onClose();
  };

  if (!supplier) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" data-testid="modal-nudge-supplier">
        <DialogHeader>
          <DialogTitle data-testid="text-nudge-modal-title">
            Contact {supplier.name}
          </DialogTitle>
          <DialogDescription>
            Send a performance review message to your supplier
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              data-testid="input-nudge-subject"
            />
          </div>
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={12}
              data-testid="textarea-nudge-message"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button 
            variant="outline" 
            onClick={onClose}
            data-testid="button-nudge-cancel"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSend}
            data-testid="button-nudge-send"
          >
            <Send className="mr-2 h-4 w-4" />
            Send Message
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const getScoreLabel = (score: number): { label: string; variant: string; icon: React.ReactNode } => {
    if (score >= 80) {
      return { label: "Top Choice", variant: "default", icon: <Award className="mr-1 h-3 w-3" /> };
    } else if (score >= 60) {
      return { label: "Consider", variant: "secondary", icon: <Star className="mr-1 h-3 w-3" /> };
    } else {
      return { label: "Watchlist", variant: "destructive", icon: <AlertCircle className="mr-1 h-3 w-3" /> };
    }
  };

  const { label, variant, icon } = getScoreLabel(score);

  return (
    <Badge 
      variant={variant as any} 
      className="inline-flex items-center"
      data-testid={`badge-score-${label.toLowerCase().replace(' ', '-')}`}
    >
      {icon}
      {label}
    </Badge>
  );
}

export default function SupplierBenchmarkPage() {
  const [filters, setFilters] = useState<BenchmarkFilters>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<keyof SupplierMetrics>("score");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isNudgeModalOpen, setIsNudgeModalOpen] = useState(false);
  const { toast } = useToast();

  // Load data from localStorage
  const data = useMemo(() => {
    return {
      suppliers: JSON.parse(localStorage.getItem("flowventory:suppliers") || "[]") as Supplier[],
      purchaseOrders: JSON.parse(localStorage.getItem("flowventory:purchaseOrders") || "[]") as PurchaseOrder[],
      returns: JSON.parse(localStorage.getItem("flowventory:returns") || "[]") as ReturnRecord[],
      products: JSON.parse(localStorage.getItem("flowventory:products") || "[]") as Product[],
      sla: JSON.parse(localStorage.getItem("flowventory:sla") || "[]") as SLA[]
    };
  }, [filters]);

  // Load saved filters
  useEffect(() => {
    const savedFilters = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (savedFilters) {
      setFilters(JSON.parse(savedFilters));
    }
  }, []);

  // Save filters when they change
  useEffect(() => {
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  // Calculate metrics for each supplier
  const supplierMetrics = useMemo((): SupplierMetrics[] => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - filters.dateRange);

    const metrics: SupplierMetrics[] = [];

    // Filter purchase orders within date range
    const filteredPOs = data.purchaseOrders.filter(po => 
      new Date(po.createdAt) >= cutoffDate
    );

    // Filter returns within date range
    const filteredReturns = data.returns.filter(ret => 
      new Date(ret.ts) >= cutoffDate
    );

    data.suppliers.forEach(supplier => {
      // Get POs for this supplier
      const supplierPOs = filteredPOs.filter(po => po.supplierId === supplier.id);
      const receivedPOs = supplierPOs.filter(po => po.receivedAt);

      if (supplierPOs.length === 0) {
        return; // Skip suppliers with no POs in the date range
      }

      // Apply category/SKU filter
      let relevantPOs = supplierPOs;
      if (filters.category !== "all" || filters.sku !== "all") {
        relevantPOs = supplierPOs.filter(po => {
          return po.items.some(item => {
            const product = data.products.find(p => p.id === item.productId);
            if (!product) return false;

            const categoryMatch = filters.category === "all" || product.category === filters.category;
            const skuMatch = filters.sku === "all" || product.sku === filters.sku;
            
            return categoryMatch && skuMatch;
          });
        });
      }

      // Apply region filter
      if (filters.region !== "all" && supplier.region !== filters.region) {
        return;
      }

      if (relevantPOs.length === 0) {
        return;
      }

      const relevantReceivedPOs = relevantPOs.filter(po => po.receivedAt);

      // Calculate on-time percentage
      const onTimePOs = relevantReceivedPOs.filter(po => {
        return new Date(po.receivedAt!) <= new Date(po.expectedAt);
      });
      const onTimePct = relevantReceivedPOs.length > 0 ? (onTimePOs.length / relevantReceivedPOs.length) * 100 : 0;

      // Calculate average lead time (received POs only)
      let avgLeadTime = 0;
      if (relevantReceivedPOs.length > 0) {
        const totalLeadTime = relevantReceivedPOs.reduce((sum, po) => {
          const created = new Date(po.createdAt);
          const received = new Date(po.receivedAt!);
          return sum + (received.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        }, 0);
        avgLeadTime = totalLeadTime / relevantReceivedPOs.length;
      }

      // Calculate price variance per product
      const allItems = relevantPOs.flatMap(po => po.items);
      const productPrices: Record<string, number[]> = {};
      
      allItems.forEach(item => {
        if (!productPrices[item.productId]) {
          productPrices[item.productId] = [];
        }
        productPrices[item.productId].push(item.unitPrice);
      });

      let priceVariances: number[] = [];
      Object.values(productPrices).forEach(prices => {
        if (prices.length > 1) {
          const sortedPrices = [...prices].sort((a, b) => a - b);
          const median = sortedPrices[Math.floor(sortedPrices.length / 2)];
          
          prices.forEach(price => {
            if (median > 0) {
              const variance = (price - median) / median;
              priceVariances.push(variance);
            }
          });
        }
      });

      const avgPriceVariance = priceVariances.length > 0 
        ? priceVariances.reduce((sum, v) => sum + Math.abs(v), 0) / priceVariances.length 
        : 0;

      // Calculate defect rate from returns
      const supplierReturns = filteredReturns.filter(ret => ret.supplierId === supplier.id);
      const totalReturnedQty = supplierReturns.reduce((sum, ret) => sum + ret.qty, 0);
      const totalSuppliedQty = allItems.reduce((sum, item) => sum + item.qty, 0);
      const defectRate = totalSuppliedQty > 0 ? (totalReturnedQty / totalSuppliedQty) * 100 : 0;

      // Calculate overall score (0-100)
      const normalizedLeadTime = Math.max(0, Math.min(1, (30 - avgLeadTime) / 30)); // Normalize assuming 30 days is worst
      const normalizedPriceVar = Math.max(0, Math.min(1, 1 - avgPriceVariance)); // Lower variance is better
      const score = (onTimePct / 100 * 0.5) + (normalizedLeadTime * 0.3) + (normalizedPriceVar * 0.2);
      const finalScore = Math.round(score * 100);

      // Determine score label
      let scoreLabel: "Top Choice" | "Consider" | "Watchlist";
      if (finalScore >= 80) {
        scoreLabel = "Top Choice";
      } else if (finalScore >= 60) {
        scoreLabel = "Consider";
      } else {
        scoreLabel = "Watchlist";
      }

      // Calculate additional metrics
      const totalQty = allItems.reduce((sum, item) => sum + item.qty, 0);
      const avgPrice = allItems.length > 0 
        ? allItems.reduce((sum, item) => sum + item.unitPrice, 0) / allItems.length 
        : 0;

      metrics.push({
        supplierId: supplier.id,
        supplierName: supplier.name,
        region: supplier.region,
        onTimePct,
        avgLeadTime,
        priceVariance: avgPriceVariance * 100, // Convert to percentage
        defectRate,
        poCount: relevantPOs.length,
        score: finalScore,
        scoreLabel,
        totalQty,
        avgPrice
      });
    });

    return metrics;
  }, [data, filters]);

  // Sort metrics
  const sortedMetrics = useMemo(() => {
    return [...supplierMetrics].sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc" 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });
  }, [supplierMetrics, sortBy, sortOrder]);

  // Get unique categories and SKUs for filters
  const categories = useMemo(() => {
    const cats = new Set(data.products.map(p => p.category).filter((cat): cat is string => Boolean(cat)));
    return Array.from(cats);
  }, [data.products]);

  const skus = useMemo(() => {
    const skuSet = new Set(data.products.map(p => p.sku));
    return Array.from(skuSet);
  }, [data.products]);

  const regions = useMemo(() => {
    const regionSet = new Set(data.suppliers.map(s => s.region));
    return Array.from(regionSet);
  }, [data.suppliers]);

  const handleSort = (field: keyof SupplierMetrics) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const handleCreatePO = (supplierId: string) => {
    // In a real app, this would navigate to PO creation with supplier preselected
    toast({
      title: "Create Purchase Order",
      description: "Opening PO creation form with supplier preselected..."
    });
  };

  const handleOpenSupplier = (supplierId: string) => {
    // In a real app, this would navigate to supplier detail page
    toast({
      title: "Supplier Details",
      description: "Opening supplier detail page..."
    });
  };

  const handleNudgeSupplier = (supplierId: string) => {
    const supplier = data.suppliers.find(s => s.id === supplierId);
    setSelectedSupplier(supplier || null);
    setIsNudgeModalOpen(true);
  };

  const handleExportCSV = () => {
    const csvHeaders = [
      "Supplier",
      "Region", 
      "On-time %",
      "Avg Lead Time (days)",
      "Price Variance %",
      "Defect Rate %",
      "PO Count",
      "Score",
      "Rating"
    ];

    const csvRows = sortedMetrics.map(metric => [
      metric.supplierName,
      metric.region,
      metric.onTimePct.toFixed(1),
      metric.avgLeadTime.toFixed(1),
      metric.priceVariance.toFixed(2),
      metric.defectRate.toFixed(2),
      metric.poCount.toString(),
      metric.score.toString(),
      metric.scoreLabel
    ]);

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `supplier-benchmark-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Complete",
      description: "Supplier benchmark data exported to CSV"
    });
  };

  return (
    <LocationGuard>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6" data-testid="page-supplier-benchmark">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-benchmark-title">
              Supplier Benchmarking
            </h1>
            <p className="text-muted-foreground" data-testid="text-benchmark-subtitle">
              Compare suppliers by performance metrics and rankings
            </p>
          </div>
          <Button 
            onClick={handleExportCSV}
            data-testid="button-export-csv"
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Select 
                  value={filters.dateRange.toString()} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: parseInt(value) }))}
                >
                  <SelectTrigger data-testid="select-date-range">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30" data-testid="option-range-30">Last 30 days</SelectItem>
                    <SelectItem value="90" data-testid="option-range-90">Last 90 days</SelectItem>
                    <SelectItem value="180" data-testid="option-range-180">Last 6 months</SelectItem>
                    <SelectItem value="365" data-testid="option-range-365">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Category</Label>
                <Select 
                  value={filters.category} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger data-testid="select-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="option-category-all">All categories</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category} data-testid={`option-category-${category}`}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>SKU</Label>
                <Select 
                  value={filters.sku} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, sku: value }))}
                >
                  <SelectTrigger data-testid="select-sku">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="option-sku-all">All SKUs</SelectItem>
                    {skus.map(sku => (
                      <SelectItem key={sku} value={sku} data-testid={`option-sku-${sku}`}>
                        {sku}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Region</Label>
                <Select 
                  value={filters.region} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, region: value }))}
                >
                  <SelectTrigger data-testid="select-region">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="option-region-all">All regions</SelectItem>
                    {regions.map(region => (
                      <SelectItem key={region} value={region} data-testid={`option-region-${region}`}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metrics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Suppliers</p>
                  <p className="text-2xl font-bold" data-testid="text-total-suppliers">
                    {sortedMetrics.length}
                  </p>
                </div>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg On-Time %</p>
                  <p className="text-2xl font-bold" data-testid="text-avg-ontime">
                    {sortedMetrics.length > 0 
                      ? (sortedMetrics.reduce((sum, m) => sum + m.onTimePct, 0) / sortedMetrics.length).toFixed(1)
                      : "0.0"
                    }%
                  </p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Lead Time</p>
                  <p className="text-2xl font-bold" data-testid="text-avg-leadtime">
                    {sortedMetrics.length > 0 
                      ? (sortedMetrics.reduce((sum, m) => sum + m.avgLeadTime, 0) / sortedMetrics.length).toFixed(1)
                      : "0.0"
                    }d
                  </p>
                </div>
                <Clock className="h-4 w-4 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Top Choice</p>
                  <p className="text-2xl font-bold" data-testid="text-top-choice-count">
                    {sortedMetrics.filter(m => m.scoreLabel === "Top Choice").length}
                  </p>
                </div>
                <Award className="h-4 w-4 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Benchmarking Table */}
        <Card>
          <CardHeader>
            <CardTitle>Supplier Performance Rankings</CardTitle>
            <CardDescription>
              Showing {sortedMetrics.length} suppliers for the last {filters.dateRange} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sortedMetrics.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No supplier data</h3>
                <p>No suppliers found matching the current filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => handleSort("supplierName")}
                        data-testid="header-supplier-name"
                      >
                        <div className="flex items-center gap-1">
                          Supplier
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => handleSort("onTimePct")}
                        data-testid="header-ontime-pct"
                      >
                        <div className="flex items-center gap-1">
                          On-time %
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => handleSort("avgLeadTime")}
                        data-testid="header-lead-time"
                      >
                        <div className="flex items-center gap-1">
                          Avg Lead Time
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => handleSort("priceVariance")}
                        data-testid="header-price-variance"
                      >
                        <div className="flex items-center gap-1">
                          Price Variance
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => handleSort("defectRate")}
                        data-testid="header-defect-rate"
                      >
                        <div className="flex items-center gap-1">
                          Defect Rate %
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => handleSort("poCount")}
                        data-testid="header-po-count"
                      >
                        <div className="flex items-center gap-1">
                          PO Count
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => handleSort("score")}
                        data-testid="header-score"
                      >
                        <div className="flex items-center gap-1">
                          Score
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedMetrics.map((metric) => (
                      <TableRow key={metric.supplierId} data-testid={`row-supplier-${metric.supplierId}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium" data-testid="text-supplier-name">
                              {metric.supplierName}
                            </div>
                            <div className="text-sm text-muted-foreground" data-testid="text-supplier-region">
                              {metric.region}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${
                              metric.onTimePct >= 90 ? "text-green-600" :
                              metric.onTimePct >= 80 ? "text-yellow-600" : "text-red-600"
                            }`} data-testid="text-ontime-pct">
                              {metric.onTimePct.toFixed(1)}%
                            </span>
                            {metric.onTimePct >= 85 ? 
                              <TrendingUp className="h-3 w-3 text-green-500" /> : 
                              <TrendingDown className="h-3 w-3 text-red-500" />
                            }
                          </div>
                        </TableCell>
                        <TableCell>
                          <span data-testid="text-lead-time">
                            {metric.avgLeadTime.toFixed(1)}d
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`${
                            metric.priceVariance <= 5 ? "text-green-600" :
                            metric.priceVariance <= 15 ? "text-yellow-600" : "text-red-600"
                          }`} data-testid="text-price-variance">
                            {metric.priceVariance.toFixed(2)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`${
                            metric.defectRate <= 2 ? "text-green-600" :
                            metric.defectRate <= 5 ? "text-yellow-600" : "text-red-600"
                          }`} data-testid="text-defect-rate">
                            {metric.defectRate.toFixed(2)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <span data-testid="text-po-count">
                            {metric.poCount}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium" data-testid="text-score">
                              {metric.score}
                            </span>
                            <ScoreBadge score={metric.score} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCreatePO(metric.supplierId)}
                              data-testid={`button-create-po-${metric.supplierId}`}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenSupplier(metric.supplierId)}
                              data-testid={`button-open-supplier-${metric.supplierId}`}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleNudgeSupplier(metric.supplierId)}
                              data-testid={`button-nudge-supplier-${metric.supplierId}`}
                            >
                              <Send className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Nudge Supplier Modal */}
        <NudgeSupplierModal
          supplier={selectedSupplier}
          isOpen={isNudgeModalOpen}
          onClose={() => setIsNudgeModalOpen(false)}
        />
      </div>
    </LocationGuard>
  );
}