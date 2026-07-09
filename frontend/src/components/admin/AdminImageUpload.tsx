import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { adminUploadImage } from "@/lib/db";
import { type ImagePreset, presetFor, processImageFile } from "@/lib/imageProcess";
import { AdminInput } from "@/components/admin/ui/AdminPrimitives";
import { Button } from "@/components/ui/button";

export function AdminImageUpload({
  label,
  value,
  onChange,
  kind,
  hint,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  kind: ImagePreset;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const preset = presetFor(kind);

  const onPick = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const dataUrl = await processImageFile(file, kind);
      const { url } = await adminUploadImage(dataUrl, kind);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <span className="text-xs text-slate-500">{preset.label} · auto crop</span>
      </div>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          {busy ? "Processing…" : "Browse & upload"}
        </Button>
        {value && (
          <img src={value} alt="" className="h-12 w-12 rounded-lg border object-cover" />
        )}
      </div>
      <AdminInput
        placeholder="Or paste image URL"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
