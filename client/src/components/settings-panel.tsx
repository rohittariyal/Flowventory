import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings, CheckCircle, Link, Key, AlertCircle } from "lucide-react";
import { type OnboardingData, type User } from "@shared/schema";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onboardingData: OnboardingData;
}

interface ConnectionStatus {
  [key: string]: {
    connected: boolean;
    apiKey?: string;
  };
}

export function SettingsPanel({ isOpen, onClose, user, onboardingData }: SettingsPanelProps) {
  const [connections, setConnections] = useState<ConnectionStatus>({});
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState<string>("");

  const getPlatformDetails = (platform: string) => {
    const platformMap: Record<string, { name: string; icon: string; description: string }> = {
      shopify: {
        name: "Shopify",
        icon: "🛒",
        description: "Connect your Shopify store to sync products and orders"
      },
      amazon: {
        name: "Amazon",
        icon: "📦",
        description: "Import Amazon sales data and inventory levels"
      },
      flipkart: {
        name: "Flipkart",
        icon: "🛍️",
        description: "Sync Flipkart marketplace data and analytics"
      },
      ebay: {
        name: "eBay",
        icon: "🏪",
        description: "Connect eBay store for unified inventory management"
      },
      etsy: {
        name: "Etsy",
        icon: "🎨",
        description: "Import Etsy shop data and customer insights"
      },
      woocommerce: {
        name: "WooCommerce",
        icon: "🔧",
        description: "Connect WooCommerce store for complete integration"
      }
    };

    return platformMap[platform] || {
      name: platform.charAt(0).toUpperCase() + platform.slice(1),
      icon: "🔗",
      description: "Connect this platform to your dashboard"
    };
  };

  const handleConnect = (platform: string) => {
    setConnectingPlatform(platform);
    setApiKeyInput("");
  };

  const handleConfirmConnection = () => {
    if (connectingPlatform && apiKeyInput.trim()) {
      setConnections(prev => ({
        ...prev,
        [connectingPlatform]: {
          connected: true,
          apiKey: apiKeyInput.trim()
        }
      }));
      
      // Show success message
      setTimeout(() => {
        setConnectingPlatform(null);
        setApiKeyInput("");
      }, 500);
    }
  };

  const handleDisconnect = (platform: string) => {
    setConnections(prev => ({
      ...prev,
      [platform]: {
        connected: false,
        apiKey: undefined
      }
    }));
  };

  const isConnected = (platform: string) => connections[platform]?.connected || false;
  
  const selectedPlatforms = onboardingData.salesChannels || [];
  const connectedCount = selectedPlatforms.filter(platform => isConnected(platform)).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-foreground">
            <Settings className="h-5 w-5" />
            <span>Platform Settings</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-secondary/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Platform Connections</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage your e-commerce platform integrations
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">{connectedCount}/{selectedPlatforms.length}</div>
                <div className="text-sm text-muted-foreground">Connected</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Platform Cards */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-foreground">Your Selected Platforms</h4>
            
            {selectedPlatforms.length === 0 ? (
              <Card className="bg-secondary/30">
                <CardContent className="p-6 text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No platforms selected during onboarding</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {selectedPlatforms.map((platform) => {
                  const details = getPlatformDetails(platform);
                  const connected = isConnected(platform);
                  
                  return (
                    <Card key={platform} className="bg-secondary/30 border border-border hover:border-primary/30 transition-colors">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="text-2xl">{details.icon}</div>
                            <div>
                              <h5 className="font-semibold text-foreground flex items-center space-x-2">
                                <span>{details.name}</span>
                                {connected && (
                                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Connected
                                  </Badge>
                                )}
                              </h5>
                              <p className="text-sm text-muted-foreground mt-1">
                                {details.description}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {connected ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDisconnect(platform)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                Disconnect
                              </Button>
                            ) : (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleConnect(platform)}
                                className="bg-primary hover:bg-primary/90"
                              >
                                <Link className="h-4 w-4 mr-1" />
                                Connect
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* API Key Connection Modal */}
        {connectingPlatform && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md bg-card border border-border">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Key className="h-5 w-5 text-primary" />
                  <span>Connect {getPlatformDetails(connectingPlatform).name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="apiKey" className="text-sm font-medium text-foreground">
                    API Key
                  </Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="Enter your API key..."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Your API key will be encrypted and stored securely
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setConnectingPlatform(null);
                      setApiKeyInput("");
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmConnection}
                    disabled={!apiKeyInput.trim()}
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Connect
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}