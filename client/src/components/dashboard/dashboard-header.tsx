import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Settings, Bell } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { type User } from "@shared/schema";

interface DashboardHeaderProps {
  user: User;
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const { logoutMutation } = useAuth();

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-primary/20 text-primary border-primary/30";
      case "manager":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default:
        return "bg-muted/20 text-muted-foreground border-muted/30";
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {getGreeting()}, {user.username}
            </h1>
            <div className="flex items-center space-x-3 mt-1">
              <Badge className={`text-xs ${getRoleBadgeColor(user.role)}`}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Welcome to your business intelligence dashboard
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <Bell className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logoutMutation.mutate()}
            className="text-muted-foreground hover:text-foreground"
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}