export type ImagePreset = "logo" | "favicon" | "og" | "general";

const PRESETS: Record<ImagePreset, { width: number; height: number; label: string }> = {
  logo: { width: 256, height: 256, label: "Logo (256×256)" },
  favicon: { width: 64, height: 64, label: "Favicon (64×64)" },
  og: { width: 1200, height: 630, label: "Share image (1200×630)" },
  general: { width: 1024, height: 1024, label: "General (1024×1024)" },
};

export function presetFor(kind: ImagePreset) {
  return PRESETS[kind];
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image file."));
    };
    img.src = url;
  });
}

/** Center-crop and resize to target dimensions; returns WebP data URL. */
export async function processImageFile(
  file: File,
  kind: ImagePreset
): Promise<string> {
  const { width, height } = PRESETS[kind];
  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported.");

  const scale = Math.max(width / img.width, height / img.height);
  const sw = width / scale;
  const sh = height / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);

  const dataUrl = canvas.toDataURL("image/webp", 0.88);
  if (!dataUrl || dataUrl.length < 40) {
    throw new Error("Failed to process image.");
  }
  return dataUrl;
}
