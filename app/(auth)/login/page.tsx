"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

type DevRole = "owner" | "tenant" | "committee" | "manager";

const DEV_BUTTONS: Array<{ key: DevRole; label: string; hint: string }> = [
  { key: "owner", label: "Enter as Lot Owner", hint: "Lot 12 · full case-file toolkit" },
  { key: "tenant", label: "Enter as Tenant", hint: "Lot 24 · restricted standing view" },
  { key: "committee", label: "Enter as Committee Chair", hint: "Lot 7 · scheme oversight" },
  { key: "manager", label: "Enter as Body Corp Manager", hint: "External · scheme operator" },
];

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devRole, setDevRole] = useState<DevRole | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push(redirect);
    router.refresh();
  }

  async function onGoogle() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    });
  }

  async function devEnter(role: DevRole) {
    setLoading(true);
    setError(null);
    setDevRole(role);
    try {
      const res = await fetch("/api/dev/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const { email: em, password: pw } = await res.json();
      const supabase = createClient();
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: em,
        password: pw,
      });
      if (signErr) throw signErr;
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Dev login failed");
      setLoading(false);
      setDevRole(null);
    }
  }

  const isDev =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your Parity account.</CardDescription>
      </CardHeader>
      <CardContent>
        {isDev ? (
          <div className="mb-6 rounded-lg border border-teal-200 bg-teal-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="warning">DEV</Badge>
              <p className="text-sm font-medium text-teal-900">
                One-click entry (bypasses email confirmation)
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEV_BUTTONS.map((b) => (
                <Button
                  key={b.key}
                  type="button"
                  variant="outline"
                  className="justify-start h-auto py-2 flex flex-col items-start text-left"
                  disabled={loading}
                  onClick={() => devEnter(b.key)}
                >
                  <span className="font-medium text-sm">
                    {devRole === b.key && loading ? "Entering…" : b.label}
                  </span>
                  <span className="text-xs text-neutral-500">{b.hint}</span>
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1"
            />
          </div>
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && !devRole ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-neutral-500">
          <div className="h-px flex-1 bg-neutral-200" />
          <span>or</span>
          <div className="h-px flex-1 bg-neutral-200" />
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onGoogle}
          disabled={loading}
        >
          Continue with Google
        </Button>

        <p className="mt-6 text-center text-sm text-neutral-600">
          New here?{" "}
          <Link href="/signup" className="text-teal-700 font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
