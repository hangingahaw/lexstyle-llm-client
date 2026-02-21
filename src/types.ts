/** Chat message format for LLM functions */
export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Known providers with built-in base URL mapping */
export type Provider =
  | "openai"
  | "anthropic"
  | "gemini"
  | "groq"
  | "together"
  | "mistral"
  | "openrouter"
  | "xai"
  | "deepseek";

/** Provider configuration: base URL and default model */
export interface ProviderConfig {
  baseURL: string;
  defaultModel: string;
}

/** Common LLM options shared by all fixer packages */
export interface LlmOptions {
  /** API key for the LLM provider */
  apiKey?: string;
  /** LLM provider name (e.g. "openai", "groq", "together"). Maps to a known base URL. */
  provider?: Provider;
  /** Model name (e.g. "gpt-4o-mini", "llama-3.3-70b-versatile"). */
  model?: string;
  /** Custom base URL for OpenAI-compatible APIs. Overrides provider mapping. */
  baseURL?: string;
  /** Custom LLM function: receives messages, returns the raw text response. Overrides apiKey/provider/model. */
  llm?: (messages: Message[]) => Promise<string>;
}
