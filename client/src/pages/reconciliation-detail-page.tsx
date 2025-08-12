import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, DollarSign, AlertCircle, CheckCircle, MessageSquare, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";

interface ReconBatch {
  id: string;
  source: string;
  region: string;
  expectedBaseTotal: number;
  paidBaseTotal: number;
  diffBaseTotal: number;
  ordersTotal: number;
  mismatchedCount: number;
  baseCurrency: string;
  createdAt: string;
}

interface ReconRow {
  id: string;
  orderId: string;
  currency: string;
  gross: number;
  fees: number;
  tax: number;
  expectedNet: number;
  paid: number;
  diff: number;
  expectedNetBase: number;
  paidBase: number;
  diffBase: number;
  status: "PENDING" | "PARTIAL" | "RESOLVED";
  notes?: string;
}

export default function ReconciliationDetailPage() {
  const [match, params] = useRoute("/recon/:batchId");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showOnlyMismatches, setShowOnlyMismatches] = useState(false);
  const [notesRowId, setNotesRowId] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");
  const { toast } = useToast();

  const batchId = params?.batchId;

  const { data, isLoading } = useQuery<{ batch: ReconBatch; rows: ReconRow[] }>({
    queryKey: ["/api/recon/batches", batchId, { status: statusFilter !== "all" ? statusFilter : undefined, hasDiff: showOnlyMismatches }],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/recon/batches/${batchId}?${new URLSearchParams({
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(showOnlyMismatches && { hasDiff: "true" }),
      })}`);
      return response.json();
    },
    enabled: !!batchId,
  });

  const createTaskMutation = useMutation({
    mutationFn: async (rowId: string) => {
      const response = await apiRequest("POST", `/api/recon/rows/${rowId}/create-task`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recon/batches", batchId] });
      toast({
        title: "Task Created",
        description: "Reconciliation task has been created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateRowMutation = useMutation({
    mutationFn: async ({ rowId, updates }: { rowId: string; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/recon/rows/${rowId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recon/batches", batchId] });
      setNotesRowId(null);
      setNotesText("");
      toast({
        title: "Updated",
        description: "Row has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "RESOLVED": return "default";
      case "PARTIAL": return "secondary";
      default: return "destructive";
    }
  };

  const getSeverityColor = (diffBase: number) => {
    const absAmount = Math.abs(diffBase);
    if (absAmount > 5000) return "destructive"; // > $50
    if (absAmount > 1000) return "default"; // > $10
    return "secondary";
  };

  if (!match || !batchId) {
    return <div>Batch not found</div>;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return <div>Error loading batch details</div>;
  }

  const { batch, rows } = data;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/recon">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Reconciliation
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {batch.source} - {batch.region}
          </h1>
          <p className="text-muted-foreground">
            Created {formatDistanceToNow(new Date(batch.createdAt), { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expected Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(batch.expectedBaseTotal, batch.baseCurrency)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(batch.paidBaseTotal, batch.baseCurrency)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Difference</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${Math.abs(batch.diffBaseTotal) > 100 ? 'text-destructive' : 'text-green-600'}`}>
              {formatCurrency(batch.diffBaseTotal, batch.baseCurrency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {batch.mismatchedCount} of {batch.ordersTotal} orders
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PARTIAL">Partial</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2 mt-6">
              <Switch
                id="mismatches-only"
                checked={showOnlyMismatches}
                onCheckedChange={setShowOnlyMismatches}
              />
              <Label htmlFor="mismatches-only">Show only mismatches</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rows Table */}
      <Card>
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
          <CardDescription>
            {rows.length} orders showing {rows.filter(r => Math.abs(r.diffBase) > 1).length} mismatches
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Fees</TableHead>
                  <TableHead className="text-right">Tax</TableHead>
                  <TableHead className="text-right">Expected</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                  <TableHead className="text-right">Diff ({batch.baseCurrency})</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-sm">{row.orderId}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.currency}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.gross, row.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.fees, row.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.tax, row.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.expectedNet, row.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(row.paid, row.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={getSeverityColor(row.diff)}>
                        {formatCurrency(row.diff, row.currency)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={getSeverityColor(row.diffBase)}>
                        {formatCurrency(row.diffBase, batch.baseCurrency)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(row.status)}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {Math.abs(row.diffBase) > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => createTaskMutation.mutate(row.id)}
                            disabled={row.notes?.includes('Task:') || createTaskMutation.isPending}
                          >
                            {row.notes?.includes('Task:') ? (
                              <>
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Task
                              </>
                            ) : (
                              "Create Task"
                            )}
                          </Button>
                        )}
                        
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setNotesRowId(row.id);
                                setNotesText(row.notes || "");
                              }}
                            >
                              <MessageSquare className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Update Order Notes</DialogTitle>
                              <DialogDescription>
                                Order ID: {row.orderId}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                  defaultValue={row.status}
                                  onValueChange={(value) => {
                                    updateRowMutation.mutate({
                                      rowId: row.id,
                                      updates: { status: value }
                                    });
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="PENDING">Pending</SelectItem>
                                    <SelectItem value="PARTIAL">Partial</SelectItem>
                                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                  id="notes"
                                  value={notesText}
                                  onChange={(e) => setNotesText(e.target.value)}
                                  placeholder="Add notes about this reconciliation..."
                                  rows={3}
                                />
                              </div>
                              
                              <Button
                                onClick={() => {
                                  updateRowMutation.mutate({
                                    rowId: row.id,
                                    updates: { notes: notesText }
                                  });
                                }}
                                disabled={updateRowMutation.isPending}
                              >
                                Save Notes
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}