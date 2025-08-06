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
import { CSVImportModal } from "@/components/csv-import-modal";
import { type OnboardingData } from "@shared/schema";

export default function HomePage() {
  const { user } = useAuth();
  const [selectedPanels, setSelectedPanels] = useState<string[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<'inventory' | 'sales'>('inventory');
  const [importedData, setImportedData] = useState<{inventory?: any[], sales?: any[]}>({});

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
      
      // Show AI Copilot Panel if user selected any AI features
      if (onboardingData.aiAssistance && onboardingData.aiAssistance.length > 0) {
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
      <DashboardHeader user={user} onImportClick={openImportModal} />
      <main className="p-6 space-y-6">
        {/* Smart Alerts */}
        {onboardingData && (selectedPanels.includes("inventory-brain") || selectedPanels.includes("po-generator")) && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="text-yellow-400">⚠️</div>
              <div className="text-yellow-400 font-medium">
                2 products are running low on stock.
              </div>
              <span className="text-muted-foreground">
                Check Inventory Panel for details.
              </span>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Business Pulse - Always shown */}
          {selectedPanels.includes("business-pulse") && (
            <BusinessPulsePanel className="xl:col-span-2" />
          )}
          
          {/* Sales Intelligence - Based on selected channels */}
          {selectedPanels.includes("sales-intelligence") && onboardingData?.salesChannels && (
            <SalesIntelligencePanel 
              className="xl:col-span-2" 
              salesChannels={onboardingData.salesChannels}
            />
          )}
          
          {/* Inventory Brain - Conditional on inventory size */}
          {selectedPanels.includes("inventory-brain") && (
            <InventoryBrainPanel user={user} importedData={importedData.inventory} />
          )}
          
          {/* Customer Radar - Always shown */}
          {selectedPanels.includes("customer-radar") && (
            <CustomerRadarPanel />
          )}
          
          {/* AI Copilot - Conditional on AI features */}
          {selectedPanels.includes("ai-copilot") && (
            <AICopilotPanel />
          )}
          
          {/* Return Abuse Detection - Admin/Manager only */}
          {selectedPanels.includes("return-abuse") && (
            <ReturnAbusePanel className="xl:col-span-2" />
          )}
          
          {/* PO Generator - Admin only */}
          {selectedPanels.includes("po-generator") && (
            <POGeneratorPanel user={user} />
          )}
        </div>
        
        {/* Welcome message for new users */}
        {selectedPanels.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-card rounded-lg p-8 border border-border max-w-md mx-auto">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Setting up your dashboard...
              </h2>
              <p className="text-muted-foreground">
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
      </main>
    </div>
  );
}
