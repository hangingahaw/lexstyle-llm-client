import { describe, it, expect } from "vitest";
import { getProviderConfig, resolveLlm } from "../src/client.js";
import type { Message } from "../src/types.js";

describe("getProviderConfig", () => {
  it("returns config for known providers", () => {
    const config = getProviderConfig("openai");
    expect(config.baseURL).toBe("https://api.openai.com/v1");
    expect(config.defaultModel).toBe("gpt-4o-mini");
  });

  it("returns config for anthropic", () => {
    const config = getProviderConfig("anthropic");
    expect(config.baseURL).toBe("https://api.anthropic.com");
    expect(config.defaultModel).toBe("claude-haiku-4-5-20251001");
  });

  it("returns config for all 9 providers", () => {
    const providers = [
      "openai", "anthropic", "gemini", "groq", "together",
      "mistral", "openrouter", "xai", "deepseek",
    ];
    for (const p of providers) {
      const config = getProviderConfig(p);
      expect(config.baseURL).toBeTruthy();
    }
  });

  it("throws on unknown provider", () => {
    expect(() => getProviderConfig("invalid")).toThrow('Unknown provider "invalid"');
  });

  it("includes valid providers in error message", () => {
    expect(() => getProviderConfig("bad")).toThrow("Valid providers:");
  });
});

describe("resolveLlm", () => {
  it("returns custom llm function when provided", () => {
    const customLlm = async (_messages: Message[]) => "response";
    const fn = resolveLlm({ llm: customLlm }, "testpkg");
    expect(fn).toBe(customLlm);
  });

  it("throws when llm is not a function", () => {
    expect(() => resolveLlm({ llm: "not a function" as any }, "testpkg")).toThrow(
      "`llm` option must be a function"
    );
  });

  it("creates function from apiKey + provider", () => {
    const fn = resolveLlm({ apiKey: "sk-test", provider: "openai" }, "testpkg");
    expect(typeof fn).toBe("function");
  });

  it("creates function from apiKey + model", () => {
    const fn = resolveLlm({ apiKey: "sk-test", model: "gpt-4o" }, "testpkg");
    expect(typeof fn).toBe("function");
  });

  it("throws when apiKey provided without model or provider", () => {
    expect(() => resolveLlm({ apiKey: "sk-test" }, "mypkg")).toThrow(
      "mypkg requires `model`"
    );
  });

  it("throws when neither apiKey nor llm provided", () => {
    expect(() => resolveLlm({}, "mypkg")).toThrow(
      "mypkg requires either"
    );
  });

  it("includes package name in error messages", () => {
    expect(() => resolveLlm({}, "bluebookify")).toThrow("bluebookify requires");
  });

  it("throws on unknown provider", () => {
    expect(() =>
      resolveLlm({ apiKey: "sk-test", provider: "invalid" as any }, "testpkg")
    ).toThrow('Unknown provider "invalid"');
  });
});
