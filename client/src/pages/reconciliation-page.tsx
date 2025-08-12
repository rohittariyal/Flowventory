import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload, Plus, FileText, DollarSign, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

interface ReconBatch {
  id: string;
  source: string;
  region: string;
  periodFrom?: string;
  periodTo?: string;
  expectedBaseTotal: number;
  paidBaseTotal: number;
  diffBaseTotal: number;
  ordersTotal: number;
  mismatchedCount: number;
  baseCurrency: string;
  createdAt: string;
}

export default function ReconciliationPage() {
  const [location] = useLocation();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const { toast } = useToast();

  const { data: batches, isLoading } = useQuery<ReconBatch[]>({
    queryKey: ["/api/recon/batches"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/recon/ingest", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/recon/batches"] });
      setIsUploadOpen(false);
      toast({
        title: "Reconciliation Completed",
        description: `Processed ${data.counts.ordersTotal} orders with ${data.counts.mismatched} mismatches`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount / 100);
  };

  const getSeverityColor = (diffBase: number) => {
    const absAmount = Math.abs(diffBase);
    if (absAmount > 5000) return "destructive"; // > $50
    if (absAmount > 1000) return "default"; // > $10
    return "secondary";
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Reconciliation</h1>
          <p className="text-muted-foreground">
            Reconcile marketplace payouts with order data across multiple currencies
          </p>
        </div>
        
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Reconciliation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Reconciliation Data</DialogTitle>
              <DialogDescription>
                Upload your orders and payouts CSV files to start reconciliation
              </DialogDescription>
            </DialogHeader>
            <ReconciliationUploadForm 
              onSubmit={(formData) => uploadMutation.mutate(formData)}
              isLoading={uploadMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      {batches && batches.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{batches.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {batches.reduce((sum, batch) => sum + batch.ordersTotal, 0)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mismatches</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {batches.reduce((sum, batch) => sum + batch.mismatchedCount, 0)}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Difference</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(
                  batches.reduce((sum, batch) => sum + batch.diffBaseTotal, 0),
                  batches[0]?.baseCurrency || "USD"
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Batches Table */}
      <Card>
        <CardHeader>
          <CardTitle>Reconciliation Batches</CardTitle>
          <CardDescription>
            View and manage your payment reconciliation batches
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!batches || batches.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No reconciliation batches</h3>
              <p className="text-muted-foreground">
                Start by uploading your first set of order and payout data
              </p>
              <Button 
                className="mt-4" 
                onClick={() => setIsUploadOpen(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Data
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Created</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Mismatches</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell>
                        {formatDistanceToNow(new Date(batch.createdAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{batch.source}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{batch.region}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {batch.periodFrom && batch.periodTo
                          ? `${new Date(batch.periodFrom).toLocaleDateString()} - ${new Date(batch.periodTo).toLocaleDateString()}`
                          : "Not specified"
                        }
                      </TableCell>
                      <TableCell className="text-right">{batch.ordersTotal}</TableCell>
                      <TableCell className="text-right">
                        {batch.mismatchedCount > 0 ? (
                          <Badge variant="destructive">{batch.mismatchedCount}</Badge>
                        ) : (
                          <Badge variant="secondary">0</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={getSeverityColor(batch.diffBaseTotal)}>
                          {formatCurrency(batch.diffBaseTotal, batch.baseCurrency)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link href={`/recon/${batch.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface UploadFormProps {
  onSubmit: (formData: FormData) => void;
  isLoading: boolean;
}

function ReconciliationUploadForm({ onSubmit, isLoading }: UploadFormProps) {
  const [ordersFile, setOrdersFile] = useState<File | null>(null);
  const [payoutsFile, setPayoutsFile] = useState<File | null>(null);
  const [source, setSource] = useState("");
  const [region, setRegion] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ordersFile || !payoutsFile || !source || !region) {
      return;
    }

    const formData = new FormData();
    formData.append("orders", ordersFile);
    formData.append("payouts", payoutsFile);
    formData.append("source", source);
    formData.append("region", region);

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="source">Source</Label>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger>
              <SelectValue placeholder="Select source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Amazon">Amazon</SelectItem>
              <SelectItem value="Shopify">Shopify</SelectItem>
              <SelectItem value="Flipkart">Flipkart</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="region">Region</Label>
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger>
              <SelectValue placeholder="Select region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UK">UK</SelectItem>
              <SelectItem value="US">US</SelectItem>
              <SelectItem value="EU">EU</SelectItem>
              <SelectItem value="UAE">UAE</SelectItem>
              <SelectItem value="SG">Singapore</SelectItem>
              <SelectItem value="IN">India</SelectItem>
              <SelectItem value="GLOBAL">Global</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="orders">Orders File (CSV)</Label>
        <Input
          id="orders"
          type="file"
          accept=".csv"
          onChange={(e) => setOrdersFile(e.target.files?.[0] || null)}
          required
        />
        <p className="text-xs text-muted-foreground">
          Expected columns: orderId, currency, gross, fees, tax
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="payouts">Payouts File (CSV)</Label>
        <Input
          id="payouts"
          type="file"
          accept=".csv"
          onChange={(e) => setPayoutsFile(e.target.files?.[0] || null)}
          required
        />
        <p className="text-xs text-muted-foreground">
          Expected columns: orderId, currency, paid
        </p>
      </div>

      <Button 
        type="submit" 
        className="w-full" 
        disabled={isLoading || !ordersFile || !payoutsFile || !source || !region}
      >
        {isLoading ? "Processing..." : "Start Reconciliation"}
      </Button>
    </form>
  );
}