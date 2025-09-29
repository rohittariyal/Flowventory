import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { PermissionsProvider } from "@/hooks/use-perms";
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
import SettingsPage from "@/pages/settings-page";
import SuppliersPage from "@/pages/suppliers-page";
import ReturnsPage from "@/pages/returns-page";
import CustomersPage from "@/pages/customers-page";
import CustomerDetailPage from "@/pages/customer-detail-page";
import UsersPage from "@/pages/users-page";
import InvoicesPage from "@/pages/invoices-page";
import InvoiceDetailPage from "@/pages/invoice-detail-page";
import ProductDetailPage from "@/pages/product-detail-page";
import ForecastsPage from "@/pages/forecasts-page";
import FinanceSettingsPage from "@/pages/finance-settings-page";
import LocationsSettingsPage from "@/pages/locations-settings-page";
import ShippingSettingsPage from "@/pages/shipping-settings-page";
import PaymentSettingsPage from "@/pages/payment-settings-page";
import CompliancePage from "@/pages/compliance-page";
import InsightsPage from "@/pages/insights-page";
import SupplierBenchmarkPage from "@/pages/supplier-benchmark-page";
import { ProtectedRoute } from "./lib/protected-route";
import { initializeSeedData } from "@/data/seedInvoiceData";
import { initializeSessionData, initializeProductNotesData } from "@/data/seedSessionData";
import { initializeProductData, initializeBatchInventoryData, initializeBatchEventsData } from "@/data/seedProductData";
import { initializeAnalyticsData } from "@/utils/analytics";
import { initializeTaxationData } from "@/utils/taxation";
import { initializeWarehouseData } from "@/utils/warehouse";
import { seedForecastData } from "@/data/seedForecastData";
import { initializeLocationAccessData } from "@/data/seedLocationData";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/onboarding" component={OnboardingPage} requiresOnboarding={false} />
      <ProtectedRoute path="/team" component={TeamPage} />
      <ProtectedRoute path="/action-center" component={ActionCenterPage} />
      <ProtectedRoute path="/inventory" component={InventoryPage} />
      <ProtectedRoute path="/products" component={InventoryPage} />
      <ProtectedRoute path="/forecast" component={ForecastsPage} />
      <ProtectedRoute path="/orders" component={PurchaseOrdersPage} />
      <ProtectedRoute path="/purchase-orders" component={PurchaseOrdersPage} />
      <ProtectedRoute path="/recon" component={ReconciliationPage} />
      <ProtectedRoute path="/recon/:batchId" component={ReconciliationDetailPage} />
      <ProtectedRoute path="/workspace-settings" component={WorkspaceSettingsPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/suppliers" component={SuppliersPage} />
      <ProtectedRoute path="/suppliers/benchmark" component={SupplierBenchmarkPage} />
      <ProtectedRoute path="/returns" component={ReturnsPage} />
      <ProtectedRoute path="/customers" component={CustomersPage} />
      <ProtectedRoute path="/customers/:id" component={CustomerDetailPage} />
      <ProtectedRoute path="/invoices" component={InvoicesPage} />
      <ProtectedRoute path="/invoices/:id" component={InvoiceDetailPage} />
      <ProtectedRoute path="/products/:id" component={ProductDetailPage} />
      <ProtectedRoute path="/workspace/users" component={UsersPage} />
      <ProtectedRoute path="/settings/finance" component={FinanceSettingsPage} />
      <ProtectedRoute path="/settings/locations" component={LocationsSettingsPage} />
      <ProtectedRoute path="/settings/shipping" component={ShippingSettingsPage} />
      <ProtectedRoute path="/settings/payments" component={PaymentSettingsPage} />
      <ProtectedRoute path="/compliance" component={CompliancePage} />
      <ProtectedRoute path="/insights" component={InsightsPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize seed data on app start
  initializeSeedData();
  initializeSessionData();
  initializeProductNotesData();
  initializeProductData();
  initializeBatchInventoryData();
  initializeBatchEventsData();
  initializeAnalyticsData();
  initializeTaxationData();
  initializeWarehouseData();
  seedForecastData(); // Initialize forecast demo data
  initializeLocationAccessData(); // Initialize location access data
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PermissionsProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </PermissionsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
