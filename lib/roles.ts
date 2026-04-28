import type { SchemeRole } from "@/lib/supabase/types";

const LEADERSHIP: SchemeRole[] = [
  "committee_chair",
  "committee_member",
  "manager",
];

export function isLeadershipRole(role: SchemeRole | string | null | undefined): boolean {
  if (!role) return false;
  return (LEADERSHIP as string[]).includes(role);
}

/** Lot owners, tenants, observers: resident-facing tools (e.g. guided “My case”). */
export function isResidentRole(role: SchemeRole | string | null | undefined): boolean {
  if (!role) return false;
  return (
    role === "owner" || role === "tenant" || role === "observer"
  );
}

export function isManagerRole(role: SchemeRole | string | null | undefined): boolean {
  return role === "manager";
}

export function isCommitteeRole(role: SchemeRole | string | null | undefined): boolean {
  return role === "committee_chair" || role === "committee_member";
}

/**
 * Drives which primary dashboard / nav experience to show.
 * - `resident` — lot owner, tenant, observer
 * - `manager` — body corporate manager
 * - `committee` — committee (body corporate as elected body, communication & governance)
 */
export function getRoleSegment(
  role: SchemeRole | string | null | undefined,
): "resident" | "manager" | "committee" {
  if (isManagerRole(role)) return "manager";
  if (isCommitteeRole(role)) return "committee";
  return "resident";
}
