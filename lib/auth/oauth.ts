/**
 * Build Supabase OAuth return URL. Supabase redirects here with ?code= after the IdP.
 * Optional onboarding_role is applied in /api/auth/callback for new OAuth users.
 */

export function safePathAfterAuth(
  path: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (path == null || path === "") return fallback;
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return fallback;
  }
  return path;
}

export function buildAuthCallbackUrl(
  origin: string,
  options: { redirect: string; onboardingRole?: string },
): string {
  const url = new URL("/api/auth/callback", origin);
  url.searchParams.set(
    "redirect",
    safePathAfterAuth(options.redirect, "/dashboard"),
  );
  if (options.onboardingRole) {
    url.searchParams.set("onboarding_role", options.onboardingRole);
  }
  return url.toString();
}
