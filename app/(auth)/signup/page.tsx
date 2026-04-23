"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  isOnboardingRole,
  ONBOARDING_ROLE_LABELS,
  USER_METADATA_KEY,
  type OnboardingRole,
} from "@/lib/auth/onboarding-role";

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const resolvedRole: OnboardingRole | null = isOnboardingRole(roleParam)
    ? roleParam
    : null;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (roleParam !== null && !resolvedRole) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invalid role</CardTitle>
          <CardDescription>Choose how you will use Parity to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/start">Choose your role</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!resolvedRole) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Choose your role first</CardTitle>
          <CardDescription>
            We need to know whether you are a resident, manager, or on the
            committee so we can set up the right experience.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/start">How will you use Parity?</Link>
          </Button>
          <p className="mt-4 text-center text-sm text-neutral-600">
            Already have an account?{" "}
            <Link href="/login" className="text-teal-700 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          [USER_METADATA_KEY]: resolvedRole,
        },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (data.session) {
      router.push("/onboarding");
      router.refresh();
    } else {
      setInfo("Check your email for a confirmation link.");
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Create your account</CardTitle>
          <Badge variant="secondary" className="text-xs font-normal">
            {ONBOARDING_ROLE_LABELS[resolvedRole]}
          </Badge>
        </div>
        <CardDescription>
          Free while in beta. Your data stays in Australia.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1"
            />
          </div>
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
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1"
            />
            <p className="mt-1 text-xs text-neutral-500">At least 8 characters.</p>
          </div>
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          {info ? (
            <p className="text-sm text-teal-700" role="status">
              {info}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-neutral-600">
          <Link
            href="/start"
            className="text-teal-700 font-medium hover:underline"
          >
            Change role
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-neutral-600">
          Already have an account?{" "}
          <Link href="/login" className="text-teal-700 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
