import React, { useState } from "react";
import {
  Save,
  Bell,
  Shield,
  User,
  Globe,
  Moon,
  Sun,
  Mail,
  Volume2,
  Vibrate,
  Download,
  Trash2,
  Key,
  Database,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuthStore } from "@/store/auth.store";
import { useNotifications } from "@/hooks/useNotifications";
import { useUpdatePreferences } from "@/hooks/useAuth";
import { useUIStore } from "@/store/ui.store";
import type { NotificationPreferences } from "@/types/api.types";

// Profile form schema

export const SettingsPage: React.FC = () => {
  const { admin } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();
  const {
    isSupported,
    // Remove properties that don't exist in useNotifications
  } = useNotifications();

  const updatePreferences = useUpdatePreferences();
  const [activeTab, setActiveTab] = useState("profile");
  const [isTestingNotification, setIsTestingNotification] = useState(false);

  // Local state for notification preferences
  const [notificationPreferences, setNotificationPreferences] = useState({
    pushEnabled: false,
    soundEnabled: true,
    vibrationEnabled: true,
    emailEnabled: true,
  });

  // Handle notification toggle
  const handleNotificationToggle = async (checked: boolean) => {
    setNotificationPreferences((prev) => ({
      ...prev,
      pushEnabled: checked,
    }));

    if (checked) {
      // You'll need to implement subscribeToPush function
      toast.info("Push notifications would be enabled here");
    } else {
      // You'll need to implement unsubscribeFromPush function
      toast.info("Push notifications would be disabled here");
    }
  };

  // Handle test notification
  const handleTestNotification = async () => {
    setIsTestingNotification(true);
    try {
      // You'll need to implement sendTestNotification function
      toast.success("Test notification would be sent here");
    } catch {
      toast.error("Failed to send test notification");
    } finally {
      setIsTestingNotification(false);
    }
  };

  // Handle export data
  const handleExportData = () => {
    toast.info("Export feature coming soon");
  };

  // Handle clear data
  const handleClearData = () => {
    if (
      confirm(
        "Are you sure you want to clear all local data? This will log you out."
      )
    ) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // Handle preferences update
  const handlePreferencesUpdate = async () => {
    try {
      const preferences: NotificationPreferences = {
        email: notificationPreferences.emailEnabled,
        push: notificationPreferences.pushEnabled,
        sound: notificationPreferences.soundEnabled,
        vibration: notificationPreferences.vibrationEnabled,
      };

      await updatePreferences.mutateAsync(preferences);
      toast.success("Preferences updated successfully");
    } catch {
      // Error is handled in mutation
      toast.error("Failed to update preferences");
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Settings
          </h1>
          <p className="text-gray-600 mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toggleTheme()}>
            {theme === "light" ? (
              <Moon className="h-4 w-4 mr-2" />
            ) : (
              <Sun className="h-4 w-4 mr-2" />
            )}
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </Button>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="advanced">
            <Globe className="h-4 w-4 mr-2" />
            Advanced
          </TabsTrigger>
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your account profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={admin?.username || ""}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">
                    Username cannot be changed
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={admin?.email || ""}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">
                    Contact admin to change email
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value={admin?.role?.replace("_", " ") || ""}
                  disabled
                  className="bg-gray-50 capitalize"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="joined">Member Since</Label>
                <Input
                  id="joined"
                  value={
                    admin?.createdAt
                      ? new Date(admin.createdAt).toLocaleDateString()
                      : "N/A"
                  }
                  disabled
                  className="bg-gray-50"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>
                Update how you receive notifications and alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Preferred Contact Method</Label>
                  <p className="text-sm text-gray-500">
                    Choose how you want to receive important notifications
                  </p>
                </div>
                <Select defaultValue="email">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="push">Push</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Notification Schedule</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reminderTime" className="text-sm">
                      Daily Reminder Time
                    </Label>
                    <Select defaultValue="9">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="8">8:00 AM</SelectItem>
                        <SelectItem value="9">9:00 AM</SelectItem>
                        <SelectItem value="10">10:00 AM</SelectItem>
                        <SelectItem value="11">11:00 AM</SelectItem>
                        <SelectItem value="12">12:00 PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weekendReminders" className="text-sm">
                      Weekend Reminders
                    </Label>
                    <Select defaultValue="enabled">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="enabled">Enabled</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Push Notifications</CardTitle>
              <CardDescription>
                Control how you receive push notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isSupported ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Not Supported</AlertTitle>
                  <AlertDescription>
                    Push notifications are not supported in your browser. Try
                    using Chrome, Firefox, or Edge.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">
                        Enable Push Notifications
                      </Label>
                      <p className="text-sm text-gray-500">
                        Receive notifications even when the app is closed
                      </p>
                    </div>
                    <Switch
                      checked={notificationPreferences.pushEnabled}
                      onCheckedChange={handleNotificationToggle}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">Notification Types</h4>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Bell className="h-4 w-4 text-gray-500" />
                          <div>
                            <Label>Payment Reminders</Label>
                            <p className="text-sm text-gray-500">
                              Notify about upcoming and overdue payments
                            </p>
                          </div>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <div>
                            <Label>Payment Receipts</Label>
                            <p className="text-sm text-gray-500">
                              Notify when payments are received
                            </p>
                          </div>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-4 w-4 text-gray-500" />
                          <div>
                            <Label>System Alerts</Label>
                            <p className="text-sm text-gray-500">
                              Important system updates and maintenance
                            </p>
                          </div>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="font-medium">Notification Preferences</h4>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Volume2 className="h-4 w-4 text-gray-500" />
                          <div>
                            <Label>Sound</Label>
                            <p className="text-sm text-gray-500">
                              Play sound for notifications
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={notificationPreferences.soundEnabled}
                          onCheckedChange={(checked) =>
                            setNotificationPreferences((prev) => ({
                              ...prev,
                              soundEnabled: checked,
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Vibrate className="h-4 w-4 text-gray-500" />
                          <div>
                            <Label>Vibration</Label>
                            <p className="text-sm text-gray-500">
                              Vibrate device for notifications
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={notificationPreferences.vibrationEnabled}
                          onCheckedChange={(checked) =>
                            setNotificationPreferences((prev) => ({
                              ...prev,
                              vibrationEnabled: checked,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={handleTestNotification}
                disabled={
                  !isSupported ||
                  !notificationPreferences.pushEnabled ||
                  isTestingNotification
                }
              >
                <Bell className="h-4 w-4 mr-2" />
                {isTestingNotification ? "Sending..." : "Test Notification"}
              </Button>

              <Button onClick={handlePreferencesUpdate}>
                <Save className="h-4 w-4 mr-2" />
                Save Preferences
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>
                Configure email notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">
                    Enable Email Notifications
                  </Label>
                  <p className="text-sm text-gray-500">
                    Receive important updates via email
                  </p>
                </div>
                <Switch
                  checked={notificationPreferences.emailEnabled}
                  onCheckedChange={(checked) =>
                    setNotificationPreferences((prev) => ({
                      ...prev,
                      emailEnabled: checked,
                    }))
                  }
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Email Frequency</Label>
                <Select defaultValue="daily">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">Instant</SelectItem>
                    <SelectItem value="daily">Daily Digest</SelectItem>
                    <SelectItem value="weekly">Weekly Summary</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Choose how often you want to receive email notifications
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="Enter current password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password"
                />
                <p className="text-xs text-gray-500">
                  Password must be at least 6 characters long
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button>
                <Key className="h-4 w-4 mr-2" />
                Update Password
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security & Privacy</CardTitle>
              <CardDescription>
                Manage your security and privacy settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Two-Factor Authentication</Label>
                  <p className="text-sm text-gray-500">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <Switch />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Login Notifications</Label>
                  <p className="text-sm text-gray-500">
                    Get notified when someone logs into your account
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Auto-Logout</Label>
                  <p className="text-sm text-gray-500">
                    Automatically logout after period of inactivity
                  </p>
                </div>
                <Select defaultValue="30">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertTitle>Security Tips</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-4 space-y-1 mt-2">
                <li>Use a strong, unique password</li>
                <li>Enable two-factor authentication</li>
                <li>Never share your login credentials</li>
                <li>Log out from shared devices</li>
                <li>Regularly review login activity</li>
              </ul>
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* Advanced Settings */}
        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>
                Manage your application data and exports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium">Export Data</h4>
                <p className="text-sm text-gray-500">
                  Download your data for backup or analysis
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={handleExportData}>
                    <Download className="h-4 w-4 mr-2" />
                    Export All Data
                  </Button>
                  <Button variant="outline">
                    <Database className="h-4 w-4 mr-2" />
                    Export Student Data
                  </Button>
                  <Button variant="outline">
                    <Database className="h-4 w-4 mr-2" />
                    Export Payment Data
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium">Clear Data</h4>
                <p className="text-sm text-gray-500">
                  Clear all local data and cache. This will log you out.
                </p>
                <Button variant="destructive" onClick={handleClearData}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All Data
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Application Settings</CardTitle>
              <CardDescription>
                Advanced application configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Offline Mode</Label>
                  <p className="text-sm text-gray-500">
                    Enable offline data access and sync
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Auto-Refresh</Label>
                  <p className="text-sm text-gray-500">
                    Automatically refresh dashboard data
                  </p>
                </div>
                <Select defaultValue="5">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 minute</SelectItem>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Data Sync</Label>
                  <p className="text-sm text-gray-500">
                    Sync data in background
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
              <CardDescription>
                Application information and version
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">App Version</span>
                  <span className="font-medium">1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Build Date</span>
                  <span className="font-medium">
                    {new Date().toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">API Version</span>
                  <span className="font-medium">v1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Database</span>
                  <span className="font-medium">MongoDB</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <h4 className="font-medium">Support</h4>
                <p className="text-sm text-gray-500">
                  For technical support or feature requests, please contact:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-sm">
                  <li>Email: support@library.com</li>
                  <li>Phone: +91 9876543210</li>
                  <li>Hours: Mon-Fri, 9 AM - 6 PM</li>
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                Check for Updates
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
