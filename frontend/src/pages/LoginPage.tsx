import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import {
  apiLogin,
  apiLoginVerify,
  apiTotpEnable,
  apiTotpSetup,
  type LoginResponse,
} from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Seo } from "@/components/Seo";
import { Lock, Mail, Shield } from "lucide-react";

type Step = "credentials" | "totp" | "setup";

function isUser(res: LoginResponse): res is import("@/lib/db").User {
  return "id" in res && "email" in res;
}

export default function LoginPage() {
  const { user, setUserFromLogin } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ticket, setTicket] = useState("");
  const [code, setCode] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user?.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await apiLogin(email, password);
      if (isUser(res)) {
        setUserFromLogin(res);
        navigate("/admin");
        return;
      }
      if ("needsTotpSetup" in res && res.needsTotpSetup) {
        setTicket(res.ticket);
        const setup = await apiTotpSetup(res.ticket);
        setQrDataUrl(setup.qrDataUrl);
        setStep("setup");
        return;
      }
      if ("needsTotp" in res && res.needsTotp) {
        setTicket(res.ticket);
        setStep("totp");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleTotpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const u = await apiLoginVerify(ticket, code);
      setUserFromLogin(u);
      navigate("/admin");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid code.");
    } finally {
      setLoading(false);
    }
  };

  const handleTotpEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const u = await apiTotpEnable(ticket, code);
      setUserFromLogin(u);
      navigate("/admin");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12">
      <Seo title="Admin Login" description="Administrator access." path="/login" noindex />

      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-violet-600 shadow-lg shadow-violet-900/40">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">TinyDown Admin</h1>
          <p className="mt-2 text-sm text-slate-400">Secure administrator portal</p>
        </div>

        <Card className="border-slate-700/50 bg-white p-8 shadow-2xl">
          <div className="text-center">
            <h2 className="text-lg font-bold text-slate-900">Sign in</h2>
            <p className="mt-1 text-sm text-slate-500">
              {step === "credentials" && "Enter your administrator credentials"}
              {step === "totp" && "Enter the 6-digit code from your authenticator"}
              {step === "setup" && "Set up two-factor authentication to continue"}
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {step === "credentials" && (
            <form onSubmit={handleCredentials} className="mt-8 space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Admin email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 pl-11"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pl-11"
                />
              </div>
              <Button type="submit" disabled={loading} className="h-11 w-full bg-violet-600 hover:bg-violet-700">
                {loading ? "Signing in…" : "Continue"}
              </Button>
            </form>
          )}

          {(step === "totp" || step === "setup") && (
            <form
              onSubmit={step === "setup" ? handleTotpEnable : handleTotpVerify}
              className="mt-8 space-y-4"
            >
              {step === "setup" && qrDataUrl && (
                <div className="flex justify-center rounded-xl border border-border bg-white p-4">
                  <img src={qrDataUrl} alt="TOTP QR code" className="h-44 w-44" />
                </div>
              )}
              <Input
                type="text"
                inputMode="numeric"
                placeholder="6-digit code"
                required
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="h-12 text-center text-lg tracking-widest"
              />
              <Button type="submit" disabled={loading} className="h-11 w-full bg-violet-600 hover:bg-violet-700">
                {loading ? "Verifying…" : step === "setup" ? "Enable 2FA & Sign In" : "Verify & Sign In"}
              </Button>
              <button
                type="button"
                className="w-full text-sm text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setStep("credentials");
                  setCode("");
                  setError("");
                }}
              >
                ← Back to login
              </button>
            </form>
          )}
        </Card>

        <p className="mt-6 text-center text-xs text-slate-500">
          Authorized personnel only. All access is logged.
        </p>
      </div>
    </div>
  );
}
