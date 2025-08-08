import { useAuth } from "@/hooks/use-auth";
import { ActionCenter } from "@/components/ActionCenter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function ActionCenterPage() {
  const { user } = useAuth();

  // Check if user has access to Action Center (Admin/Manager only)
  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You need Admin or Manager permissions to access the Action Center.
          </p>
          <Button asChild variant="outline">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header - Responsive */}
      <div className="border-b">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/">
                <ArrowLeft className="mr-1 sm:mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Link>
            </Button>
            <div className="h-4 w-px bg-border" />
            <h1 className="text-base sm:text-lg font-semibold truncate">Action Center</h1>
          </div>
        </div>
      </div>

      {/* Main Content - Responsive */}
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <ActionCenter />
      </div>
    </div>
  );
}