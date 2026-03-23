export const PLAN_LIMITS = {
  FREE: {
    maxProducts: 2,
    maxEvents: 1,
    maxCampaigns: 1,
    maxCollaborators: 1,
  },
  PRO: {
    maxProducts: Infinity,
    maxEvents: Infinity,
    maxCampaigns: Infinity,
    maxCollaborators: Infinity,
  },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;

export function getPlanLimits(plan: string) {
  return PLAN_LIMITS[plan as Plan] ?? PLAN_LIMITS.FREE;
}
