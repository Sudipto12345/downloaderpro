import type { PlanId } from "@prisma/client";

export interface PlanLimit {
  id: PlanId;
  name: string;
  /** -1 = unlimited */
  maxDownloadsPerDay: number;
  /** Max video height in pixels */
  maxResolution: number;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimit> = {
  free: { id: "free", name: "Free", maxDownloadsPerDay: 10, maxResolution: 720 },
  pro: { id: "pro", name: "Pro", maxDownloadsPerDay: -1, maxResolution: 1080 },
  business: { id: "business", name: "Business", maxDownloadsPerDay: -1, maxResolution: 4320 },
};

export function getPlanLimit(planId: PlanId): PlanLimit {
  return PLAN_LIMITS[planId] ?? PLAN_LIMITS.free;
}

/** Start of the current day (server local time) as a Date. */
export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
