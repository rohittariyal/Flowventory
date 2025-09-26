import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Save, RotateCcw, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getForecastSettings, saveForecastSettings } from "@/utils/forecastStorage";

// Form schemas
const generalSettingsSchema = z.object({
  orgName: z.string().min(1, "Organization name is required"),
  logoUrl: z.string().url().optional().or(z.literal("")),
  defaultCurrency: z.enum(["USD", "EUR", "GBP", "INR", "AED"]),
  defaultTimezone: z.string(),
  dateFormat: z.enum(["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]),
  numberFormat: z.enum(["US", "EU", "IN"])
});

const regionSchema = z.object({
  name: z.string().min(1, "Region name is required"),
  code: z.string().min(2, "Region code must be at least 2 characters"),
  slaHours: z.number().min(1).max(168),
  restockBufferPercentage: z.number().min(0).max(100),
  isActive: z.boolean()
});

const notificationSchema = z.object({
  dailyDigestEnabled: z.string(),
  digestTime: z.string(),
  alertsEnabled: z.string(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional()
});

const forecastSettingsSchema = z.object({
  defaultMethod: z.enum(["moving_avg", "ewma"]),
  defaultHorizon: z.enum(["30", "60", "90"]),
  minHistoryDays: z.number().min(7).max(365),
  defaultSafetyStock: z.number().min(0),
  defaultLeadTimeDays: z.number().min(1).max(365),
  autoRefreshEnabled: z.boolean(),
  autoRefreshIntervalMinutes: z.number().min(5).max(1440),
  cacheStaleHours: z.number().min(1).max(168),
  priorityProductsEnabled: z.boolean(),
  maxCacheEntries: z.number().min(50).max(10000)
});

export default function WorkspaceSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("general");

  // Fetch all settings data
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ["/api/settings"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Type-safe access to settings data
  const workspace = (settingsData as any)?.workspace || {};
  const notifications = (settingsData as any)?.notifications || {};
  const regions = (settingsData as any)?.regions || [];

  // General Settings Form
  const generalForm = useForm({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      orgName: workspace?.orgName || "",
      logoUrl: workspace?.logoUrl || "",
      defaultCurrency: workspace?.defaultCurrency || "USD",
      defaultTimezone: workspace?.defaultTimezone || "UTC",
      dateFormat: workspace?.dateFormat || "MM/DD/YYYY",
      numberFormat: workspace?.numberFormat || "US"
    }
  });

  // Region Form
  const regionForm = useForm({
    resolver: zodResolver(regionSchema),
    defaultValues: {
      name: "",
      code: "",
      slaHours: 24,
      restockBufferPercentage: 20,
      isActive: true
    }
  });

  // Notification Form
  const notificationForm = useForm({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      dailyDigestEnabled: notifications?.dailyDigestEnabled || "true",
      digestTime: notifications?.digestTime || "09:00",
      alertsEnabled: notifications?.alertsEnabled || "true",
      smtpHost: notifications?.smtpHost || "",
      smtpPort: notifications?.smtpPort || 587,
      smtpUser: notifications?.smtpUser || "",
      smtpPassword: notifications?.smtpPassword || ""
    }
  });

  // Load current forecast settings
  const currentForecastSettings = getForecastSettings();

  // Forecast Settings Form
  const forecastForm = useForm({
    resolver: zodResolver(forecastSettingsSchema),
    defaultValues: {
      defaultMethod: currentForecastSettings.defaultMethod,
      defaultHorizon: currentForecastSettings.defaultHorizon,
      minHistoryDays: currentForecastSettings.minHistoryDays,
      defaultSafetyStock: currentForecastSettings.defaultSafetyStock,
      defaultLeadTimeDays: currentForecastSettings.defaultLeadTimeDays,
      autoRefreshEnabled: currentForecastSettings.autoRefreshEnabled,
      autoRefreshIntervalMinutes: currentForecastSettings.autoRefreshIntervalMinutes,
      cacheStaleHours: currentForecastSettings.cacheStaleHours,
      priorityProductsEnabled: currentForecastSettings.priorityProductsEnabled,
      maxCacheEntries: currentForecastSettings.maxCacheEntries
    }
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => 
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings Updated",
        description: "Your workspace settings have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  // Create region mutation
  const createRegionMutation = useMutation({
    mutationFn: (data: any) => 
      fetch("/api/regions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      regionForm.reset();
      toast({
        title: "Region Created",
        description: "New region has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create region",
        variant: "destructive",
      });
    },
  });

  // Delete region mutation
  const deleteRegionMutation = useMutation({
    mutationFn: (regionId: string) => 
      fetch(`/api/regions/${regionId}`, {
        method: "DELETE",
        credentials: "include",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Region Deleted",
        description: "Region has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete region",
        variant: "destructive",
      });
    },
  });

  // Update notifications mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: (data: any) => 
      fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Notifications Updated",
        description: "Your notification settings have been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update notification settings",
        variant: "destructive",
      });
    },
  });

  // Form handlers
  const onGeneralSubmit = (data: any) => {
    updateSettingsMutation.mutate(data);
  };

  const onRegionSubmit = (data: any) => {
    createRegionMutation.mutate(data);
  };

  const onNotificationSubmit = (data: any) => {
    updateNotificationsMutation.mutate(data);
  };

  const onForecastSubmit = (data: any) => {
    try {
      saveForecastSettings(data);
      toast({
        title: "Forecast Settings Updated",
        description: "Your forecasting preferences have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to save forecast settings",
        variant: "destructive",
      });
    }
  };

  const resetForm = (formType: string) => {
    if (formType === "general") {
      generalForm.reset();
    } else if (formType === "region") {
      regionForm.reset();
    } else if (formType === "notification") {
      notificationForm.reset();
    } else if (formType === "forecast") {
      forecastForm.reset();
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Workspace Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your organization settings, regions, and notification preferences
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Navigation */}
        <div className="col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="w-full">
            <TabsList className="grid w-full grid-rows-5 h-auto">
              <TabsTrigger value="general" className="justify-start">General</TabsTrigger>
              <TabsTrigger value="localization" className="justify-start">Localization</TabsTrigger>
              <TabsTrigger value="regions" className="justify-start">Regions & SLAs</TabsTrigger>
              <TabsTrigger value="notifications" className="justify-start">Notifications</TabsTrigger>
              <TabsTrigger value="forecasting" className="justify-start">
                <TrendingUp className="h-4 w-4 mr-2" />
                Forecasting
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Right Content */}
        <div className="col-span-9">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* General Tab */}
            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>
                    Manage your organization's basic information and branding
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={generalForm.handleSubmit(onGeneralSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="orgName">Organization Name</Label>
                        <Input
                          id="orgName"
                          {...generalForm.register("orgName")}
                          placeholder="Enter organization name"
                        />
                        {generalForm.formState.errors.orgName && (
                          <p className="text-sm text-red-500 mt-1">
                            {String(generalForm.formState.errors.orgName.message)}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="logoUrl">Logo URL (Optional)</Label>
                        <Input
                          id="logoUrl"
                          {...generalForm.register("logoUrl")}
                          placeholder="https://example.com/logo.png"
                        />
                        {generalForm.formState.errors.logoUrl && (
                          <p className="text-sm text-red-500 mt-1">
                            {String(generalForm.formState.errors.logoUrl.message)}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="defaultCurrency">Default Currency</Label>
                        <Select 
                          value={generalForm.watch("defaultCurrency")}
                          onValueChange={(value) => generalForm.setValue("defaultCurrency", value as "USD" | "EUR" | "GBP" | "INR" | "AED")}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD - US Dollar</SelectItem>
                            <SelectItem value="EUR">EUR - Euro</SelectItem>
                            <SelectItem value="GBP">GBP - British Pound</SelectItem>
                            <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                            <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-between">
                      <Button type="button" variant="outline" onClick={() => resetForm("general")}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset
                      </Button>
                      <Button type="submit" disabled={updateSettingsMutation.isPending}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Localization Tab */}
            <TabsContent value="localization">
              <Card>
                <CardHeader>
                  <CardTitle>Localization Settings</CardTitle>
                  <CardDescription>
                    Configure timezone, date formats, and regional preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={generalForm.handleSubmit(onGeneralSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="defaultTimezone">Default Timezone</Label>
                        <Select 
                          value={generalForm.watch("defaultTimezone")}
                          onValueChange={(value) => generalForm.setValue("defaultTimezone", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UTC">UTC - Coordinated Universal Time</SelectItem>
                            <SelectItem value="America/New_York">Eastern Time</SelectItem>
                            <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                            <SelectItem value="Europe/London">London Time</SelectItem>
                            <SelectItem value="Asia/Kolkata">India Standard Time</SelectItem>
                            <SelectItem value="Asia/Dubai">UAE Time</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="dateFormat">Date Format</Label>
                        <Select 
                          value={generalForm.watch("dateFormat")}
                          onValueChange={(value) => generalForm.setValue("dateFormat", value as "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD")}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select date format" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (US)</SelectItem>
                            <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (EU)</SelectItem>
                            <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="numberFormat">Number Format</Label>
                        <Select 
                          value={generalForm.watch("numberFormat")}
                          onValueChange={(value) => generalForm.setValue("numberFormat", value as "US" | "EU" | "IN")}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select number format" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="US">US (1,234.56)</SelectItem>
                            <SelectItem value="EU">EU (1.234,56)</SelectItem>
                            <SelectItem value="IN">IN (1,23,456.78)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-between">
                      <Button type="button" variant="outline" onClick={() => resetForm("general")}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset
                      </Button>
                      <Button type="submit" disabled={updateSettingsMutation.isPending}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Regions & SLAs Tab */}
            <TabsContent value="regions">
              <div className="space-y-6">
                {/* Existing Regions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Regions & SLA Management</CardTitle>
                    <CardDescription>
                      Configure operational regions with specific SLA targets and restock buffers
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {regions?.length > 0 ? (
                        regions.map((region: any) => (
                          <div key={region.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-4">
                              <Badge variant={region.isActive ? "default" : "secondary"}>
                                {region.code}
                              </Badge>
                              <div>
                                <h4 className="font-medium">{region.name}</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  SLA: {region.slaHours}h • Buffer: {region.restockBufferPercentage}%
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteRegionMutation.mutate(region.id)}
                              disabled={deleteRegionMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                          No regions configured yet. Add your first region below.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Add New Region */}
                <Card>
                  <CardHeader>
                    <CardTitle>Add New Region</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={regionForm.handleSubmit(onRegionSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="regionName">Region Name</Label>
                          <Input
                            id="regionName"
                            {...regionForm.register("name")}
                            placeholder="e.g., United Arab Emirates"
                          />
                          {regionForm.formState.errors.name && (
                            <p className="text-sm text-red-500 mt-1">
                              {regionForm.formState.errors.name.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="regionCode">Region Code</Label>
                          <Input
                            id="regionCode"
                            {...regionForm.register("code")}
                            placeholder="e.g., UAE"
                          />
                          {regionForm.formState.errors.code && (
                            <p className="text-sm text-red-500 mt-1">
                              {regionForm.formState.errors.code.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="slaHours">SLA Hours</Label>
                          <Input
                            id="slaHours"
                            type="number"
                            {...regionForm.register("slaHours", { valueAsNumber: true })}
                            placeholder="24"
                          />
                          {regionForm.formState.errors.slaHours && (
                            <p className="text-sm text-red-500 mt-1">
                              {regionForm.formState.errors.slaHours.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="restockBuffer">Restock Buffer %</Label>
                          <Input
                            id="restockBuffer"
                            type="number"
                            {...regionForm.register("restockBufferPercentage", { valueAsNumber: true })}
                            placeholder="20"
                          />
                          {regionForm.formState.errors.restockBufferPercentage && (
                            <p className="text-sm text-red-500 mt-1">
                              {regionForm.formState.errors.restockBufferPercentage.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="isActive"
                          checked={regionForm.watch("isActive")}
                          onCheckedChange={(checked) => regionForm.setValue("isActive", checked)}
                        />
                        <Label htmlFor="isActive">Active Region</Label>
                      </div>

                      <div className="flex justify-between">
                        <Button type="button" variant="outline" onClick={() => resetForm("region")}>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Reset
                        </Button>
                        <Button type="submit" disabled={createRegionMutation.isPending}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Region
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Settings</CardTitle>
                  <CardDescription>
                    Configure how and when you receive notifications from the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="dailyDigest">Daily Digest</Label>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Receive a daily summary of important activities
                          </p>
                        </div>
                        <Switch
                          id="dailyDigest"
                          checked={notificationForm.watch("dailyDigestEnabled") === "true"}
                          onCheckedChange={(checked) => 
                            notificationForm.setValue("dailyDigestEnabled", checked ? "true" : "false")
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor="digestTime">Digest Time</Label>
                        <Input
                          id="digestTime"
                          type="time"
                          {...notificationForm.register("digestTime")}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="alerts">System Alerts</Label>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Receive real-time alerts for critical events
                          </p>
                        </div>
                        <Switch
                          id="alerts"
                          checked={notificationForm.watch("alertsEnabled") === "true"}
                          onCheckedChange={(checked) => 
                            notificationForm.setValue("alertsEnabled", checked ? "true" : "false")
                          }
                        />
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">SMTP Configuration</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="smtpHost">SMTP Host</Label>
                            <Input
                              id="smtpHost"
                              {...notificationForm.register("smtpHost")}
                              placeholder="smtp.gmail.com"
                            />
                          </div>
                          <div>
                            <Label htmlFor="smtpPort">SMTP Port</Label>
                            <Input
                              id="smtpPort"
                              type="number"
                              {...notificationForm.register("smtpPort", { valueAsNumber: true })}
                              placeholder="587"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="smtpUser">SMTP Username</Label>
                            <Input
                              id="smtpUser"
                              {...notificationForm.register("smtpUser")}
                              placeholder="your@email.com"
                            />
                          </div>
                          <div>
                            <Label htmlFor="smtpPassword">SMTP Password</Label>
                            <Input
                              id="smtpPassword"
                              type="password"
                              {...notificationForm.register("smtpPassword")}
                              placeholder="••••••••"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-between">
                      <Button type="button" variant="outline" onClick={() => resetForm("notification")}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset
                      </Button>
                      <Button type="submit" disabled={updateNotificationsMutation.isPending}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Forecasting Tab */}
            <TabsContent value="forecasting">
              <div className="space-y-6">
                {/* General Forecast Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>General Forecasting Settings</CardTitle>
                    <CardDescription>
                      Configure default settings for demand forecasting and reorder suggestions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={forecastForm.handleSubmit(onForecastSubmit)} className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="defaultMethod">Default Forecasting Method</Label>
                          <Select 
                            value={forecastForm.watch("defaultMethod")}
                            onValueChange={(value) => forecastForm.setValue("defaultMethod", value as "moving_avg" | "ewma")}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="moving_avg">Moving Average</SelectItem>
                              <SelectItem value="ewma">Exponential Weighted Moving Average</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Method used for new products without specific settings
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="defaultHorizon">Default Forecast Horizon</Label>
                          <Select 
                            value={forecastForm.watch("defaultHorizon")}
                            onValueChange={(value) => forecastForm.setValue("defaultHorizon", value as "30" | "60" | "90")}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select horizon" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="30">30 Days</SelectItem>
                              <SelectItem value="60">60 Days</SelectItem>
                              <SelectItem value="90">90 Days</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Default time period for demand forecasting
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="minHistoryDays">Minimum History Days</Label>
                          <Input
                            id="minHistoryDays"
                            type="number"
                            {...forecastForm.register("minHistoryDays", { valueAsNumber: true })}
                            placeholder="30"
                          />
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Minimum sales history required for forecasting (7-365 days)
                          </p>
                          {forecastForm.formState.errors.minHistoryDays && (
                            <p className="text-sm text-red-500 mt-1">
                              {forecastForm.formState.errors.minHistoryDays.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="defaultSafetyStock">Default Safety Stock</Label>
                          <Input
                            id="defaultSafetyStock"
                            type="number"
                            {...forecastForm.register("defaultSafetyStock", { valueAsNumber: true })}
                            placeholder="50"
                          />
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Default safety stock level for reorder calculations
                          </p>
                          {forecastForm.formState.errors.defaultSafetyStock && (
                            <p className="text-sm text-red-500 mt-1">
                              {forecastForm.formState.errors.defaultSafetyStock.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="defaultLeadTimeDays">Default Lead Time (Days)</Label>
                        <Input
                          id="defaultLeadTimeDays"
                          type="number"
                          {...forecastForm.register("defaultLeadTimeDays", { valueAsNumber: true })}
                          placeholder="14"
                          className="max-w-xs"
                        />
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Default supplier lead time for reorder suggestions (1-365 days)
                        </p>
                        {forecastForm.formState.errors.defaultLeadTimeDays && (
                          <p className="text-sm text-red-500 mt-1">
                            {forecastForm.formState.errors.defaultLeadTimeDays.message}
                          </p>
                        )}
                      </div>

                      <Separator />

                      <div className="flex justify-between">
                        <Button type="button" variant="outline" onClick={() => resetForm("forecast")}>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Reset
                        </Button>
                        <Button type="submit">
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* Performance & Caching Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>Performance & Caching</CardTitle>
                    <CardDescription>
                      Configure auto-refresh and caching behavior for optimal performance
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={forecastForm.handleSubmit(onForecastSubmit)} className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="autoRefreshEnabled">Auto Refresh</Label>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Automatically refresh stale forecasts in background
                            </p>
                          </div>
                          <Switch
                            id="autoRefreshEnabled"
                            checked={forecastForm.watch("autoRefreshEnabled")}
                            onCheckedChange={(checked) => forecastForm.setValue("autoRefreshEnabled", checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="priorityProductsEnabled">Priority Products</Label>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Give higher-value products priority for refresh
                            </p>
                          </div>
                          <Switch
                            id="priorityProductsEnabled"
                            checked={forecastForm.watch("priorityProductsEnabled")}
                            onCheckedChange={(checked) => forecastForm.setValue("priorityProductsEnabled", checked)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <Label htmlFor="autoRefreshIntervalMinutes">Auto Refresh Interval (Minutes)</Label>
                          <Input
                            id="autoRefreshIntervalMinutes"
                            type="number"
                            {...forecastForm.register("autoRefreshIntervalMinutes", { valueAsNumber: true })}
                            placeholder="360"
                            disabled={!forecastForm.watch("autoRefreshEnabled")}
                          />
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            How often to check for stale forecasts (5-1440 minutes)
                          </p>
                          {forecastForm.formState.errors.autoRefreshIntervalMinutes && (
                            <p className="text-sm text-red-500 mt-1">
                              {forecastForm.formState.errors.autoRefreshIntervalMinutes.message}
                            </p>
                          )}
                        </div>

                        <div>
                          <Label htmlFor="cacheStaleHours">Cache Stale After (Hours)</Label>
                          <Input
                            id="cacheStaleHours"
                            type="number"
                            {...forecastForm.register("cacheStaleHours", { valueAsNumber: true })}
                            placeholder="6"
                          />
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Mark forecasts as stale after this time (1-168 hours)
                          </p>
                          {forecastForm.formState.errors.cacheStaleHours && (
                            <p className="text-sm text-red-500 mt-1">
                              {forecastForm.formState.errors.cacheStaleHours.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="maxCacheEntries">Maximum Cache Entries</Label>
                        <Input
                          id="maxCacheEntries"
                          type="number"
                          {...forecastForm.register("maxCacheEntries", { valueAsNumber: true })}
                          placeholder="1000"
                          className="max-w-xs"
                        />
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Maximum number of forecasts to keep in cache (50-10000)
                        </p>
                        {forecastForm.formState.errors.maxCacheEntries && (
                          <p className="text-sm text-red-500 mt-1">
                            {forecastForm.formState.errors.maxCacheEntries.message}
                          </p>
                        )}
                      </div>

                      <Separator />

                      <div className="flex justify-between">
                        <Button type="button" variant="outline" onClick={() => resetForm("forecast")}>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Reset
                        </Button>
                        <Button type="submit">
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}