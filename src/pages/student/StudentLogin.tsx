import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";
import { studentAuthApi } from "@/api/studentAuth.api";
import { useStudentAuthStore } from "@/store/studentAuth.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

export const StudentLogin = () => {
  const navigate = useNavigate();
  const { setAuth } = useStudentAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = useMutation({
    mutationFn: studentAuthApi.login,
    onSuccess: ({ data }) => {
      if (data?.data) {
        const { student, accessToken } = data.data;
        setAuth(student, accessToken);
        localStorage.setItem("studentAccessToken", accessToken);
        localStorage.setItem("student", JSON.stringify(student));
        navigate("/student/dashboard");
      }
    },
    onError: (error: Error) => {
      console.error("Login failed:", error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill all fields");
      return;
    }
    try {
      await loginMutation.mutateAsync({ email, password });

      // ✅ Encryption keys now generated per conversation, not per user
      // No need for global key setup on login
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed";
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4">
            <span className="text-white font-bold text-2xl">LS</span>
          </div>
          <CardTitle className="text-2xl text-center">Student Login</CardTitle>
          <CardDescription className="text-center">
            Enter your email and password to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="student@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Logging in..." : "Login"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <div className="space-y-3">
              <div className="text-center text-sm">
                <span className="text-muted-foreground">
                  Don't have an account?{" "}
                </span>
                <Button
                  type="button"
                  variant="link"
                  onClick={() => navigate("/student/register")}
                  className="text-primary hover:underline p-0 h-auto"
                >
                  Create account
                </Button>
              </div>

              <div className="text-center text-sm">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => navigate("/student/verify-email")}
                  className="text-sm text-muted-foreground"
                >
                  Already registered? Verify email with OTP
                </Button>
              </div>

              <div className="text-center text-sm">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => navigate("/student/forgot-password")}
                  className="text-sm text-muted-foreground"
                >
                  Forgot password?
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
