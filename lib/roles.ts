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
