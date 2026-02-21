import OpenAI from "openai";
import type { LlmOptions, Message, Provider, ProviderConfig } from "./types.js";

/** Known provider configurations */
const PROVIDER_CONFIGS: Record<Provider, ProviderConfig> = {
  openai: { baseURL: "https://api.openai.com/v1", defaultModel: "gpt-4o-mini" },
  anthropic: { baseURL: "https://api.anthropic.com", defaultModel: "claude-haiku-4-5-20251001" },
  gemini: { baseURL: "https://generativelanguage.googleapis.com/v1beta/openai", defaultModel: "gemini-2.0-flash" },
  groq: { baseURL: "https://api.groq.com/openai/v1", defaultModel: "llama-3.3-70b-versatile" },
  together: { baseURL: "https://api.together.xyz/v1", defaultModel: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo" },
  mistral: { baseURL: "https://api.mistral.ai/v1", defaultModel: "mistral-small-latest" },
  openrouter: { baseURL: "https://openrouter.ai/api/v1", defaultModel: "" },
  xai: { baseURL: "https://api.x.ai/v1", defaultModel: "grok-3-mini-fast" },
  deepseek: { baseURL: "https://api.deepseek.com", defaultModel: "deepseek-chat" },
};

/**
 * Get the provider config, with runtime validation.
 */
export function getProviderConfig(provider: string): ProviderConfig {
  if (!(provider in PROVIDER_CONFIGS)) {
    const valid = Object.keys(PROVIDER_CONFIGS).join(", ");
    throw new Error(`Unknown provider "${provider}". Valid providers: ${valid}`);
  }
  return PROVIDER_CONFIGS[provider as Provider];
}

/**
 * Call the Anthropic Messages API directly via fetch.
 *
 * Anthropic uses a different API format than OpenAI:
 * - system prompt is a top-level field, not a message
 * - uses x-api-key header instead of Authorization Bearer
 */
async function callAnthropic(
  messages: Message[],
  apiKey: string,
  model: string,
  baseURL?: string
): Promise<string> {
  const resolvedBaseURL = (baseURL ?? PROVIDER_CONFIGS.anthropic.baseURL)
    .replace(/\/+$/, "")
    .replace(/\/v1$/i, "");
  const url = `${resolvedBaseURL}/v1/messages`;

  const systemMsg = messages.find((m) => m.role === "system");
  const nonSystemMsgs = messages.filter((m) => m.role !== "system");

  const body: Record<string, unknown> = {
    model,
    max_tokens: 4096,
    messages: nonSystemMsgs.map((m) => ({ role: m.role, content: m.content })),
  };
  if (systemMsg) {
    body.system = systemMsg.content;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    content: Array<{ type: string; text?: string }>;
  };

  const textBlock = data.content?.find((b) => b.type === "text");
  if (!textBlock?.text) {
    throw new Error("Anthropic returned an empty response");
  }
  return textBlock.text;
}

/**
 * Call an OpenAI-compatible chat completions API.
 */
async function callOpenAICompatible(
  messages: Message[],
  apiKey: string,
  model: string,
  baseURL?: string
): Promise<string> {
  const client = new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });

  const response = await client.chat.completions.create({
    model,
    messages,
    temperature: 0,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("LLM returned an empty response");
  }
  return content;
}

/**
 * Route to the correct API adapter based on provider.
 */
export async function callLLM(
  messages: Message[],
  apiKey: string,
  model: string,
  provider?: Provider,
  baseURL?: string
): Promise<string> {
  if (provider === "anthropic") {
    return callAnthropic(messages, apiKey, model, baseURL);
  }

  const resolvedBaseURL =
    baseURL ?? (provider ? PROVIDER_CONFIGS[provider].baseURL : undefined);

  return callOpenAICompatible(messages, apiKey, model, resolvedBaseURL);
}

/**
 * Resolve LLM options into a callable function.
 *
 * Accepts three patterns:
 * 1. `{ llm }` — custom function, used as-is
 * 2. `{ apiKey, provider }` — uses provider's default model
 * 3. `{ apiKey, model }` — uses explicit model
 *
 * @param options - LLM configuration options
 * @param packageName - Name of the calling package (for error messages)
 * @returns A function that sends messages to the LLM and returns the response text
 */
export function resolveLlm(
  options: LlmOptions,
  packageName: string
): (messages: Message[]) => Promise<string> {
  if (options.llm) {
    if (typeof options.llm !== "function") {
      throw new Error("`llm` option must be a function");
    }
    return options.llm;
  }

  if (options.apiKey) {
    const providerConfig = options.provider ? getProviderConfig(options.provider) : undefined;
    const model = options.model ?? providerConfig?.defaultModel;

    if (!model) {
      throw new Error(
        `${packageName} requires \`model\` when using \`apiKey\` (or use a \`provider\` with a default model)`
      );
    }

    const { apiKey, provider, baseURL } = options;
    return (messages) => callLLM(messages, apiKey, model, provider, baseURL);
  }

  throw new Error(
    `${packageName} requires either \`apiKey\` + \`model\`, \`apiKey\` + \`provider\`, or \`llm\` option`
  );
}
