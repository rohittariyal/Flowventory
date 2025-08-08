import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Settings, Bell, Upload, FileSpreadsheet, Users, BarChart3, Package } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { NotificationPanel } from "../NotificationPanel";
import { type User, type OnboardingData } from "@shared/schema";

interface DashboardHeaderProps {
  user: User;
  onImportClick?: (type: 'inventory' | 'sales') => void;
  onSettingsClick?: () => void;
}

export function DashboardHeader({ user, onImportClick, onSettingsClick }: DashboardHeaderProps) {
  const { logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

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
          {/* CSV Import Buttons - Admin and Manager only */}
          {onImportClick && (user.role === "admin" || user.role === "manager") && (
            <div className="flex items-center space-x-2 mr-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onImportClick('inventory')}
                className="text-primary border-primary hover:bg-primary hover:text-primary-foreground"
              >
                <Upload className="h-4 w-4 mr-1" />
                Import Inventory
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onImportClick('sales')}
                className="text-primary border-primary hover:bg-primary hover:text-primary-foreground"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1" />
                Import Sales
              </Button>
            </div>
          )}

          {/* Inventory Button - Admin and Manager only */}
          {(user.role === "admin" || user.role === "manager") && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/inventory">
                <Package className="h-4 w-4 mr-1" />
                Inventory
              </Link>
            </Button>
          )}

          {/* Action Center Button - Admin and Manager only */}
          {(user.role === "admin" || user.role === "manager") && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/action-center">
                <BarChart3 className="h-4 w-4 mr-1" />
                Action Center
              </Link>
            </Button>
          )}

          {/* Team Management Button - Admin and Manager only */}
          {(user.role === "admin" || user.role === "manager") && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation("/team")}
              className="text-blue-400 hover:text-blue-300"
            >
              <Users className="h-4 w-4" />
            </Button>
          )}
          
          {/* Notification Panel - Admin and Manager only */}
          {(user.role === "admin" || user.role === "manager") && (
            <NotificationPanel user={user} />
          )}
          {/* Settings - Admin only */}
          {user.role === "admin" && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onSettingsClick}
              className="text-muted-foreground hover:text-foreground"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
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