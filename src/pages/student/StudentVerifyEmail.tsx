import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Mail, Key, ArrowRight, Lock } from "lucide-react";
import { studentAuthApi } from "@/api/studentAuth.api";
import { studentChatApi } from "@/api/studentChat.api";
import { useStudentAuthStore } from "@/store/studentAuth.store";
import { initCrypto, getOrCreateKeyPair } from "@/lib/crypto";
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

export const StudentVerifyEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth } = useStudentAuthStore();
  const [step, setStep] = useState<"email" | "otp">("email");
  // Pre-fill email from URL params (e.g., from registration)
  const [email, setEmail] = useState(() => searchParams.get("email") || "");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");

  const requestOtpMutation = useMutation({
    mutationFn: () => studentAuthApi.requestOtp({ email, purpose: "VERIFY" }),
    onSuccess: () => {
      toast.success("OTP sent to your email");
      setStep("otp");
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: () =>
      studentAuthApi.verifyOtp({ email, otp, setPassword: password }),
    onSuccess: async ({ data }) => {
      if (data?.data) {
        const { student, accessToken } = data.data;
        setAuth(student, accessToken);
        localStorage.setItem("studentAccessToken", accessToken);
        localStorage.setItem("student", JSON.stringify(student));

        // Initialize encryption keys for announcements/chat
        try {
          await initCrypto();
          const keypair = await getOrCreateKeyPair();
          await studentChatApi.setPublicKey(keypair.publicKey);
        } catch (error) {
          console.error("Failed to initialize encryption keys:", error);
        }

        navigate("/student/dashboard");
      }
    },
  });

  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    requestOtpMutation.mutate();
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !password) {
      toast.error("Please fill all fields");
      return;
    }
    verifyOtpMutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md bg-white">
        <CardHeader className="space-y-1">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4">
            <span className="text-white font-bold text-2xl">LS</span>
          </div>
          <CardTitle className="text-2xl text-center">
            {step === "email" ? "Verify Email" : "Enter OTP"}
          </CardTitle>
          <CardDescription className="text-center">
            {step === "email"
              ? "Enter your registered email to receive OTP"
              : "Enter the OTP sent to your email and set a password"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "email" ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
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

              <Button
                type="submit"
                className="w-full"
                disabled={requestOtpMutation.isPending}
              >
                {requestOtpMutation.isPending ? "Sending..." : "Send OTP"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <div className="text-center text-sm">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => navigate("/student/login")}
                  className="text-sm"
                >
                  Already verified? Login
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">OTP</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="otp"
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Set Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={verifyOtpMutation.isPending}
              >
                {verifyOtpMutation.isPending
                  ? "Verifying..."
                  : "Verify & Continue"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <div className="text-center text-sm">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setStep("email")}
                  className="text-sm"
                >
                  Change email
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
