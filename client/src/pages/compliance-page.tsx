import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileDown, Filter, Calendar, MapPin, FileText, Download } from "lucide-react";
import type { ComplianceReportRow } from "@/utils/taxation";
import { 
  getFinanceSettings, 
  generateComplianceReport, 
  exportComplianceReportCSV,
  currencyFormat,
  initializeTaxationData
} from "@/utils/taxation";

export default function CompliancePage() {
  const [filters, setFilters] = useState({
    regionId: "",
    dateStart: "",
    dateEnd: "",
    docType: "Orders" as "Orders" | "Invoices"
  });
  
  const [reportData, setReportData] = useState<ComplianceReportRow[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize comprehensive taxation data if not present
    initializeTaxationData();
    
    const financeSettings = getFinanceSettings();
    setSettings(financeSettings);
    generateReport();
  }, []);

  useEffect(() => {
    generateReport();
  }, [filters]);

  const generateReport = () => {
    const data = generateComplianceReport(
      filters.regionId && filters.regionId !== "all" ? filters.regionId : undefined,
      filters.dateStart || undefined,
      filters.dateEnd || undefined,
      filters.docType
    );
    setReportData(data);
  };

  const handleExportCSV = () => {
    if (reportData.length === 0) {
      toast({
        title: "No Data to Export",
        description: "Please adjust your filters to include data in the report.",
        variant: "destructive",
      });
      return;
    }

    try {
      exportComplianceReportCSV(reportData);
      toast({
        title: "Export Successful",
        description: `Exported ${reportData.length} records to CSV file.`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error exporting the report.",
        variant: "destructive",
      });
    }
  };

  const clearFilters = () => {
    setFilters({
      regionId: "",
      dateStart: "",
      dateEnd: "",
      docType: "Orders"
    });
  };

  const totalSubtotal = useMemo(() => {
    return reportData.reduce((sum, row) => sum + row.subtotal, 0);
  }, [reportData]);

  const totalTax = useMemo(() => {
    return reportData.reduce((sum, row) => sum + row.tax, 0);
  }, [reportData]);

  const totalGrand = useMemo(() => {
    return reportData.reduce((sum, row) => sum + row.grand, 0);
  }, [reportData]);

  const getStatusColor = (tax: number): "default" | "secondary" | "destructive" => {
    if (tax === 0) return "secondary";
    if (tax > 0) return "default";
    return "destructive";
  };

  if (!settings) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center space-x-2">
          <FileText className="h-6 w-6" />
          <h1 className="text-2xl font-semibold">Compliance Reports</h1>
        </div>
        <div className="text-center">Loading compliance data...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-compliance">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileText className="h-6 w-6" />
          <h1 className="text-2xl font-semibold">Compliance Reports</h1>
        </div>
        <Button 
          onClick={handleExportCSV} 
          disabled={reportData.length === 0}
          data-testid="button-export-csv"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Report Filters</span>
          </CardTitle>
          <CardDescription>
            Filter compliance data by region, date range, and document type
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="region-filter">Region</Label>
              <Select 
                value={filters.regionId} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, regionId: value }))}
              >
                <SelectTrigger data-testid="select-region-filter">
                  <SelectValue placeholder="All regions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {settings.regions.map((region: any) => (
                    <SelectItem key={region.id} value={region.id}>
                      {region.name} ({region.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date-start">Start Date</Label>
              <Input
                id="date-start"
                type="date"
                data-testid="input-date-start"
                value={filters.dateStart}
                onChange={(e) => setFilters(prev => ({ ...prev, dateStart: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date-end">End Date</Label>
              <Input
                id="date-end"
                type="date"
                data-testid="input-date-end"
                value={filters.dateEnd}
                onChange={(e) => setFilters(prev => ({ ...prev, dateEnd: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="doc-type">Document Type</Label>
              <Select 
                value={filters.docType} 
                onValueChange={(value: "Orders" | "Invoices") => setFilters(prev => ({ ...prev, docType: value }))}
              >
                <SelectTrigger data-testid="select-doc-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Orders">Orders</SelectItem>
                  <SelectItem value="Invoices">Invoices</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-between items-center pt-2">
            <div className="text-sm text-gray-600">
              Showing {reportData.length} records
            </div>
            <Button variant="outline" onClick={clearFilters} data-testid="button-clear-filters">
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Subtotal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-subtotal">
              {currencyFormat(totalSubtotal, settings.baseCurrency, settings.displayLocale)}
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tax</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-tax">
              {currencyFormat(totalTax, settings.baseCurrency, settings.displayLocale)}
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Grand Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-grand-total">
              {currencyFormat(totalGrand, settings.baseCurrency, settings.displayLocale)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Table */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileDown className="h-5 w-5" />
            <span>Compliance Report Data</span>
          </CardTitle>
          <CardDescription>
            Detailed breakdown of tax compliance across all transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reportData.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Found</h3>
              <p className="text-gray-600">
                Try adjusting your filters to include more data in the report.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doc No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer/Supplier</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Place of Supply</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead>Tax Breakdown</TableHead>
                  <TableHead className="text-right">Grand Total</TableHead>
                  <TableHead>Tax Rule</TableHead>
                  <TableHead>Currency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((row, index) => (
                  <TableRow key={index} data-testid={`row-compliance-${index}`}>
                    <TableCell className="font-medium">{row.docNo}</TableCell>
                    <TableCell>{row.date}</TableCell>
                    <TableCell>{row.customerSupplier}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3" />
                        <span>{row.region}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {row.placeOfSupply || row.region}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {currencyFormat(row.subtotal, row.currency, settings.displayLocale)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <Badge variant={getStatusColor(row.tax)} className="font-mono">
                        {currencyFormat(row.tax, row.currency, settings.displayLocale)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {row.taxBreakdown && row.taxBreakdown.length > 0 ? (
                        <div className="space-y-1">
                          {row.taxBreakdown.map((breakdown, idx) => (
                            <div key={idx} className="text-xs">
                              <Badge variant="outline" className="mr-1 text-xs">
                                {breakdown.name}
                              </Badge>
                              {currencyFormat(breakdown.amount, row.currency, settings.displayLocale)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">No breakdown</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {currencyFormat(row.grand, row.currency, settings.displayLocale)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.taxRule}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{row.currency}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}