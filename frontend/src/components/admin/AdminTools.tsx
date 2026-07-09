import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { TOOLS } from "@/data/tools";
import { adminGetToolOrder, adminUpdateToolOrder } from "@/lib/db";
import { orderTools } from "@/lib/orderedTools";
import {
  AdminCard,
  AdminLoading,
  AdminPageHeader,
} from "@/components/admin/ui/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { PlatformLogo } from "@/components/logos/PlatformLogo";

export default function AdminTools() {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    adminGetToolOrder()
      .then((r) => setSlugs(r.slugs))
      .catch(() => setSlugs(TOOLS.map((t) => t.slug)))
      .finally(() => setLoading(false));
  }, []);

  const tools = useMemo(() => orderTools(slugs), [slugs]);

  const move = (index: number, dir: -1 | 1) => {
    const next = [...slugs];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setSlugs(next);
  };

  const save = async () => {
    await adminUpdateToolOrder(slugs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <AdminLoading />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Downloader Tools"
        description="Reorder platform tools — this changes the More menu, tools page, and sitemap order."
        actions={<Button onClick={save}>{saved ? "Saved!" : "Save order"}</Button>}
      />

      <AdminCard padding={false}>
        <ul className="divide-y divide-slate-100">
          {tools.map((tool, index) => (
            <li key={tool.slug} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <GripVertical className="h-4 w-4 shrink-0 text-slate-300" />
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100">
                <PlatformLogo platform={tool.platformId} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{tool.platform}</p>
                <p className="truncate text-xs text-slate-500">/{tool.slug === "video-downloader" ? "" : tool.slug}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                  title="Move up"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={index === tools.length - 1}
                  onClick={() => move(index, 1)}
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                  title="Move down"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </AdminCard>
    </div>
  );
}
