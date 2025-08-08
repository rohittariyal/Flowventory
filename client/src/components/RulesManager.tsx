import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Trash2, 
  Settings,
  User,
  Clock,
  AlertCircle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Rule, CreateRuleData } from "@shared/schema";

const TASK_TYPES = [
  { value: "RESTOCK", label: "Restock" },
  { value: "RECONCILE", label: "Reconcile" },
  { value: "RETRY_SYNC", label: "Retry Sync" },
  { value: "ADJUST_BUDGET", label: "Adjust Budget" },
];

const PRIORITIES = [
  { value: "P1", label: "P1 - Critical" },
  { value: "P2", label: "P2 - High" },
  { value: "P3", label: "P3 - Medium" },
];

export function RulesManager() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState<CreateRuleData>({
    type: "RESTOCK",
    assigneeId: undefined,
    priority: undefined,
    dueOffsetHours: undefined,
  });
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Only show for admin users
  if (!user || user.role !== "admin") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Task Assignment Rules
          </CardTitle>
          <CardDescription>
            Only administrators can manage task assignment rules.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Access denied. Admin privileges required.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Fetch rules
  const { data: rules = [] } = useQuery<Rule[]>({
    queryKey: ["/api/rules"],
    queryFn: async () => {
      const response = await fetch("/api/rules");
      if (!response.ok) throw new Error("Failed to fetch rules");
      return response.json();
    },
  });

  // Create rule mutation
  const createRuleMutation = useMutation({
    mutationFn: async (ruleData: CreateRuleData) => {
      const response = await apiRequest("POST", "/api/rules", ruleData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
      setCreateDialogOpen(false);
      setFormData({
        type: "RESTOCK",
        assigneeId: undefined,
        priority: undefined,
        dueOffsetHours: undefined,
      });
    },
  });

  // Delete rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const response = await apiRequest("DELETE", `/api/rules/${ruleId}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rules"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createRuleMutation.mutate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Task Assignment Rules
            </CardTitle>
            <CardDescription>
              Automatically assign tasks based on type, priority, and due dates
            </CardDescription>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Assignment Rule</DialogTitle>
                <DialogDescription>
                  Set up automatic task assignment for specific task types
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Task Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select task type" />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assigneeId">Assignee ID (Optional)</Label>
                  <Input
                    id="assigneeId"
                    value={formData.assigneeId || ""}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      assigneeId: e.target.value || undefined 
                    }))}
                    placeholder="e.g., ops_user, tech_user, finance_user"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority (Optional)</Label>
                  <Select
                    value={formData.priority || ""}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      priority: value || undefined as any
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No priority override</SelectItem>
                      {PRIORITIES.map(priority => (
                        <SelectItem key={priority.value} value={priority.value}>
                          {priority.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueOffsetHours">Due Date Offset (Hours)</Label>
                  <Input
                    id="dueOffsetHours"
                    type="number"
                    min="0"
                    value={formData.dueOffsetHours || ""}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      dueOffsetHours: e.target.value ? parseInt(e.target.value) : undefined 
                    }))}
                    placeholder="e.g., 24 for 1 day, 168 for 1 week"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createRuleMutation.isPending}
                  >
                    {createRuleMutation.isPending ? "Creating..." : "Create Rule"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {rules.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No assignment rules configured.</p>
            <p className="text-sm">Create rules to automatically assign tasks based on type.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      {TASK_TYPES.find(t => t.value === rule.type)?.label || rule.type}
                    </Badge>
                    {rule.priority && (
                      <Badge variant={
                        rule.priority === "P1" ? "destructive" : 
                        rule.priority === "P2" ? "default" : "secondary"
                      }>
                        {rule.priority}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {rule.assigneeId && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Assign to: {rule.assigneeId}
                      </div>
                    )}
                    {rule.dueOffsetHours && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Due in: {rule.dueOffsetHours}h
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteRuleMutation.mutate(rule.id)}
                  disabled={deleteRuleMutation.isPending}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}