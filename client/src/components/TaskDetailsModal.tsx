import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  MessageCircle, 
  Activity, 
  Send,
  User,
  Clock,
  CheckCircle2,
  UserPlus,
  Calendar,
  AlertCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import type { Task, Comment, Activity as ActivityType } from "@shared/schema";

interface TaskDetailsModalProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACTIVITY_ICONS = {
  STATUS_CHANGE: CheckCircle2,
  ASSIGN: UserPlus,
  COMMENT: MessageCircle,
  DUE_CHANGE: Calendar,
} as const;

const PRIORITY_COLORS = {
  P1: "destructive",
  P2: "default", 
  P3: "secondary",
} as const;

export function TaskDetailsModal({ task, open, onOpenChange }: TaskDetailsModalProps) {
  const [commentText, setCommentText] = useState("");
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch comments
  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ["/api/tasks", task?.id, "comments"],
    queryFn: async () => {
      if (!task) return [];
      const response = await fetch(`/api/tasks/${task.id}/comments`);
      if (!response.ok) throw new Error("Failed to fetch comments");
      return response.json();
    },
    enabled: !!task,
  });

  // Fetch activity
  const { data: activity = [] } = useQuery<ActivityType[]>({
    queryKey: ["/api/tasks", task?.id, "activity"],
    queryFn: async () => {
      if (!task) return [];
      const response = await fetch(`/api/tasks/${task.id}/activity`);
      if (!response.ok) throw new Error("Failed to fetch activity");
      return response.json();
    },
    enabled: !!task,
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!task) throw new Error("No task selected");
      const response = await apiRequest("POST", `/api/tasks/${task.id}/comments`, {
        message
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id, "comments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", task?.id, "activity"] });
      setCommentText("");
    },
  });

  const handleSubmitComment = () => {
    if (!commentText.trim()) return;
    createCommentMutation.mutate(commentText.trim());
  };

  const formatActivityDescription = (act: ActivityType): string => {
    const meta = act.meta as any; // Type assertion for flexible meta object
    switch (act.type) {
      case "STATUS_CHANGE":
        if (meta?.action === "created") {
          return "Task created";
        }
        return `Status changed from ${meta?.oldStatus || "unknown"} to ${meta?.newStatus || "unknown"}`;
      case "ASSIGN":
        return `Assigned from ${meta?.oldAssigneeId || "unassigned"} to ${meta?.newAssigneeId || "unassigned"}`;
      case "COMMENT":
        return "Added a comment";
      case "DUE_CHANGE":
        return "Due date changed";
      default:
        return "Activity logged";
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Badge variant={PRIORITY_COLORS[task.priority]}>{task.priority}</Badge>
            {task.title}
          </DialogTitle>
          <DialogDescription>
            Task ID: {task.id} • Created {formatDistanceToNow(new Date(task.createdAt))} ago
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Type:</span> {task.type}
            </div>
            <div className="text-sm">
              <span className="font-medium">Status:</span>{" "}
              <Badge variant={task.status === "DONE" ? "default" : "destructive"}>
                {task.status}
              </Badge>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Assignee:</span>{" "}
              {task.assigneeId || "Unassigned"}
            </div>
            {task.dueAt && (
              <div className="text-sm">
                <span className="font-medium">Due:</span>{" "}
                <span className={
                  new Date(task.dueAt) < new Date() && task.status !== "DONE"
                    ? "text-destructive font-medium"
                    : ""
                }>
                  {formatDistanceToNow(new Date(task.dueAt))} 
                  {new Date(task.dueAt) < new Date() ? " ago" : " from now"}
                </span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            {task.notes && (
              <div className="text-sm">
                <span className="font-medium">Notes:</span>
                <p className="text-muted-foreground mt-1">{task.notes}</p>
              </div>
            )}
          </div>
        </div>

        <Separator />

        <Tabs defaultValue="comments" className="flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="comments" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Comments ({comments.length})
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity ({activity.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="comments" className="space-y-4">
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {comments.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No comments yet. Be the first to comment!</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex space-x-3 p-3 bg-muted/50 rounded-lg">
                      <div className="flex-shrink-0">
                        <User className="h-8 w-8 p-1.5 bg-primary text-primary-foreground rounded-full" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{comment.authorId}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.createdAt))} ago
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{comment.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="flex space-x-2">
              <Textarea
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="flex-1"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleSubmitComment();
                  }
                }}
              />
              <Button 
                onClick={handleSubmitComment}
                disabled={!commentText.trim() || createCommentMutation.isPending}
                size="sm"
                className="h-auto px-3"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Press Ctrl+Enter to submit
            </p>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {activity.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No activity yet.</p>
                  </div>
                ) : (
                  activity.map((act) => {
                    const IconComponent = ACTIVITY_ICONS[act.type] || AlertCircle;
                    return (
                      <div key={act.id} className="flex space-x-3 p-3 border-l-2 border-muted">
                        <div className="flex-shrink-0">
                          <IconComponent className="h-5 w-5 mt-0.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm">{formatActivityDescription(act)}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(act.createdAt ? new Date(act.createdAt) : new Date())} ago
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}