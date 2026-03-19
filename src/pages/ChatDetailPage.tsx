import { useParams, useNavigate } from "react-router-dom";
import { useChatsStore } from "@/stores/chats-store";
import { useAgentsStore } from "@/stores/agents-store";
import { useConfigStore } from "@/stores/config-store";
import { useMessagesStore } from "@/stores/messages-store";
import { streamChatCompletion, type LLMRequestMessage } from "@/lib/llm";
import { ChevronLeft, Settings2, Trash2 } from "lucide-react";
import { useEffect, useRef, useCallback, useState } from "react";

export function ChatDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getChat, updateChat } = useChatsStore();
  const { getAgent } = useAgentsStore();
  const { apiKeys, defaultModel } = useConfigStore();
  const { getMessages, addMessage, updateMessage } = useMessagesStore();

  const chat = getChat(id!);
  const agent = chat ? getAgent(chat.agentId) : undefined;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [contextPrompt, setContextPrompt] = useState(chat?.contextPrompt || "");
  const { addTemplate, toggleTemplate, removeTemplate } = useChatsStore();

  const getIframeUrl = useCallback(() => {
    const enabledTemplates = chat?.templates.filter((t) => t.enabled) || [];
    if (enabledTemplates.length === 0 && !agent?.customHtml) {
      return "/guest.html";
    }
    
    let baseHtml = agent?.customHtml || "";
    if (!baseHtml) {
      return "/guest.html";
    }
    
    for (const tpl of enabledTemplates) {
      baseHtml += "\n" + tpl.html;
    }
    
    const blob = new Blob([baseHtml], { type: "text/html" });
    return URL.createObjectURL(blob);
  }, [chat?.templates, agent?.customHtml]);

  const sendToIframe = useCallback(
    (action: string, payload?: unknown) => {
      console.log("[Host] Sending to iframe:", action, payload);
      iframeRef.current?.contentWindow?.postMessage({ action, payload }, "*");
    },
    []
  );

  const initIframeChat = useCallback(() => {
    const messages = getMessages(id!);
    sendToIframe("initChat", {
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        isTemplate: m.isTemplate,
        templateData: m.templateData,
      })),
    });
  }, [id, getMessages, sendToIframe]);

  const resolveApiKey = useCallback((): string | null => {
    if (agent?.apiKeyId) {
      const found = apiKeys.find((k) => k.id === agent.apiKeyId);
      return found?.key || null;
    }
    if (agent?.oneTimeApiKey) return agent.oneTimeApiKey;
    if (apiKeys.length > 0) return apiKeys[0]!.key;
    return null;
  }, [agent, apiKeys]);

  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!chat || !id) return;

      console.log("[Host] User sent message:", text);

      if (text.toLowerCase() === "html") {
        console.log("[Host] HTML command detected, returning template");
        const userMsg = addMessage(id, "user", text);
        sendToIframe("appendMessage", {
          message: {
            id: userMsg.id,
            role: "user",
            content: text,
            timestamp: userMsg.timestamp,
          },
        });

        const templateHtml = `<!DOCTYPE html>
<html>
<head>
<style>
  body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-family: sans-serif; padding: 20px; }
  .message { background: rgba(255,255,255,0.1); padding: 15px; border-radius: 10px; margin: 10px 0; }
</style>
</head>
<body>
<h2>Custom Template Example</h2>
<div id="messages"></div>
<script>
  window.addEventListener('message', function(e) {
    if (e.data.action === 'appendMessage') {
      const msg = e.data.payload.message;
      const div = document.createElement('div');
      div.className = 'message';
      div.textContent = msg.role + ': ' + msg.content;
      document.getElementById('messages').appendChild(div);
    }
  });
</script>
</body>
</html>`;

        const assistantMsg = addMessage(id, "assistant", templateHtml, {
          isTemplate: true,
          templateData: JSON.stringify({ name: "Purple Gradient Theme", html: templateHtml }),
        });

        sendToIframe("appendMessage", {
          message: {
            id: assistantMsg.id,
            role: "assistant",
            content: templateHtml,
            timestamp: assistantMsg.timestamp,
            isTemplate: true,
            templateData: JSON.stringify({ name: "Purple Gradient Theme", html: templateHtml }),
          },
        });

        updateChat(id, {
          lastMessage: "[Template]",
          lastMessageTime: Date.now(),
        });
        return;
      }

      const userMsg = addMessage(id, "user", text);
      updateChat(id, {
        lastMessage: text,
        lastMessageTime: Date.now(),
        unread: false,
      });

      sendToIframe("appendMessage", {
        message: {
          id: userMsg.id,
          role: "user",
          content: text,
          timestamp: userMsg.timestamp,
        },
      });

      const apiKey = resolveApiKey();
      if (!apiKey) {
        const errMsg = addMessage(
          id,
          "assistant",
          "No API key configured. Please set one in Settings or Agent config."
        );
        sendToIframe("appendMessage", {
          message: {
            id: errMsg.id,
            role: "assistant",
            content: errMsg.content,
            timestamp: errMsg.timestamp,
          },
        });
        return;
      }

      const allMessages = getMessages(id);
      const llmMessages: LLMRequestMessage[] = [];

      if (agent?.systemPrompt) {
        llmMessages.push({ role: "system", content: agent.systemPrompt });
      }
      if (contextPrompt) {
        llmMessages.push({ role: "system", content: contextPrompt });
      }

      for (const m of allMessages) {
        if (m.role === "user" || m.role === "assistant") {
          llmMessages.push({ role: m.role, content: m.content });
        }
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const assistantMsg = addMessage(id, "assistant", "");
      console.log("[Host] Starting stream for message:", assistantMsg.id);
      sendToIframe("streamStart", {});

      await streamChatCompletion(apiKey, defaultModel, llmMessages, {
        onToken: (token) => {
          sendToIframe("streamToken", { token });
        },
        onDone: (fullText) => {
          console.log("[Host] Stream completed, full text length:", fullText.length);
          updateMessage(id, assistantMsg.id, fullText);
          updateChat(id, {
            lastMessage: fullText.slice(0, 100),
            lastMessageTime: Date.now(),
          });
          sendToIframe("streamEnd", {
            message: {
              id: assistantMsg.id,
              role: "assistant",
              content: fullText,
              timestamp: Date.now(),
            },
          });
        },
        onError: (error) => {
          console.error("[Host] Stream error:", error);
          updateMessage(id, assistantMsg.id, `Error: ${error.message}`);
          sendToIframe("streamError", { error: error.message });
        },
      }, controller.signal);
    },
    [
      chat, id, agent, contextPrompt, defaultModel,
      addMessage, updateChat, updateMessage, getMessages,
      sendToIframe, resolveApiKey,
    ]
  );

  const handleInstallTemplate = useCallback(
    (templateData: Record<string, unknown>) => {
      if (!id || !chat) return;
      console.log("[Host] Installing template:", templateData);
      if (templateData.html && typeof templateData.html === "string") {
        const name = (templateData.name as string) || "Custom Template";
        addTemplate(id, name, templateData.html as string);
      }
    },
    [id, chat, addTemplate]
  );

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const data = event.data;
      if (!data || !data.action) return;

      console.log("[Host] Received from iframe:", data.action, data.payload);

      switch (data.action) {
        case "guestReady":
          console.log("[Host] Guest ready, initializing chat");
          initIframeChat();
          break;
        case "sendMessage":
          if (data.payload?.text) {
            handleSendMessage(data.payload.text);
          }
          break;
        case "installTemplate":
          if (data.payload?.templateData) {
            handleInstallTemplate(data.payload.templateData);
          }
          break;
      }
    }

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      abortRef.current?.abort();
    };
  }, [initIframeChat, handleSendMessage, handleInstallTemplate]);

  useEffect(() => {
    if (!iframeRef.current) return;
    const url = getIframeUrl();
    console.log("[Host] Loading iframe from:", url);
    iframeRef.current.src = url;
    return () => {
      if (url.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    };
  }, [getIframeUrl]);

  if (!chat || !agent) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Chat not found
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Fixed top bar - always in host, not in iframe */}
      <header className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-card shrink-0 z-10">
        <button
          onClick={() => navigate("/chats")}
          className="p-1 rounded-full hover:bg-accent"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm shrink-0">
          {agent.avatar}
        </div>
        <span className="font-medium flex-1 truncate">{chat.title}</span>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1 rounded-full hover:bg-accent"
        >
          <Settings2 className="h-5 w-5" />
        </button>
      </header>

      {/* Chat settings panel */}
      {showSettings && (
        <div className="border-b border-border bg-card p-3 space-y-3 shrink-0 max-h-80 overflow-y-auto">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Context Prompt
            </label>
            <textarea
              value={contextPrompt}
              onChange={(e) => {
                setContextPrompt(e.target.value);
                updateChat(id!, { contextPrompt: e.target.value });
              }}
              placeholder="Additional context for this conversation..."
              rows={2}
              className="w-full px-2 py-1.5 text-sm rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">
              UI Templates
            </label>
            {chat.templates.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                No templates yet. Send "HTML" to get a sample template.
              </p>
            ) : (
              <div className="space-y-2">
                {chat.templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="flex items-center gap-2 p-2 rounded border border-border hover:bg-accent/50"
                  >
                    <input
                      type="checkbox"
                      checked={tpl.enabled}
                      onChange={() => toggleTemplate(id!, tpl.id)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span className="flex-1 text-sm truncate">{tpl.name}</span>
                    <button
                      onClick={() => removeTemplate(id!, tpl.id)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sandboxed iframe */}
      <iframe
        ref={iframeRef}
        className="flex-1 w-full border-none"
        sandbox="allow-scripts allow-same-origin"
        title="Chat View"
      />
    </div>
  );
}
