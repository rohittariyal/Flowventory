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
import { type OnboardingData } from "@shared/schema";

export default function HomePage() {
  const { user } = useAuth();
  const [selectedPanels, setSelectedPanels] = useState<string[]>([]);

  // Fetch user's onboarding data to determine which panels to show
  const { data: onboardingData } = useQuery<OnboardingData>({
    queryKey: ["/api/onboarding"],
    enabled: !!user,
  });

  useEffect(() => {
    if (onboardingData) {
      const panels = ["business-pulse"]; // Always show business pulse
      
      // Add panels based on onboarding data
      if (onboardingData.salesChannels?.length > 0) {
        panels.push("sales-intelligence");
      }
      
      if (onboardingData.averageStockPerSku && parseInt(onboardingData.averageStockPerSku) > 0) {
        panels.push("inventory-brain");
      }
      
      panels.push("customer-radar"); // Always show customer insights
      
      if (onboardingData.aiAssistance?.includes("insights") || onboardingData.aiAssistance?.includes("predictions")) {
        panels.push("ai-copilot");
      }
      
      // Show return abuse panel for admins and managers
      if (user?.role === "admin" || user?.role === "manager") {
        panels.push("return-abuse");
      }
      
      setSelectedPanels(panels);
    }
  }, [onboardingData, user?.role]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader user={user} />
      <main className="p-6 space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Business Pulse - Always shown */}
          {selectedPanels.includes("business-pulse") && (
            <BusinessPulsePanel className="xl:col-span-2" />
          )}
          
          {/* Sales Intelligence - Conditional on sales channels */}
          {selectedPanels.includes("sales-intelligence") && onboardingData?.salesChannels && (
            <SalesIntelligencePanel 
              className="xl:col-span-2" 
              salesChannels={onboardingData.salesChannels}
            />
          )}
          
          {/* Inventory Brain - Conditional on inventory size */}
          {selectedPanels.includes("inventory-brain") && (
            <InventoryBrainPanel user={user} />
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
      </main>
    </div>
  );
}
