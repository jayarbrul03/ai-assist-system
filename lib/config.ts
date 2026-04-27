/**
 * Central runtime config.
 *
 * IMPORTANT: NEXT_PUBLIC_* variables are read via direct literal accessor so
 * Next.js / Turbopack can statically inline them into the client bundle.
 * Dynamic process.env[name] lookups do NOT get inlined, causing the client
 * bundle to see `undefined` and fall through to the placeholder.
 *
 * Server-only secrets are read through the helper and never leak to the
 * client.
 */

function coalesce(v: string | undefined, name: string): string {
  return v && v.length > 0 ? v : `__MISSING__${name}`;
}

function optional(v: string | undefined): string | undefined {
  return v && v.length > 0 ? v : undefined;
}

export const config = {
  appUrl: coalesce(process.env.NEXT_PUBLIC_APP_URL, "NEXT_PUBLIC_APP_URL"),
  supabase: {
    url: coalesce(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      "NEXT_PUBLIC_SUPABASE_URL",
    ),
    anonKey: coalesce(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ),
    serviceRoleKey: coalesce(
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      "SUPABASE_SERVICE_ROLE_KEY",
    ),
  },
  anthropic: {
    apiKey: coalesce(process.env.ANTHROPIC_API_KEY, "ANTHROPIC_API_KEY"),
    chatModel: "claude-sonnet-4-5",
    fastModel: "claude-haiku-4-5",
  },
  voyage: {
    apiKey: coalesce(process.env.VOYAGE_API_KEY, "VOYAGE_API_KEY"),
    model: "voyage-3",
    dimensions: 1024,
  },
  resend: {
    apiKey: optional(process.env.RESEND_API_KEY),
  },
  sentry: {
    dsn: optional(process.env.SENTRY_DSN),
    publicDsn: optional(process.env.NEXT_PUBLIC_SENTRY_DSN),
  },
  posthog: {
    key: optional(process.env.NEXT_PUBLIC_POSTHOG_KEY),
    host:
      optional(process.env.NEXT_PUBLIC_POSTHOG_HOST) ??
      "https://app.posthog.com",
  },
  limits: {
    chatMessagesPerDay: 20,
    evidenceAnalysesPerDay: 10,
    draftGenerationsPerDay: 5,
    inboxAiBatchesPerDay: 25,
    inboxDraftRepliesPerDay: 20,
  },
  rag: {
    similarityThreshold: 0.7,
    topK: 5,
  },
} as const;

export function isMissing(value: string): boolean {
  return value.startsWith("__MISSING__") || value.includes("placeholder");
}

export function isPlaceholderConfig(): boolean {
  return (
    isMissing(config.supabase.url) ||
    isMissing(config.supabase.anonKey) ||
    isMissing(config.anthropic.apiKey)
  );
}

export function requireRealConfig(scope: "supabase" | "anthropic" | "voyage") {
  if (scope === "supabase" && isMissing(config.supabase.url)) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. See SETUP.md.",
    );
  }
  if (scope === "anthropic" && isMissing(config.anthropic.apiKey)) {
    throw new Error(
      "Anthropic is not configured. Set ANTHROPIC_API_KEY. See SETUP.md.",
    );
  }
  if (scope === "voyage" && isMissing(config.voyage.apiKey)) {
    throw new Error(
      "Voyage embeddings are not configured. Set VOYAGE_API_KEY. See SETUP.md.",
    );
  }
}

export function assertAuRegionAtRuntime() {
  const region = process.env.SUPABASE_REGION;
  if (region && region !== "ap-southeast-2") {
    throw new Error(
      `Supabase region must be ap-southeast-2 (Sydney); got ${region}`,
    );
  }
}
