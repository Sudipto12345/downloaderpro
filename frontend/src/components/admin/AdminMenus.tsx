import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  adminCreateMenuItem,
  adminDeleteMenuItem,
  adminGetMenus,
  adminUpdateMenuItem,
  adminResetDefaultMenus,
  type AdminMenuItem,
} from "@/lib/db";
import {
  AdminCard,
  AdminInput,
  AdminLoading,
  AdminPageHeader,
  AdminSelect,
} from "@/components/admin/ui/AdminPrimitives";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  Edit2,
  ExternalLink,
  GripVertical,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type MenuType = "header" | "footer";

interface EditState {
  id: string;
  label: string;
  href: string;
  parentId: string;
  openInNew: boolean;
  order: number;
}

export default function AdminMenus() {
  const [items, setItems] = useState<AdminMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [activeMenu, setActiveMenu] = useState<MenuType>("header");
  const [form, setForm] = useState({
    menu: "header" as MenuType,
    label: "",
    href: "",
    column: 1,
    order: 0,
    parentId: "",
    openInNew: false,
  });
  const [addOpen, setAddOpen] = useState(false);

  const load = () => {
    setLoading(true);
    adminGetMenus()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminCreateMenuItem({
        ...form,
        column: form.menu === "footer" ? form.column : null,
        parentId: form.parentId || null,
        openInNew: form.openInNew,
      });
      setForm({ menu: activeMenu, label: "", href: "", column: 1, order: 0, parentId: "", openInNew: false });
      setAddOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: AdminMenuItem) => {
    setEditId(item.id);
    setEditState({
      id: item.id,
      label: item.label,
      href: item.href,
      parentId: item.parentId ?? "",
      openInNew: item.openInNew,
      order: item.order,
    });
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditState(null);
  };

  const saveEdit = async () => {
    if (!editState) return;
    setSaving(true);
    try {
      await adminUpdateMenuItem(editState.id, {
        label: editState.label,
        href: editState.href,
        parentId: editState.parentId || null,
        openInNew: editState.openInNew,
        order: editState.order,
      });
      cancelEdit();
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset all navigation menus to defaults? This will erase all current custom links.")) return;
    setLoading(true);
    try {
      await adminResetDefaultMenus();
      load();
    } catch {
      alert("Failed to reset defaults.");
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this menu item?")) return;
    await adminDeleteMenuItem(id);
    load();
  };

  if (loading) return <AdminLoading />;

  const menuItems = items.filter((i) => i.menu === activeMenu);
  const topLevel = menuItems.filter((i) => !i.parentId);
  const children = menuItems.filter((i) => i.parentId);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Navigation Menus"
        description="Manage header links and footer columns. Add dropdown submenus by selecting a parent item."
        actions={
          <div className="flex gap-2">
            <Button onClick={handleReset} variant="outline" size="sm">
              Reset Defaults
            </Button>
            <Button onClick={() => { setAddOpen(true); setForm((f) => ({ ...f, menu: activeMenu })); }} size="sm">
              <Plus className="mr-1.5 h-4 w-4" /> Add item
            </Button>
          </div>
        }
      />

      {/* Menu type tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-0">
        {(["header", "footer"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setActiveMenu(m)}
            className={cn(
              "rounded-t-lg px-5 py-2.5 text-sm font-semibold capitalize transition-colors",
              activeMenu === m
                ? "border border-b-white border-slate-200 bg-white text-violet-700 -mb-px"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {m} menu
          </button>
        ))}
      </div>

      {/* Add item form */}
      {addOpen && (
        <AdminCard>
          <h4 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
            <Plus className="h-4 w-4 text-violet-500" />
            Add {form.menu} menu item
          </h4>
          <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="lg:col-span-3">
              <AdminSelect
                value={form.menu}
                onChange={(e) => setForm({ ...form, menu: e.target.value as MenuType })}
              >
                <option value="header">Header menu</option>
                <option value="footer">Footer menu</option>
              </AdminSelect>
            </div>

            <AdminInput
              placeholder="Label (e.g. YouTube Downloader)"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              required
            />
            <AdminInput
              placeholder="URL / path (e.g. /youtube-downloader)"
              value={form.href}
              onChange={(e) => setForm({ ...form, href: e.target.value })}
              required
            />

            {/* Dropdown parent */}
            <AdminSelect
              value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
            >
              <option value="">No parent — top level</option>
              {items
                .filter((item) => item.menu === form.menu && !item.parentId)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    ↳ {item.label}
                  </option>
                ))}
            </AdminSelect>

            {form.menu === "footer" && (
              <AdminInput
                type="number"
                placeholder="Column"
                value={form.column}
                onChange={(e) => setForm({ ...form, column: Number(e.target.value) })}
              />
            )}

            <AdminInput
              type="number"
              placeholder="Order (0 = first)"
              value={form.order}
              onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
            />

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.openInNew}
                onChange={(e) => setForm({ ...form, openInNew: e.target.checked })}
                className="h-4 w-4 rounded"
              />
              Open in new tab
            </label>

            <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? "Adding…" : "Add item"}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </AdminCard>
      )}

      {/* Menu item list */}
      <AdminCard padding={false}>
        <div className="border-b border-slate-100 px-5 py-4">
          <h4 className="font-semibold capitalize text-slate-900">
            {activeMenu} menu items
            <span className="ml-2 text-xs font-normal text-slate-400">
              ({topLevel.length} top-level, {children.length} sub-items)
            </span>
          </h4>
          <p className="mt-1 text-xs text-slate-500">
            Sub-menu items appear as dropdown children of their parent in the nav bar.
          </p>
        </div>

        {menuItems.length === 0 && (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-slate-500">No items yet. Click "Add item" to get started.</p>
          </div>
        )}

        <ul className="divide-y divide-slate-100">
          {/* Top-level items */}
          {topLevel
            .sort((a, b) => a.order - b.order)
            .map((item) => {
              const sub = children.filter((c) => c.parentId === item.id).sort((a, b) => a.order - b.order);
              const isEditing = editId === item.id;

              return (
                <li key={item.id}>
                  {/* Parent item */}
                  <div
                    className={cn(
                      "flex items-start gap-3 px-5 py-3 transition-colors",
                      isEditing ? "bg-violet-50" : "hover:bg-slate-50/50"
                    )}
                  >
                    <GripVertical className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
                    <div className="min-w-0 flex-1">
                      {isEditing && editState ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <AdminInput
                            placeholder="Label"
                            value={editState.label}
                            onChange={(e) => setEditState({ ...editState, label: e.target.value })}
                          />
                          <AdminInput
                            placeholder="URL / path"
                            value={editState.href}
                            onChange={(e) => setEditState({ ...editState, href: e.target.value })}
                          />
                          <AdminSelect
                            value={editState.parentId}
                            onChange={(e) => setEditState({ ...editState, parentId: e.target.value })}
                          >
                            <option value="">No parent — top level</option>
                            {topLevel
                              .filter((t) => t.id !== item.id)
                              .map((t) => (
                                <option key={t.id} value={t.id}>↳ {t.label}</option>
                              ))}
                          </AdminSelect>
                          <AdminInput
                            type="number"
                            placeholder="Order"
                            value={editState.order}
                            onChange={(e) => setEditState({ ...editState, order: Number(e.target.value) })}
                          />
                          <label className="flex items-center gap-2 text-sm text-slate-600">
                            <input
                              type="checkbox"
                              checked={editState.openInNew}
                              onChange={(e) => setEditState({ ...editState, openInNew: e.target.checked })}
                              className="h-4 w-4 rounded"
                            />
                            Open in new tab
                          </label>
                          <div className="flex gap-2 sm:col-span-2">
                            <Button size="sm" onClick={saveEdit} disabled={saving}>
                              <Save className="mr-1.5 h-3.5 w-3.5" />
                              {saving ? "Saving…" : "Save"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEdit}>
                              <X className="mr-1.5 h-3.5 w-3.5" /> Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{item.label}</span>
                          <span className="text-xs text-slate-400">→</span>
                          <span className="truncate text-sm text-slate-500">{item.href}</span>
                          {item.openInNew && <ExternalLink className="h-3 w-3 text-slate-400" />}
                          {sub.length > 0 && (
                            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-600">
                              {sub.length} sub-item{sub.length !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {!isEditing && (
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="rounded-lg p-1.5 text-red-400 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Sub-items */}
                  {sub.map((child) => {
                    const isChildEditing = editId === child.id;
                    return (
                      <div
                        key={child.id}
                        className={cn(
                          "flex items-start gap-3 border-t border-slate-50 pl-10 pr-5 py-2.5 transition-colors",
                          isChildEditing ? "bg-violet-50" : "hover:bg-slate-50/30"
                        )}
                      >
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
                        <div className="min-w-0 flex-1">
                          {isChildEditing && editState ? (
                            <div className="grid gap-2 sm:grid-cols-2">
                              <AdminInput
                                placeholder="Label"
                                value={editState.label}
                                onChange={(e) => setEditState({ ...editState, label: e.target.value })}
                              />
                              <AdminInput
                                placeholder="URL / path"
                                value={editState.href}
                                onChange={(e) => setEditState({ ...editState, href: e.target.value })}
                              />
                              <AdminSelect
                                value={editState.parentId}
                                onChange={(e) => setEditState({ ...editState, parentId: e.target.value })}
                              >
                                <option value="">No parent — top level</option>
                                {topLevel.map((t) => (
                                  <option key={t.id} value={t.id}>↳ {t.label}</option>
                                ))}
                              </AdminSelect>
                              <AdminInput
                                type="number"
                                placeholder="Order"
                                value={editState.order}
                                onChange={(e) => setEditState({ ...editState, order: Number(e.target.value) })}
                              />
                              <div className="flex gap-2 sm:col-span-2">
                                <Button size="sm" onClick={saveEdit} disabled={saving}>
                                  <Save className="mr-1.5 h-3.5 w-3.5" />
                                  {saving ? "Saving…" : "Save"}
                                </Button>
                                <Button size="sm" variant="outline" onClick={cancelEdit}>
                                  <X className="mr-1.5 h-3.5 w-3.5" /> Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-700">{child.label}</span>
                              <span className="text-xs text-slate-400">→</span>
                              <span className="truncate text-xs text-slate-500">{child.href}</span>
                              {child.openInNew && <ExternalLink className="h-3 w-3 text-slate-400" />}
                            </div>
                          )}
                        </div>
                        {!isChildEditing && (
                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              onClick={() => startEdit(child)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(child.id)}
                              className="rounded-lg p-1.5 text-red-400 hover:bg-red-50"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </li>
              );
            })}

          {/* Orphaned children (parent deleted) */}
          {children
            .filter((c) => !topLevel.find((t) => t.id === c.parentId))
            .map((orphan) => (
              <li
                key={orphan.id}
                className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-slate-50/50"
              >
                <span className="min-w-0">
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                    orphaned
                  </span>{" "}
                  <strong className="text-slate-900">{orphan.label}</strong>
                  <span className="text-slate-500"> → {orphan.href}</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(orphan.id)}
                  className="shrink-0 rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
        </ul>
      </AdminCard>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
        <strong>How dropdowns work:</strong> Create a top-level item (e.g. "Tools"), then add
        sub-items with that item as their parent. Sub-items appear in a hover dropdown in the
        navbar. Changes take effect immediately after saving.
      </div>
    </div>
  );
}
