import type { SchemeRole } from "@/lib/supabase/types";

export const ONBOARDING_ROLES = [
  "owner",
  "tenant",
  "manager",
  "committee_chair",
] as const;

export type OnboardingRole = (typeof ONBOARDING_ROLES)[number];

export const ONBOARDING_ROLE_LABELS: Record<OnboardingRole, string> = {
  owner: "Lot owner",
  tenant: "Tenant",
  manager: "Body corporate manager",
  committee_chair: "Committee (chair or secretary)",
};

export const USER_METADATA_KEY = "onboarding_role" as const;

export function isOnboardingRole(s: string | null | undefined): s is OnboardingRole {
  return s !== null && s !== undefined && (ONBOARDING_ROLES as readonly string[]).includes(s);
}

export function toSchemeRole(choice: OnboardingRole): SchemeRole {
  return choice;
}

export function defaultSchemeRoleForNewUser(
  metadata: { [k: string]: unknown } | null | undefined,
): SchemeRole {
  const raw = metadata?.[USER_METADATA_KEY];
  if (typeof raw === "string" && isOnboardingRole(raw)) {
    return toSchemeRole(raw);
  }
  return "owner";
}
