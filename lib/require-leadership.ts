import { redirect } from "next/navigation";
import { getActiveScheme } from "@/lib/scheme";
import { isLeadershipRole } from "@/lib/roles";

/**
 * For server components / route handlers: leadership (committee or manager) only.
 */
export async function requireLeadership(redirectTo = "/dashboard") {
  const ctx = await getActiveScheme();
  if (!ctx) redirect("/login");
  if (!ctx.scheme) redirect("/onboarding");
  if (!isLeadershipRole(ctx.membership?.role)) {
    redirect(redirectTo);
  }
  return ctx;
}
