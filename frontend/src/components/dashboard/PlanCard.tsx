import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getMyTodayCount } from "@/lib/db";
import { getEffectivePlan, isDevUnlimited } from "@/lib/dev";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Shield } from "lucide-react";

export default function PlanCard() {
  const { user } = useAuth();
  const [todayCount, setTodayCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getMyTodayCount()
      .then((c) => {
        if (!cancelled) setTodayCount(c);
      })
      .catch(() => {
        if (!cancelled) setTodayCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;

  const plan = getEffectivePlan(user.planId);
  const maxDownloads = plan.maxDownloadsPerDay;

  // Percentage for progress bar
  const percent = maxDownloads > 0 ? Math.min(100, (todayCount / maxDownloads) * 100) : 0;

  return (
    <Card className="border border-border/50 bg-card/45 p-6 backdrop-blur-xl">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Current Plan
          </span>
          <div className="mt-1 flex items-center gap-2">
            <h3 className="text-2xl font-extrabold capitalize tracking-tight">
              {plan.name}
            </h3>
            {isDevUnlimited && (
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                DEV
              </span>
            )}
            {plan.id !== "free" && (
              <span className="flex items-center gap-1 rounded-full bg-gradient-to-br from-primary to-accent px-2.5 py-0.5 text-[10px] font-semibold text-white shadow-md shadow-primary/20">
                <Sparkles className="h-2.5 w-2.5" /> PRO
              </span>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-secondary p-2.5 text-primary">
          <Shield className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Daily Downloads Used</span>
            <span className="font-semibold">
              {maxDownloads === -1 ? `${todayCount} / Unlimited` : `${todayCount} / ${maxDownloads}`}
            </span>
          </div>

          {maxDownloads > 0 && (
            <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500`}
                style={{ width: `${percent}%` }}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 border-t border-border/40 pt-4 text-xs">
          <div>
            <span className="text-muted-foreground">Max Resolution</span>
            <p className="mt-0.5 font-bold text-foreground">
              {plan.maxResolution >= 2160
                ? "4K Ultra HD (2160p+)"
                : plan.maxResolution === 1080
                  ? "Full HD (1080p)"
                  : "HD (720p)"}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Features</span>
            <p className="mt-0.5 font-bold text-foreground">
              {plan.id === "free" ? "Standard Downloads" : "Priority Processing"}
            </p>
          </div>
        </div>

        {plan.id === "free" && (
          <div className="mt-6 border-t border-border/40 pt-4">
            <a href="/#pricing">
              <Button className="w-full h-10 rounded-xl text-sm font-semibold">
                Upgrade to Pro
              </Button>
            </a>
          </div>
        )}
      </div>
    </Card>
  );
}
