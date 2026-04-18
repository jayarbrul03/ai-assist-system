/**
 * Central runtime config. Values fall back to labelled placeholders when
 * missing so the app always boots — real values are required only at the
 * point of external API call. This keeps `next build` green when Supabase /
 * Anthropic credentials have not yet been provisioned.
 *
 * AU residency: if SUPABASE_REGION is set and != ap-southeast-2 in prod,
 * we hard-fail at runtime from assertAuRegionAtRuntime().
 */

function read(name: string): string {
  const v = process.env[name];
  return v && v.length > 0 ? v : `__MISSING__${name}`;
}

function optional(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

export const config = {
  appUrl: read("NEXT_PUBLIC_APP_URL"),
  supabase: {
    url: read("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: read("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    serviceRoleKey: read("SUPABASE_SERVICE_ROLE_KEY"),
  },
  anthropic: {
    apiKey: read("ANTHROPIC_API_KEY"),
    chatModel: "claude-sonnet-4-5",
    fastModel: "claude-haiku-4-5",
  },
  voyage: {
    apiKey: read("VOYAGE_API_KEY"),
    model: "voyage-3",
    dimensions: 1024,
  },
  resend: {
    apiKey: optional("RESEND_API_KEY"),
  },
  sentry: {
    dsn: optional("SENTRY_DSN"),
    publicDsn: optional("NEXT_PUBLIC_SENTRY_DSN"),
  },
  posthog: {
    key: optional("NEXT_PUBLIC_POSTHOG_KEY"),
    host: optional("NEXT_PUBLIC_POSTHOG_HOST") ?? "https://app.posthog.com",
  },
  limits: {
    chatMessagesPerDay: 20,
    evidenceAnalysesPerDay: 10,
    draftGenerationsPerDay: 5,
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

/**
 * Call this at request time (not import time) before any external API call
 * that absolutely requires a real credential.
 */
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
