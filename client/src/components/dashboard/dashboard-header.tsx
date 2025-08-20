import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Settings, Bell, Upload, FileSpreadsheet, Users, BarChart3, Package, DollarSign, Globe, Truck, RotateCcw, UserCheck } from "lucide-react";
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
    <div className="bg-card border-b border-border px-3 sm:px-6 py-3 sm:py-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">
              {getGreeting()}, {user.username}
            </h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
              <Badge className={`text-xs self-start ${getRoleBadgeColor(user.role)}`}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </Badge>
              <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">
                Welcome to your business intelligence dashboard
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:space-x-3 overflow-x-auto">
          {/* CSV Import Buttons - Admin and Manager only - Responsive */}
          {onImportClick && (user.role === "admin" || user.role === "manager") && (
            <div className="flex items-center gap-1 sm:gap-2 mr-2 sm:mr-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onImportClick('inventory')}
                className="text-primary border-primary hover:bg-primary hover:text-primary-foreground text-xs sm:text-sm"
              >
                <Upload className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden sm:inline">Import Inventory</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onImportClick('sales')}
                className="text-primary border-primary hover:bg-primary hover:text-primary-foreground text-xs sm:text-sm"
              >
                <FileSpreadsheet className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden sm:inline">Import Sales</span>
              </Button>
            </div>
          )}

          {/* Navigation Buttons - Admin and Manager only - Responsive */}
          {(user.role === "admin" || user.role === "manager") && (
            <>
              <Button asChild variant="ghost" size="sm" className="shrink-0">
                <Link href="/inventory">
                  <Package className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Inventory</span>
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="shrink-0">
                <Link href="/action-center">
                  <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Action Center</span>
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="shrink-0">
                <Link href="/recon">
                  <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Reconciliation</span>
                </Link>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setLocation("/team")}
                className="text-blue-400 hover:text-blue-300 shrink-0"
              >
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline ml-1">Team</span>
              </Button>
              <Button asChild variant="ghost" size="sm" className="shrink-0">
                <Link href="/suppliers">
                  <Truck className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Suppliers</span>
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="shrink-0">
                <Link href="/customers">
                  <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Customers</span>
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="shrink-0">
                <Link href="/returns">
                  <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Returns</span>
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="shrink-0">
                <Link href="/workspace-settings">
                  <Globe className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Workspace</span>
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="shrink-0">
                <Link href="/settings">
                  <Settings className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Settings</span>
                </Link>
              </Button>
            </>
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