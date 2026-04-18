/**
 * Next.js instrumentation hook. Sentry wires in here when configured.
 * Falls back silently in dev / placeholder mode.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) return;
    try {
      const Sentry = await import("@sentry/nextjs");
      Sentry.init({
        dsn,
        tracesSampleRate: 0.1,
        enabled: true,
      });
    } catch (e) {
      console.warn("[sentry] init skipped:", (e as Error).message);
    }
  }
}

export async function onRequestError(
  err: unknown,
  request: Request,
): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(err, {
      extra: { url: request.url },
    });
  } catch {
    /* ignore */
  }
}
