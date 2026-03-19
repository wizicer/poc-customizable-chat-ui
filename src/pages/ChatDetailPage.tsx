import { useParams, useNavigate } from "react-router-dom";
import { useChatsStore } from "@/stores/chats-store";
import { useAgentsStore } from "@/stores/agents-store";
import { useConfigStore } from "@/stores/config-store";
import { useMessagesStore } from "@/stores/messages-store";
import { streamChatCompletion, type LLMRequestMessage } from "@/lib/llm";
import { EmojiPicker } from "@/components/EmojiPicker";
import { getDefaultModelForProvider, inferProviderFromModel } from "@/lib/providers";
import type { ChatTemplate, Message } from "@/types";
import { ChevronLeft, Settings2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface GuestPayload {
  text?: string;
  clientMessageId?: string;
  templateData?: ChatTemplate;
}

const DEBUG_HTML_TEMPLATE: ChatTemplate = {
  id: "debug-html-template",
  name: "Reference Theme Plugin",
  description: "Filter + UI injection plugin, following the reference plugin architecture.",
  css: `.plugin-badge { margin: 0 16px 12px; padding: 10px 12px; border-radius: 12px; background: rgba(79, 70, 229, 0.12); color: #4338ca; font-size: 12px; font-weight: 600; }
.plugin-ui-btn { padding: 10px 14px; background: #ff4d4f; color: white; border: none; border-radius: 999px; cursor: pointer; font-weight: 700; }`,
  js: `
window.ChatAPI.addFilter('render:text', (text) => {
  let safeText = String(text).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  safeText = safeText.replace(/(BUG|报错)/gi, "<strong style='color:#ef4444;font-size:1.05em;'>$1</strong>");
  return safeText;
});
window.ChatAPI.on('core:mounted', () => {
  const topAnchor = document.getElementById('top-injection-anchor');
  if (topAnchor && !document.getElementById('reference-plugin-badge')) {
    const badge = document.createElement('div');
    badge.id = 'reference-plugin-badge';
    badge.className = 'plugin-badge';
    badge.textContent = 'Reference plugin loaded';
    topAnchor.appendChild(badge);
  }
  const bottomAnchor = document.getElementById('bottom-injection-anchor');
  if (bottomAnchor && !document.getElementById('reference-plugin-button')) {
    const button = document.createElement('button');
    button.id = 'reference-plugin-button';
    button.className = 'plugin-ui-btn';
    button.textContent = '🚨 Send plugin alert';
    button.addEventListener('click', () => {
      window.ChatAPI.sendToHost('sendMessage', { text: '[Plugin Alert] Reference template button clicked' });
    });
    bottomAnchor.appendChild(button);
  }
});`,
};

function createGuestUrl(chatId: string, reloadKey: number) {
  return `/guest-chat.html?chatId=${encodeURIComponent(chatId)}&reload=${reloadKey}`;
}

function getPluginStorageKey(chatId: string) {
  return `chat-plugin-bundle:${chatId}`;
}

export function ChatDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getChat, updateChat } = useChatsStore();
  const { getAgent } = useAgentsStore();
  const { apiKeys, defaultModel } = useConfigStore();
  const { getMessages, addMessage, updateMessage } = useMessagesStore();

  const chat = getChat(id || "");
  const agent = chat ? getAgent(chat.agentId) : undefined;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pendingMessagesRef = useRef<Array<{ action: string; payload?: unknown }>>([]);
  const iframeReadyRef = useRef(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const activeTemplates = useMemo(() => {
    if (!chat) return [];
    return chat.installedTemplates.filter((template) =>
      chat.enabledTemplateIds.includes(template.id)
    );
  }, [chat]);

  const iframeUrl = useMemo(() => {
    if (!id) return "about:blank";
    return createGuestUrl(id, reloadKey);
  }, [id, reloadKey]);

  const log = useCallback((...args: unknown[]) => {
    console.debug("[chat-detail]", ...args);
  }, []);

  const postToIframe = useCallback(
    (action: string, payload?: unknown) => {
      const frameWindow = iframeRef.current?.contentWindow;
      log("postMessage -> guest", action, payload);
      if (!frameWindow || !iframeReadyRef.current) {
        pendingMessagesRef.current.push({ action, payload });
        return;
      }
      frameWindow.postMessage({ action, payload }, "*");
    },
    [log]
  );

  const flushPendingGuestMessages = useCallback(() => {
    const queue = [...pendingMessagesRef.current];
    pendingMessagesRef.current = [];
    queue.forEach((item) => {
      iframeRef.current?.contentWindow?.postMessage(
        { action: item.action, payload: item.payload },
        "*"
      );
    });
  }, []);

  const buildGuestMessages = useCallback(
    (messages: Message[]) =>
      messages.map((message) => ({
        id: message.id,
        clientMessageId: message.clientMessageId,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        isTemplate: message.isTemplate,
        templateData: message.templateData,
      })),
    []
  );

  const initGuest = useCallback(() => {
    if (!id || !chat) return;
    const messages = getMessages(id);
    log("initGuest", { chatId: id, messageCount: messages.length, templates: activeTemplates });
    postToIframe("initChat", {
      messages: buildGuestMessages(messages),
      templates: activeTemplates,
    });
    flushPendingGuestMessages();
  }, [activeTemplates, buildGuestMessages, chat, flushPendingGuestMessages, getMessages, id, log, postToIframe]);

  const resolveApiConfig = useCallback(() => {
    if (agent?.apiKeyId) {
      const selected = apiKeys.find((entry) => entry.id === agent.apiKeyId);
      if (selected) {
        return { apiKey: selected.key, provider: selected.provider, model: selected.model };
      }
    }
    if (agent?.oneTimeApiKey) {
      const provider = inferProviderFromModel(defaultModel);
      return {
        apiKey: agent.oneTimeApiKey,
        provider,
        model: defaultModel || getDefaultModelForProvider(provider),
      };
    }
    const fallback = apiKeys[0];
    if (!fallback) return null;
    return { apiKey: fallback.key, provider: fallback.provider, model: fallback.model };
  }, [agent, apiKeys, defaultModel]);

  const appendAssistantMessage = useCallback(
    (content: string, extra?: Partial<Message>) => {
      if (!id) return;
      const assistantMessage = addMessage(id, "assistant", content, extra);
      updateChat(id, {
        lastMessage: content.slice(0, 100),
        lastMessageTime: Date.now(),
        unread: false,
      });
      postToIframe("appendMessage", {
        message: {
          id: assistantMessage.id,
          clientMessageId: assistantMessage.clientMessageId,
          role: "assistant",
          content: assistantMessage.content,
          timestamp: assistantMessage.timestamp,
          isTemplate: assistantMessage.isTemplate,
          templateData: assistantMessage.templateData,
        },
      });
    },
    [addMessage, id, postToIframe, updateChat]
  );

  const handleInstallTemplate = useCallback(
    (template: ChatTemplate) => {
      if (!id || !chat) return;
      const installedTemplates = chat.installedTemplates.some((entry) => entry.id === template.id)
        ? chat.installedTemplates.map((entry) => (entry.id === template.id ? template : entry))
        : [...chat.installedTemplates, template];
      const enabledTemplateIds = chat.enabledTemplateIds.includes(template.id)
        ? chat.enabledTemplateIds
        : [...chat.enabledTemplateIds, template.id];
      log("installTemplate", template);
      updateChat(id, { installedTemplates, enabledTemplateIds });
    },
    [chat, id, log, updateChat]
  );

  const handleSendMessage = useCallback(
    async (text: string, clientMessageId?: string) => {
      if (!chat || !agent || !id) return;

      const trimmed = text.trim();
      if (!trimmed) return;

      log("handleSendMessage", { text: trimmed, clientMessageId, chatId: id });
      const userMessage = addMessage(id, "user", trimmed, { clientMessageId });
      updateChat(id, {
        lastMessage: trimmed,
        lastMessageTime: Date.now(),
        unread: false,
      });

      postToIframe("appendMessage", {
        message: {
          id: userMessage.id,
          clientMessageId,
          role: "user",
          content: trimmed,
          timestamp: userMessage.timestamp,
        },
      });

      if (trimmed.toUpperCase() === "HTML") {
        appendAssistantMessage("Reference template plugin ready.", {
          isTemplate: true,
          templateData: JSON.stringify(DEBUG_HTML_TEMPLATE),
        });
        return;
      }

      const apiConfig = resolveApiConfig();
      if (!apiConfig) {
        appendAssistantMessage("No API key configured. Please set one in Settings or Agent config.");
        return;
      }

      const history = getMessages(id);
      const requestMessages: LLMRequestMessage[] = [];

      if (agent.systemPrompt) {
        requestMessages.push({ role: "system", content: agent.systemPrompt });
      }
      if (chat.contextPrompt) {
        requestMessages.push({ role: "system", content: chat.contextPrompt });
      }
      if (chat.memoryEnabled && chat.memoryPrompt.trim()) {
        requestMessages.push({ role: "system", content: chat.memoryPrompt.trim() });
      }

      history.forEach((message) => {
        if (message.role === "user" || message.role === "assistant") {
          requestMessages.push({ role: message.role, content: message.content });
        }
      });

      log("api request", {
        provider: apiConfig.provider,
        model: apiConfig.model,
        messageCount: requestMessages.length,
        providerAgent: agent.name,
      });

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const assistantMessage = addMessage(id, "assistant", "");
      postToIframe("streamStart", {});

      await streamChatCompletion(
        apiConfig.apiKey,
        apiConfig.provider,
        apiConfig.model,
        requestMessages,
        {
          onToken: (token) => {
            log("api token", token);
            postToIframe("streamToken", { token });
          },
          onDone: (fullText) => {
            log("api done", { fullText });
            updateMessage(id, assistantMessage.id, fullText);
            updateChat(id, {
              lastMessage: fullText.slice(0, 100),
              lastMessageTime: Date.now(),
              unread: false,
            });
            postToIframe("streamEnd", {
              message: {
                id: assistantMessage.id,
                role: "assistant",
                content: fullText,
                timestamp: Date.now(),
              },
            });
          },
          onError: (error) => {
            log("api error", error);
            updateMessage(id, assistantMessage.id, `Error: ${error.message}`);
            postToIframe("streamError", { error: error.message });
          },
        },
        controller.signal
      );
    },
    [addMessage, agent, appendAssistantMessage, chat, getMessages, id, log, postToIframe, resolveApiConfig, updateChat, updateMessage]
  );

  useEffect(() => {
    if (!id) return;
    localStorage.setItem(getPluginStorageKey(id), JSON.stringify(activeTemplates));
    iframeReadyRef.current = false;
    setReloadKey((value) => value + 1);
  }, [activeTemplates, id]);

  useEffect(() => {
    function handleWindowMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow) return;
      const data = event.data as { action?: string; payload?: GuestPayload };
      log("message <- guest", data);
      if (!data?.action) return;

      if (data.action === "guestReady") {
        iframeReadyRef.current = true;
        initGuest();
        return;
      }

      if (data.action === "sendMessage" && data.payload?.text) {
        void handleSendMessage(data.payload.text, data.payload.clientMessageId);
        return;
      }

      if (data.action === "installTemplate" && data.payload?.templateData) {
        handleInstallTemplate(data.payload.templateData);
      }
    }

    window.addEventListener("message", handleWindowMessage);
    return () => {
      window.removeEventListener("message", handleWindowMessage);
      abortRef.current?.abort();
    };
  }, [handleInstallTemplate, handleSendMessage, initGuest, log]);

  if (!chat || !agent || !id) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Chat not found
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-card shrink-0 z-10">
        <button onClick={() => navigate("/chats")} className="p-1 rounded-full hover:bg-accent">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm shrink-0">
          {chat.icon || agent.avatar}
        </div>
        <span className="font-medium flex-1 truncate">{chat.title}</span>
        <button onClick={() => setShowSettings((value) => !value)} className="p-1 rounded-full hover:bg-accent">
          <Settings2 className="h-5 w-5" />
        </button>
      </header>

      {showSettings && (
        <div className="border-b border-border bg-card p-3 space-y-4 shrink-0 max-h-[45vh] overflow-y-auto">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Topic Icon</label>
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker((value) => !value)}
                className="h-12 w-12 rounded-2xl border border-border bg-muted flex items-center justify-center text-2xl hover:bg-accent transition-colors"
              >
                {chat.icon || "💬"}
              </button>
              {showEmojiPicker && (
                <div className="absolute left-0 top-14 z-20">
                  <EmojiPicker
                    value={chat.icon}
                    onChange={(emoji) => updateChat(id, { icon: emoji })}
                    onClose={() => setShowEmojiPicker(false)}
                  />
                </div>
              )}
            </div>
            <input
              type="text"
              value={chat.icon}
              onChange={(event) => updateChat(id, { icon: event.target.value })}
              placeholder="Pick or type a custom icon"
              className="w-full mt-3 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Context Prompt</label>
            <textarea
              value={chat.contextPrompt}
              onChange={(event) => updateChat(id, { contextPrompt: event.target.value })}
              placeholder="Additional context for this topic..."
              rows={2}
              className="w-full px-2 py-1.5 text-sm rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground block">Context Memory</label>
              <button
                onClick={() => updateChat(id, { memoryEnabled: !chat.memoryEnabled })}
                className={`px-2 py-1 rounded text-xs font-medium ${chat.memoryEnabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                {chat.memoryEnabled ? "Enabled" : "Disabled"}
              </button>
            </div>
            <textarea
              value={chat.memoryPrompt}
              onChange={(event) => updateChat(id, { memoryPrompt: event.target.value })}
              placeholder="Describe how the chat should compress or retain memory."
              rows={2}
              className="w-full px-2 py-1.5 text-sm rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Installed Templates</label>
            {chat.installedTemplates.length === 0 ? (
              <div className="text-sm text-muted-foreground rounded-lg border border-dashed border-border p-3">
                No templates installed yet. Send `HTML` in the chat to generate a reference plugin template.
              </div>
            ) : (
              <div className="space-y-2">
                {chat.installedTemplates.map((template) => {
                  const enabled = chat.enabledTemplateIds.includes(template.id);
                  return (
                    <label key={template.id} className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(event) => {
                          const enabledTemplateIds = event.target.checked
                            ? [...chat.enabledTemplateIds, template.id]
                            : chat.enabledTemplateIds.filter((value) => value !== template.id);
                          updateChat(id, { enabledTemplateIds });
                        }}
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{template.name}</div>
                        <div className="text-xs text-muted-foreground">{template.description}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={iframeUrl}
        className="flex-1 w-full border-none"
        sandbox="allow-scripts allow-same-origin"
        title="Chat View"
      />
    </div>
  );
}
