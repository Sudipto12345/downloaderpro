import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const TEMP_ROOT = resolve(import.meta.dirname ?? ".", "../../tmp");

export function getTempStorageInfo(): { fileCount: number; totalBytes: number } {
  if (!existsSync(TEMP_ROOT)) {
    return { fileCount: 0, totalBytes: 0 };
  }

  let fileCount = 0;
  let totalBytes = 0;

  function walk(dir: string) {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      const p = join(dir, name);
      try {
        const st = statSync(p);
        if (st.isDirectory()) {
          walk(p);
        } else {
          fileCount++;
          totalBytes += st.size;
        }
      } catch {
        /* skip */
      }
    }
  }

  walk(TEMP_ROOT);
  return { fileCount, totalBytes };
}

export function purgeTempStorage(): { removedDirs: number } {
  if (!existsSync(TEMP_ROOT)) {
    return { removedDirs: 0 };
  }
  let removedDirs = 0;
  try {
    const entries = readdirSync(TEMP_ROOT);
    for (const name of entries) {
      const p = join(TEMP_ROOT, name);
      try {
        if (statSync(p).isDirectory()) {
          rmSync(p, { recursive: true, force: true });
          removedDirs++;
        }
      } catch {
        /* skip */
      }
    }
  } catch {
    /* ignore */
  }
  return { removedDirs };
}
