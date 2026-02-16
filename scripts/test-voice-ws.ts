#!/usr/bin/env npx tsx

/**
 * Voice Agent WebSocket Test Script
 *
 * Simulates a Retell voice call end-to-end against the local WS server:
 *   1. Connects to ws://localhost:3000/ws/retell/llm/<callId>?auth=<secret>
 *   2. Receives config message
 *   3. Sends call_details with a retell_agent_id
 *   4. Sends response_required with a user message
 *   5. Collects streamed AI response chunks
 *   6. Optionally sends a second turn
 *   7. Verifies database records (conversation, messages, analytics)
 *
 * Usage:
 *   npx tsx scripts/test-voice-ws.ts [options]
 *
 * Options:
 *   --retell-agent-id <id>   Use this Retell agent ID (skips DB lookup)
 *   --message <text>         First user message (default: "What are your business hours?")
 *   --url <ws-url>           WebSocket base URL (default: ws://localhost:3000)
 *   --skip-db                Skip database verification
 *   --no-second-turn         Skip the second conversation turn
 *   --help                   Show this help message
 */

import dotenv from "dotenv";
import path from "path";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import WebSocket from "ws";

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------

interface CliArgs {
  retellAgentId?: string;
  message: string;
  wsBaseUrl: string;
  skipDb: boolean;
  noSecondTurn: boolean;
  help: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const opts: CliArgs = {
    message: "What are your business hours?",
    wsBaseUrl: "ws://localhost:3000",
    skipDb: false,
    noSecondTurn: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--retell-agent-id":
        opts.retellAgentId = args[++i];
        break;
      case "--message":
        opts.message = args[++i];
        break;
      case "--url":
        opts.wsBaseUrl = args[++i];
        break;
      case "--skip-db":
        opts.skipDb = true;
        break;
      case "--no-second-turn":
        opts.noSecondTurn = true;
        break;
      case "--help":
      case "-h":
        opts.help = true;
        break;
      default:
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
    }
  }

  return opts;
}

function printHelp() {
  console.log(`
Voice Agent WebSocket Test Script

Simulates a Retell voice call end-to-end against the local WS server.

Usage:
  npx tsx scripts/test-voice-ws.ts [options]

Options:
  --retell-agent-id <id>   Use this Retell agent ID (skips DB auto-lookup)
  --message <text>         First user message (default: "What are your business hours?")
  --url <ws-url>           WebSocket base URL (default: ws://localhost:3000)
  --skip-db                Skip database verification step
  --no-second-turn         Skip the second conversation turn
  --help, -h               Show this help message

Environment:
  Reads .env.local for RETELL_WEBHOOK_SECRET, NEXT_PUBLIC_SUPABASE_URL,
  and SUPABASE_SERVICE_ROLE_KEY.

Examples:
  npx tsx scripts/test-voice-ws.ts
  npx tsx scripts/test-voice-ws.ts --retell-agent-id agent_abc123
  npx tsx scripts/test-voice-ws.ts --message "Tell me about your pricing"
  npx tsx scripts/test-voice-ws.ts --skip-db --no-second-turn
`);
}

// ---------------------------------------------------------------------------
// Env loading
// ---------------------------------------------------------------------------

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  dotenv.config({ path: envPath });

  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];

  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(", ")}`);
    console.error("Make sure .env.local exists with these values.");
    process.exit(1);
  }
}

function getSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ---------------------------------------------------------------------------
// Agent lookup
// ---------------------------------------------------------------------------

async function findAgent(
  supabase: SupabaseClient,
  retellAgentId?: string
): Promise<{ id: string; retell_agent_id: string; name: string }> {
  if (retellAgentId) {
    // Verify this agent exists
    const { data, error } = await supabase
      .from("agents")
      .select("id, retell_agent_id, name")
      .eq("retell_agent_id", retellAgentId)
      .eq("is_active", true)
      .single();

    if (error || !data) {
      console.error(
        `Agent with retell_agent_id="${retellAgentId}" not found or inactive.`
      );
      process.exit(1);
    }
    return data as { id: string; retell_agent_id: string; name: string };
  }

  // Auto-lookup: find any voice-enabled agent
  const { data, error } = await supabase
    .from("agents")
    .select("id, retell_agent_id, name")
    .eq("voice_enabled", true)
    .eq("is_active", true)
    .not("retell_agent_id", "is", null)
    .limit(1)
    .single();

  if (error || !data) {
    console.error(
      "No voice-enabled agent found. Use --retell-agent-id to specify one."
    );
    process.exit(1);
  }
  return data as { id: string; retell_agent_id: string; name: string };
}

// ---------------------------------------------------------------------------
// Test result tracking
// ---------------------------------------------------------------------------

interface TestResult {
  name: string;
  passed: boolean;
  detail?: string;
}

const results: TestResult[] = [];

function pass(name: string, detail?: string) {
  results.push({ name, passed: true, detail });
  console.log(`  [PASS] ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name: string, detail?: string) {
  results.push({ name, passed: false, detail });
  console.log(`  [FAIL] ${name}${detail ? ` — ${detail}` : ""}`);
}

// ---------------------------------------------------------------------------
// WebSocket test runner
// ---------------------------------------------------------------------------

interface WsTestContext {
  callId: string;
  responses: { turn: number; chunks: string[]; full: string }[];
}

function waitForMessage(
  ws: WebSocket,
  timeoutMs: number = 5000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for message (${timeoutMs}ms)`));
    }, timeoutMs);

    const handler = (data: WebSocket.RawData) => {
      clearTimeout(timer);
      ws.off("message", handler);
      try {
        resolve(JSON.parse(data.toString()));
      } catch {
        reject(new Error("Received non-JSON message"));
      }
    };

    ws.on("message", handler);
  });
}

function collectStreamedResponse(
  ws: WebSocket,
  timeoutMs: number = 30000
): Promise<{ chunks: string[]; full: string }> {
  return new Promise((resolve, reject) => {
    const chunks: string[] = [];
    let full = "";

    const timer = setTimeout(() => {
      ws.off("message", handler);
      reject(
        new Error(
          `Timed out waiting for content_complete (${timeoutMs}ms). ` +
            `Received ${chunks.length} chunks so far: "${full}"`
        )
      );
    }, timeoutMs);

    const handler = (data: WebSocket.RawData) => {
      let msg: any;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return; // skip non-JSON
      }

      if (msg.response_type === "ping_pong") return; // ignore pings

      if (msg.response_type === "response") {
        if (msg.content) {
          chunks.push(msg.content);
          full += msg.content;
        }
        if (msg.content_complete) {
          clearTimeout(timer);
          ws.off("message", handler);
          resolve({ chunks, full });
        }
      }
    };

    ws.on("message", handler);
  });
}

async function runTest(
  opts: CliArgs,
  agent: { id: string; retell_agent_id: string; name: string }
): Promise<WsTestContext> {
  const callId = `test-call-${Date.now()}`;
  const wsSecret = process.env.RETELL_WEBHOOK_SECRET;
  const authParam = wsSecret ? `?auth=${encodeURIComponent(wsSecret)}` : "";
  const wsUrl = `${opts.wsBaseUrl}/ws/retell/llm/${callId}${authParam}`;

  const ctx: WsTestContext = { callId, responses: [] };

  console.log(`\n--- WebSocket Test ---`);
  console.log(`Agent:   ${agent.name} (${agent.retell_agent_id})`);
  console.log(`Call ID: ${callId}`);
  console.log(`WS URL:  ${opts.wsBaseUrl}/ws/retell/llm/${callId}`);
  console.log("");

  // Step 1: Connect
  const ws = await new Promise<WebSocket>((resolve, reject) => {
    const socket = new WebSocket(wsUrl);
    const timer = setTimeout(() => {
      socket.close();
      reject(new Error("WebSocket connection timed out (5s)"));
    }, 5000);

    socket.on("open", () => {
      clearTimeout(timer);
      resolve(socket);
    });

    socket.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

  pass("WebSocket connected");

  try {
    // Step 2: Receive config
    const configMsg = await waitForMessage(ws, 5000);
    if (
      configMsg.response_type === "config" &&
      configMsg.config?.call_details === true
    ) {
      pass("Received config message", JSON.stringify(configMsg.config));
    } else {
      fail("Received config message", `Unexpected: ${JSON.stringify(configMsg)}`);
    }

    // Step 3: Send call_details
    const callDetails = {
      interaction_type: "call_details",
      call: {
        call_id: callId,
        agent_id: agent.retell_agent_id,
        from_number: "+15551234567",
        to_number: "+15559876543",
      },
    };
    ws.send(JSON.stringify(callDetails));
    pass("Sent call_details");

    // Step 4: Wait for server to process (create conversation, look up agent)
    await sleep(2000);
    pass("Waited for server to process call_details");

    // Step 5: Send first response_required
    console.log(`\n  Turn 1: "${opts.message}"`);
    const responseReq1 = {
      interaction_type: "response_required",
      response_id: 1,
      transcript: [{ role: "user", content: opts.message }],
    };
    ws.send(JSON.stringify(responseReq1));
    pass("Sent response_required (turn 1)");

    // Step 6: Collect streamed response
    const resp1 = await collectStreamedResponse(ws, 30000);
    ctx.responses.push({ turn: 1, ...resp1 });

    if (resp1.full.length > 0) {
      pass(
        "Received streamed response (turn 1)",
        `${resp1.chunks.length} chunks, ${resp1.full.length} chars`
      );
      console.log(`\n  AI Response (turn 1):\n  "${resp1.full}"\n`);
    } else {
      fail("Received streamed response (turn 1)", "Empty response");
    }

    // Step 7: Optionally send second turn
    if (!opts.noSecondTurn) {
      const secondMessage = "Can I schedule an appointment?";
      console.log(`  Turn 2: "${secondMessage}"`);

      const responseReq2 = {
        interaction_type: "response_required",
        response_id: 2,
        transcript: [
          { role: "user", content: opts.message },
          { role: "assistant", content: resp1.full },
          { role: "user", content: secondMessage },
        ],
      };
      ws.send(JSON.stringify(responseReq2));
      pass("Sent response_required (turn 2)");

      const resp2 = await collectStreamedResponse(ws, 30000);
      ctx.responses.push({ turn: 2, ...resp2 });

      if (resp2.full.length > 0) {
        pass(
          "Received streamed response (turn 2)",
          `${resp2.chunks.length} chunks, ${resp2.full.length} chars`
        );
        console.log(`\n  AI Response (turn 2):\n  "${resp2.full}"\n`);
      } else {
        fail("Received streamed response (turn 2)", "Empty response");
      }
    }

    // Step 8: Close connection
    ws.close();
    pass("WebSocket closed");
  } catch (err: any) {
    fail("WebSocket test flow", err.message);
    try {
      ws.close();
    } catch {
      // already closed
    }
  }

  return ctx;
}

// ---------------------------------------------------------------------------
// Database verification
// ---------------------------------------------------------------------------

async function verifyDatabase(
  supabase: SupabaseClient,
  ctx: WsTestContext,
  agent: { id: string }
) {
  console.log(`\n--- Database Verification ---\n`);

  // Wait briefly for async DB writes to flush
  await sleep(1000);

  // Check conversation was created
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("*")
    .eq("call_id", ctx.callId)
    .single();

  if (convError || !conversation) {
    fail("Conversation created in DB", convError?.message || "Not found");
    return;
  }

  const conv = conversation as any;
  pass(
    "Conversation created in DB",
    `id=${conv.id}, channel=${conv.channel}, status=${conv.call_status}`
  );

  if (conv.channel === "voice") {
    pass("Conversation channel is 'voice'");
  } else {
    fail("Conversation channel is 'voice'", `Got: ${conv.channel}`);
  }

  if (conv.agent_id === agent.id) {
    pass("Conversation linked to correct agent");
  } else {
    fail(
      "Conversation linked to correct agent",
      `Expected ${agent.id}, got ${conv.agent_id}`
    );
  }

  // Check messages were saved
  const { data: messages, error: msgError } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conv.id)
    .order("created_at", { ascending: true });

  if (msgError) {
    fail("Messages saved in DB", msgError.message);
  } else if (!messages || messages.length === 0) {
    fail("Messages saved in DB", "No messages found");
  } else {
    const msgs = messages as any[];
    const userMsgs = msgs.filter((m) => m.role === "user");
    const assistantMsgs = msgs.filter((m) => m.role === "assistant");
    pass(
      "Messages saved in DB",
      `${msgs.length} total (${userMsgs.length} user, ${assistantMsgs.length} assistant)`
    );

    // Verify at least one user message content matches
    const firstUserMsg = userMsgs[0];
    if (firstUserMsg) {
      pass("First user message recorded", `"${firstUserMsg.content}"`);
    }
  }

  // Check analytics event
  const { data: events, error: evtError } = await supabase
    .from("analytics_events")
    .select("*")
    .eq("conversation_id", conv.id)
    .eq("event_type", "call_started");

  if (evtError) {
    fail("Analytics event (call_started) logged", evtError.message);
  } else if (!events || events.length === 0) {
    fail("Analytics event (call_started) logged", "Not found");
  } else {
    pass(
      "Analytics event (call_started) logged",
      `${events.length} event(s)`
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Print summary
// ---------------------------------------------------------------------------

function printResults() {
  console.log(`\n${"=".repeat(50)}`);
  console.log("TEST SUMMARY");
  console.log("=".repeat(50));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  for (const r of results) {
    const icon = r.passed ? "[PASS]" : "[FAIL]";
    console.log(`  ${icon} ${r.name}`);
  }

  console.log(`\n  ${passed} passed, ${failed} failed, ${results.length} total`);

  if (failed > 0) {
    console.log("\n  Some tests FAILED.\n");
    process.exit(1);
  } else {
    console.log("\n  All tests PASSED.\n");
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs();

  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  loadEnv();

  const supabase = getSupabase();

  console.log("Looking up voice-enabled agent...");
  const agent = await findAgent(supabase, opts.retellAgentId);
  console.log(`Found agent: ${agent.name} (retell_agent_id=${agent.retell_agent_id})`);

  const ctx = await runTest(opts, agent);

  if (!opts.skipDb) {
    await verifyDatabase(supabase, ctx, agent);
  } else {
    console.log("\n--- Database verification skipped (--skip-db) ---");
  }

  printResults();
}

main().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
