import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, Globe, Clock, AlertTriangle } from "lucide-react";
import type { WorkspaceSettings } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

const workspaceSettingsSchema = z.object({
  baseCurrency: z.enum(["INR", "USD", "GBP", "AED", "SGD"]),
  timezone: z.string().min(1, "Timezone is required"),
  regionsEnabled: z.array(z.string()).default([]),
  slaDefaults: z.object({
    RESTOCK: z.number().min(1, "Must be at least 1 hour"),
    RETRY_SYNC: z.number().min(1, "Must be at least 1 hour"),
    RECONCILE: z.number().min(1, "Must be at least 1 hour"),
  }),
});

type WorkspaceSettingsForm = z.infer<typeof workspaceSettingsSchema>;

const CURRENCY_OPTIONS = [
  { value: "INR", label: "₹ Indian Rupee" },
  { value: "USD", label: "$ US Dollar" },
  { value: "GBP", label: "£ British Pound" },
  { value: "AED", label: "د.إ UAE Dirham" },
  { value: "SGD", label: "S$ Singapore Dollar" },
];

const TIMEZONE_OPTIONS = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "America/New_York", label: "America/New_York (EST)" },
  { value: "Europe/London", label: "Europe/London (GMT)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEDT)" },
];

const REGION_OPTIONS = [
  { value: "IN", label: "India" },
  { value: "UK", label: "United Kingdom" },
  { value: "US", label: "United States" },
  { value: "UAE", label: "United Arab Emirates" },
  { value: "SG", label: "Singapore" },
  { value: "EU", label: "European Union" },
  { value: "GLOBAL", label: "Global" },
];

export default function WorkspaceSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);

  const { data: settings, isLoading } = useQuery<WorkspaceSettings>({
    queryKey: ["/api/workspace/me"],
  });

  const form = useForm<WorkspaceSettingsForm>({
    resolver: zodResolver(workspaceSettingsSchema),
    defaultValues: {
      baseCurrency: "INR",
      timezone: "Asia/Kolkata",
      regionsEnabled: [],
      slaDefaults: {
        RESTOCK: 24,
        RETRY_SYNC: 2,
        RECONCILE: 72,
      },
    },
  });

  // Update form when data loads
  useEffect(() => {
    if (settings) {
      form.reset({
        baseCurrency: settings.baseCurrency,
        timezone: settings.timezone,
        regionsEnabled: settings.regionsEnabled,
        slaDefaults: settings.slaDefaults as any,
      });
      setSelectedRegions(settings.regionsEnabled);
    }
  }, [settings, form]);

  const updateSettingsMutation = useMutation({
    mutationFn: (data: Partial<WorkspaceSettings>) =>
      apiRequest("/api/workspace", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workspace/me"] });
      toast({
        title: "Settings Updated",
        description: "Workspace settings have been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update workspace settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: WorkspaceSettingsForm) => {
    updateSettingsMutation.mutate({
      ...data,
      regionsEnabled: selectedRegions,
    });
  };

  const toggleRegion = (regionValue: string) => {
    setSelectedRegions(prev => 
      prev.includes(regionValue)
        ? prev.filter(r => r !== regionValue)
        : [...prev, regionValue]
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6 max-w-4xl">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Workspace Settings
        </h1>
        <p className="text-muted-foreground">
          Configure global settings for your workspace
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Regional Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="baseCurrency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CURRENCY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timezone</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIMEZONE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Enabled Regions</label>
                <div className="flex flex-wrap gap-2">
                  {REGION_OPTIONS.map((region) => (
                    <Badge
                      key={region.value}
                      variant={selectedRegions.includes(region.value) ? "default" : "secondary"}
                      className="cursor-pointer"
                      onClick={() => toggleRegion(region.value)}
                    >
                      {region.label}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Click to enable/disable regions for your operations
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                SLA Defaults
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Default time limits (in hours) for different task types
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="slaDefaults.RESTOCK"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Restock Tasks</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slaDefaults.RETRY_SYNC"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Retry Sync Tasks</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slaDefaults.RECONCILE"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reconcile Tasks</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={updateSettingsMutation.isPending}
              className="min-w-32"
            >
              {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}