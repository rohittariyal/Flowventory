import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Settings, Globe, MapPin, Bell } from "lucide-react";

const SETTINGS_KEY = "flowventory:settings";

// Schemas
const workspaceSchema = z.object({
  orgName: z.string().min(1, "Organization name is required"),
  logoUrl: z.string().url().optional().or(z.literal("")),
  defaultCurrency: z.enum(["USD", "GBP", "AED", "SGD"]),
  defaultTimezone: z.enum(["UTC", "Europe/London", "Asia/Dubai", "Asia/Singapore", "America/New_York"]),
  dateFormat: z.string().min(1),
  numberFormat: z.string().min(1),
});

const regionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Region name is required"),
  slaDays: z.number().min(0, "SLA days must be 0 or greater"),
  restockBufferPct: z.number().min(0).max(100, "Restock buffer must be between 0 and 100"),
  currency: z.string().optional(),
  timezone: z.string().optional(),
});

const notificationsSchema = z.object({
  dailyDigestEnabled: z.boolean(),
  smtpHost: z.string(),
  smtpPort: z.number().min(1, "SMTP port must be positive"),
  username: z.string(),
  password: z.string(),
});

type WorkspaceSettings = z.infer<typeof workspaceSchema>;
type Region = z.infer<typeof regionSchema>;
type NotificationSettings = z.infer<typeof notificationsSchema>;

interface Settings {
  workspace: WorkspaceSettings;
  regions: Region[];
  notifications: NotificationSettings;
}

const defaultSettings: Settings = {
  workspace: {
    orgName: "Flowventory",
    logoUrl: "",
    defaultCurrency: "USD",
    defaultTimezone: "UTC",
    dateFormat: "YYYY-MM-DD",
    numberFormat: "1,234.56",
  },
  regions: [
    {
      id: "uae",
      name: "UAE",
      slaDays: 7,
      restockBufferPct: 10,
    },
  ],
  notifications: {
    dailyDigestEnabled: false,
    smtpHost: "",
    smtpPort: 587,
    username: "",
    password: "",
  },
};

export default function SettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [editingRegion, setEditingRegion] = useState<Region | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error("Failed to parse settings:", error);
      }
    }
  }, []);

  // Forms
  const workspaceForm = useForm<WorkspaceSettings>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: settings.workspace,
  });

  const regionForm = useForm<Region>({
    resolver: zodResolver(regionSchema),
    defaultValues: {
      id: "",
      name: "",
      slaDays: 7,
      restockBufferPct: 10,
    },
  });

  const notificationsForm = useForm<NotificationSettings>({
    resolver: zodResolver(notificationsSchema),
    defaultValues: settings.notifications,
  });

  // Update form defaults when settings change
  useEffect(() => {
    workspaceForm.reset(settings.workspace);
    notificationsForm.reset(settings.notifications);
  }, [settings, workspaceForm, notificationsForm]);

  const saveToLocalStorage = (newSettings: Settings) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    setSettings(newSettings);
    toast({
      title: "Settings saved",
      description: "Your settings have been saved successfully.",
    });
  };

  const onWorkspaceSubmit = (data: WorkspaceSettings) => {
    try {
      const newSettings = { ...settings, workspace: data };
      saveToLocalStorage(newSettings);
    } catch (error) {
      toast({
        title: "Invalid fields",
        description: "Please check your input and try again.",
        variant: "destructive",
      });
    }
  };

  const onNotificationsSubmit = (data: NotificationSettings) => {
    try {
      const newSettings = { ...settings, notifications: data };
      saveToLocalStorage(newSettings);
      setShowPassword(false); // Hide password after save
    } catch (error) {
      toast({
        title: "Invalid fields",
        description: "Please check your input and try again.",
        variant: "destructive",
      });
    }
  };

  const onRegionSubmit = (data: Region) => {
    try {
      let newRegions;
      if (editingRegion) {
        newRegions = settings.regions.map((r) =>
          r.id === editingRegion.id ? { ...data, id: editingRegion.id } : r
        );
      } else {
        const newRegion = { ...data, id: `region-${Date.now()}` };
        newRegions = [...settings.regions, newRegion];
      }
      
      const newSettings = { ...settings, regions: newRegions };
      saveToLocalStorage(newSettings);
      setEditingRegion(null);
      regionForm.reset({
        id: "",
        name: "",
        slaDays: 7,
        restockBufferPct: 10,
      });
    } catch (error) {
      toast({
        title: "Invalid fields",
        description: "Please check your input and try again.",
        variant: "destructive",
      });
    }
  };

  const deleteRegion = (regionId: string) => {
    const newRegions = settings.regions.filter((r) => r.id !== regionId);
    const newSettings = { ...settings, regions: newRegions };
    saveToLocalStorage(newSettings);
  };

  const editRegion = (region: Region) => {
    setEditingRegion(region);
    regionForm.reset(region);
  };

  const resetWorkspace = () => {
    workspaceForm.reset(settings.workspace);
  };

  const resetNotifications = () => {
    notificationsForm.reset(settings.notifications);
    setShowPassword(false);
  };

  const resetRegions = () => {
    setEditingRegion(null);
    regionForm.reset({
      id: "",
      name: "",
      slaDays: 7,
      restockBufferPct: 10,
    });
  };

  const tabs = [
    { id: "general", label: "General", icon: Settings },
    { id: "localization", label: "Localization", icon: Globe },
    { id: "regions", label: "Regions & SLAs", icon: MapPin },
    { id: "notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Configure your workspace preferences and operational settings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Tabs */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-4">
              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 text-left rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                          : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Right Content - Forms */}
        <div className="lg:col-span-3">
          {activeTab === "general" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>General Settings</span>
                </CardTitle>
                <CardDescription>
                  Basic workspace configuration and branding
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={workspaceForm.handleSubmit(onWorkspaceSubmit)} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="orgName">Organization Name</Label>
                      <Input
                        id="orgName"
                        {...workspaceForm.register("orgName")}
                        placeholder="Enter organization name"
                      />
                      {workspaceForm.formState.errors.orgName && (
                        <p className="text-sm text-red-500 mt-1">
                          {workspaceForm.formState.errors.orgName.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="logoUrl">Logo URL</Label>
                      <Input
                        id="logoUrl"
                        {...workspaceForm.register("logoUrl")}
                        placeholder="https://example.com/logo.png"
                      />
                      {workspaceForm.watch("logoUrl") && (
                        <div className="mt-2">
                          <img
                            src={workspaceForm.watch("logoUrl")}
                            alt="Logo preview"
                            className="h-12 w-auto"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <Button type="submit">Save</Button>
                    <Button type="button" variant="outline" onClick={resetWorkspace}>
                      Reset
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {activeTab === "localization" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="h-5 w-5" />
                  <span>Localization</span>
                </CardTitle>
                <CardDescription>
                  Configure regional preferences and formats
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={workspaceForm.handleSubmit(onWorkspaceSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="defaultCurrency">Default Currency</Label>
                      <Select
                        value={workspaceForm.watch("defaultCurrency")}
                        onValueChange={(value) => 
                          workspaceForm.setValue("defaultCurrency", value as "USD" | "GBP" | "AED" | "SGD")
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="GBP">GBP - British Pound</SelectItem>
                          <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                          <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="defaultTimezone">Default Timezone</Label>
                      <Select
                        value={workspaceForm.watch("defaultTimezone")}
                        onValueChange={(value) => workspaceForm.setValue("defaultTimezone", value as any)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UTC">UTC</SelectItem>
                          <SelectItem value="Europe/London">Europe/London</SelectItem>
                          <SelectItem value="Asia/Dubai">Asia/Dubai</SelectItem>
                          <SelectItem value="Asia/Singapore">Asia/Singapore</SelectItem>
                          <SelectItem value="America/New_York">America/New_York</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="dateFormat">Date Format</Label>
                      <Input
                        id="dateFormat"
                        {...workspaceForm.register("dateFormat")}
                        placeholder="YYYY-MM-DD"
                      />
                    </div>

                    <div>
                      <Label htmlFor="numberFormat">Number Format</Label>
                      <Input
                        id="numberFormat"
                        {...workspaceForm.register("numberFormat")}
                        placeholder="1,234.56"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <Button type="submit">Save</Button>
                    <Button type="button" variant="outline" onClick={resetWorkspace}>
                      Reset
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {activeTab === "regions" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5" />
                    <span>Regions & SLAs</span>
                  </CardTitle>
                  <CardDescription>
                    Configure operational regions with specific SLA targets and restock buffers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {settings.regions.length > 0 ? (
                      settings.regions.map((region) => (
                        <div key={region.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <Badge variant="default">{region.name}</Badge>
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              <span className="mr-4">SLA: {region.slaDays} days</span>
                              <span>Buffer: {region.restockBufferPct}%</span>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => editRegion(region)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteRegion(region.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                        No regions configured yet
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Plus className="h-4 w-4" />
                    <span>{editingRegion ? "Edit Region" : "Add New Region"}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={regionForm.handleSubmit(onRegionSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="regionName">Region Name</Label>
                        <Input
                          id="regionName"
                          {...regionForm.register("name")}
                          placeholder="Enter region name"
                        />
                        {regionForm.formState.errors.name && (
                          <p className="text-sm text-red-500 mt-1">
                            {regionForm.formState.errors.name.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="slaDays">SLA Days</Label>
                        <Input
                          id="slaDays"
                          type="number"
                          {...regionForm.register("slaDays", { valueAsNumber: true })}
                          placeholder="7"
                        />
                        {regionForm.formState.errors.slaDays && (
                          <p className="text-sm text-red-500 mt-1">
                            {regionForm.formState.errors.slaDays.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="restockBufferPct">Restock Buffer %</Label>
                        <Input
                          id="restockBufferPct"
                          type="number"
                          {...regionForm.register("restockBufferPct", { valueAsNumber: true })}
                          placeholder="10"
                        />
                        {regionForm.formState.errors.restockBufferPct && (
                          <p className="text-sm text-red-500 mt-1">
                            {regionForm.formState.errors.restockBufferPct.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex space-x-4">
                      <Button type="submit">
                        {editingRegion ? "Update Region" : "Add Region"}
                      </Button>
                      <Button type="button" variant="outline" onClick={resetRegions}>
                        Reset
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>Notifications</span>
                </CardTitle>
                <CardDescription>
                  Configure notification preferences and email settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={notificationsForm.handleSubmit(onNotificationsSubmit)} className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Daily Digest</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Receive daily summary emails
                        </p>
                      </div>
                      <Switch
                        checked={notificationsForm.watch("dailyDigestEnabled")}
                        onCheckedChange={(checked) => 
                          notificationsForm.setValue("dailyDigestEnabled", checked)
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="smtpHost">SMTP Host</Label>
                        <Input
                          id="smtpHost"
                          {...notificationsForm.register("smtpHost")}
                          placeholder="smtp.gmail.com"
                        />
                      </div>

                      <div>
                        <Label htmlFor="smtpPort">SMTP Port</Label>
                        <Input
                          id="smtpPort"
                          type="number"
                          {...notificationsForm.register("smtpPort", { valueAsNumber: true })}
                          placeholder="587"
                        />
                        {notificationsForm.formState.errors.smtpPort && (
                          <p className="text-sm text-red-500 mt-1">
                            {notificationsForm.formState.errors.smtpPort.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          {...notificationsForm.register("username")}
                          placeholder="your-email@example.com"
                        />
                      </div>

                      <div>
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          {...notificationsForm.register("password")}
                          placeholder={showPassword ? "Enter password" : "••••••••"}
                          onFocus={() => setShowPassword(true)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <Button type="submit">Save</Button>
                    <Button type="button" variant="outline" onClick={resetNotifications}>
                      Reset
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}