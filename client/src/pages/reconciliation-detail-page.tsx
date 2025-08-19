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
import { ArrowLeft, DollarSign, AlertCircle, CheckCircle, MessageSquare, ExternalLink, Download, Save, Edit3 } from "lucide-react";
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
  notes?: string;
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
  const [isEditingBatchNotes, setIsEditingBatchNotes] = useState(false);
  const [batchNotesText, setBatchNotesText] = useState("");
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

  const updateBatchMutation = useMutation({
    mutationFn: async (updates: { notes: string }) => {
      const response = await apiRequest("PATCH", `/api/recon/batches/${batchId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recon/batches", batchId] });
      setIsEditingBatchNotes(false);
      toast({
        title: "Batch Notes Updated",
        description: "Batch notes have been saved successfully",
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

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/recon/batches/${batchId}/export`, {
        method: "GET",
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Export failed");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = response.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || "mismatches.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Export Complete",
        description: "Mismatches CSV has been downloaded",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Export Failed",
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

      {/* Batch Notes & Export */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Batch Notes</CardTitle>
            <CardDescription>Add notes or tags for this reconciliation batch</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending || batch.mismatchedCount === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              {exportMutation.isPending ? "Exporting..." : "Export Mismatches"}
            </Button>
            {!isEditingBatchNotes ? (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setIsEditingBatchNotes(true);
                  setBatchNotesText(batch.notes || "");
                }}
              >
                <Edit3 className="mr-2 h-4 w-4" />
                Edit Notes
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setIsEditingBatchNotes(false);
                    setBatchNotesText("");
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm"
                  onClick={() => updateBatchMutation.mutate({ notes: batchNotesText })}
                  disabled={updateBatchMutation.isPending}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {updateBatchMutation.isPending ? "Saving..." : "Save Notes"}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditingBatchNotes ? (
            <Textarea
              placeholder="Add notes, tags, or comments about this reconciliation batch..."
              value={batchNotesText}
              onChange={(e) => setBatchNotesText(e.target.value)}
              className="min-h-[100px]"
            />
          ) : (
            <div className="min-h-[60px] p-3 bg-muted/50 rounded border text-sm">
              {batch.notes ? (
                <span className="text-foreground">{batch.notes}</span>
              ) : (
                <span className="text-muted-foreground italic">No notes added yet. Click "Edit Notes" to add batch comments.</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
          {rows.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {showOnlyMismatches ? "No Mismatches Found" : "No Orders Found"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {showOnlyMismatches 
                  ? "Great! All payments in this batch match perfectly. No discrepancies to review."
                  : statusFilter !== "all"
                  ? `No orders found with status "${statusFilter}". Try adjusting your filters.`
                  : "No order data available for this batch."
                }
              </p>
              {showOnlyMismatches && (
                <Button 
                  variant="outline"
                  onClick={() => setShowOnlyMismatches(false)}
                >
                  Show All Orders
                </Button>
              )}
            </div>
          ) : (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}