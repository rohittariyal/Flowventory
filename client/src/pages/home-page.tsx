import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { BusinessPulsePanel } from "@/components/dashboard/business-pulse-panel";
import { InventoryBrainPanel } from "@/components/dashboard/inventory-brain-panel";
import { SalesIntelligencePanel } from "@/components/dashboard/sales-intelligence-panel";
import { CustomerRadarPanel } from "@/components/dashboard/customer-radar-panel";
import { AICopilotPanel } from "@/components/dashboard/ai-copilot-panel";
import { ReturnAbusePanel } from "@/components/dashboard/return-abuse-panel";
import { POGeneratorPanel } from "@/components/dashboard/po-generator-panel";
import { SupplierManagementPanel } from "@/components/dashboard/supplier-management-panel";
import { SupplierSLAPanel } from "@/components/dashboard/supplier-sla-panel";
import { CSVImportModal } from "@/components/csv-import-modal";
import { SettingsPanel } from "@/components/settings-panel";
import { AnalyticsPanel } from "@/components/analytics-panel";
import { type OnboardingData } from "@shared/schema";

export default function HomePage() {
  const { user } = useAuth();
  const [selectedPanels, setSelectedPanels] = useState<string[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<'inventory' | 'sales'>('inventory');
  const [importedData, setImportedData] = useState<{inventory?: any[], sales?: any[]}>({});
  const [showSettings, setShowSettings] = useState(false);

  // Fetch user's onboarding data to determine which panels to show
  const { data: onboardingData } = useQuery<OnboardingData>({
    queryKey: ["/api/onboarding"],
    enabled: !!user,
  });

  useEffect(() => {
    if (onboardingData && user) {
      const panels = ["business-pulse"]; // Always show Business Pulse
      
      // Show Sales Intelligence Panel if user selected any sales platforms
      if (onboardingData.salesChannels && onboardingData.salesChannels.length > 0) {
        panels.push("sales-intelligence");
      }
      
      // Show Inventory Panel if platforms were selected
      if (onboardingData.salesChannels && onboardingData.salesChannels.length > 0) {
        panels.push("inventory-brain");
      }
      
      // Show AI Copilot Panel if user selected any AI features (Admin/Manager only)
      if (onboardingData.aiAssistance && onboardingData.aiAssistance.length > 0 && 
          (user.role === "admin" || user.role === "manager")) {
        panels.push("ai-copilot");
      }
      
      // Show Customer Radar Panel if user selected Customer Feedback Analysis
      if (onboardingData.aiAssistance?.includes("feedback-analysis")) {
        panels.push("customer-radar");
      }
      
      // Show Return Abuse Panel if user selected Return Alerts (admin/manager only)
      if (onboardingData.aiAssistance?.includes("return-alerts") && 
          (user.role === "admin" || user.role === "manager")) {
        panels.push("return-abuse");
      }
      
      // Show PO Generator Panel for admins only
      if (user.role === "admin") {
        panels.push("po-generator");
      }

      // Show Supplier Management Panel for admins and managers
      if (user.role === "admin" || user.role === "manager") {
        panels.push("supplier-management");
        // Also show SLA Tracker Panel for supply chain monitoring
        panels.push("supplier-sla");
      }
      
      // Always show Analytics panel for all users
      panels.push("analytics");
      
      setSelectedPanels(panels);
    }
  }, [onboardingData, user]);

  const handleImport = (data: any[], type: 'inventory' | 'sales') => {
    setImportedData(prev => ({
      ...prev,
      [type]: data
    }));
    console.log(`Imported ${type} data:`, data);
    
    // Show success message
    const successMessage = `Successfully imported ${data.length} ${type} records! The data is now visible in your ${type} dashboard panel.`;
    alert(successMessage);
  };

  const openImportModal = (type: 'inventory' | 'sales') => {
    setImportType(type);
    setShowImportModal(true);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader 
        user={user} 
        onImportClick={openImportModal}
        onSettingsClick={() => setShowSettings(true)}
      />
      <main className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        {/* Smart Alerts - Admin/Manager only - Responsive */}
        {onboardingData && (selectedPanels.includes("inventory-brain") || selectedPanels.includes("po-generator")) && 
         (user.role === "admin" || user.role === "manager") && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
              <div className="text-yellow-400">⚠️</div>
              <div className="text-yellow-400 font-medium">
                2 products are running low on stock.
              </div>
              <span className="text-muted-foreground text-sm">
                Check Inventory Panel for details.
              </span>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {/* Business Pulse - Always shown - Responsive */}
          {selectedPanels.includes("business-pulse") && (
            <div className="lg:col-span-2 xl:col-span-3">
              <BusinessPulsePanel />
            </div>
          )}
          
          {/* Sales Intelligence - Based on selected channels - Responsive */}
          {selectedPanels.includes("sales-intelligence") && onboardingData?.salesChannels && (
            <div className="lg:col-span-2 xl:col-span-3">
              <SalesIntelligencePanel salesChannels={onboardingData.salesChannels} />
            </div>
          )}
          
          {/* Inventory Brain - Conditional on inventory size - Responsive */}
          {selectedPanels.includes("inventory-brain") && (
            <div className="lg:col-span-1">
              <InventoryBrainPanel user={user} importedData={importedData.inventory} />
            </div>
          )}
          
          {/* Customer Radar - Always shown - Responsive */}
          {selectedPanels.includes("customer-radar") && (
            <div className="lg:col-span-1">
              <CustomerRadarPanel />
            </div>
          )}
          
          {/* AI Copilot - Admin/Manager only - Responsive */}
          {selectedPanels.includes("ai-copilot") && (user.role === "admin" || user.role === "manager") && (
            <div className="lg:col-span-1">
              <AICopilotPanel />
            </div>
          )}
          
          {/* Return Abuse Detection - Admin/Manager only - Responsive */}
          {selectedPanels.includes("return-abuse") && (user.role === "admin" || user.role === "manager") && (
            <div className="lg:col-span-2 xl:col-span-3">
              <ReturnAbusePanel />
            </div>
          )}
          
          {/* PO Generator - Admin only - Responsive */}
          {selectedPanels.includes("po-generator") && user.role === "admin" && (
            <div className="lg:col-span-1">
              <POGeneratorPanel user={user} />
            </div>
          )}

          {/* Supplier Management - Admin/Manager only - Responsive */}
          {selectedPanels.includes("supplier-management") && (user.role === "admin" || user.role === "manager") && (
            <div className="lg:col-span-1">
              <SupplierManagementPanel />
            </div>
          )}

          {/* Supplier SLA Tracker - Admin/Manager only - Responsive */}
          {selectedPanels.includes("supplier-sla") && (user.role === "admin" || user.role === "manager") && (
            <div className="lg:col-span-2 xl:col-span-3">
              <SupplierSLAPanel />
            </div>
          )}
          
          {/* Analytics V1 - All users - Responsive */}
          {selectedPanels.includes("analytics") && (
            <div className="lg:col-span-2 xl:col-span-3">
              <AnalyticsPanel />
            </div>
          )}
        </div>
        
        {/* Welcome message for new users - Responsive */}
        {selectedPanels.length === 0 && (
          <div className="text-center py-8 sm:py-12">
            <div className="bg-card rounded-lg p-6 sm:p-8 border border-border max-w-md mx-auto">
              <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4">
                Setting up your dashboard...
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Complete your onboarding to see personalized business insights and analytics.
              </p>
            </div>
          </div>
        )}

        {/* CSV Import Modal */}
        <CSVImportModal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          onImport={handleImport}
          importType={importType}
        />

        {/* Settings Panel */}
        {onboardingData && (
          <SettingsPanel
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            user={user}
            onboardingData={onboardingData}
          />
        )}
      </main>
    </div>
  );
}
