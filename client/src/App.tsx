import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import HomePage from "@/pages/home-page";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import OnboardingPage from "@/pages/onboarding-page";
import TeamPage from "@/pages/team-page";
import ReconciliationPage from "@/pages/reconciliation-page";
import ReconciliationDetailPage from "@/pages/reconciliation-detail-page";
import ActionCenterPage from "@/pages/action-center-page";
import InventoryPage from "@/pages/inventory-page";
import PurchaseOrdersPage from "@/pages/purchase-orders-page";
import WorkspaceSettingsPage from "@/pages/workspace-settings-page";
import SuppliersPage from "@/pages/suppliers-page";
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/onboarding" component={OnboardingPage} requiresOnboarding={false} />
      <ProtectedRoute path="/team" component={TeamPage} />
      <ProtectedRoute path="/action-center" component={ActionCenterPage} />
      <ProtectedRoute path="/inventory" component={InventoryPage} />
      <ProtectedRoute path="/purchase-orders" component={PurchaseOrdersPage} />
      <ProtectedRoute path="/recon" component={ReconciliationPage} />
      <ProtectedRoute path="/recon/:batchId" component={ReconciliationDetailPage} />
      <ProtectedRoute path="/workspace-settings" component={WorkspaceSettingsPage} />
      <ProtectedRoute path="/suppliers" component={SuppliersPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
