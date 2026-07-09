import { TOOLS, type Tool } from "@/data/tools";
import type { PlatformId } from "@/components/logos/PlatformLogo";

export interface PlatformNavItem {
  platformId: PlatformId;
  slug: string;
  label: string;
  home?: boolean;
}

export function orderTools(slugs: string[] | undefined): Tool[] {
  if (!slugs?.length) return TOOLS;
  const map = new Map(TOOLS.map((t) => [t.slug, t]));
  const ordered: Tool[] = [];
  for (const slug of slugs) {
    const tool = map.get(slug);
    if (tool) {
      ordered.push(tool);
      map.delete(slug);
    }
  }
  for (const tool of map.values()) ordered.push(tool);
  return ordered;
}

export function toolsToPlatformNav(tools: Tool[]): PlatformNavItem[] {
  return tools.map((t) => ({
    platformId: t.platformId,
    slug: t.slug,
    label: t.platform,
    home: t.slug === "video-downloader",
  }));
}

export function useOrderedToolsFromConfig(toolOrder?: string[]): Tool[] {
  return orderTools(toolOrder);
}
