import type { Plan, PlanId } from "./db";
import { getPlan } from "./db";

/** Vite dev server — unlimited downloads & max quality for local development. */
export const isDevUnlimited = import.meta.env.DEV;

export function getEffectivePlan(id: PlanId): Plan {
  const plan = getPlan(id);
  if (!isDevUnlimited) return plan;
  return {
    ...plan,
    maxDownloadsPerDay: -1,
    maxResolution: 4320,
  };
}
