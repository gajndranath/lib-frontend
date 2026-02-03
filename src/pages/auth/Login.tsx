import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock, UserPlus } from "lucide-react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  // Check if already authenticated
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("accessToken");
      const admin = localStorage.getItem("admin");

      if (token && admin) {
        console.log("Login page: Already authenticated, redirecting...");
        const from = location.state?.from?.pathname || "/dashboard";
        navigate(from, { replace: true });
      }
    };

    checkAuth();
  }, [navigate, location]);

  // Load remembered email
  useEffect(() => {
    const rememberedEmail = localStorage.getItem("rememberedEmail");
    if (rememberedEmail) {
      setValue("email", rememberedEmail);
      setValue("rememberMe", true);
    }
  }, [setValue]);

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);

    try {
      if (data.rememberMe) {
        localStorage.setItem("rememberedEmail", data.email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      await login({
        email: data.email,
        password: data.password,
      });

      // Login successful, redirect will be handled by AuthProvider
      toast.success("Login successful!");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred";
      console.error("Login error:", errorMessage);
      toast.error(
        errorMessage || "Login failed. Please check your credentials.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const rememberMe = watch("rememberMe");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary mb-4">
            <div className="text-2xl font-bold text-white">LMS</div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Library Management System
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sign in to manage your library operations
          </p>
        </div>

        <Card className="shadow-lg border-0 bg-white">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="bg-white">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    {...register("email")}
                    placeholder="admin@library.com"
                    className="pl-10"
                    type="email"
                    autoComplete="email"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    {...register("password")}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                  />
                  {errors.password && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.password.message}
                    </p>
                  )}
                  <button
                    type="button"
                    className="absolute right-3 top-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    {...register("rememberMe")}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label
                    htmlFor="rememberMe"
                    className={cn(
                      "ml-2 text-sm cursor-pointer",
                      rememberMe
                        ? "text-gray-900 dark:text-white"
                        : "text-gray-600 dark:text-gray-400",
                    )}
                  >
                    Remember me
                  </label>
                </div>
                <button
                  type="button"
                  className="text-sm text-primary hover:text-primary/80 font-medium"
                  onClick={() => toast.info("Contact admin to reset password")}
                >
                  Forgot password?
                </button>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                loading={isSubmitting || isLoading}
                disabled={isSubmitting || isLoading}
              >
                {isSubmitting || isLoading ? "Signing in..." : "Sign In"}
              </Button>

              {/* Register Link */}
              <div className="text-center pt-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Don't have an account?{" "}
                  <Link
                    to="/register"
                    className="text-black-600 hover:text-primary/80 font-medium inline-flex items-center gap-1"
                  >
                    <UserPlus className="h-4 w-4 " />
                    Create new admin account
                  </Link>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  Note: Only Super Admins can create new admin accounts
                </p>
              </div>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                  Demo Credentials
                </span>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>Super Admin:</span>
                <code className="text-primary font-mono">
                  superadmin@library.com
                </code>
              </div>
              <div className="flex justify-between">
                <span>Staff:</span>
                <code className="text-primary font-mono">
                  staff@library.com
                </code>
              </div>
              <div className="text-center text-xs mt-2">
                Password:{" "}
                <code className="text-primary font-mono">admin123</code>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              Having trouble signing in?{" "}
              <button
                type="button"
                className="text-primary hover:text-primary/80 font-medium"
                onClick={() =>
                  toast.info("Please contact your system administrator")
                }
              >
                Contact Support
              </button>
            </div>
            <div className="text-center text-xs text-gray-500 dark:text-gray-500">
              <p>
                By signing in, you agree to our Terms of Service and Privacy
                Policy
              </p>
              <p className="mt-1">v2.0.0 • Secure Authentication</p>
            </div>
          </CardFooter>
        </Card>

        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
            <span>System Status: All Services Operational</span>
          </div>
        </div>
      </div>
    </div>
  );
};
