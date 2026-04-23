import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isOnboardingRole,
  USER_METADATA_KEY,
} from "@/lib/auth/onboarding-role";
import { safePathAfterAuth } from "@/lib/auth/oauth";

/**
 * PKCE OAuth callback: exchange ?code= for a session, optionally set
 * user metadata from ?onboarding_role= (new Google sign-ups from /signup), then redirect.
 * Configure redirect URLs in Supabase Dashboard → Authentication → URL configuration.
 * Enable Google (or other IdPs) under Sign In / Providers.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const nextPath = safePathAfterAuth(
    searchParams.get("redirect"),
    "/dashboard",
  );
  const onboardingRole = searchParams.get("onboarding_role");

  if (oauthError) {
    const message = errorDescription || oauthError;
    const to = new URL("/login", origin);
    to.searchParams.set("error", message.slice(0, 200));
    return NextResponse.redirect(to);
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/login?error=missing+authorization+code",
        origin,
      ),
    );
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
    code,
  );
  if (exchangeError) {
    const to = new URL("/login", origin);
    to.searchParams.set("error", exchangeError.message);
    return NextResponse.redirect(to);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (
    user &&
    isOnboardingRole(onboardingRole) &&
    (user.user_metadata as Record<string, unknown>)?.[USER_METADATA_KEY] == null
  ) {
    const { error: updateErr } = await supabase.auth.updateUser({
      data: { [USER_METADATA_KEY]: onboardingRole },
    });
    if (updateErr) {
      console.warn("[auth/callback] updateUser metadata:", updateErr.message);
    }
  }

  return NextResponse.redirect(new URL(nextPath, origin).toString());
}
