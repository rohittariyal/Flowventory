import { useState, useEffect } from 'react';
import { Search, Filter, Download, RefreshCw, Activity, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  keyPrefix?: string;
  keyId?: string;
  ip: string;
  userAgent?: string;
  method: string;
  path: string;
  query?: string;
  statusCode?: number;
  responseTimeMs?: number;
  error?: string;
  requestBody?: any;
  responseSize?: number;
}

interface AuditStats {
  totalRequests: number;
  uniqueKeys: number;
  errorRate: number;
  avgResponseTime: number;
  topPaths: Array<{ path: string; count: number }>;
  statusCodes: Record<string, number>;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    keyPrefix: '',
    method: '',
    statusCode: '',
    pathPattern: '',
    fromDate: '',
    toDate: '',
    limit: 100
  });
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadAuditData();
  }, []);

  const loadAuditData = async () => {
    try {
      // Load audit logs with current filters
      const logsParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) logsParams.append(key, value.toString());
      });

      const [logsResponse, statsResponse] = await Promise.all([
        fetch(`/mgmt/audit/logs?${logsParams}`),
        fetch('/mgmt/audit/stats')
      ]);

      if (logsResponse.ok) {
        const logsData = await logsResponse.json();
        setLogs(logsData.entries || []);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Failed to load audit data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load audit logs',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    loadAuditData();
  };

  const clearFilters = () => {
    setFilters({
      keyPrefix: '',
      method: '',
      statusCode: '',
      pathPattern: '',
      fromDate: '',
      toDate: '',
      limit: 100
    });
    setTimeout(loadAuditData, 100);
  };

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });
      params.append('export', 'true');

      const response = await fetch(`/mgmt/audit/logs?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export audit logs',
        variant: 'destructive'
      });
    }
  };

  const getStatusColor = (statusCode?: number) => {
    if (!statusCode) return 'secondary';
    if (statusCode >= 200 && statusCode < 300) return 'default';
    if (statusCode >= 400 && statusCode < 500) return 'destructive';
    if (statusCode >= 500) return 'destructive';
    return 'secondary';
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'default';
      case 'POST': return 'secondary';
      case 'PATCH': return 'outline';
      case 'PUT': return 'outline';
      case 'DELETE': return 'destructive';
      default: return 'secondary';
    }
  };

  const formatResponseTime = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground">
            Monitor API usage, track requests, and analyze performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportLogs} data-testid="button-export-logs">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={loadAuditData} data-testid="button-refresh-logs">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="logs" className="w-full">
        <TabsList>
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="space-y-6">
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalRequests.toLocaleString()}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Unique API Keys</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.uniqueKeys}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.errorRate.toFixed(1)}%</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatResponseTime(stats.avgResponseTime)}</div>
                </CardContent>
              </Card>
            </div>
          )}

          {stats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top API Paths</CardTitle>
                  <CardDescription>Most frequently accessed endpoints</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.topPaths.slice(0, 10).map((path, index) => (
                      <div key={path.path} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">#{index + 1}</span>
                          <code className="text-sm">{path.path}</code>
                        </div>
                        <Badge variant="outline">{path.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Status Codes</CardTitle>
                  <CardDescription>Distribution of HTTP response codes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(stats.statusCodes)
                      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                      .map(([code, count]) => (
                        <div key={code} className="flex items-center justify-between">
                          <Badge variant={getStatusColor(parseInt(code))}>
                            {code}
                          </Badge>
                          <span className="text-sm">{count} requests</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="keyPrefix">API Key</Label>
                  <Input
                    id="keyPrefix"
                    placeholder="fv_abc12345"
                    value={filters.keyPrefix}
                    onChange={(e) => setFilters(prev => ({ ...prev, keyPrefix: e.target.value }))}
                    data-testid="input-filter-key"
                  />
                </div>
                
                <div>
                  <Label htmlFor="method">Method</Label>
                  <Select value={filters.method} onValueChange={(value) => setFilters(prev => ({ ...prev, method: value }))}>
                    <SelectTrigger data-testid="select-filter-method">
                      <SelectValue placeholder="All methods" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All methods</SelectItem>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PATCH">PATCH</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="statusCode">Status Code</Label>
                  <Select value={filters.statusCode} onValueChange={(value) => setFilters(prev => ({ ...prev, statusCode: value }))}>
                    <SelectTrigger data-testid="select-filter-status">
                      <SelectValue placeholder="All codes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All codes</SelectItem>
                      <SelectItem value="200">200 (OK)</SelectItem>
                      <SelectItem value="201">201 (Created)</SelectItem>
                      <SelectItem value="400">400 (Bad Request)</SelectItem>
                      <SelectItem value="401">401 (Unauthorized)</SelectItem>
                      <SelectItem value="403">403 (Forbidden)</SelectItem>
                      <SelectItem value="404">404 (Not Found)</SelectItem>
                      <SelectItem value="429">429 (Rate Limited)</SelectItem>
                      <SelectItem value="500">500 (Server Error)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="pathPattern">Path Pattern</Label>
                  <Input
                    id="pathPattern"
                    placeholder="/api/v1/products"
                    value={filters.pathPattern}
                    onChange={(e) => setFilters(prev => ({ ...prev, pathPattern: e.target.value }))}
                    data-testid="input-filter-path"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <Button onClick={applyFilters} data-testid="button-apply-filters">
                    <Search className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                  <Button variant="outline" onClick={clearFilters} data-testid="button-clear-filters">
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Logs Table */}
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr className="bg-muted/50">
                        <th className="text-left p-3 font-medium">Timestamp</th>
                        <th className="text-left p-3 font-medium">Method</th>
                        <th className="text-left p-3 font-medium">Path</th>
                        <th className="text-left p-3 font-medium">Status</th>
                        <th className="text-left p-3 font-medium">Response Time</th>
                        <th className="text-left p-3 font-medium">API Key</th>
                        <th className="text-left p-3 font-medium">IP Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center p-8 text-muted-foreground">
                            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            No audit logs found
                          </td>
                        </tr>
                      ) : (
                        logs.map((log) => (
                          <tr 
                            key={log.id} 
                            className="border-b hover:bg-muted/50 cursor-pointer"
                            onClick={() => setSelectedLog(log)}
                            data-testid={`row-log-${log.id}`}
                          >
                            <td className="p-3 text-sm">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="p-3">
                              <Badge variant={getMethodColor(log.method)} className="text-xs">
                                {log.method}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <code className="text-sm">{log.path}</code>
                            </td>
                            <td className="p-3">
                              {log.statusCode ? (
                                <Badge variant={getStatusColor(log.statusCode)} className="text-xs">
                                  {log.statusCode}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="p-3 text-sm">
                              {formatResponseTime(log.responseTimeMs)}
                            </td>
                            <td className="p-3 text-sm">
                              {log.keyPrefix ? (
                                <code className="text-xs">{log.keyPrefix}••••••••</code>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="p-3 text-sm text-muted-foreground">
                              {log.ip}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>
              Detailed information about this API request
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Timestamp</Label>
                  <p className="text-sm">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Request ID</Label>
                  <p className="text-sm font-mono">{selectedLog.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Method</Label>
                  <Badge variant={getMethodColor(selectedLog.method)} className="text-xs">
                    {selectedLog.method}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status Code</Label>
                  {selectedLog.statusCode ? (
                    <Badge variant={getStatusColor(selectedLog.statusCode)} className="text-xs">
                      {selectedLog.statusCode}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium">Response Time</Label>
                  <p className="text-sm">{formatResponseTime(selectedLog.responseTimeMs)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Response Size</Label>
                  <p className="text-sm">{formatFileSize(selectedLog.responseSize)}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Path</Label>
                <p className="text-sm font-mono bg-muted p-2 rounded">{selectedLog.path}</p>
              </div>

              {selectedLog.query && (
                <div>
                  <Label className="text-sm font-medium">Query Parameters</Label>
                  <p className="text-sm font-mono bg-muted p-2 rounded">{selectedLog.query}</p>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">API Key</Label>
                <p className="text-sm font-mono">
                  {selectedLog.keyPrefix ? `${selectedLog.keyPrefix}••••••••` : 'None'}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">IP Address</Label>
                <p className="text-sm">{selectedLog.ip}</p>
              </div>

              {selectedLog.userAgent && (
                <div>
                  <Label className="text-sm font-medium">User Agent</Label>
                  <p className="text-sm font-mono bg-muted p-2 rounded text-wrap break-all">
                    {selectedLog.userAgent}
                  </p>
                </div>
              )}

              {selectedLog.requestBody && (
                <div>
                  <Label className="text-sm font-medium">Request Body</Label>
                  <pre className="text-sm bg-muted p-2 rounded overflow-x-auto">
                    {JSON.stringify(selectedLog.requestBody, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.error && (
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    Error
                  </Label>
                  <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                    {selectedLog.error}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}