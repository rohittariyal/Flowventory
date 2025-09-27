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
import { LocationGuard } from "@/components/LocationGuard";
import { useAuth } from "@/hooks/use-auth";
import { getUserScope, getUserAccessibleLocations } from "@/utils/locationAccess";

interface ReconBatch {
  id: string;
  source: string;
  region: string;
  period: string;
  baseCurrency: string;
  ordersTotal: number;
  mismatchedCount: number;
  diffBaseTotal: number;
  status: "PENDING" | "PROCESSING" | "COMPLETED";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface ReconRow {
  id: string;
  batchId: string;
  externalOrderId: string;
  internalOrderId: string | null;
  externalAmount: number;
  internalAmount: number | null;
  diffBase: number;
  externalCurrency: string;
  internalCurrency: string | null;
  externalFees: number;
  internalFees: number | null;
  reconciliationNotes: string | null;
  severity: "LOW" | "MEDIUM" | "HIGH";
  createdAt: string;
  updatedAt: string;
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
  const { user } = useAuth();

  const batchId = params?.batchId;

  // Get user's location scope for access control
  const userScope = user ? getUserScope(user) : null;
  const accessibleLocations = getUserAccessibleLocations();
  const accessibleRegions = accessibleLocations.map(loc => loc.regionId);

  const { data, isLoading } = useQuery<{ batch: ReconBatch; rows: ReconRow[] }>({
    queryKey: ["/api/recon/batches", batchId, { status: statusFilter !== "all" ? statusFilter : undefined, hasDiff: showOnlyMismatches }],
    queryFn: async () => {
      const response = await fetch(`/api/recon/batches/${batchId}?${new URLSearchParams({
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(showOnlyMismatches && { hasDiff: "true" }),
      })}`);
      return response.json();
    },
    enabled: !!batchId,
  });

  // Check if user has access to this batch's region
  const canAccessBatch = !data?.batch || 
    userScope?.scope === 'all' || 
    (userScope?.scope === 'subset' && accessibleRegions.includes(data.batch.region));

  if (!canAccessBatch && data?.batch) {
    return (
      <LocationGuard>
        <div className="space-y-6">
          <Card className="max-w-lg mx-auto mt-8">
            <CardContent className="pt-6">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
                <p className="text-gray-600 mb-4">
                  You don't have access to reconciliation data for the "{data.batch.region}" region.
                </p>
                <Button variant="outline" asChild>
                  <Link href="/recon">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Batches
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </LocationGuard>
    );
  }

  const createTaskMutation = useMutation({
    mutationFn: async (rowId: string) => {
      const response = await apiRequest("POST", `/api/recon/rows/${rowId}/create-task`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recon/batches", batchId] });
      toast({
        title: "Task Created",
        description: "P1 task has been created and sent to Microsoft Teams",
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
    mutationFn: async ({ rowId, updates }: { rowId: string; updates: { status?: string; notes?: string } }) => {
      const response = await apiRequest("PATCH", `/api/recon/rows/${rowId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recon/batches", batchId] });
      setNotesRowId(null);
      setNotesText("");
      toast({
        title: "Row Updated",
        description: "Reconciliation row has been updated successfully",
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
    if (absAmount > 1000) return "secondary"; // > $10
    return "default"; // <= $10
  };

  if (isLoading) {
    return (
      <LocationGuard>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/recon">
                <ArrowLeft className="h-4 w-4" />
                Back to Batches
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Reconciliation Details</h1>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          </div>
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading reconciliation data...</p>
          </div>
        </div>
      </LocationGuard>
    );
  }

  if (!data?.batch) {
    return (
      <LocationGuard>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/recon">
                <ArrowLeft className="h-4 w-4" />
                Back to Batches
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Reconciliation Details</h1>
              <p className="text-muted-foreground">Batch not found</p>
            </div>
          </div>
        </div>
      </LocationGuard>
    );
  }

  const { batch, rows } = data;

  return (
    <LocationGuard>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/recon">
              <ArrowLeft className="h-4 w-4" />
              Back to Batches
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reconciliation Details</h1>
            <p className="text-muted-foreground">
              Review and resolve payment reconciliation discrepancies
            </p>
          </div>
        </div>

        {/* Batch Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {batch.source} - {batch.region} ({batch.period})
            </CardTitle>
            <CardDescription>
              Created {formatDistanceToNow(new Date(batch.createdAt))} ago
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-2">
              Status: <Badge variant={batch.status === "COMPLETED" ? "default" : "secondary"}>
                {batch.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter reconciliation rows by status and type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status-filter">Status Filter</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PARTIAL">Partial</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mismatch-toggle" className="flex items-center gap-2">
                  <Switch
                    id="mismatch-toggle"
                    checked={showOnlyMismatches}
                    onCheckedChange={setShowOnlyMismatches}
                  />
                  Show Only Mismatches
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{batch.ordersTotal.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Processed in this batch
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mismatches</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{batch.mismatchedCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {((batch.mismatchedCount / batch.ordersTotal) * 100).toFixed(1)}% of total orders
              </p>
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
                value={batchNotesText}
                onChange={(e) => setBatchNotesText(e.target.value)}
                placeholder="Add notes about this reconciliation batch..."
                rows={3}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {batch.notes || "No notes added yet"}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Reconciliation Data */}
        <Card>
          <CardHeader>
            <CardTitle>Reconciliation Data</CardTitle>
            <CardDescription>
              {rows.length} rows {statusFilter !== "all" && `(filtered by ${statusFilter})`}
              {showOnlyMismatches && " (mismatches only)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No rows found</h3>
                <p className="text-gray-600">
                  {showOnlyMismatches 
                    ? "No mismatches found with the current filters."
                    : "No data found with the current filters."
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>External ID</TableHead>
                      <TableHead>Internal ID</TableHead>
                      <TableHead>External Amount</TableHead>
                      <TableHead>Internal Amount</TableHead>
                      <TableHead>Difference</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.id} className={row.diffBase !== 0 ? "bg-orange-50" : ""}>
                        <TableCell className="font-mono text-sm">{row.externalOrderId}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {row.internalOrderId || <span className="text-gray-400">Not found</span>}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(row.externalAmount, row.externalCurrency)}
                        </TableCell>
                        <TableCell>
                          {row.internalAmount !== null 
                            ? formatCurrency(row.internalAmount, row.internalCurrency || batch.baseCurrency)
                            : <span className="text-gray-400">-</span>
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant={getSeverityColor(row.diffBase)}>
                            {formatCurrency(row.diffBase, batch.baseCurrency)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.severity === "HIGH" ? "destructive" : row.severity === "MEDIUM" ? "secondary" : "default"}>
                            {row.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(row.status)}>
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {row.diffBase !== 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => createTaskMutation.mutate(row.id)}
                                disabled={createTaskMutation.isPending}
                              >
                                <AlertCircle className="h-4 w-4 mr-1" />
                                Create Task
                              </Button>
                            )}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setNotesRowId(row.id);
                                    setNotesText(row.notes || "");
                                  }}
                                >
                                  <MessageSquare className="h-4 w-4 mr-1" />
                                  Notes
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                  <DialogTitle>Row Notes & Status</DialogTitle>
                                  <DialogDescription>
                                    Update status and add notes for order {row.externalOrderId}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <Select 
                                      value={row.status} 
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
    </LocationGuard>
  );
}