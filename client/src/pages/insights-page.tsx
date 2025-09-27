
import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LocationGuard } from "@/components/LocationGuard";
import { useInsights, type Insight, type InsightAction } from "@/hooks/use-insights";
import { 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  Package, 
  Truck, 
  Users, 
  RefreshCw,
  Filter,
  X,
  ChevronRight
} from "lucide-react";

export interface InsightFilters {
  location: string;
  region: string;
  severity: string;
}

const CATEGORY_LABELS = {
  stock: "Stock Risks",
  supplier: "Supplier Risks", 
  logistics: "Logistics",
  finance: "Finance",
  forecast: "Forecast Anomalies"
};

const CATEGORY_ICONS = {
  stock: Package,
  supplier: Users,
  logistics: Truck,
  finance: DollarSign,
  forecast: TrendingUp
};

const SEVERITY_COLORS = {
  critical: "destructive",
  high: "secondary", 
  medium: "outline",
  info: "default"
} as const;

function InsightCard({ insight }: { insight: Insight }) {
  const [dismissed, setDismissed] = useState(false);
  const { toast } = useToast();
  
  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    
    // Store dismissed insight with date for daily reset
    const dismissedInsights = JSON.parse(localStorage.getItem("flowventory:insights:dismissed") || "[]");
    const today = new Date().toDateString();
    const dismissedEntry = { id: insight.id, date: today };
    
    // Remove old entries for today and add new one
    const filteredDismissed = dismissedInsights.filter((entry: any) => entry.date === today);
    filteredDismissed.push(dismissedEntry);
    localStorage.setItem("flowventory:insights:dismissed", JSON.stringify(filteredDismissed));
    
    toast({
      title: "Insight dismissed",
      description: (
        <div className="flex items-center gap-2">
          <span>This insight will be hidden until tomorrow</span>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => {
              setDismissed(false);
              // Remove from dismissed list
              const current = JSON.parse(localStorage.getItem("flowventory:insights:dismissed") || "[]");
              const updated = current.filter((entry: any) => entry.id !== insight.id);
              localStorage.setItem("flowventory:insights:dismissed", JSON.stringify(updated));
            }}
          >
            Undo
          </Button>
        </div>
      ),
    });
  };

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={SEVERITY_COLORS[insight.severity]} className="capitalize">
              {insight.severity}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {insight.dataSource}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardTitle className="text-base">{insight.title}</CardTitle>
        <CardDescription className="text-sm">{insight.why}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2">
          {insight.actions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || "outline"}
              size="sm"
              onClick={action.onClick}
              className="text-xs"
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CategorySection({ 
  category, 
  insights, 
  expanded, 
  onToggle 
}: { 
  category: keyof typeof CATEGORY_LABELS;
  insights: Insight[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const Icon = CATEGORY_ICONS[category];
  
  return (
    <div className="space-y-4">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5" />
          <h3 className="text-lg font-semibold">{CATEGORY_LABELS[category]}</h3>
          <Badge variant="secondary" className="ml-2">
            {insights.length}
          </Badge>
        </div>
        <ChevronRight 
          className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} 
        />
      </div>
      
      {expanded && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {insights.length === 0 ? (
            <Card className="md:col-span-2 lg:col-span-3">
              <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
                <div className="text-center">
                  <Icon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No {CATEGORY_LABELS[category].toLowerCase()} right now</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            insights.map(insight => (
              <InsightCard key={insight.id} insight={insight} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function InsightsPage() {
  const [filters, setFilters] = useState<InsightFilters>({
    location: "all",
    region: "all", 
    severity: "all"
  });
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    stock: true,
    supplier: true,
    logistics: true,
    finance: true,
    forecast: true
  });
  const { toast } = useToast();
  const { insights, locations, refreshInsights } = useInsights();

  const filteredInsights = useMemo(() => {
    // Get dismissed insights for today
    const dismissedInsights = JSON.parse(localStorage.getItem("flowventory:insights:dismissed") || "[]");
    const today = new Date().toDateString();
    const todayDismissed = dismissedInsights
      .filter((entry: any) => entry.date === today)
      .map((entry: any) => entry.id);

    let filtered = insights.filter(insight => !todayDismissed.includes(insight.id));
    
    if (filters.severity !== "all") {
      filtered = filtered.filter(insight => insight.severity === filters.severity);
    }
    
    if (filters.location !== "all") {
      filtered = filtered.filter(insight => insight.locationId === filters.location);
    }
    
    if (filters.region !== "all") {
      filtered = filtered.filter(insight => insight.regionId === filters.region);
    }
    
    return filtered;
  }, [insights, filters]);

  const groupedInsights = useMemo(() => {
    const groups: Record<string, Insight[]> = {
      stock: [],
      supplier: [],
      logistics: [],
      finance: [],
      forecast: []
    };
    
    filteredInsights.forEach(insight => {
      if (groups[insight.category]) {
        groups[insight.category].push(insight);
      }
    });
    
    // Sort within each group: Critical > High > Medium > Info, then by magnitude
    Object.keys(groups).forEach(category => {
      groups[category].sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, info: 1 };
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;
        return (b.magnitude || 0) - (a.magnitude || 0);
      });
    });
    
    return groups;
  }, [filteredInsights]);

  const handleRefresh = () => {
    // Clear dismissed insights and refresh
    refreshInsights();
    toast({
      title: "Insights refreshed",
      description: "All insights have been recomputed from current data"
    });
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  return (
    <LocationGuard>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6" data-testid="page-insights">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-insights-title">
              AI Insights (Lite)
            </h1>
            <p className="text-muted-foreground" data-testid="text-insights-subtitle">
              Proactive, data-driven callouts to help optimize your operations
            </p>
          </div>
          <Button 
            onClick={handleRefresh}
            data-testid="button-refresh-insights"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location-filter">Location</Label>
                <Select 
                  value={filters.location} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, location: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All locations</SelectItem>
                    {locations.map(location => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="region-filter">Region</Label>
                <Select 
                  value={filters.region} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, region: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All regions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All regions</SelectItem>
                    {Array.from(new Set(locations.map(loc => loc.regionId))).map(regionId => (
                      <SelectItem key={regionId} value={regionId}>
                        {regionId.replace('region-', '').toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="severity-filter">Severity</Label>
                <Select 
                  value={filters.severity} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, severity: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All severities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All severities</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Insights by Category */}
        <div className="space-y-6">
          {Object.keys(CATEGORY_LABELS).map(category => (
            <CategorySection
              key={category}
              category={category as keyof typeof CATEGORY_LABELS}
              insights={groupedInsights[category] || []}
              expanded={expandedCategories[category]}
              onToggle={() => toggleCategory(category)}
            />
          ))}
        </div>
        
        {/* Empty state */}
        {filteredInsights.length === 0 && (
          <Card className="mt-8">
            <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No insights found</h3>
                <p>
                  {Object.values(filters).some(f => f !== "all") 
                    ? "Try adjusting your filters to see more insights"
                    : "Your operations look healthy! Check back later for new insights"
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </LocationGuard>
  );
}