import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiError, NotificationPreferences } from "@/types";
import { Mail, MessageSquare, Smartphone, Save, RefreshCw } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminApi } from "@/api/admin.api";
import { useToast } from "@/hooks/useToast";

export const Settings: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: {
      paymentReminder: true,
      feeAlerts: true,
      slotUpdates: true,
      newsletter: false,
    },
    sms: {
      paymentReminder: true,
      feeAlerts: true,
      slotUpdates: false,
    },
    push: {
      paymentReminder: true,
      feeAlerts: true,
      slotUpdates: true,
    },
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch notification preferences
  const { isLoading: isLoadingPrefs } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: async () => {
      const { data, error } = await adminApi.getNotificationPreferences();
      if (error) throw error;
      if (data?.data) {
        setPreferences(data.data);
      }
      return data?.data;
    },
  });

  // Update preferences mutation
  const { mutate: updatePreferences, isPending: isUpdating } = useMutation({
    mutationFn: async () => {
      const { data, error } =
        await adminApi.updateNotificationPreferences(preferences);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      toast.success("Preferences updated successfully");
      setHasChanges(false);
    },
    onError: (error: ApiError) => {
      toast.error(error?.message || "Failed to update preferences");
    },
  });

  const handleToggle = (
    channel: keyof NotificationPreferences,
    key: string,
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [key]: !prev[channel][key as keyof (typeof prev)[typeof channel]],
      },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updatePreferences();
  };

  const handleReset = () => {
    queryClient.refetchQueries({ queryKey: ["notification-preferences"] });
    setHasChanges(false);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your notification preferences and app settings
        </p>
      </div>

      {/* Notification Preferences */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>
              Choose how you want to receive notifications
            </CardDescription>
          </div>
          {hasChanges && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isUpdating}
              >
                Reset
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoadingPrefs ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs defaultValue="email" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span className="hidden sm:inline">Email</span>
                </TabsTrigger>
                <TabsTrigger value="sms" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span className="hidden sm:inline">SMS</span>
                </TabsTrigger>
                <TabsTrigger value="push" className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  <span className="hidden sm:inline">Push</span>
                </TabsTrigger>
              </TabsList>

              {/* Email Notifications */}
              <TabsContent value="email" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Payment Reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        Get reminded about upcoming payments
                      </p>
                    </div>
                    <Switch
                      checked={preferences.email.paymentReminder}
                      onCheckedChange={() =>
                        handleToggle("email", "paymentReminder")
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div>
                      <Label className="text-base">Fee Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified about fee-related updates
                      </p>
                    </div>
                    <Switch
                      checked={preferences.email.feeAlerts}
                      onCheckedChange={() => handleToggle("email", "feeAlerts")}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div>
                      <Label className="text-base">Slot Updates</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified about slot availability changes
                      </p>
                    </div>
                    <Switch
                      checked={preferences.email.slotUpdates}
                      onCheckedChange={() =>
                        handleToggle("email", "slotUpdates")
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div>
                      <Label className="text-base">Newsletter</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive our monthly newsletter
                      </p>
                    </div>
                    <Switch
                      checked={preferences.email.newsletter}
                      onCheckedChange={() =>
                        handleToggle("email", "newsletter")
                      }
                    />
                  </div>
                </div>
              </TabsContent>

              {/* SMS Notifications */}
              <TabsContent value="sms" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Payment Reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        Get SMS reminders about upcoming payments
                      </p>
                    </div>
                    <Switch
                      checked={preferences.sms.paymentReminder}
                      onCheckedChange={() =>
                        handleToggle("sms", "paymentReminder")
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div>
                      <Label className="text-base">Fee Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Get SMS notifications for fee updates
                      </p>
                    </div>
                    <Switch
                      checked={preferences.sms.feeAlerts}
                      onCheckedChange={() => handleToggle("sms", "feeAlerts")}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div>
                      <Label className="text-base">Slot Updates</Label>
                      <p className="text-sm text-muted-foreground">
                        Get SMS alerts for slot changes
                      </p>
                    </div>
                    <Switch
                      checked={preferences.sms.slotUpdates}
                      onCheckedChange={() => handleToggle("sms", "slotUpdates")}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Push Notifications */}
              <TabsContent value="push" className="space-y-4 mt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Payment Reminders</Label>
                      <p className="text-sm text-muted-foreground">
                        Get push notifications about upcoming payments
                      </p>
                    </div>
                    <Switch
                      checked={preferences.push.paymentReminder}
                      onCheckedChange={() =>
                        handleToggle("push", "paymentReminder")
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div>
                      <Label className="text-base">Fee Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Get push notifications for fee updates
                      </p>
                    </div>
                    <Switch
                      checked={preferences.push.feeAlerts}
                      onCheckedChange={() => handleToggle("push", "feeAlerts")}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t">
                    <div>
                      <Label className="text-base">Slot Updates</Label>
                      <p className="text-sm text-muted-foreground">
                        Get push notifications for slot changes
                      </p>
                    </div>
                    <Switch
                      checked={preferences.push.slotUpdates}
                      onCheckedChange={() =>
                        handleToggle("push", "slotUpdates")
                      }
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* App Settings */}
      <Card>
        <CardHeader>
          <CardTitle>App Settings</CardTitle>
          <CardDescription>Customize your app experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Dark Mode</Label>
              <p className="text-sm text-muted-foreground">Coming soon</p>
            </div>
            <Switch disabled />
          </div>
          <div className="flex items-center justify-between pt-3 border-t">
            <div>
              <Label className="text-base">Analytics Tracking</Label>
              <p className="text-sm text-muted-foreground">
                Help us improve by sharing anonymous usage data
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
