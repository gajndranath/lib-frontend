import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, User, Mail, Lock, Shield, ArrowLeft } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/store/auth.store"; // Use store directly
import { adminApi } from "@/api/admin.api";

// Fix the schema
const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .max(30, "Username must be less than 30 characters")
      .regex(
        /^[a-z0-9_]+$/,
        "Username can only contain lowercase letters, numbers, and underscores",
      ),
    email: z
      .string()
      .email("Invalid email address")
      .min(1, "Email is required"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
    role: z.enum(["SUPER_ADMIN", "STAFF"]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export const Register: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const navigate = useNavigate();
  const { admin } = useAuthStore(); // Get admin from store directly

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "STAFF",
    },
  });

  // Check if user is super admin - useEffect runs once on mount
  useEffect(() => {
    const checkAuth = async () => {
      setIsCheckingAuth(true);

      try {
        // Check if we have token in localStorage
        const token = localStorage.getItem("accessToken");
        const storedAdmin = localStorage.getItem("admin");

        if (!token || !storedAdmin) {
          toast.error("Please login first");
          navigate("/login");
          return;
        }

        // Parse admin data
        const adminData = JSON.parse(storedAdmin);

        // Check if user is SUPER_ADMIN
        if (adminData.role !== "SUPER_ADMIN") {
          toast.error("Only Super Admins can register new admins");
          navigate("/dashboard");
          return;
        }

        // All checks passed
        setIsCheckingAuth(false);
      } catch (error) {
        console.error("Auth check error:", error);
        toast.error("Authentication error. Please login again.");
        navigate("/login");
      }
    };

    checkAuth();
  }, [navigate]);

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);

    try {
      // Get token from localStorage
      const token = localStorage.getItem("accessToken");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const { error } = await adminApi.registerAdmin({
        username: data.username,
        email: data.email,
        password: data.password,
        role: data.role,
      });

      if (error) {
        throw new Error(error.message);
      }

      toast.success("Admin registered successfully");
      reset();

      // Redirect based on user role
      if (admin?.role === "SUPER_ADMIN") {
        navigate("/admin/staff");
      } else {
        navigate("/dashboard");
      }
    } catch (error: unknown) {
      console.error("Registration error:", error);
      if (error instanceof Error) {
        toast.error(error.message || "Failed to register admin");
      } else {
        toast.error("Failed to register admin");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const password = watch("password");
  const confirmPassword = watch("confirmPassword");

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    if (!password) return { score: 0, label: "", color: "bg-gray-200" };

    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const strength = {
      0: { label: "Very Weak", color: "bg-red-500" },
      1: { label: "Weak", color: "bg-red-400" },
      2: { label: "Fair", color: "bg-yellow-500" },
      3: { label: "Good", color: "bg-green-400" },
      4: { label: "Strong", color: "bg-green-500" },
      5: { label: "Very Strong", color: "bg-green-600" },
    };

    return { score, ...strength[score as keyof typeof strength] };
  };

  const passwordStrength = getPasswordStrength(password);

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-xl bg-primary/10 mb-6">
            <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Checking Permissions...
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Verifying your access to register new admins
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary mb-4">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Register New Admin
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create a new admin account for library management
          </p>

          {/* Current User Info */}
          {admin && (
            <div className="mt-4 inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium">
                Logged in as: {admin.username} ({admin.role})
              </span>
            </div>
          )}
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Admin Registration</CardTitle>
                <CardDescription>
                  Fill in the details to create a new admin account
                </CardDescription>
              </div>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Username */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      {...register("username")}
                      placeholder="john_doe"
                      className={`pl-10 ${
                        errors.username ? "border-red-500" : ""
                      }`}
                    />
                    {errors.username && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.username.message}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Lowercase letters, numbers, and underscores only
                  </p>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      {...register("email")}
                      placeholder="admin@library.com"
                      className={`pl-10 ${
                        errors.email ? "border-red-500" : ""
                      }`}
                      type="email"
                    />
                    {errors.email && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      {...register("password")}
                      placeholder="••••••••"
                      className={`pl-10 pr-10 ${
                        errors.password ? "border-red-500" : ""
                      }`}
                      type={showPassword ? "text" : "password"}
                    />
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
                  {errors.password && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.password.message}
                    </p>
                  )}

                  {/* Password strength */}
                  {password && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Password strength:</span>
                        <span className="font-medium">
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${passwordStrength.color} transition-all duration-300`}
                          style={{
                            width: `${(passwordStrength.score / 5) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      {...register("confirmPassword")}
                      placeholder="••••••••"
                      className={`pl-10 pr-10 ${
                        errors.confirmPassword ? "border-red-500" : ""
                      }`}
                      type={showConfirmPassword ? "text" : "password"}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400" />
                      ) : (
                        <Eye className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.confirmPassword.message}
                    </p>
                  )}

                  {/* Password match indicator */}
                  {password && confirmPassword && (
                    <div className="flex items-center gap-2 text-xs">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          password === confirmPassword
                            ? "bg-green-500"
                            : "bg-red-500"
                        }`}
                      />
                      <span
                        className={
                          password === confirmPassword
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }
                      >
                        {password === confirmPassword
                          ? "Passwords match"
                          : "Passwords do not match"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Role */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <Select
                    defaultValue="STAFF"
                    onValueChange={(value: "SUPER_ADMIN" | "STAFF") =>
                      setValue("role", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="STAFF">Staff</SelectItem>
                      <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Super Admins have full system access
                  </p>
                </div>
              </div>

              {/* Requirements */}
              <div className="rounded-lg border p-4 bg-gray-50 dark:bg-gray-900">
                <h4 className="font-medium mb-2">Password Requirements:</h4>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center">
                    <div
                      className={`h-1.5 w-1.5 rounded-full mr-2 ${
                        password.length >= 6 ? "bg-green-500" : "bg-gray-300"
                      }`}
                    />
                    At least 6 characters
                  </li>
                  <li className="flex items-center">
                    <div
                      className={`h-1.5 w-1.5 rounded-full mr-2 ${
                        /[A-Z]/.test(password) ? "bg-green-500" : "bg-gray-300"
                      }`}
                    />
                    At least one uppercase letter
                  </li>
                  <li className="flex items-center">
                    <div
                      className={`h-1.5 w-1.5 rounded-full mr-2 ${
                        /[a-z]/.test(password) ? "bg-green-500" : "bg-gray-300"
                      }`}
                    />
                    At least one lowercase letter
                  </li>
                  <li className="flex items-center">
                    <div
                      className={`h-1.5 w-1.5 rounded-full mr-2 ${
                        /[0-9]/.test(password) ? "bg-green-500" : "bg-gray-300"
                      }`}
                    />
                    At least one number
                  </li>
                </ul>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate("/dashboard")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Registering..." : "Register Admin"}
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="border-t pt-6 flex flex-col space-y-4">
            <div className="w-full text-center text-sm text-gray-600 dark:text-gray-400">
              <p>
                <span className="font-medium">Note:</span> New admins will
                receive an email with login instructions. Make sure to provide
                valid credentials.
              </p>
              <p className="mt-2">
                Super Admin accounts have complete system access including staff
                management, audit logs, and system configuration.
              </p>
            </div>

            {/* Login Link */}
            <div className="text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-primary hover:text-primary/80 font-medium"
                >
                  Sign in here
                </Link>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
