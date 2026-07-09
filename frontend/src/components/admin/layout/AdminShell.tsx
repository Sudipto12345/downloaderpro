import {
  ExternalLink,
  FileText,
  Globe,
  LayoutDashboard,
  LogOut,
  Map,
  Megaphone,
  Menu,
  Palette,
  Search,
  Shield,
  Users,
  Wrench,
  Radar,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";

export type AdminTab =
  | "overview"
  | "geo"
  | "ads"
  | "menus"
  | "pages"
  | "tools"
  | "seo"
  | "appearance"
  | "searchconsole"
  | "sitemap"
  | "users"
  | "developer";

const BASE_NAV: { id: AdminTab; label: string; icon: typeof LayoutDashboard; group: string }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, group: "Main" },
  { id: "geo", label: "Geo Downloads", icon: Globe, group: "Downloads" },
  { id: "ads", label: "Advertising", icon: Megaphone, group: "Monetization" },
  { id: "menus", label: "Navigation", icon: Menu, group: "Content" },
  { id: "pages", label: "Pages", icon: FileText, group: "Content" },
  { id: "tools", label: "Downloader Tools", icon: Wrench, group: "Content" },
  { id: "seo", label: "SEO & Settings", icon: Search, group: "Content" },
  { id: "appearance", label: "Appearance", icon: Palette, group: "Content" },
  { id: "searchconsole", label: "Search Console", icon: Radar, group: "Content" },
  { id: "sitemap", label: "Sitemap Manager", icon: Map, group: "Content" },
  { id: "users", label: "Administrators", icon: Users, group: "System" },
];

const TAB_TITLES: Record<AdminTab, string> = {
  overview: "Dashboard Overview",
  geo: "Country-wise Downloads",
  ads: "Advertising",
  menus: "Navigation Menus",
  pages: "Content Pages",
  tools: "Downloader Tools",
  seo: "SEO & Site Settings",
  appearance: "Appearance & Header",
  searchconsole: "Google Search Console",
  sitemap: "Sitemap Manager",
  users: "Administrator Accounts",
  developer: "Developer Controls",
};

interface Props {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  children: React.ReactNode;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onMobileOpen: () => void;
}

function SidebarNav({
  activeTab,
  onTabChange,
  onNavigate,
  isDeveloper,
}: {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onNavigate?: () => void;
  isDeveloper?: boolean;
}) {
  const nav = [
    ...BASE_NAV,
    ...(isDeveloper
      ? [{ id: "developer" as const, label: "Developer", icon: Wrench, group: "System" }]
      : []),
  ];
  const groups = [...new Set(nav.map((n) => n.group))];
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {groups.map((group) => (
        <div key={group}>
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">{group}</p>
          <ul className="space-y-0.5">
            {nav.filter((n) => n.group === group).map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => {
                    onTabChange(id);
                    onNavigate?.();
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    activeTab === id
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 opacity-90" />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminShell({
  activeTab,
  onTabChange,
  children,
  mobileOpen,
  onMobileClose,
  onMobileOpen,
}: Props) {
  const { user, logout } = useAuth();
  const isDeveloper = user?.isDeveloper === true;

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900 lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-violet-600">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">TinyDown</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Admin Portal</p>
          </div>
        </div>
        <SidebarNav activeTab={activeTab} onTabChange={onTabChange} isDeveloper={isDeveloper} />
        <div className="border-t border-slate-800 p-4">
          <div className="mb-3 truncate rounded-lg bg-slate-800/80 px-3 py-2">
            <p className="truncate text-sm font-medium text-white">{user?.name}</p>
            <p className="truncate text-xs text-slate-400">{user?.email}</p>
          </div>
          <Link
            to="/"
            target="_blank"
            className="mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <ExternalLink className="h-3.5 w-3.5" /> View live site
          </Link>
          <button
            type="button"
            onClick={() => logout()}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/50" onClick={onMobileClose} aria-label="Close menu" />
          <aside className="relative flex h-full w-[min(280px,85vw)] flex-col bg-slate-900 shadow-2xl">
            <div className="flex h-14 items-center justify-between border-b border-slate-800 px-4">
              <span className="font-bold text-white">Admin Menu</span>
              <button type="button" onClick={onMobileClose} className="rounded-lg p-2 text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarNav
              activeTab={activeTab}
              onTabChange={onTabChange}
              onNavigate={onMobileClose}
              isDeveloper={isDeveloper}
            />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:h-16 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-600 lg:hidden"
              onClick={onMobileOpen}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-base font-bold text-slate-900 sm:text-lg">{TAB_TITLES[activeTab]}</h1>
              <p className="hidden text-xs text-slate-500 sm:block">TinyDown administration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AdminBadgeLive />
            <span className="hidden text-sm text-slate-600 sm:inline">{user?.name}</span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

function AdminBadgeLive() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
      Live
    </span>
  );
}

export { BASE_NAV as NAV };
