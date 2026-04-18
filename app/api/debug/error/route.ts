/**
 * Forced-error endpoint — verifies Sentry wiring in production.
 * DO NOT REMOVE without updating the success criteria in SETUP.md.
 */
export const runtime = "nodejs";

export async function GET() {
  throw new Error("Parity Sentry smoke test: forced error at /api/_debug/error");
}
