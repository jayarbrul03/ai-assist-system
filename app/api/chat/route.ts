import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getAnthropic, MODELS } from "@/lib/claude/client";
import {
  RULEBOOK_SYSTEM_PROMPT,
  RULEBOOK_NO_MATCH_RESPONSE,
  DISCLAIMER,
} from "@/lib/claude/prompts";
import { searchBylaws, formatCitationsForPrompt } from "@/lib/claude/rag";
import { checkRateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { config, isMissing } from "@/lib/config";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ChatRequestBody {
  sessionId?: string;
  schemeId: string;
  message: string;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const body = (await req.json()) as ChatRequestBody;
  if (!body?.message || !body?.schemeId) {
    return NextResponse.json({ error: "missing schemeId or message" }, { status: 400 });
  }

  // Rate limit
  const rl = await checkRateLimit(user.id, "chat_message");
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Daily chat limit reached (${rl.limit}).` },
      { status: 429 },
    );
  }

  // Membership check
  const { data: membership } = await supabase
    .from("scheme_memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("scheme_id", body.schemeId)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "not a member" }, { status: 403 });
  }

  // Ensure session exists
  let sessionId = body.sessionId ?? null;
  if (!sessionId) {
    const { data: s } = await supabase
      .from("chat_sessions")
      .insert({
        user_id: user.id,
        scheme_id: body.schemeId,
        title: body.message.slice(0, 80),
      })
      .select("*")
      .single();
    sessionId = s?.id ?? null;
  }

  if (!sessionId) {
    return NextResponse.json({ error: "could not create session" }, { status: 500 });
  }

  // Persist user message
  await supabase.from("chat_messages").insert({
    session_id: sessionId,
    role: "user",
    content: body.message,
  });

  // RAG lookup
  const hits = await searchBylaws(supabase, body.schemeId, body.message);

  // If no hit above threshold, return the canonical "cannot find" response.
  if (hits.length === 0) {
    await supabase.from("chat_messages").insert({
      session_id: sessionId,
      role: "assistant",
      content: RULEBOOK_NO_MATCH_RESPONSE,
      citations: [],
    });
    await audit({
      action: "chat_message",
      entityType: "chat_messages",
      entityId: sessionId,
      schemeId: body.schemeId,
      metadata: { no_match: true, query: body.message.slice(0, 120) },
    });
    return streamOnce(RULEBOOK_NO_MATCH_RESPONSE, sessionId, []);
  }

  const contextBlock = formatCitationsForPrompt(hits);

  const citations = hits.map((h) => ({
    chunk_id: h.id,
    bylaw_number: h.bylaw_number ?? undefined,
    page: h.page_number ?? undefined,
  }));

  // If no Anthropic key, synth a deterministic but safe answer.
  if (isMissing(config.anthropic.apiKey)) {
    const fallback = fallbackAnswer(body.message, hits);
    const service = createServiceClient();
    await service.from("chat_messages").insert({
      session_id: sessionId,
      role: "assistant",
      content: fallback,
      citations,
    });
    await audit({
      action: "chat_message",
      entityType: "chat_messages",
      entityId: sessionId,
      schemeId: body.schemeId,
      metadata: { placeholder: true },
    });
    return streamOnce(fallback, sessionId, citations);
  }

  // Live Claude streaming
  const stream = await getAnthropic().messages.stream({
    model: MODELS.chat,
    max_tokens: 1024,
    system: RULEBOOK_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Question from a scheme member: ${body.message}\n\n---\n\nRetrieved by-law provisions for this scheme:\n\n${contextBlock}\n\n---\n\nAnswer using only the retrieved provisions and well-established BCCM Act references. If retrieved provisions do not cover the question, use the "cannot find" response.`,
      },
    ],
  });

  const encoder = new TextEncoder();
  let buffered = "";

  const body$ = new ReadableStream({
    async start(controller) {
      // Send the initial event with sessionId + citations
      controller.enqueue(
        encoder.encode(
          `event: meta\ndata: ${JSON.stringify({ sessionId, citations })}\n\n`,
        ),
      );

      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            buffered += event.delta.text;
            controller.enqueue(
              encoder.encode(
                `event: token\ndata: ${JSON.stringify({ text: event.delta.text })}\n\n`,
              ),
            );
          }
        }

        // Ensure disclaimer is present
        let final = buffered.trim();
        if (!final.toLowerCase().includes("not legal advice")) {
          final = `${final}\n\n${DISCLAIMER}`;
          controller.enqueue(
            encoder.encode(
              `event: token\ndata: ${JSON.stringify({ text: `\n\n${DISCLAIMER}` })}\n\n`,
            ),
          );
        }

        const service = createServiceClient();
        await service.from("chat_messages").insert({
          session_id: sessionId,
          role: "assistant",
          content: final,
          citations,
        });

        await audit({
          action: "chat_message",
          entityType: "chat_messages",
          entityId: sessionId,
          schemeId: body.schemeId,
          metadata: { tokens: final.length },
        });

        controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
        controller.close();
      } catch (e) {
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify({ error: e instanceof Error ? e.message : "stream error" })}\n\n`,
          ),
        );
        controller.close();
      }
    },
  });

  return new Response(body$, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

function streamOnce(
  text: string,
  sessionId: string,
  citations: Array<Record<string, unknown>>,
) {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `event: meta\ndata: ${JSON.stringify({ sessionId, citations })}\n\n`,
          ),
        );
        controller.enqueue(
          encoder.encode(`event: token\ndata: ${JSON.stringify({ text })}\n\n`),
        );
        controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
        controller.close();
      },
    }),
    {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    },
  );
}

/**
 * Deterministic fallback answer when Anthropic is not configured.
 * Quotes the top retrieved provision verbatim and appends the disclaimer.
 */
function fallbackAnswer(
  query: string,
  hits: { bylaw_number: string | null; page_number: number | null; content: string }[],
): string {
  const top = hits[0];
  const num = top.bylaw_number ? `By-law ${top.bylaw_number}` : "the closest provision";
  const page = top.page_number ? `, p.${top.page_number}` : "";
  return `Based on a search of your registered by-laws, the most relevant provision to "${query}" is:

"${top.content.trim().slice(0, 400)}${top.content.length > 400 ? "…" : ""}"

[${num}${page}]

${DISCLAIMER}`;
}
