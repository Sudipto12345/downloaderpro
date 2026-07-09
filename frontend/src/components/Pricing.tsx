import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";
import { type PlanId } from "@/lib/db";

const PLANS = [
  {
    id: "free" as PlanId,
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "Perfect for the occasional download.",
    highlight: false,
    cta: "Start free",
    features: ["10 downloads / day", "Up to 720p", "All platforms", "Video, image & audio"],
  },
  {
    id: "pro" as PlanId,
    name: "Pro",
    price: "$5",
    period: "/month",
    desc: "For creators who download daily.",
    highlight: true,
    cta: "Go Pro",
    features: [
      "Unlimited downloads",
      "Up to 1080p HD",
      "No ads",
      "Download history",
      "Priority speed",
    ],
  },
  {
    id: "business" as PlanId,
    name: "Business",
    price: "$15",
    period: "/month",
    desc: "Power tools for teams & agencies.",
    highlight: false,
    cta: "Choose Business",
    features: [
      "Everything in Pro",
      "Up to 4K Ultra HD",
      "Batch downloads",
      "Priority queue",
      "Early access to new tools",
    ],
  },
];

export function Pricing() {
  const { user, upgradePlan } = useAuth();
  const navigate = useNavigate();

  const handleSelectPlan = async (planId: PlanId) => {
    if (!user) {
      // Redirect guest to signup/login
      navigate("/signup");
      return;
    }

    if (user.planId === planId) return;

    const confirmUpgrade = confirm(`Would you like to switch to the ${planId} plan? (Simulated Checkout)`);
    if (confirmUpgrade) {
      try {
        await upgradePlan(planId);
        alert(`Successfully switched to the ${planId} plan!`);
        navigate("/dashboard");
      } catch (err: any) {
        alert(err?.message ?? "Failed to switch plan. Please try again.");
      }
    }
  };

  return (
    <section id="pricing" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
      <div className="text-center">
        <span className="text-sm font-semibold uppercase tracking-widest text-primary">Pricing</span>
        <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Start free, upgrade anytime
        </h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          Simple, transparent plans. Cancel whenever you want.
        </p>
      </div>

      <div className="mt-14 grid items-start gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = user?.planId === plan.id;
          
          return (
            <Card
              key={plan.name}
              className={cn(
                "card-hover relative flex flex-col p-7",
                plan.highlight && "border-primary/50 ring-1 ring-primary/30 md:-mt-4 md:pb-9"
              )}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-gradient-to-br from-primary to-accent px-3 py-1 text-xs font-semibold text-white shadow-lg shadow-primary/30">
                  <Sparkles className="h-3 w-3" /> Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{plan.desc}</p>
              <div className="mt-5 flex items-end gap-1">
                <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                <span className="mb-1.5 text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant={isCurrent ? "outline" : plan.highlight ? "default" : "outline"}
                size="lg"
                className="mt-8 w-full font-semibold"
                disabled={isCurrent}
                onClick={() => handleSelectPlan(plan.id)}
              >
                {isCurrent ? "Current Plan" : plan.cta}
              </Button>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
