import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
  requiresOnboarding = true,
}: {
  path: string;
  component: () => React.JSX.Element | null;
  requiresOnboarding?: boolean;
}) {
  const { user, isLoading, needsOnboarding } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // If user needs onboarding and this route requires completed onboarding, redirect to onboarding
  // But only if we're not currently on the dashboard and user still needs onboarding
  if (requiresOnboarding && needsOnboarding && path !== "/onboarding" && path === "/") {
    return (
      <Route path={path}>
        <Redirect to="/onboarding" />
      </Route>
    );
  }

  return (
    <Route path={path}>
      <Component />
    </Route>
  );
}
