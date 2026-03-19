import { DEFAULT_PROXY_URL } from "@/lib/proxy";

export interface LLMRequestMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMStreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
}

export interface LLMTransportOptions {
  useProxy?: boolean;
  proxyUrl?: string;
}

function extractErrorMessage(rawText: string) {
  const text = rawText.trim();
  if (!text) return "";

  try {
    const parsed = JSON.parse(text) as {
      error?: { message?: string } | string;
      message?: string;
      detail?: string;
    };

    if (typeof parsed.error === "string") return parsed.error;
    if (parsed.error?.message) return parsed.error.message;
    if (parsed.message) return parsed.message;
    if (parsed.detail) return parsed.detail;
  } catch {
    return text;
  }

  return text;
}

function isLikelyCorsFailure(error: Error) {
  const message = error.message.toLowerCase();
  return (
    error instanceof TypeError &&
    (message.includes("failed to fetch") ||
      message.includes("load failed") ||
      message.includes("networkerror") ||
      message.includes("fetch failed"))
  );
}

function createFriendlyError(error: Error, context: { provider: string; useProxy: boolean; proxyUrl: string }) {
  if (isLikelyCorsFailure(error)) {
    if (context.useProxy) {
      return new Error(
        `Unable to reach the proxy server at ${context.proxyUrl}. Make sure the local proxy is running and reachable. This often happens when the proxy server is not started, the URL is wrong, or another app is blocking the port.`
      );
    }

    return new Error(
      `The browser could not call the ${context.provider} API directly. This is usually caused by CORS restrictions from the provider. Enable \`Use proxy\` in Settings to send the request through a trusted server instead.`
    );
  }

  return error;
}

export async function streamChatCompletion(
  apiKey: string,
  provider: string,
  model: string,
  messages: LLMRequestMessage[],
  callbacks: LLMStreamCallbacks,
  signal?: AbortSignal,
  options?: LLMTransportOptions
) {
  const normalizedProvider = provider.trim().toLowerCase();
  const isAnthropic = normalizedProvider === "anthropic";
  const isGemini = normalizedProvider === "gemini";
  const useProxy = options?.useProxy ?? false;
  const proxyUrl = options?.proxyUrl?.trim() || DEFAULT_PROXY_URL;

  const validMessages = messages.filter((m) => m.content && m.content.trim() !== "");

  let url: string;
  let headers: Record<string, string>;
  let body: unknown;

  if (isAnthropic) {
    url = "https://api.anthropic.com/v1/messages";
    headers = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    };
    const systemMsg = validMessages.find((m) => m.role === "system");
    const nonSystemMsgs = validMessages.filter((m) => m.role !== "system");
    body = {
      model,
      max_tokens: 4096,
      stream: true,
      ...(systemMsg ? { system: systemMsg.content } : {}),
      messages: nonSystemMsgs.map((m) => ({ role: m.role, content: m.content })),
    };
  } else if (isGemini) {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;
    headers = { "Content-Type": "application/json" };
    const systemMsg = validMessages.find((m) => m.role === "system");
    const nonSystemMsgs = validMessages.filter((m) => m.role !== "system");
    body = {
      ...(systemMsg
        ? { system_instruction: { parts: [{ text: systemMsg.content }] } }
        : {}),
      contents: nonSystemMsgs.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    };
  } else {
    url = "https://api.openai.com/v1/chat/completions";
    if (normalizedProvider === "deepseek") {
      url = "https://api.deepseek.com/v1/chat/completions";
    } else if (normalizedProvider === "moonshot") {
      url = "https://api.moonshot.cn/v1/chat/completions";
    }
    headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };
    body = {
      model,
      stream: true,
      messages: validMessages.map((m) => ({ role: m.role, content: m.content })),
    };
  }

  try {
    console.debug("[llm] request", {
      provider: normalizedProvider,
      model,
      url,
      useProxy,
      proxyUrl: useProxy ? proxyUrl : undefined,
      messageCount: validMessages.length,
      roles: validMessages.map((message) => message.role),
    });

    const requestUrl = useProxy ? proxyUrl : url;
    const requestHeaders = useProxy ? { "Content-Type": "application/json" } : headers;
    const requestBody = useProxy
      ? {
          url,
          method: "POST",
          headers,
          body,
        }
      : body;

    const res = await fetch(requestUrl, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(requestBody),
      signal,
    });

    console.debug("[llm] response", {
      provider: normalizedProvider,
      model,
      url: requestUrl,
      status: res.status,
      ok: res.ok,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[llm] response error", errText);
      const detail = extractErrorMessage(errText);
      throw new Error(
        detail
          ? `API Error ${res.status}: ${detail}`
          : `API Error ${res.status}: The ${normalizedProvider} request failed.`
      );
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") continue;

        try {
          const json = JSON.parse(data);
          let token = "";

          if (isAnthropic) {
            if (json.type === "content_block_delta") {
              token = json.delta?.text || "";
            }
          } else if (isGemini) {
            token =
              json.candidates?.[0]?.content?.parts?.[0]?.text || "";
          } else {
            token = json.choices?.[0]?.delta?.content || "";
          }

          if (token) {
            fullText += token;
            callbacks.onToken(token);
          }
        } catch (error) {
          console.debug("[llm] skipped chunk", { data, error });
        }
      }
    }

    console.debug("[llm] complete", { provider: normalizedProvider, model, outputLength: fullText.length });
    callbacks.onDone(fullText);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return;
    console.error("[llm] request failed", err);
    const baseError = err instanceof Error ? err : new Error(String(err));
    callbacks.onError(
      createFriendlyError(baseError, {
        provider: normalizedProvider,
        useProxy,
        proxyUrl,
      })
    );
  }
}
