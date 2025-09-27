import { useAuth } from "@/hooks/use-auth";
import { getUserScope } from "@/utils/locationAccess";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, AlertCircle } from "lucide-react";

interface LocationGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireLocations?: boolean;
}

export function LocationGuard({ 
  children, 
  fallback, 
  requireLocations = true 
}: LocationGuardProps) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-600">
            <MapPin className="h-5 w-5 mr-2" />
            Loading...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Checking authentication...</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!user) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <AlertCircle className="h-5 w-5 mr-2" />
            Authentication Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Please log in to access this page.</p>
        </CardContent>
      </Card>
    );
  }

  if (!requireLocations) {
    return <>{children}</>;
  }

  const userScope = getUserScope(user);
  
  if (userScope.scope === 'none') {
    return fallback || (
      <Card className="max-w-lg mx-auto mt-8" data-testid="location-guard-no-access">
        <CardHeader>
          <CardTitle className="flex items-center text-orange-600">
            <MapPin className="h-5 w-5 mr-2" />
            No Location Access
          </CardTitle>
          <CardDescription>
            You don't have access to any locations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            This page requires location access to display data. Please contact an admin to assign locations to your account.
          </p>
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Current Status:</strong> No locations assigned
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Role:</strong> {user.roleId}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return <>{children}</>;
}

interface LocationScopeChipProps {
  className?: string;
}

export function LocationScopeChip({ className = "" }: LocationScopeChipProps) {
  const { user } = useAuth();
  
  if (!user) return null;
  
  const userScope = getUserScope(user);
  
  let text = "";
  let bgColor = "";
  
  switch (userScope.scope) {
    case 'all':
      text = "All locations";
      bgColor = "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      break;
    case 'subset':
      text = `${userScope.locations?.length || 0} locations`;
      bgColor = "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      break;
    case 'none':
      text = "No locations";
      bgColor = "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      break;
    default:
      return null;
  }
  
  return (
    <span 
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${bgColor} ${className}`}
      data-testid="location-scope-chip"
    >
      <MapPin className="h-3 w-3 mr-1" />
      {text}
    </span>
  );
}