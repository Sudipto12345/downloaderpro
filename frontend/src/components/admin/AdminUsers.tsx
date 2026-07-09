import { useEffect, useState } from "react";
import {
  adminCreateUser,
  adminDeleteUser,
  adminGetUsers,
  adminUpdateUser,
  type AdminUser,
} from "@/lib/db";
import {
  AdminBadge,
  AdminCard,
  AdminInput,
  AdminLoading,
  AdminPageHeader,
} from "@/components/admin/ui/AdminPrimitives";
import { Button } from "@/components/ui/button";
import { Pencil, Search, Shield, Trash2, UserPlus } from "lucide-react";

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [editForm, setEditForm] = useState({ name: "", password: "", totpExempt: true });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refreshList = () => {
    setLoading(true);
    adminGetUsers()
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refreshList();
  }, []);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await adminCreateUser({ ...form, totpExempt: true });
      setForm({ name: "", email: "", password: "" });
      setShowForm(false);
      refreshList();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create admin.");
    }
  };

  const startEdit = (user: AdminUser) => {
    setEditing(user);
    setEditForm({ name: user.name, password: "", totpExempt: user.totpExempt ?? true });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setError("");
    try {
      await adminUpdateUser(editing.id, {
        name: editForm.name,
        ...(editForm.password ? { password: editForm.password } : {}),
        totpExempt: editForm.totpExempt,
      });
      setEditing(null);
      refreshList();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update admin.");
    }
  };

  const handleDelete = async (user: AdminUser) => {
    if (user.isSuperAdmin) {
      alert("Main administrator cannot be removed.");
      return;
    }
    if (!confirm(`Remove admin access for ${user.email}?`)) return;
    await adminDeleteUser(user.id).catch(() => undefined);
    refreshList();
  };

  if (loading) return <AdminLoading />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Administrator Accounts"
        description="Create admins, update passwords, and manage access. Two-factor auth is optional (off by default)."
        actions={
          <Button size="sm" onClick={() => setShowForm((v) => !v)}>
            <UserPlus className="h-4 w-4" /> Add admin
          </Button>
        }
      />

      {showForm && (
        <AdminCard>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-3">
            <AdminInput
              placeholder="Full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <AdminInput
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <AdminInput
              type="password"
              placeholder="Password (min 8 chars)"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={8}
              required
            />
            {error && <p className="text-sm text-red-600 sm:col-span-3">{error}</p>}
            <div className="sm:col-span-3">
              <Button type="submit" size="sm">
                Create administrator
              </Button>
            </div>
          </form>
        </AdminCard>
      )}

      {editing && (
        <AdminCard>
          <h4 className="mb-4 font-semibold text-slate-900">Edit {editing.email}</h4>
          <form onSubmit={handleUpdate} className="grid gap-4 sm:grid-cols-2">
            <AdminInput
              placeholder="Name"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              required
            />
            <AdminInput
              type="password"
              placeholder="New password (leave blank to keep)"
              value={editForm.password}
              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              minLength={8}
            />
            <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-2">
              <input
                type="checkbox"
                checked={editForm.totpExempt}
                onChange={(e) => setEditForm({ ...editForm, totpExempt: e.target.checked })}
              />
              Skip two-factor authentication (OTP off)
            </label>
            {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" size="sm">
                Save changes
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </AdminCard>
      )}

      <AdminCard padding={false}>
        <div className="border-b border-slate-100 p-4 sm:p-5">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <AdminInput
              placeholder="Search administrators…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3 font-semibold">Administrator</th>
                <th className="px-5 py-3 font-semibold">2FA</th>
                <th className="px-5 py-3 font-semibold">Joined</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {item.isSuperAdmin && <Shield className="h-4 w-4 text-amber-500" />}
                      <div>
                        <p className="font-semibold text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <AdminBadge variant={item.totpExempt ? "default" : item.totpEnabled ? "success" : "warning"}>
                      {item.totpExempt ? "OTP off" : item.totpEnabled ? "Enabled" : "Pending"}
                    </AdminBadge>
                  </td>
                  <td className="px-5 py-4 text-slate-500">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                        title="Edit admin"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {!item.isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                          title="Remove admin"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  );
}
