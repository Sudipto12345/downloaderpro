import { cn } from "@/lib/utils";

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
        {description && <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function AdminCard({
  className,
  children,
  padding = true,
}: {
  className?: string;
  children: React.ReactNode;
  padding?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/80 bg-white shadow-sm",
        padding && "p-5 sm:p-6",
        className
      )}
    >
      {children}
    </div>
  );
}

export function AdminStatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "primary",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: "primary" | "emerald" | "blue" | "amber";
}) {
  const accents = {
    primary: "bg-violet-50 text-violet-600",
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <AdminCard className="relative overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 truncate text-3xl font-bold tabular-nums text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        {Icon && (
          <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", accents[accent])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </AdminCard>
  );
}

export function AdminLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </label>
  );
}

export function AdminInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100",
        props.className
      )}
    />
  );
}

export function AdminTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100",
        props.className
      )}
    />
  );
}

export function AdminSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "h-10 w-full rounded-lg border border-slate-200 bg-slate-50/50 px-3 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100",
        props.className
      )}
    />
  );
}

export function AdminBadge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const styles = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    danger: "bg-red-50 text-red-700",
  };
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", styles[variant])}>
      {children}
    </span>
  );
}

export function AdminEmpty({ message }: { message: string }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-16 text-sm text-slate-500">
      {message}
    </div>
  );
}

export function AdminLoading() {
  return (
    <div className="grid min-h-[320px] place-items-center">
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-violet-200 border-t-violet-600" />
    </div>
  );
}
