# @lexstyle/llm-client

[![npm](https://img.shields.io/npm/v/@lexstyle/llm-client)](https://www.npmjs.com/package/@lexstyle/llm-client)
[![license](https://img.shields.io/npm/l/@lexstyle/llm-client)](https://github.com/hangingahaw/lexstyle-llm-client/blob/main/LICENSE)

Shared LLM client for [lexstyle](https://github.com/hangingahaw/lexstyle) text-correction tools.

Routes chat completions to any of 9 providers through a single interface. Used internally by [redashify](https://github.com/hangingahaw/redashify) and other fixer packages — not typically imported directly.

## Install

```sh
npm install @lexstyle/llm-client
```

## Usage

```ts
import { resolveLlm } from '@lexstyle/llm-client'

const llm = resolveLlm(
  { apiKey: process.env.OPENAI_API_KEY, provider: 'openai' },
  'my-package'
)

const response = await llm([
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello' },
])
```

### Custom LLM function

Bypass the built-in client entirely:

```ts
const llm = resolveLlm(
  { llm: async (messages) => myCustomCall(messages) },
  'my-package'
)
```

## Providers

| Provider | Default model | Notes |
|---|---|---|
| `openai` | `gpt-4o-mini` | |
| `anthropic` | `claude-haiku-4-5-20251001` | Native adapter (different API format) |
| `gemini` | `gemini-2.0-flash` | OpenAI-compatible endpoint |
| `groq` | `llama-3.3-70b-versatile` | |
| `together` | `meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo` | |
| `mistral` | `mistral-small-latest` | |
| `xai` | `grok-3-mini-fast` | |
| `deepseek` | `deepseek-chat` | |
| `openrouter` | *(none — must specify `model`)* | |

## API

### `resolveLlm(options, packageName)`

Resolve `LlmOptions` into a callable `(messages: Message[]) => Promise<string>`.

Accepts three patterns:
1. `{ llm }` — custom function, used as-is
2. `{ apiKey, provider }` — uses provider's default model
3. `{ apiKey, model }` — uses explicit model (with optional `baseURL`)

### `callLLM(messages, apiKey, model, provider?, baseURL?)`

Low-level: route a chat completion to the correct adapter. Anthropic uses its native API; all others use the OpenAI-compatible format.

### `getProviderConfig(provider)`

Look up a provider's base URL and default model. Throws on unknown providers.

## Types

```ts
interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type Provider =
  | 'openai' | 'anthropic' | 'gemini' | 'groq' | 'together'
  | 'mistral' | 'xai' | 'deepseek' | 'openrouter'

interface LlmOptions {
  apiKey?: string
  provider?: Provider
  model?: string
  baseURL?: string
  llm?: (messages: Message[]) => Promise<string>
}
```

## License

Apache-2.0
