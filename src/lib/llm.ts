export interface LLMRequestMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMStreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
}

export async function streamChatCompletion(
  apiKey: string,
  model: string,
  messages: LLMRequestMessage[],
  callbacks: LLMStreamCallbacks,
  signal?: AbortSignal
) {
  const isAnthropic = model.startsWith("claude");
  const isGemini = model.startsWith("gemini");

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
    const systemMsg = messages.find((m) => m.role === "system");
    const nonSystemMsgs = messages.filter((m) => m.role !== "system");
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
    const systemMsg = messages.find((m) => m.role === "system");
    const nonSystemMsgs = messages.filter((m) => m.role !== "system");
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
    if (model.startsWith("deepseek")) {
      url = "https://api.deepseek.com/v1/chat/completions";
    } else if (model.startsWith("moonshot")) {
      url = "https://api.moonshot.cn/v1/chat/completions";
    }
    headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };
    body = {
      model,
      stream: true,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API Error ${res.status}: ${errText}`);
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
        } catch {
          // skip malformed JSON chunks
        }
      }
    }

    callbacks.onDone(fullText);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return;
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
}
