export interface GscPayload {
  verificationContent?: string;
  propertyUrl?: string;
  googleAnalyticsId?: string;
  customHeadHtml?: string;
}

export function normalizeGscPayload(data: Partial<GscPayload> = {}): Partial<GscPayload> {
  const normalize = (value: unknown): string | undefined => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  };

  return {
    verificationContent: normalize(data.verificationContent),
    propertyUrl: normalize(data.propertyUrl),
    googleAnalyticsId: normalize(data.googleAnalyticsId),
    customHeadHtml: normalize(data.customHeadHtml),
  };
}
