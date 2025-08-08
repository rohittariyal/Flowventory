import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { onboardingSchema, type InsertOnboardingData } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, 
  Building, 
  ShoppingCart, 
  Package, 
  Brain, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle,
  ArrowRight
} from "lucide-react";

const STEPS = [
  { id: 1, title: "Business Overview", icon: Building },
  { id: 2, title: "Sales Channels", icon: ShoppingCart },
  { id: 3, title: "Inventory Setup", icon: Package },
  { id: 4, title: "AI Preferences", icon: Brain },
];

const INDUSTRIES = [
  { value: "apparel", label: "Apparel" },
  { value: "electronics", label: "Electronics" },
  { value: "beauty", label: "Beauty" },
  { value: "home", label: "Home" },
  { value: "other", label: "Other" },
];

const MONTHLY_ORDERS = [
  { value: "0-100", label: "0–100 orders" },
  { value: "100-500", label: "100–500 orders" },
  { value: "500-1000", label: "500–1000 orders" },
  { value: "1000+", label: "1000+ orders" },
];

const SALES_CHANNELS = [
  { id: "shopify", label: "Shopify" },
  { id: "amazon", label: "Amazon Seller Central" },
  { id: "flipkart", label: "Flipkart Seller Hub" },
  { id: "woocommerce", label: "WooCommerce" },
  { id: "offline", label: "Offline Retail" },
];

const REORDER_FREQUENCY = [
  { value: "weekly", label: "Weekly" },
  { value: "bi-weekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
];

const REORDER_METHODS = [
  { value: "manual", label: "Manual" },
  { value: "excel", label: "Excel" },
  { value: "tool", label: "Tool" },
];

const AI_ASSISTANCE_OPTIONS = [
  { id: "inventory-planning", label: "Inventory Planning" },
  { id: "forecasting", label: "Forecasting" },
  { id: "feedback-analysis", label: "Customer Feedback Analysis" },
  { id: "return-alerts", label: "Return Alerts" },
];

const NOTIFICATION_METHODS = [
  { id: "email", label: "Email" },
  { id: "in-app", label: "In-app" },
  { id: "whatsapp", label: "WhatsApp" },
];

export default function OnboardingPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [averageStock, setAverageStock] = useState([50]);
  const { toast } = useToast();

  const form = useForm<InsertOnboardingData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      companyName: user?.companyName || "",
      industry: "electronics",
      monthlyOrders: "0-100",
      productsLive: "",
      businessLocation: "",
      salesChannels: [],
      manageOwnWarehouse: "yes",
      averageStockPerSku: "50",
      reorderFrequency: "monthly",
      reorderMethod: "manual",
      aiAssistance: [],
      notificationMethods: [],
    },
  });

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: InsertOnboardingData) => {
    setIsSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/onboarding/save", {
        ...data,
        averageStockPerSku: averageStock[0].toString(),
      });
      
      if (!response.ok) {
        throw new Error("Failed to save onboarding data");
      }
      
      // Update the user in the query cache to mark onboarding as complete
      if (user) {
        queryClient.setQueryData(["/api/user"], {
          ...user,
          onboardingComplete: "true"
        });
      }
      
      // Invalidate queries to refresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/user"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/onboarding"] })
      ]);
      
      toast({
        title: "Onboarding Complete!",
        description: "Welcome to your dashboard. Let's get started!",
      });
      
      // Small delay to ensure state updates, then navigate
      setTimeout(() => {
        setLocation("/");
      }, 100);
      
    } catch (error) {
      console.error("Onboarding error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to complete onboarding. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-background py-6 sm:py-12 px-3 sm:px-4 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header - Responsive */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Welcome to your setup!</h1>
          <p className="text-base sm:text-lg text-muted-foreground">Let's get your business configured in just a few steps</p>
        </div>

        {/* Progress Bar - Responsive */}
        <div className="mb-6 sm:mb-8">
          <div className="hidden sm:flex items-center justify-between mb-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                    ${isCompleted ? 'bg-green-500 border-green-500 text-white' : 
                      isActive ? 'bg-primary border-primary text-white' : 
                      'bg-white border-gray-300 text-gray-400'}
                  `}>
                    {isCompleted ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                    {step.title}
                  </span>
                  {index < STEPS.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground mx-4" />
                  )}
                </div>
              );
            })}
          </div>
          {/* Mobile step indicator */}
          <div className="sm:hidden text-center mb-4">
            <p className="text-sm text-muted-foreground">
              Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].title}
            </p>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Form */}
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {(() => {
                const Icon = STEPS[currentStep - 1].icon;
                return <Icon className="h-6 w-6 text-primary" />;
              })()}
              <span>{STEPS[currentStep - 1].title}</span>
            </CardTitle>
            <CardDescription>
              Step {currentStep} of {STEPS.length}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Step 1: Business Overview */}
              {currentStep === 1 && (
                <div className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        placeholder="Acme Corporation"
                        {...form.register("companyName")}
                      />
                      {form.formState.errors.companyName && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.companyName.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry</Label>
                      <Select
                        value={form.watch("industry")}
                        onValueChange={(value) => form.setValue("industry", value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          {INDUSTRIES.map((industry) => (
                            <SelectItem key={industry.value} value={industry.value}>
                              {industry.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="monthlyOrders">Monthly Orders</Label>
                      <Select
                        value={form.watch("monthlyOrders")}
                        onValueChange={(value) => form.setValue("monthlyOrders", value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select order volume" />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHLY_ORDERS.map((order) => (
                            <SelectItem key={order.value} value={order.value}>
                              {order.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="productsLive">Products Live</Label>
                      <Input
                        id="productsLive"
                        type="number"
                        placeholder="150"
                        {...form.register("productsLive")}
                      />
                      {form.formState.errors.productsLive && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.productsLive.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessLocation">Business Location</Label>
                    <Input
                      id="businessLocation"
                      placeholder="New York, NY"
                      {...form.register("businessLocation")}
                    />
                    {form.formState.errors.businessLocation && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.businessLocation.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Sales Channels */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <Label className="text-base font-medium">Select your sales channels</Label>
                    <p className="text-sm text-muted-foreground mb-4">Choose all platforms where you sell your products</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {SALES_CHANNELS.map((channel) => (
                        <div key={channel.id} className="flex items-center space-x-3 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                          <Checkbox
                            id={channel.id}
                            checked={form.watch("salesChannels").includes(channel.id)}
                            onCheckedChange={(checked) => {
                              const currentChannels = form.watch("salesChannels");
                              if (checked) {
                                form.setValue("salesChannels", [...currentChannels, channel.id]);
                              } else {
                                form.setValue("salesChannels", currentChannels.filter(c => c !== channel.id));
                              }
                            }}
                          />
                          <Label htmlFor={channel.id} className="text-sm font-medium cursor-pointer">
                            {channel.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                    
                    {form.formState.errors.salesChannels && (
                      <p className="text-sm text-destructive mt-2">
                        {form.formState.errors.salesChannels.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Inventory Setup */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <Label className="text-base font-medium">Do you manage your own warehouse?</Label>
                    <RadioGroup
                      value={form.watch("manageOwnWarehouse")}
                      onValueChange={(value) => form.setValue("manageOwnWarehouse", value as "yes" | "no")}
                      className="flex space-x-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="warehouse-yes" />
                        <Label htmlFor="warehouse-yes">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="warehouse-no" />
                        <Label htmlFor="warehouse-no">No</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base font-medium">
                      Average Stock per SKU: {averageStock[0]} units
                    </Label>
                    <Slider
                      value={averageStock}
                      onValueChange={setAverageStock}
                      max={1000}
                      min={1}
                      step={10}
                      className="w-full"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="reorderFrequency">How often do you reorder?</Label>
                      <Select
                        value={form.watch("reorderFrequency")}
                        onValueChange={(value) => form.setValue("reorderFrequency", value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          {REORDER_FREQUENCY.map((freq) => (
                            <SelectItem key={freq.value} value={freq.value}>
                              {freq.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reorderMethod">Reorder method?</Label>
                      <Select
                        value={form.watch("reorderMethod")}
                        onValueChange={(value) => form.setValue("reorderMethod", value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          {REORDER_METHODS.map((method) => (
                            <SelectItem key={method.value} value={method.value}>
                              {method.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: AI Preferences */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <Label className="text-base font-medium">How would you like AI to assist? (Optional)</Label>
                    <p className="text-sm text-gray-600 mb-4">Select areas where you'd like AI assistance</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {AI_ASSISTANCE_OPTIONS.map((option) => (
                        <div key={option.id} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                          <Checkbox
                            id={option.id}
                            checked={form.watch("aiAssistance").includes(option.id)}
                            onCheckedChange={(checked) => {
                              const currentAssistance = form.watch("aiAssistance");
                              if (checked) {
                                form.setValue("aiAssistance", [...currentAssistance, option.id]);
                              } else {
                                form.setValue("aiAssistance", currentAssistance.filter(a => a !== option.id));
                              }
                            }}
                          />
                          <Label htmlFor={option.id} className="text-sm font-medium cursor-pointer">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-medium">Notification Methods</Label>
                    <p className="text-sm text-gray-600 mb-4">How would you like to receive notifications?</p>
                    
                    <div className="flex flex-wrap gap-4">
                      {NOTIFICATION_METHODS.map((method) => (
                        <div key={method.id} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                          <Checkbox
                            id={method.id}
                            checked={form.watch("notificationMethods").includes(method.id)}
                            onCheckedChange={(checked) => {
                              const currentMethods = form.watch("notificationMethods");
                              if (checked) {
                                form.setValue("notificationMethods", [...currentMethods, method.id]);
                              } else {
                                form.setValue("notificationMethods", currentMethods.filter(m => m !== method.id));
                              }
                            }}
                          />
                          <Label htmlFor={method.id} className="text-sm font-medium cursor-pointer">
                            {method.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                    
                    {form.formState.errors.notificationMethods && (
                      <p className="text-sm text-destructive mt-2">
                        {form.formState.errors.notificationMethods.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="flex items-center space-x-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Previous</span>
                </Button>

                {currentStep < STEPS.length ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="flex items-center space-x-2"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center space-x-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Completing Setup...</span>
                      </>
                    ) : (
                      <>
                        <span>Complete Setup</span>
                        <CheckCircle className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}