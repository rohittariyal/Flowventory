import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Users, 
  Zap,
  Package,
  DollarSign,
  AlertCircle,
  TrendingDown
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

interface Event {
  id: string;
  type: string;
  sku: string | null;
  channel: string | null;
  payload: Record<string, any>;
  severity: "LOW" | "MEDIUM" | "HIGH";
  occurredAt: string;
  status: "OPEN" | "HANDLED";
}

interface Task {
  id: string;
  title: string;
  sourceEventId: string | null;
  type: "RESTOCK" | "RETRY_SYNC" | "RECONCILE" | "ADJUST_BUDGET";
  assigneeId: string | null;
  priority: "P1" | "P2" | "P3";
  dueAt: string | null;
  status: "OPEN" | "IN_PROGRESS" | "DONE";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const EVENT_ICONS = {
  INVENTORY_LOW: Package,
  SYNC_ERROR: Zap,
  PAYMENT_MISMATCH: DollarSign,
  ROAS_DROP: TrendingDown,
};

const SEVERITY_COLORS = {
  HIGH: "destructive",
  MEDIUM: "default",
  LOW: "secondary",
} as const;

const PRIORITY_COLORS = {
  P1: "destructive",
  P2: "default", 
  P3: "secondary",
} as const;

export function ActionCenter() {
  const [selectedTab, setSelectedTab] = useState("overview");
  const queryClient = useQueryClient();

  // Fetch events with summary for overview
  const { data: eventsData } = useQuery({
    queryKey: ["/api/events", { summary: true }],
    queryFn: async () => {
      const response = await fetch("/api/events?summary=true");
      if (!response.ok) throw new Error("Failed to fetch events");
      return response.json();
    },
  });

  // Fetch tasks
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    queryFn: async () => {
      const response = await fetch("/api/tasks");
      if (!response.ok) throw new Error("Failed to fetch tasks");
      return response.json();
    },
  });

  // Resolve task mutation
  const resolveTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiRequest("POST", `/api/tasks/${taskId}/resolve`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    },
  });

  // Create task from event mutation
  const createTaskMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await apiRequest("POST", `/api/events/${eventId}/create-task`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    },
  });

  const events = eventsData?.events || [];
  const summary = eventsData?.summary || {
    total: 0,
    open: 0,
    handled: 0,
    bySeverity: { LOW: 0, MEDIUM: 0, HIGH: 0 }
  };

  const openTasks = tasks.filter(task => task.status !== "DONE");
  const overdueTasks = tasks.filter(task => 
    task.dueAt && new Date(task.dueAt) < new Date() && task.status !== "DONE"
  );

  const formatEventDescription = (event: Event) => {
    switch (event.type) {
      case "INVENTORY_LOW":
        return `${event.sku} stock is ${event.payload.currentStock} (reorder at ${event.payload.reorderLevel})`;
      case "SYNC_ERROR":
        return `${event.channel} sync failed: ${event.payload.errorCode}`;
      case "PAYMENT_MISMATCH":
        return `Payment mismatch on ${event.payload.orderId}: expected $${event.payload.expectedAmount}, got $${event.payload.actualAmount}`;
      case "ROAS_DROP":
        return `ROAS dropped for ${event.sku}: ${event.payload.currentROAS}% (target: ${event.payload.targetROAS}%)`;
      default:
        return "Unknown event";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Action Center</h2>
          <p className="text-muted-foreground">
            Monitor events and manage tasks across your business operations
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Events</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.open}</div>
            <p className="text-xs text-muted-foreground">
              {summary.bySeverity.HIGH} high priority
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openTasks.length}</div>
            <p className="text-xs text-muted-foreground">
              {overdueTasks.length} overdue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.handled}</div>
            <p className="text-xs text-muted-foreground">
              Events handled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Efficiency</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.total > 0 ? Math.round((summary.handled / summary.total) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Resolution rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Events */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Events</CardTitle>
                <CardDescription>Latest business events requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {events.slice(0, 5).map((event: Event) => {
                      const IconComponent = EVENT_ICONS[event.type as keyof typeof EVENT_ICONS] || AlertCircle;
                      return (
                        <div key={event.id} className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <IconComponent className="h-4 w-4 mt-1 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={SEVERITY_COLORS[event.severity]}>
                                {event.severity}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(event.occurredAt))} ago
                              </span>
                            </div>
                            <p className="text-sm text-foreground">
                              {formatEventDescription(event)}
                            </p>
                            {event.status === "OPEN" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={() => createTaskMutation.mutate(event.id)}
                                disabled={createTaskMutation.isPending}
                              >
                                Create Task
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {events.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No events to display
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Active Tasks */}
            <Card>
              <CardHeader>
                <CardTitle>Active Tasks</CardTitle>
                <CardDescription>Tasks requiring immediate action</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {openTasks.slice(0, 5).map((task) => (
                      <div key={task.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={PRIORITY_COLORS[task.priority]}>
                              {task.priority}
                            </Badge>
                            <span className="font-medium text-sm">{task.title}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            Created {formatDistanceToNow(new Date(task.createdAt))} ago
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resolveTaskMutation.mutate(task.id)}
                            disabled={resolveTaskMutation.isPending}
                          >
                            Resolve
                          </Button>
                        </div>
                        <Separator />
                      </div>
                    ))}
                    {openTasks.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No active tasks
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Events</CardTitle>
              <CardDescription>Complete event history and status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {events.map((event: Event) => {
                  const IconComponent = EVENT_ICONS[event.type as keyof typeof EVENT_ICONS] || AlertCircle;
                  return (
                    <div key={event.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                      <div className="flex-shrink-0">
                        <IconComponent className="h-5 w-5 mt-1 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={SEVERITY_COLORS[event.severity]}>
                            {event.severity}
                          </Badge>
                          <Badge variant={event.status === "OPEN" ? "destructive" : "default"}>
                            {event.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(event.occurredAt))} ago
                          </span>
                        </div>
                        <p className="text-sm font-medium mb-1">{formatEventDescription(event)}</p>
                        <p className="text-xs text-muted-foreground">
                          Type: {event.type} {event.channel && `• Channel: ${event.channel}`}
                        </p>
                      </div>
                      {event.status === "OPEN" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => createTaskMutation.mutate(event.id)}
                          disabled={createTaskMutation.isPending}
                        >
                          Create Task
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Task Management</CardTitle>
              <CardDescription>Track and manage all tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tasks.map((task) => (
                  <div key={task.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={PRIORITY_COLORS[task.priority]}>
                          {task.priority}
                        </Badge>
                        <Badge variant={task.status === "DONE" ? "default" : "destructive"}>
                          {task.status}
                        </Badge>
                        <span className="font-medium">{task.title}</span>
                      </div>
                      {task.status !== "DONE" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resolveTaskMutation.mutate(task.id)}
                          disabled={resolveTaskMutation.isPending}
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Created: {formatDistanceToNow(new Date(task.createdAt))} ago</p>
                      <p>Type: {task.type}</p>
                      {task.dueAt && (
                        <p>Due: {formatDistanceToNow(new Date(task.dueAt))} from now</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}