import { createServiceClient } from "@/lib/supabase/server";
import { config } from "@/lib/config";

type RateLimitKind = "chat_message" | "evidence_analyse" | "draft_generation";

const KIND_MAP: Record<RateLimitKind, { action: string; limit: number }> = {
  chat_message: {
    action: "chat_message",
    limit: config.limits.chatMessagesPerDay,
  },
  evidence_analyse: {
    action: "evidence_created",
    limit: config.limits.evidenceAnalysesPerDay,
  },
  draft_generation: {
    action: "comms_drafted",
    limit: config.limits.draftGenerationsPerDay,
  },
};

/**
 * Enforces a per-user daily rate limit by counting audit_log rows
 * of the relevant action from the last 24 hours.
 * Returns { ok: true } if under limit, { ok: false, remaining: 0 } otherwise.
 */
export async function checkRateLimit(
  userId: string,
  kind: RateLimitKind,
): Promise<{ ok: boolean; remaining: number; limit: number }> {
  const { action, limit } = KIND_MAP[kind];
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    const supabase = createServiceClient();
    const { count, error } = await supabase
      .from("audit_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("action", action)
      .gte("created_at", since);

    if (error) throw error;
    const used = count ?? 0;
    return { ok: used < limit, remaining: Math.max(0, limit - used), limit };
  } catch {
    // Fail open in dev / placeholder mode — never block users due to infra fault.
    return { ok: true, remaining: limit, limit };
  }
}
