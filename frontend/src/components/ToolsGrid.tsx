import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { PlatformLogo } from "@/components/logos/PlatformLogo";
import { Card } from "@/components/ui/card";
import { useConfig } from "@/lib/ConfigContext";
import { orderTools } from "@/lib/orderedTools";

export function ToolsGrid({
  heading = "Pick your downloader",
  subheading = "Dedicated tools tuned for each platform.",
  exclude,
}: {
  heading?: string;
  subheading?: string;
  exclude?: string;
}) {
  const { config } = useConfig();
  const tools = orderTools(config.toolOrder).filter((t) => t.slug !== exclude);

  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
      <div className="text-center">
        <span className="text-sm font-semibold uppercase tracking-widest text-primary">Tools</span>
        <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{heading}</h2>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">{subheading}</p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-3 sm:mt-12 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {tools.map((tool) => (
          <Link
            key={tool.slug}
            to={tool.slug === "video-downloader" ? "/" : `/${tool.slug}`}
            className="group"
          >
            <Card className="card-hover flex h-full items-center gap-3 p-3.5 sm:items-start sm:gap-4 sm:p-5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg shadow-md ring-1 ring-black/5 dark:ring-white/10 sm:h-10 sm:w-10 sm:rounded-xl">
                <PlatformLogo platform={tool.platformId} className="max-h-full max-w-full" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-sm font-semibold sm:text-base">{tool.platform}</h3>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary sm:h-4 sm:w-4" />
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground sm:mt-1 sm:text-sm">
                  {tool.tagline}
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
