"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { DisclaimerStrip } from "@/components/ui/disclaimer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateTime } from "@/lib/utils";
import { Send, Plus, BookOpen } from "lucide-react";

type Citation = { bylaw_number?: string; page?: number; chunk_id?: string };

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations: Citation[] | null;
  created_at: string;
}

interface Session {
  id: string;
  title: string | null;
  created_at: string;
}

const SUGGESTIONS = [
  "Do I have to reverse park?",
  "Can my visitor be towed?",
  "What records am I entitled to see?",
  "Are committee decisions binding if not minuted?",
];

export function ChatView({
  schemeId,
  schemeName,
  sessions,
  activeSessionId,
  initialMessages,
  autoAsk,
}: {
  schemeId: string;
  schemeName: string;
  sessions: Session[];
  activeSessionId: string | null;
  initialMessages: Message[];
  autoAsk?: string | null;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(activeSessionId);
  const [pending, setPending] = useState(false);
  const [streaming, setStreaming] = useState("");
  const [streamCitations, setStreamCitations] = useState<Citation[]>([]);
  const [drawer, setDrawer] = useState<{ id: string } | null>(null);
  const [autoAsked, setAutoAsked] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  useEffect(() => {
    if (autoAsk && !autoAsked && !activeSessionId) {
      setAutoAsked(true);
      void send(autoAsk);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoAsk, autoAsked, activeSessionId]);

  async function send(msg: string) {
    if (!msg.trim() || pending) return;
    const tempUser: Message = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content: msg,
      citations: null,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, tempUser]);
    setInput("");
    setPending(true);
    setStreaming("");
    setStreamCitations([]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schemeId, sessionId, message: msg }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        setStreaming(`⚠ ${err.error ?? "Chat error"}`);
        setPending(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let assembled = "";
      let meta: { sessionId?: string; citations?: Citation[] } = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const p of parts) {
          const lines = p.split("\n");
          const eventLine = lines.find((l) => l.startsWith("event:"));
          const dataLine = lines.find((l) => l.startsWith("data:"));
          if (!eventLine || !dataLine) continue;
          const event = eventLine.slice(7).trim();
          const data = JSON.parse(dataLine.slice(5).trim() || "{}");
          if (event === "meta") {
            meta = data;
            if (data.sessionId && !sessionId) setSessionId(data.sessionId);
            if (data.citations) setStreamCitations(data.citations);
          } else if (event === "token") {
            assembled += data.text ?? "";
            setStreaming(assembled);
          } else if (event === "done") {
            setMessages((m) => [
              ...m,
              {
                id: `asst-${Date.now()}`,
                role: "assistant",
                content: assembled,
                citations: meta.citations ?? streamCitations,
                created_at: new Date().toISOString(),
              },
            ]);
            setStreaming("");
            setStreamCitations([]);
          } else if (event === "error") {
            setStreaming(`⚠ ${data.error ?? "stream error"}`);
          }
        }
      }
      // If session was newly created, refresh session list
      if (!sessionId && meta.sessionId) {
        router.replace(`/chat?session=${meta.sessionId}`);
      }
    } finally {
      setPending(false);
    }
  }

  async function newSession() {
    router.push("/chat");
    setSessionId(null);
    setMessages([]);
  }

  return (
    <div className="flex h-screen">
      <aside className="w-64 shrink-0 border-r border-neutral-200 bg-white flex flex-col">
        <div className="px-4 py-3 border-b border-neutral-200">
          <Button variant="outline" size="sm" className="w-full" onClick={newSession}>
            <Plus className="h-4 w-4" /> New chat
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {sessions.map((s) => (
            <Link
              key={s.id}
              href={`/chat?session=${s.id}`}
              className={cn(
                "block px-3 py-2 rounded-lg text-sm hover:bg-neutral-50",
                sessionId === s.id && "bg-teal-50 text-teal-800",
              )}
            >
              <div className="font-medium truncate">
                {s.title || "Untitled chat"}
              </div>
              <div className="text-xs text-neutral-500">
                {formatDateTime(s.created_at)}
              </div>
            </Link>
          ))}
          {sessions.length === 0 ? (
            <p className="px-3 py-2 text-xs text-neutral-500">No chats yet.</p>
          ) : null}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="px-6 py-4 border-b border-neutral-200 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif-brand text-xl font-semibold">The Brain</h1>
              <p className="text-xs text-neutral-500">{schemeName}</p>
            </div>
          </div>
          <DisclaimerStrip className="mt-3" compact />
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {messages.length === 0 && !streaming ? (
            <div className="max-w-xl mx-auto space-y-3">
              <h2 className="font-serif-brand text-lg font-medium">
                Ask a question about your scheme&apos;s by-laws.
              </h2>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              onCitation={(id) => setDrawer({ id })}
            />
          ))}

          {streaming ? (
            <MessageBubble
              message={{
                id: "streaming",
                role: "assistant",
                content: streaming,
                citations: streamCitations,
                created_at: new Date().toISOString(),
              }}
              onCitation={(id) => setDrawer({ id })}
              streaming
            />
          ) : null}

          <div ref={endRef} />
        </div>

        <footer className="border-t border-neutral-200 bg-white px-6 py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2"
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a by-law, rule, or procedure…"
              className="flex-1 min-h-[60px] max-h-40"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
            />
            <Button type="submit" disabled={pending} className="h-[60px]">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </footer>
      </div>

      {drawer ? <CitationDrawer chunkId={drawer.id} onClose={() => setDrawer(null)} /> : null}
    </div>
  );
}

function MessageBubble({
  message,
  onCitation,
  streaming,
}: {
  message: Message;
  onCitation: (id: string) => void;
  streaming?: boolean;
}) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3 max-w-3xl mx-auto", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "rounded-lg px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
          isUser
            ? "bg-teal-700 text-white max-w-[80%]"
            : "bg-white border border-neutral-200 max-w-[85%]",
        )}
      >
        {message.content || (streaming ? "…" : "")}
        {!isUser && message.citations && message.citations.length > 0 ? (
          <div className="mt-3 pt-3 border-t border-neutral-100 flex flex-wrap gap-1.5">
            {message.citations.map((c, i) => (
              <button
                key={(c.chunk_id || i) + ""}
                onClick={() => c.chunk_id && onCitation(c.chunk_id)}
                className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs text-teal-800 hover:bg-teal-100"
              >
                <BookOpen className="h-3 w-3" />
                {c.bylaw_number ? `By-law ${c.bylaw_number}` : "Citation"}
                {c.page ? `, p.${c.page}` : ""}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CitationDrawer({ chunkId, onClose }: { chunkId: string; onClose: () => void }) {
  const [chunk, setChunk] = useState<{
    bylaw_number: string | null;
    heading: string | null;
    content: string;
    page_number: number | null;
  } | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("bylaws_chunks")
        .select("bylaw_number, heading, content, page_number")
        .eq("id", chunkId)
        .maybeSingle();
      if (data) setChunk(data as typeof chunk);
    })();
  }, [chunkId]);

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <div className="w-[480px] max-w-full bg-white border-l border-neutral-200 shadow-xl overflow-y-auto">
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="font-serif-brand text-lg font-semibold">Citation</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="px-6 py-6 space-y-3">
          {!chunk ? (
            <p className="text-sm text-neutral-500">Loading…</p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Badge>{chunk.bylaw_number ? `By-law ${chunk.bylaw_number}` : "Provision"}</Badge>
                {chunk.page_number ? (
                  <Badge variant="secondary">p.{chunk.page_number}</Badge>
                ) : null}
              </div>
              {chunk.heading ? (
                <p className="text-sm font-medium text-neutral-800">{chunk.heading}</p>
              ) : null}
              <p className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed">
                {chunk.content}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
