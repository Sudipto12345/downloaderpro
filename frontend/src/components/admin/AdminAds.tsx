import { useEffect, useState } from "react";
import { adminGetAds, adminUpdateAd, type AdPlacement, type AdSlotRecord } from "@/lib/db";
import {
  AdminCard,
  AdminLoading,
  AdminPageHeader,
  AdminTextarea,
} from "@/components/admin/ui/AdminPrimitives";
import { Button } from "@/components/ui/button";

const PLACEMENT_LABELS: Record<AdPlacement, string> = {
  header_banner: "Header Banner",
  below_search: "Below Search Bar",
  in_content: "In Content",
  footer: "Footer",
  popup: "Popup / Popunder",
  sticky_bar: "Sticky Bottom Bar",
  direct_link: "Direct Link",
  social_bar: "Social / Auto Bar",
};

export default function AdminAds() {
  const [slots, setSlots] = useState<AdSlotRecord[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    adminGetAds()
      .then((data) => {
        setSlots(data);
        const d: Record<string, string> = {};
        data.forEach((s) => {
          d[s.placement] = s.code;
        });
        setDrafts(d);
      })
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (placement: AdPlacement, enabled: boolean) => {
    await adminUpdateAd(placement, { enabled });
    load();
  };

  const save = async (placement: AdPlacement) => {
    setSaving(placement);
    await adminUpdateAd(placement, { code: drafts[placement] ?? "" });
    setSaving(null);
    load();
  };

  if (loading) return <AdminLoading />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Advertising"
        description="Manage ad placements across the public site. Paste network code and toggle slots on or off."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {slots.map((slot) => (
          <AdminCard key={slot.placement}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="font-semibold text-slate-900">{PLACEMENT_LABELS[slot.placement]}</h4>
                <p className="font-mono text-xs text-slate-500">{slot.placement}</p>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={slot.enabled}
                  onChange={(e) => toggle(slot.placement, e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                Enabled
              </label>
            </div>
            <AdminTextarea
              className="min-h-[100px] font-mono text-xs"
              placeholder="Paste ad code here…"
              value={drafts[slot.placement] ?? ""}
              onChange={(e) => setDrafts((d) => ({ ...d, [slot.placement]: e.target.value }))}
            />
            <Button
              size="sm"
              className="mt-3"
              disabled={saving === slot.placement}
              onClick={() => save(slot.placement)}
            >
              {saving === slot.placement ? "Saving…" : "Save code"}
            </Button>
          </AdminCard>
        ))}
      </div>
    </div>
  );
}
