import { Link, useLocation } from "react-router-dom";
import { PlatformLogo } from "@/components/logos/PlatformLogo";
import { useConfig } from "@/lib/ConfigContext";
import { orderTools, toolsToPlatformNav } from "@/lib/orderedTools";
import { cn } from "@/lib/utils";

export interface PlatformNavItem {
  platformId: import("@/components/logos/PlatformLogo").PlatformId;
  slug: string;
  label: string;
  home?: boolean;
}

export function PlatformNav({ className }: { className?: string }) {
  const { pathname } = useLocation();
  const { config } = useConfig();
  const items = toolsToPlatformNav(orderTools(config.toolOrder));

  return (
    <nav
      className={cn(
        "flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none sm:gap-2",
        className
      )}
      aria-label="Platform downloaders"
    >
      {items.map((item) => {
        const active = item.home ? pathname === "/" : pathname === `/${item.slug}`;
        const href = item.home ? "/" : `/${item.slug}`;
        return (
          <Link
            key={item.slug}
            to={href}
            title={item.label}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-all sm:px-3 sm:py-2 sm:text-sm",
              active
                ? "border-primary/50 bg-primary/15 text-foreground shadow-sm shadow-primary/10"
                : "border-border/60 bg-card/40 text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground"
            )}
          >
            <span className="grid h-4 w-4 shrink-0 place-items-center sm:h-5 sm:w-5">
              <PlatformLogo platform={item.platformId} />
            </span>
            <span className="whitespace-nowrap text-[11px] sm:text-sm">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
