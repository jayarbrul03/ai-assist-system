"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";
    if (!key) return;
    posthog.init(key, {
      api_host: host,
      capture_pageview: true,
      disable_session_recording: true,
    });
  }, []);
  return <>{children}</>;
}
