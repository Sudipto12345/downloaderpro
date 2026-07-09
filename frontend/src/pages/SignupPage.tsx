import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Seo } from "@/components/Seo";
import { Lock, Mail, User } from "lucide-react";

export default function SignupPage() {
  const { user, signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await signup(name, email, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[80vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <Seo
        title="Sign Up"
        description="Create your DownloadHub Pro account, view your download history, manage favorites and subscriptions."
        path="/signup"
      />
      
      <div className="absolute inset-0 -z-10 flex items-center justify-center opacity-30">
        <div className="h-[30rem] w-[30rem] animate-pulse rounded-full bg-primary/20 blur-[120px]" />
        <div className="h-[25rem] w-[25rem] animate-pulse rounded-full bg-accent/20 blur-[100px] delay-1000" />
      </div>

      <div className="w-full max-w-md animate-fade-up">
        <Card className="gradient-ring overflow-hidden border border-border/50 bg-card/60 p-8 backdrop-blur-xl">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight">
              Get <span className="gradient-text">Started</span>
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your DownloadHub Pro account today
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="relative">
                <User className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Full Name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 w-full rounded-xl border border-input bg-secondary/50 pl-11 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                />
              </div>

              <div className="relative">
                <Mail className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email address"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 w-full rounded-xl border border-input bg-secondary/50 pl-11 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Password (min 6 characters)"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 w-full rounded-xl border border-input bg-secondary/50 pl-11 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Confirm Password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 w-full rounded-xl border border-input bg-secondary/50 pl-11 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl text-base"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link to="/login" className="font-semibold text-primary hover:text-accent transition-colors">
              Log In
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
