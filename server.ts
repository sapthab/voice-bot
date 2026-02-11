import http from "http";
import { parse } from "url";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);

// ---------------------------------------------------------------------------
// Standalone clients (no Next.js request context needed)
// ---------------------------------------------------------------------------

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const EMBEDDING_MODEL = "text-embedding-3-small";
const VOICE_MODEL = "gpt-4o-mini";

// ---------------------------------------------------------------------------
// Per-connection state
// ---------------------------------------------------------------------------

interface ConnectionState {
  callId: string;
  agentId?: string;
  agentName?: string;
  systemPrompt?: string;
  fallbackMessage?: string;
  conversationId?: string;
}

// ---------------------------------------------------------------------------
// Helpers – inline RAG + prompt logic (mirrors src/lib/ai/ without @/ imports)
// ---------------------------------------------------------------------------

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.replace(/\n/g, " ").trim(),
  });
  return response.data[0].embedding;
}

async function retrieveContext(query: string, agentId: string) {
  const queryEmbedding = await generateEmbedding(query);

  const [docResult, faqResult] = await Promise.all([
    (supabase as any).rpc("match_documents", {
      query_embedding: queryEmbedding,
      p_agent_id: agentId,
      match_threshold: 0.7,
      match_count: 5,
    }),
    (supabase as any).rpc("match_faqs", {
      query_embedding: queryEmbedding,
      p_agent_id: agentId,
      match_threshold: 0.8,
      match_count: 3,
    }),
  ]);

  if (docResult.error) console.error("Error searching documents:", docResult.error);
  if (faqResult.error) console.error("Error searching FAQs:", faqResult.error);

  const documents: { content: string; metadata: any; similarity: number }[] =
    docResult.data || [];
  const faqs: { question: string; answer: string; similarity: number }[] =
    faqResult.data || [];

  return { documents, faqs };
}

function buildContextPrompt(context: { documents: any[]; faqs: any[] }): string {
  const parts: string[] = [];

  if (context.faqs.length > 0) {
    parts.push("## Frequently Asked Questions\n");
    for (const faq of context.faqs) {
      parts.push(`Q: ${faq.question}\nA: ${faq.answer}\n`);
    }
  }

  if (context.documents.length > 0) {
    parts.push("\n## Relevant Information from Website\n");
    for (const doc of context.documents) {
      if (doc.metadata?.title) {
        parts.push(`### ${doc.metadata.title}\n`);
      }
      parts.push(doc.content + "\n");
    }
  }

  return parts.join("\n");
}

function buildVoiceSystemPrompt(
  agentName: string,
  basePrompt: string,
  ragContext: string
): string {
  let systemPrompt = basePrompt;

  if (ragContext) {
    systemPrompt += `\n\nUse the following information to answer questions:\n${ragContext}`;
  }

  systemPrompt += `\n\nVoice guidelines:
- Keep responses short and conversational, under 2-3 sentences when possible
- Never use markdown, bullet points, or special formatting
- Use simple, natural sentences that sound good when spoken aloud
- If you don't know something, offer to connect them with a person
- Stay in character as the AI assistant for ${agentName}
- Do not make up information not provided in the context
- Spell out numbers and abbreviations naturally
- Avoid saying "as an AI" or referencing that you are artificial`;

  return systemPrompt;
}

// ---------------------------------------------------------------------------
// WebSocket handler – Retell Custom LLM (WebSocket mode)
// ---------------------------------------------------------------------------

function handleRetellConnection(ws: WebSocket, callId: string) {
  const state: ConnectionState = { callId };

  console.log(`[WS] Retell connection opened for callId=${callId}`);

  // Send initial config
  ws.send(
    JSON.stringify({
      response_type: "config",
      config: { auto_reconnect: true, call_details: true },
    })
  );

  ws.on("message", async (data) => {
    let msg: any;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      console.error("[WS] Invalid JSON received");
      return;
    }

    const interactionType: string = msg.interaction_type;

    try {
      // ---- ping_pong -------------------------------------------------------
      if (interactionType === "ping_pong") {
        ws.send(
          JSON.stringify({ response_type: "ping_pong", timestamp: msg.timestamp })
        );
        return;
      }

      // ---- call_details ----------------------------------------------------
      if (interactionType === "call_details") {
        const retellAgentId: string | undefined =
          msg.call?.agent_id || msg.agent_id;

        if (!retellAgentId) {
          console.error("[WS] No retell agent ID in call_details");
          return;
        }

        // Look up our agent by retell_agent_id
        const { data: agent, error } = await supabase
          .from("agents")
          .select("*")
          .eq("retell_agent_id", retellAgentId)
          .eq("is_active", true)
          .single();

        if (error || !agent) {
          console.error("[WS] Agent not found for retellAgentId:", retellAgentId);
          return;
        }

        state.agentId = agent.id;
        state.agentName = agent.name;
        state.systemPrompt = agent.system_prompt || "";
        state.fallbackMessage = agent.fallback_message || "I'm sorry, could you repeat that?";

        // Create conversation
        const fromNumber = msg.call?.from_number || "unknown";
        const toNumber = msg.call?.to_number || agent.phone_number || "unknown";

        const { data: conversation, error: convError } = await (supabase.from("conversations") as any)
          .insert({
            agent_id: agent.id,
            visitor_id: fromNumber,
            channel: "voice",
            call_id: callId,
            call_status: "in_progress",
            call_from: fromNumber,
            call_to: toNumber,
          })
          .select()
          .single();

        if (convError) {
          console.error("[WS] Error creating conversation:", convError);
          return;
        }

        state.conversationId = conversation.id;

        // Track analytics event
        await (supabase.from("analytics_events") as any).insert({
          agent_id: agent.id,
          event_type: "call_started",
          visitor_id: fromNumber,
          conversation_id: conversation.id,
        });

        console.log(
          `[WS] Call ${callId} → agent ${agent.name} (${agent.id}), conversation ${conversation.id}`
        );
        return;
      }

      // ---- update_only -----------------------------------------------------
      if (interactionType === "update_only") {
        // Retell sends transcript updates; no response needed
        return;
      }

      // ---- response_required / reminder_required ---------------------------
      if (
        interactionType === "response_required" ||
        interactionType === "reminder_required"
      ) {
        if (!state.agentId || !state.conversationId) {
          console.error("[WS] response_required before call_details completed");
          ws.send(
            JSON.stringify({
              response_type: "response",
              response_id: msg.response_id || 0,
              content: "I'm sorry, I'm having trouble connecting. Please try again.",
              content_complete: true,
              end_call: false,
            })
          );
          return;
        }

        // Get latest user transcript
        const transcript: { role: string; content: string }[] =
          msg.transcript || [];
        const lastUserEntry = [...transcript]
          .reverse()
          .find((t) => t.role === "user");
        const userMessage = lastUserEntry?.content || "";

        if (!userMessage) {
          ws.send(
            JSON.stringify({
              response_type: "response",
              response_id: msg.response_id || 0,
              content: "I didn't catch that. Could you please repeat?",
              content_complete: true,
              end_call: false,
            })
          );
          return;
        }

        // Save user message
        await (supabase.from("messages") as any).insert({
          conversation_id: state.conversationId,
          role: "user",
          content: userMessage,
        });

        // Get conversation history
        const { data: history } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", state.conversationId)
          .order("created_at", { ascending: true });

        // RAG context
        const context = await retrieveContext(userMessage, state.agentId);
        const contextPrompt = buildContextPrompt(context);
        const systemPrompt = buildVoiceSystemPrompt(
          state.agentName || "Assistant",
          state.systemPrompt || "",
          contextPrompt
        );

        // Build messages array
        const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
          { role: "system", content: systemPrompt },
        ];

        const recentHistory = (history || []).slice(-10) as {
          role: string;
          content: string;
        }[];
        for (const m of recentHistory) {
          messages.push({
            role: m.role as "user" | "assistant",
            content: m.content,
          });
        }
        // Only add current message if it's not the last one in history already
        const lastInHistory = recentHistory[recentHistory.length - 1];
        if (
          !lastInHistory ||
          lastInHistory.role !== "user" ||
          lastInHistory.content !== userMessage
        ) {
          messages.push({ role: "user", content: userMessage });
        }

        // Stream GPT response
        const responseId = msg.response_id || 0;
        let fullResponse = "";

        const stream = await openai.chat.completions.create({
          model: VOICE_MODEL,
          messages,
          max_tokens: 200,
          temperature: 0.7,
          stream: true,
        });

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            fullResponse += delta;
            ws.send(
              JSON.stringify({
                response_type: "response",
                response_id: responseId,
                content: delta,
                content_complete: false,
                end_call: false,
              })
            );
          }
        }

        // Send content_complete
        ws.send(
          JSON.stringify({
            response_type: "response",
            response_id: responseId,
            content: "",
            content_complete: true,
            end_call: false,
          })
        );

        // Save assistant message
        const finalContent = fullResponse || state.fallbackMessage || "I'm sorry, could you repeat that?";
        await (supabase.from("messages") as any).insert({
          conversation_id: state.conversationId,
          role: "assistant",
          content: finalContent,
        });

        return;
      }
    } catch (err) {
      console.error(`[WS] Error handling ${interactionType}:`, err);
      try {
        ws.send(
          JSON.stringify({
            response_type: "response",
            response_id: msg.response_id || 0,
            content: "I'm sorry, I'm experiencing technical difficulties. Please try again later.",
            content_complete: true,
            end_call: false,
          })
        );
      } catch {
        // ws may already be closed
      }
    }
  });

  ws.on("close", () => {
    console.log(`[WS] Connection closed for callId=${state.callId}`);
  });

  ws.on("error", (err) => {
    console.error(`[WS] Error for callId=${state.callId}:`, err);
  });
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

async function main() {
  const app = next({ dev });
  const handle = app.getRequestHandler();
  await app.prepare();

  const server = http.createServer((req, res) => {
    const parsedUrl = parse(req.url || "/", true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const pathname = req.url || "";

    // Match /ws/retell/llm  or  /ws/retell/llm/:callId
    if (pathname.startsWith("/ws/retell/llm")) {
      const parts = pathname.split("/").filter(Boolean);
      // parts: ["ws", "retell", "llm"] or ["ws", "retell", "llm", "<callId>"]
      const callId = parts[3] || `call-${Date.now()}`;

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
        handleRetellConnection(ws, callId);
      });
    } else {
      // Not a Retell WS path – let Next.js handle (HMR, etc.) or reject
      // In dev mode Next.js uses its own WS for HMR; don't interfere
      if (!dev) {
        socket.destroy();
      }
      // In dev mode, we leave the socket alone so Next.js HMR WS can function
    }
  });

  server.listen(port, () => {
    console.log(
      `> Server listening on http://localhost:${port} (${dev ? "development" : "production"})`
    );
    console.log(`> WebSocket endpoint: ws://localhost:${port}/ws/retell/llm/:callId`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
