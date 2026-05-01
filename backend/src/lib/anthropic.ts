import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';
import { assertWithinBudget, logUsage } from './usage.js';

if (!env.anthropicApiKey) {
  // Allow the server to start without the key so other routes still work,
  // but interview/strategy/content endpoints will fail at call time.
  console.warn(
    '[anthropic] ANTHROPIC_API_KEY is not set — Claude calls will fail.'
  );
}

export const anthropic = new Anthropic({
  apiKey: env.anthropicApiKey,
});

export const ANTHROPIC_MODEL = env.anthropicModel;

/**
 * Run a tool-use call where Claude is forced to call exactly one tool, and
 * return the parsed input. Errors out if Claude refuses or returns text
 * instead of a tool call. System prompt is sent with prompt caching enabled.
 */
export async function callTool<T>(opts: {
  systemPrompt: string;
  messages: Anthropic.MessageParam[];
  tool: Anthropic.Tool;
  maxTokens?: number;
  /** Free-form label for usage telemetry, e.g. "interview/turn" or "content/hero". */
  purpose: string;
}): Promise<T> {
  await assertWithinBudget();

  // cache_control on text blocks is accepted at runtime (prompt caching is GA)
  // but the TextBlockParam type in this SDK version doesn't expose it yet.
  const systemBlocks: Anthropic.TextBlockParam[] = [
    {
      type: 'text',
      text: opts.systemPrompt,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...({ cache_control: { type: 'ephemeral' } } as any),
    },
  ];

  const response = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: opts.maxTokens ?? 1024,
    system: systemBlocks,
    tools: [opts.tool],
    tool_choice: { type: 'tool', name: opts.tool.name },
    messages: opts.messages,
  });

  // Log usage even if the response shape is wrong — we still consumed tokens.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const usage = (response.usage ?? {}) as any;
  logUsage({
    purpose: opts.purpose,
    model: ANTHROPIC_MODEL,
    tokens: {
      input: usage.input_tokens ?? 0,
      output: usage.output_tokens ?? 0,
      cache_creation: usage.cache_creation_input_tokens ?? 0,
      cache_read: usage.cache_read_input_tokens ?? 0,
    },
  }).catch(() => undefined);

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
  );

  if (!toolUse) {
    throw new Error(
      `Claude did not return a tool_use block. stop_reason=${response.stop_reason}`
    );
  }

  return sanitizeUnknown(toolUse.input) as T;
}

/** Defensive: Claude sometimes outputs the literal string "<UNKNOWN>" for
 *  required fields it doesn't have data for. Walk the result and replace
 *  these with null (or empty string for inside-array primitives) so they
 *  don't leak into persisted content. */
const UNKNOWN_TOKENS = new Set([
  '<UNKNOWN>',
  '<unknown>',
  'UNKNOWN',
  'unknown',
]);

function isUnknownToken(value: unknown): boolean {
  return typeof value === 'string' && UNKNOWN_TOKENS.has(value.trim());
}

function sanitizeUnknown(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map(sanitizeUnknown)
      .filter((v) => v !== null && v !== undefined && v !== '');
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const cleaned = sanitizeUnknown(v);
      out[k] = isUnknownToken(cleaned) ? null : cleaned;
    }
    return out;
  }
  if (isUnknownToken(value)) return null;
  return value;
}
