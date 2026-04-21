#!/usr/bin/env node
// E2E smoke: dev login → signin → follow redirects until stable.
// Detects redirect loops (flickers).

const BASE = "http://localhost:3004";

// 1. Dev login endpoint creates/resets user
const devRes = await fetch(`${BASE}/api/dev/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ role: "owner" }),
});
const devJson = await devRes.json();
console.log("dev-login:", devJson.email, "scheme:", devJson.schemeId);

// 2. Supabase signin → get cookies
const sbUrl = "https://lccshdbtwnjdzsmlebef.supabase.co";
const anon =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjY3NoZGJ0d25qZHpzbWxlYmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MTc3MTEsImV4cCI6MjA4OTk5MzcxMX0.A7HiVQ7QXCMGPxVLJSSMw9J0Rlv4FafHlzX9pD0d3N4";

const signRes = await fetch(
  `${sbUrl}/auth/v1/token?grant_type=password`,
  {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email: devJson.email, password: devJson.password }),
  },
);
const session = await signRes.json();
if (!session.access_token) {
  console.error("signin FAILED:", session);
  process.exit(1);
}
console.log("signin: ok, user", session.user?.id);

// 3. Build Supabase SSR cookie (base64 JSON session)
// @supabase/ssr stores session as chunks under name sb-<ref>-auth-token[.0|.1|...]
const ref = "lccshdbtwnjdzsmlebef";
const sessionObj = {
  access_token: session.access_token,
  refresh_token: session.refresh_token,
  token_type: "bearer",
  expires_in: session.expires_in,
  expires_at: Math.floor(Date.now() / 1000) + session.expires_in,
  user: session.user,
};
const sessionB64 =
  "base64-" +
  Buffer.from(JSON.stringify(sessionObj)).toString("base64").replace(/=+$/, "");
// Supabase SSR chunks cookies at ~3600 bytes. For the smoke test, one chunk.
const cookieName = `sb-${ref}-auth-token`;

// 4. Follow redirects manually to detect loops
async function hop(url, hops = 0) {
  if (hops > 8) return { loop: true, url };
  const r = await fetch(url, {
    headers: { cookie: `${cookieName}=${sessionB64}` },
    redirect: "manual",
  });
  const loc = r.headers.get("location");
  console.log(`hop[${hops}] ${url.replace(BASE, "")} → ${r.status} ${loc ?? ""}`);
  if (r.status === 307 || r.status === 308 || r.status === 302) {
    const next = loc?.startsWith("http") ? loc : `${BASE}${loc}`;
    return hop(next, hops + 1);
  }
  return { status: r.status, url };
}

console.log("--- /dashboard ---");
await hop(`${BASE}/dashboard`);
console.log("--- /onboarding ---");
await hop(`${BASE}/onboarding`);
