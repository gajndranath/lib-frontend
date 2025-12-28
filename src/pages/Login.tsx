import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, BookOpen, Shield } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { toast } from "sonner";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Update the schema to make remember explicitly required
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  remember: z.boolean(),
});

// Use z.infer to get the type
type LoginFormData = z.infer<typeof loginSchema>;

// Define location state type
interface LocationState {
  from?: string;
}

export const LoginPage: React.FC = () => {
  const { login, isLoggingIn } = useAuth();
  const { subscribeToPush, isSupported } = useNotifications();
  const [showPushPrompt, setShowPushPrompt] = useState(false);

  // Add these hooks
  const navigate = useNavigate();
  const location = useLocation();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data);

      // Show push notification prompt after successful login
      if (isSupported) {
        setShowPushPrompt(true);
      }

      // Get redirect path from location state
      const state = location.state as LocationState;
      const from = state?.from || "/dashboard";
      navigate(from, { replace: true });
    } catch (error) {
      // Error is handled in useAuth hook
      console.error("Login failed:", error);
    }
  };

  const handleEnableNotifications = async () => {
    try {
      const success = await subscribeToPush();
      if (success) {
        setShowPushPrompt(false);
        toast.success("Notifications enabled successfully");
      }
    } catch {
      toast.error("Failed to enable notifications");
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left side - Branding */}
      <div className="md:w-1/2 bg-gradient-to-br from-indigo-600 to-purple-700 p-8 flex flex-col justify-center items-center text-white">
        <div className="max-w-md space-y-6">
          <div className="flex items-center gap-3">
            <BookOpen className="h-12 w-12" />
            <h1 className="text-4xl font-bold">Library Pro</h1>
          </div>
          <p className="text-xl opacity-90">
            Professional library management system for efficient fee collection
            and student tracking
          </p>
          <div className="space-y-4 mt-8">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5" />
              <span>Secure & Encrypted</span>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5" />
              <span>Real-time Updates</span>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5" />
              <span>Mobile First Design</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="md:w-1/2 p-4 md:p-8 flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Admin Login
            </CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="admin@library.com"
                          type="email"
                          autoComplete="email"
                          {...field}
                          disabled={isLoggingIn}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="••••••••"
                          type="password"
                          autoComplete="current-password"
                          {...field}
                          disabled={isLoggingIn}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="remember"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isLoggingIn}
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        Remember me
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isLoggingIn}>
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </Form>

            {/* Push Notification Prompt */}
            {showPushPrompt && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <Shield className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900">
                      Enable Notifications
                    </h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Get real-time payment reminders and updates even when the
                      app is closed
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={handleEnableNotifications}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Enable
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowPushPrompt(false)}
                      >
                        Later
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Demo credentials */}
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-gray-500 text-center">
                Demo Credentials:
              </p>
              <div className="text-xs text-gray-500 text-center mt-1 space-y-1">
                <p>Email: admin@library.com</p>
                <p>Password: password123</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
