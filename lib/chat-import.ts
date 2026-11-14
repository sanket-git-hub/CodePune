import { z } from "zod";
import { screenText } from "@/lib/screen";

// Shape (a): {"messages":[{"author","timestamp","text"}]}
const customChatSchema = z.object({
  messages: z.array(
    z.object({
      author: z.string().min(1, "Author is required"),
      timestamp: z.string().min(1, "Timestamp is required"),
      text: z.string().min(1, "Text is required"),
    })
  ).min(1, "At least one message is required in 'messages' array"),
});

// Shape (b): Slack-style array of {"user","text","ts"}
const slackChatSchema = z.array(
  z.object({
    user: z.string().min(1, "User is required"),
    ts: z.string().min(1, "Timestamp (ts) is required"),
    text: z.string().min(1, "Text is required"),
  })
).min(1, "At least one message is required in the array");

export type NormalizedChatMessage = {
  author: string;
  timestamp: string;
  text: string;
};

export type ChatImportParsed = {
  messages: NormalizedChatMessage[];
  chunks: { text: string; redactions: number }[];
  totalRedactions: number;
};

/**
 * Validates chat JSON against shape (a) or shape (b).
 * Rejects anything else with a clear, descriptive message.
 * Caps file size at 1 MB.
 */
export function parseAndValidateChatJson(rawJsonString: string): ChatImportParsed {
  // Check size: max 1 MB (1,048,576 bytes)
  const byteLength = Buffer.byteLength(rawJsonString, "utf8");
  if (byteLength > 1024 * 1024) {
    throw new Error("Chat file exceeds maximum allowed size of 1 MB.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJsonString);
  } catch {
    throw new Error("Invalid JSON: The uploaded file is not a valid JSON document.");
  }

  let normalized: NormalizedChatMessage[] = [];

  // Try Shape (a)
  const resA = customChatSchema.safeParse(parsed);
  if (resA.success) {
    normalized = resA.data.messages;
  } else {
    // Try Shape (b)
    const resB = slackChatSchema.safeParse(parsed);
    if (resB.success) {
      normalized = resB.data.map((m) => ({
        author: m.user,
        timestamp: m.ts,
        text: m.text,
      }));
    } else {
      throw new Error(
        "Unrecognized chat JSON format. File must match either:\n" +
        "1. {\"messages\": [{\"author\": string, \"timestamp\": string, \"text\": string}]}\n" +
        "2. A Slack export array: [{\"user\": string, \"ts\": string, \"text\": string}]"
      );
    }
  }

  // One chunk per message with author and timestamp in the chunk text
  // Run lib/screen.ts masking before saving
  let totalRedactions = 0;
  const chunks = normalized.map((msg) => {
    const rawChunkText = `[${msg.timestamp}] ${msg.author}:\n${msg.text}`;
    const screened = screenText(rawChunkText);
    totalRedactions += screened.count;
    return {
      text: screened.text,
      redactions: screened.count,
    };
  });

  return {
    messages: normalized,
    chunks,
    totalRedactions,
  };
}
