import { ChevronDown, Download, Menu, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AdSlot } from "@/components/AdSlot";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useConfig } from "@/lib/ConfigContext";
import { orderTools, toolsToPlatformNav } from "@/lib/orderedTools";

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { config } = useConfig();
  const siteName = config.site.shortName || config.site.name;
  const orderedTools = useMemo(() => orderTools(config.toolOrder), [config.toolOrder]);
  const platformNav = useMemo(() => toolsToPlatformNav(orderedTools), [orderedTools]);

  const headerItems = useMemo(() => {
    const fromDb = config.menus.filter((m) => m.menu === "header");
    if (fromDb.length) return fromDb;
    return platformNav.map((item, i) => ({
      id: item.slug,
      menu: "header" as const,
      label: item.label,
      href: item.home ? "/" : `/${item.slug}`,
      column: null,
      order: i,
      parentId: null,
      openInNew: false,
    }));
  }, [config.menus, platformNav]);

  const topLevelHeaderItems = useMemo(() => headerItems.filter((item) => !item.parentId), [headerItems]);
  const childHeaderItems = useMemo(() => headerItems.filter((item) => item.parentId), [headerItems]);

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur-md">
      <AdSlot placement="header_banner" className="border-b border-border/30" />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2 text-base font-bold tracking-tight sm:text-lg">
          {config.site.logoUrl ? (
            <img
              src={config.site.logoUrl}
              alt={siteName}
              style={{
                width: config.theme?.navbarLogoSizePx ?? 36,
                height: config.theme?.navbarLogoSizePx ?? 36,
              }}
              className="shrink-0 rounded-xl object-cover shadow-md"
            />
          ) : (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-md">
              <Download className="h-5 w-5 text-white" />
            </span>
          )}
          <span
            className="truncate"
            style={{ color: config.theme?.navbarTitleColor || undefined }}
          >
            {siteName}{" "}
            <span className={config.theme?.navbarSuffixUseGradient !== false && config.theme?.navbarSuffixText ? "gradient-text" : ""}>
              {config.theme?.navbarSuffixText ?? ""}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {topLevelHeaderItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const children = childHeaderItems.filter((child) => child.parentId === item.id);
            return (
              <div key={item.id} className="group relative">
                <Link
                  to={item.href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
                {children.length > 0 && (
                  <div className="invisible absolute left-0 top-full w-48 pt-2 opacity-0 transition-all group-hover:visible group-hover:opacity-100">
                    <div className="rounded-xl border border-border bg-card p-2 shadow-xl">
                      {children.map((child) => (
                        <Link
                          key={child.id}
                          to={child.href}
                          className="block rounded-lg px-3 py-2 text-sm hover:bg-secondary"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div className="group relative ml-2">
            <button className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
              More <ChevronDown className="h-4 w-4" />
            </button>
            <div className="invisible absolute right-0 top-full w-56 pt-2 opacity-0 transition-all group-hover:visible group-hover:opacity-100">
              <div className="rounded-xl border border-border bg-card p-2 shadow-xl">
                {orderedTools.map((tool) => (
                  <Link
                    key={tool.slug}
                    to={tool.slug === "video-downloader" ? "/" : `/${tool.slug}`}
                    className="block rounded-lg px-3 py-2 text-sm hover:bg-secondary"
                  >
                    {tool.platform}
                  </Link>
                ))}
                <Link to="/tools" className="mt-1 block rounded-lg px-3 py-2 text-center text-sm font-semibold text-primary hover:bg-secondary">
                  All tools →
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            className="grid h-10 w-10 place-items-center rounded-lg text-foreground hover:bg-secondary md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile platform strip */}
      <div className="border-t border-border/30 md:hidden">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2 scrollbar-none">
          {topLevelHeaderItems.map((item) => (
            <Link
              key={item.id}
              to={item.href}
              onClick={() => setOpen(false)}
              className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {open && (
        <div className="max-h-[70vh] overflow-y-auto border-t border-border/40 px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1.5">
            {topLevelHeaderItems.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const children = childHeaderItems.filter((child) => child.parentId === item.id);
              return (
                <div key={item.id} className="flex flex-col gap-1">
                  <Link
                    to={item.href}
                    onClick={() => setOpen(false)}
                    className={`rounded-xl px-3 py-2.5 text-sm font-medium ${
                      active ? "bg-primary/10 text-primary" : "hover:bg-secondary text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                  {children.length > 0 && (
                    <div className="ml-4 border-l border-border pl-3 flex flex-col gap-1">
                      {children.map((child) => (
                        <Link
                          key={child.id}
                          to={child.href}
                          onClick={() => setOpen(false)}
                          className="rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="border-t border-border/30 my-2 pt-2">
              <Link to="/tools" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-primary hover:bg-secondary">
                All tools →
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
