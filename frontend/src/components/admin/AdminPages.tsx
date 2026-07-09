import { useEffect, useState } from "react";
import {
  adminCreatePage,
  adminDeletePage,
  adminGetPages,
  adminUpdatePage,
  type AdminPageRecord,
} from "@/lib/db";
import {
  AdminBadge,
  AdminCard,
  AdminInput,
  AdminLoading,
  AdminPageHeader,
  AdminTextarea,
} from "@/components/admin/ui/AdminPrimitives";
import {
  defaultGuideSections,
  DOWNLOAD_FEATURES_HTML,
  DOWNLOAD_HOWTO_HTML,
  type CmsSection,
} from "@/lib/cmsPresets";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

export default function AdminPages() {
  const [pages, setPages] = useState<AdminPageRecord[]>([]);
  const [editing, setEditing] = useState<Partial<AdminPageRecord> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    adminGetPages()
      .then(setPages)
      .catch(() => setPages([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const sections = (editing?.sections ?? []) as CmsSection[];

  const setSections = (next: CmsSection[]) => {
    setEditing((prev) => (prev ? { ...prev, sections: next } : prev));
  };

  const startNew = () =>
    setEditing({
      slug: "",
      title: "",
      metaDescription: "",
      keywords: [],
      intro: "",
      sections: [{ heading: "", body: "" }],
      showDownloadBar: false,
      published: true,
      navLabel: "",
      order: pages.length,
    });

  const applyGuidePreset = () => {
    setEditing({
      id: editing?.id,
      slug: editing?.slug ?? "",
      title: editing?.title ?? "",
      metaDescription: editing?.metaDescription ?? "",
      keywords: editing?.keywords ?? [],
      intro:
        editing?.intro?.trim() ||
        "Paste a public video link in the box above to download it straight to your device — free, fast, and private.",
      sections: defaultGuideSections(),
      showDownloadBar: true,
      published: editing?.published ?? true,
      navLabel: editing?.navLabel ?? "",
      order: editing?.order ?? pages.length,
    });
  };

  const addSection = () => setSections([...sections, { heading: "", body: "" }]);

  const updateSection = (index: number, patch: Partial<CmsSection>) => {
    setSections(sections.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const removeSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  const insertPreset = (index: number, html: string) => {
    updateSection(index, { body: html });
  };

  const save = async () => {
    if (!editing?.slug || !editing.title) return;
    if (editing.id) {
      await adminUpdatePage(editing.id, editing);
    } else {
      await adminCreatePage(editing as Omit<AdminPageRecord, "id">);
    }
    setEditing(null);
    load();
  };

  if (loading) return <AdminLoading />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Content Pages"
        description="Create pages with HTML sections, styled download feature boxes, and an optional download bar."
        actions={
          <>
            <Button size="sm" variant="outline" onClick={applyGuidePreset}>
              New guide page preset
            </Button>
            <Button size="sm" onClick={startNew}>
              New page
            </Button>
          </>
        }
      />

      {editing && (
        <AdminCard>
          <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">SEO preview</p>
              <span className="text-xs text-slate-500">How search results may look</span>
            </div>
            <div className="rounded-lg border border-white bg-white p-3 shadow-sm">
              <p className="text-sm font-semibold text-blue-700">
                {(editing.title || "Untitled page").trim()}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {(editing.metaDescription || "Add a meta description to improve search snippets.").trim()}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {(editing.keywords && editing.keywords.length ? editing.keywords.join(", ") : "keywords")}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <AdminInput
              placeholder="slug (youtube-guide)"
              value={editing.slug ?? ""}
              onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
            />
            <AdminInput
              placeholder="Title"
              value={editing.title ?? ""}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            />
            <AdminInput
              placeholder="Nav label"
              value={editing.navLabel ?? ""}
              onChange={(e) => setEditing({ ...editing, navLabel: e.target.value })}
              className="sm:col-span-2"
            />
            <AdminInput
              placeholder="Meta description"
              value={editing.metaDescription ?? ""}
              onChange={(e) => setEditing({ ...editing, metaDescription: e.target.value })}
              className="sm:col-span-2"
            />
            <AdminInput
              placeholder="SEO keywords (comma separated)"
              value={(editing.keywords ?? []).join(", ")}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  keywords: e.target.value
                    .split(",")
                    .map((k) => k.trim())
                    .filter(Boolean),
                })
              }
              className="sm:col-span-2"
            />
            <AdminInput
              placeholder="Sitemap priority (0.0-1.0)"
              value={editing.order !== undefined ? String(editing.order) : "0"}
              onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) || 0 })}
              className="sm:col-span-2"
            />
            <AdminTextarea
              placeholder="Intro (plain text or HTML)"
              value={editing.intro ?? ""}
              onChange={(e) => setEditing({ ...editing, intro: e.target.value })}
              className="min-h-[80px] font-mono text-xs sm:col-span-2"
            />
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={editing.showDownloadBar ?? false}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setEditing((prev) => {
                    if (!prev) return prev;
                    const next = { ...prev, showDownloadBar: checked };
                    if (
                      checked &&
                      (!prev.sections?.length ||
                        (prev.sections.length === 1 && !prev.sections[0]?.body?.trim()))
                    ) {
                      next.sections = defaultGuideSections();
                      next.intro =
                        prev.intro?.trim() ||
                        "Paste a public video link in the box above to download it straight to your device — free, fast, and private.";
                    }
                    return next;
                  });
                }}
              />
              Show download search bar
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={editing.published ?? true}
                onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
              />
              Published
            </label>
          </div>

          <div className="mt-6 space-y-4 border-t border-slate-100 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">Sections (HTML supported)</p>
              <Button type="button" size="sm" variant="outline" onClick={addSection}>
                <Plus className="h-4 w-4" /> Add section
              </Button>
            </div>

            {sections.map((section, index) => (
              <div key={index} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Section {index + 1}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      onClick={() => insertPreset(index, DOWNLOAD_FEATURES_HTML)}
                    >
                      Features box
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      onClick={() => insertPreset(index, DOWNLOAD_HOWTO_HTML)}
                    >
                      How-to steps
                    </Button>
                    <button
                      type="button"
                      onClick={() => removeSection(index)}
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                      aria-label="Remove section"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <AdminInput
                  placeholder="Section heading"
                  value={section.heading ?? ""}
                  onChange={(e) => updateSection(index, { heading: e.target.value })}
                  className="mb-3"
                />
                <AdminTextarea
                  placeholder="Section body — HTML allowed (use preset buttons for styled download blocks)"
                  value={section.body}
                  onChange={(e) => updateSection(index, { body: e.target.value })}
                  className="min-h-[140px] font-mono text-xs"
                />
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={save}>
              Save page
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        </AdminCard>
      )}

      <AdminCard padding={false}>
        <ul className="divide-y divide-slate-100">
          {pages.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50/50"
            >
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">
                  /{p.slug} — {p.title}
                </p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {p.showDownloadBar && <AdminBadge>Download bar</AdminBadge>}
                  {!p.published && <AdminBadge variant="warning">Draft</AdminBadge>}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
                  Edit
                </Button>
                <button
                  type="button"
                  onClick={() => adminDeletePage(p.id).then(load)}
                  className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
          {pages.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-slate-500">No pages created yet</li>
          )}
        </ul>
      </AdminCard>
    </div>
  );
}
