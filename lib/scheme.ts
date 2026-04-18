import { createClient } from "@/lib/supabase/server";
import type { Scheme, SchemeMembership } from "@/lib/supabase/types";

/**
 * Returns the user's active scheme (first membership they have).
 * In v1, users belong to a single scheme; this selects the most recent membership.
 */
export async function getActiveScheme(): Promise<
  | { user: { id: string; email?: string | null }; scheme: Scheme; membership: SchemeMembership }
  | { user: { id: string; email?: string | null }; scheme: null; membership: null }
  | null
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: memberships } = await supabase
    .from("scheme_memberships")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  const membership = memberships?.[0] ?? null;
  if (!membership) {
    return { user: { id: user.id, email: user.email }, scheme: null, membership: null };
  }

  const { data: scheme } = await supabase
    .from("schemes")
    .select("*")
    .eq("id", membership.scheme_id)
    .single();

  if (!scheme) {
    return { user: { id: user.id, email: user.email }, scheme: null, membership: null };
  }

  return {
    user: { id: user.id, email: user.email },
    scheme: scheme as Scheme,
    membership: membership as SchemeMembership,
  };
}
