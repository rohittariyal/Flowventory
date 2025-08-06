import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { 
  Bell, 
  AlertTriangle, 
  WifiOff, 
  Upload, 
  Users, 
  Settings, 
  X,
  Check
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Notification, User } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface NotificationPanelProps {
  user: User;
}

const getNotificationIcon = (iconName: string) => {
  switch (iconName) {
    case "AlertTriangle":
      return AlertTriangle;
    case "WifiOff":
      return WifiOff;
    case "Upload":
      return Upload;
    case "Users":
      return Users;
    case "Settings":
      return Settings;
    default:
      return Bell;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "critical":
      return "bg-red-500/20 text-red-400 border-red-500/30";
    case "high":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "medium":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "low":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    default:
      return "bg-muted/20 text-muted-foreground border-muted/30";
  }
};

export function NotificationPanel({ user }: NotificationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return await apiRequest("POST", `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "Notification marked as read",
        description: "The notification has been removed from your active list.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to mark notification as read",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const unreadCount = notifications.length;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-primary text-primary-foreground text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:w-[400px] bg-card border-border">
        <SheetHeader>
          <SheetTitle className="text-foreground">Notifications</SheetTitle>
          <SheetDescription className="text-muted-foreground">
            {unreadCount === 0 
              ? "All caught up! No new notifications." 
              : `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}.`
            }
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-sm">
                No active notifications at the moment.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const IconComponent = getNotificationIcon(notification.icon);
                const timeAgo = notification.createdAt 
                  ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })
                  : "Just now";

                return (
                  <div
                    key={notification.id}
                    className="p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <IconComponent className="h-5 w-5 text-muted-foreground mt-0.5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-medium text-foreground truncate">
                            {notification.title}
                          </h4>
                          <Badge className={`text-xs ml-2 ${getPriorityColor(notification.priority)}`}>
                            {notification.priority}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {timeAgo}
                          </span>
                          
                          {/* Only show mark as read button for Admin/Manager */}
                          {(user.role === "admin" || user.role === "manager") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsReadMutation.mutate(notification.id)}
                              disabled={markAsReadMutation.isPending}
                              className="h-7 px-2 text-xs text-primary hover:text-primary-foreground hover:bg-primary"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Mark as Read
                            </Button>
                          )}
                          
                          {/* For viewers, show read-only badge */}
                          {user.role === "viewer" && (
                            <Badge variant="outline" className="text-xs">
                              Read Only
                            </Badge>
                          )}
                        </div>

                        {/* Show metadata if available */}
                        {notification.metadata && typeof notification.metadata === 'object' && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {notification.type === "inventory_low" && 
                             notification.metadata && 
                             typeof notification.metadata === 'object' && 
                             'productCount' in notification.metadata && (
                              <span>Affected products: {String(notification.metadata.productCount)}</span>
                            )}
                            {notification.type === "api_connection_failed" && 
                             notification.metadata && 
                             typeof notification.metadata === 'object' && 
                             'platform' in notification.metadata && (
                              <span>Platform: {String(notification.metadata.platform)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}