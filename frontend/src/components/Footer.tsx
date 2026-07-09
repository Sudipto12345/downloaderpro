import { Download } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AdSlot } from "@/components/AdSlot";
import { TOOLS } from "@/data/tools";
import { useConfig } from "@/lib/ConfigContext";

export function Footer() {
  const { config } = useConfig();
  const site = config.site;

  const footerGroups = useMemo(() => {
    const items = config.menus.filter((m) => m.menu === "footer");
    if (!items.length) {
      return [
        {
          title: "Downloaders",
          links: TOOLS.map((t) => ({
            label: t.platform,
            href: t.slug === "video-downloader" ? "/" : `/${t.slug}`,
          })),
        },
        {
          title: "Company",
          links: [
            { label: "About", href: "/about" },
            { label: "Contact", href: "/contact" },
            { label: "FAQ", href: "/faq" },
            { label: "Privacy", href: "/privacy" },
            { label: "Terms", href: "/terms" },
          ],
        },
      ];
    }
    const columns = new Map<number, { label: string; href: string }[]>();
    for (const item of items) {
      const col = item.column ?? 1;
      if (!columns.has(col)) columns.set(col, []);
      columns.get(col)!.push({ label: item.label, href: item.href });
    }
    return [...columns.entries()]
      .sort(([a], [b]) => a - b)
      .map(([col, links]) => ({ title: `Links ${col}`, links }));
  }, [config.menus]);

  return (
    <footer className="border-t border-border/50 bg-background">
      <AdSlot placement="footer" className="border-b border-border/30" />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent">
                <Download className="h-5 w-5 text-white" />
              </span>
              {site.name}
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {site.description}
            </p>
          </div>

          {footerGroups.map((group) => (
            <div key={group.title}>
              <h4 className="text-sm font-semibold">{group.title}</h4>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      to={l.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/50 pt-6 text-sm text-muted-foreground sm:flex-row">
          <p>&copy; {new Date().getFullYear()} {site.name}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
