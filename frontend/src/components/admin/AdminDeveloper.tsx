import { useEffect, useState } from "react";
import { adminGetDeveloperControls, adminUpdateDeveloperControls } from "@/lib/db";
import {
  AdminCard,
  AdminLoading,
  AdminPageHeader,
  AdminTextarea,
} from "@/components/admin/ui/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { Power, PowerOff } from "lucide-react";

export default function AdminDeveloper() {
  const [controls, setControls] = useState({
    siteOnline: true,
    downloadToolEnabled: true,
    maintenanceMessage: "",
  });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    adminGetDeveloperControls()
      .then(setControls)
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    await adminUpdateDeveloperControls(controls);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <AdminLoading />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Developer Controls"
        description="Hidden site switches — only visible to the developer account. Other admins cannot see this panel or your account."
        actions={<Button onClick={save}>{saved ? "Saved!" : "Save controls"}</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <AdminCard>
          <label className="flex cursor-pointer items-start gap-4">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={controls.siteOnline}
              onChange={(e) => setControls({ ...controls, siteOnline: e.target.checked })}
            />
            <div>
              <p className="flex items-center gap-2 font-semibold text-slate-900">
                {controls.siteOnline ? (
                  <Power className="h-4 w-4 text-emerald-600" />
                ) : (
                  <PowerOff className="h-4 w-4 text-red-600" />
                )}
                Site online
              </p>
              <p className="mt-1 text-xs text-slate-500">
                When off, visitors see a maintenance screen instead of the downloader.
              </p>
            </div>
          </label>
        </AdminCard>

        <AdminCard>
          <label className="flex cursor-pointer items-start gap-4">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4"
              checked={controls.downloadToolEnabled}
              onChange={(e) => setControls({ ...controls, downloadToolEnabled: e.target.checked })}
            />
            <div>
              <p className="font-semibold text-slate-900">Download tool enabled</p>
              <p className="mt-1 text-xs text-slate-500">
                Turn off the search bar and download actions while keeping pages visible.
              </p>
            </div>
          </label>
        </AdminCard>
      </div>

      <AdminCard>
        <h4 className="mb-3 text-sm font-bold text-slate-900">Maintenance message</h4>
        <AdminTextarea
          value={controls.maintenanceMessage}
          onChange={(e) => setControls({ ...controls, maintenanceMessage: e.target.value })}
          placeholder="Shown when the site is taken offline."
        />
      </AdminCard>
    </div>
  );
}
