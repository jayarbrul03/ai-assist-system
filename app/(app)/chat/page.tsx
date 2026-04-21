import { redirect } from "next/navigation";
import { getActiveScheme } from "@/lib/scheme";
import { createClient } from "@/lib/supabase/server";
import { ChatView } from "./chat-view";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; q?: string }>;
}) {
  const ctx = await getActiveScheme();
  if (!ctx) redirect("/login");
  if (!ctx.scheme) redirect("/onboarding");

  const supabase = await createClient();
  const { data: sessions } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("user_id", ctx.user.id)
    .eq("scheme_id", ctx.scheme.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const sp = await searchParams;
  const activeSessionId = sp.session ?? null;
  const autoAsk = sp.q ?? null;

  let messages: Array<{
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    citations: Array<{ bylaw_number?: string; page?: number; chunk_id?: string }> | null;
    created_at: string;
  }> = [];

  if (activeSessionId) {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", activeSessionId)
      .order("created_at", { ascending: true });
    messages = (data as typeof messages) ?? [];
  }

  return (
    <ChatView
      schemeId={ctx.scheme.id}
      schemeName={ctx.scheme.name}
      sessions={(sessions ?? []) as Array<{ id: string; title: string | null; created_at: string }>}
      activeSessionId={activeSessionId}
      initialMessages={messages}
      autoAsk={autoAsk}
    />
  );
}
