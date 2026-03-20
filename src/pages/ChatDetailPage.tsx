import { useParams, useNavigate } from "react-router-dom";
import { useChatsStore } from "@/stores/chats-store";
import { useAgentsStore } from "@/stores/agents-store";
import { useConfigStore } from "@/stores/config-store";
import { useMessagesStore } from "@/stores/messages-store";
import { streamChatCompletion, type LLMRequestMessage } from "@/lib/llm";
import { EmojiPicker } from "@/components/EmojiPicker";
import { getDefaultModelForProvider, inferProviderFromModel } from "@/lib/providers";
import { DEBUG_TEMPLATE_COMMANDS } from "@/debug-templates";
import type { ChatTemplate, Message } from "@/types";
import { Blocks, ChevronLeft, Settings2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface GuestPayload {
  text?: string;
  clientMessageId?: string;
  templateData?: ChatTemplate;
}

interface TemplateMenuState {
  template: ChatTemplate;
  x: number;
  y: number;
}

function areTemplateListsEqual(a: ChatTemplate[], b: ChatTemplate[]) {
  if (a.length !== b.length) return false;

  return a.every((template, index) => {
    const other = b[index];
    return (
      template.id === other?.id &&
      template.name === other?.name &&
      template.description === other?.description &&
      template.css === other?.css &&
      template.js === other?.js
    );
  });
}

function createGuestUrl(chatId: string, reloadKey: number) {
  return `/guest-chat.html?chatId=${encodeURIComponent(chatId)}&reload=${reloadKey}`;
}

function getPluginStorageKey(chatId: string) {
  return `chat-plugin-bundle:${chatId}`;
}

export function ChatDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getChat, updateChat, removeTemplateFromChats } = useChatsStore();
  const { getAgent } = useAgentsStore();
  const { apiKeys, defaultModel, installedTemplates, installTemplate, removeTemplate } = useConfigStore();
  const { getMessages, addMessage, updateMessage } = useMessagesStore();

  const chat = getChat(id || "");
  const agent = chat ? getAgent(chat.agentId) : undefined;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pendingMessagesRef = useRef<Array<{ action: string; payload?: unknown }>>([]);
  const iframeReadyRef = useRef(false);
  const previousActiveTemplatesRef = useRef<ChatTemplate[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showTemplatePanel, setShowTemplatePanel] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pendingTemplateInstall, setPendingTemplateInstall] = useState<ChatTemplate | null>(null);
  const [templateMenu, setTemplateMenu] = useState<TemplateMenuState | null>(null);
  const [pendingTemplateDelete, setPendingTemplateDelete] = useState<ChatTemplate | null>(null);
  const longPressTimeoutRef = useRef<number | null>(null);

  const activeTemplates = useMemo(() => {
    if (!chat) return [];
    return installedTemplates.filter((template) =>
      chat.enabledTemplateIds.includes(template.id)
    );
  }, [chat?.enabledTemplateIds, installedTemplates]);

  const iframeUrl = useMemo(() => {
    if (!id) return "about:blank";
    return createGuestUrl(id, 0);
  }, [id]);

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
        senderName: message.senderName,
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
        return {
          apiKey: selected.key,
          provider: selected.provider,
          model: selected.model,
          useProxy: selected.useProxy,
          proxyUrl: selected.proxyUrl,
        };
      }
    }
    if (agent?.oneTimeApiKey) {
      const provider = inferProviderFromModel(defaultModel);
      return {
        apiKey: agent.oneTimeApiKey,
        provider,
        model: defaultModel || getDefaultModelForProvider(provider),
        useProxy: false,
        proxyUrl: "",
      };
    }
    const fallback = apiKeys[0];
    if (!fallback) return null;
    return {
      apiKey: fallback.key,
      provider: fallback.provider,
      model: fallback.model,
      useProxy: fallback.useProxy,
      proxyUrl: fallback.proxyUrl,
    };
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
          senderName: assistantMessage.senderName || agent?.name || "Assistant",
          isTemplate: assistantMessage.isTemplate,
          templateData: assistantMessage.templateData,
        },
      });
    },
    [addMessage, agent?.name, id, postToIframe, updateChat]
  );

  const handleInstallTemplate = useCallback(
    (template: ChatTemplate) => {
      if (!id || !chat) return;
      installTemplate(template);
      const enabledTemplateIds = chat.enabledTemplateIds.includes(template.id)
        ? chat.enabledTemplateIds
        : [...chat.enabledTemplateIds, template.id];
      log("installTemplate", template);
      updateChat(id, { enabledTemplateIds });
    },
    [chat, id, installTemplate, log, updateChat]
  );

  const handleConfirmInstallTemplate = useCallback(() => {
    if (!pendingTemplateInstall) return;
    handleInstallTemplate(pendingTemplateInstall);
    setPendingTemplateInstall(null);
    setShowTemplatePanel(true);
  }, [handleInstallTemplate, pendingTemplateInstall]);

  const handleDeleteTemplate = useCallback(
    (template: ChatTemplate) => {
      removeTemplate(template.id);
      removeTemplateFromChats(template.id);
      setPendingTemplateDelete(null);
      setTemplateMenu(null);
    },
    [removeTemplate, removeTemplateFromChats]
  );

  const updateEnabledTemplates = useCallback(
    (templateId: string, enabled: boolean) => {
      if (!id || !chat) return;
      const enabledTemplateIds = enabled
        ? chat.enabledTemplateIds.includes(templateId)
          ? chat.enabledTemplateIds
          : [...chat.enabledTemplateIds, templateId]
        : chat.enabledTemplateIds.filter((value) => value !== templateId);
      updateChat(id, { enabledTemplateIds });
    },
    [chat, id, updateChat]
  );

  const openTemplateMenu = useCallback((template: ChatTemplate, x: number, y: number) => {
    setTemplateMenu({ template, x, y });
  }, []);

  const clearLongPressTimeout = useCallback(() => {
    if (longPressTimeoutRef.current) {
      window.clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!templateMenu) return;

    function handlePointerDown() {
      setTemplateMenu(null);
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [templateMenu]);

  const handleSendMessage = useCallback(
    async (text: string, clientMessageId?: string) => {
      if (!chat || !agent || !id) return;

      const trimmed = text.trim();
      if (!trimmed) return;

      log("handleSendMessage", { text: trimmed, clientMessageId, chatId: id });
      const userMessage = addMessage(id, "user", trimmed, { clientMessageId, senderName: "You" });
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
          senderName: userMessage.senderName || "You",
        },
      });

      const debugTemplate = DEBUG_TEMPLATE_COMMANDS[trimmed.toUpperCase()];
      if (debugTemplate) {
        appendAssistantMessage(`${debugTemplate.name} ready.`, {
          isTemplate: true,
          templateData: JSON.stringify(debugTemplate),
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

      const assistantMessage = addMessage(id, "assistant", "", { senderName: agent.name });
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
            const finalText = fullText.trim()
              ? fullText
              : "Error: The LLM returned an empty response.";
            updateMessage(id, assistantMessage.id, finalText);
            updateChat(id, {
              lastMessage: finalText.slice(0, 100),
              lastMessageTime: Date.now(),
              unread: false,
            });
            postToIframe("streamEnd", {
              message: {
                id: assistantMessage.id,
                role: "assistant",
                content: finalText,
                timestamp: Date.now(),
                senderName: agent.name,
              },
            });
          },
          onError: (error) => {
            log("api error", error);
            const errorMessage = error.message.trim() || "The LLM request failed before any response was returned.";
            const content = `Error: ${errorMessage}`;
            updateMessage(id, assistantMessage.id, content);
            updateChat(id, {
              lastMessage: content.slice(0, 100),
              lastMessageTime: Date.now(),
              unread: false,
            });
            postToIframe("streamError", {
              error: errorMessage,
              message: {
                id: assistantMessage.id,
                role: "assistant",
                content,
                timestamp: Date.now(),
                senderName: agent.name,
              },
            });
          },
        },
        controller.signal,
        {
          useProxy: apiConfig.useProxy,
          proxyUrl: apiConfig.proxyUrl,
        }
      );
    },
    [addMessage, agent, appendAssistantMessage, chat, getMessages, id, log, postToIframe, resolveApiConfig, updateChat, updateMessage]
  );

  useEffect(() => {
    if (!id) return;

    const hasChanged = !areTemplateListsEqual(previousActiveTemplatesRef.current, activeTemplates);
    previousActiveTemplatesRef.current = activeTemplates;

    if (!hasChanged) return;

    postToIframe("setTemplates", { templates: activeTemplates });
  }, [activeTemplates, id, postToIframe]);

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

      if (data.action === "requestInstallTemplate" && data.payload?.templateData) {
        setPendingTemplateInstall(data.payload.templateData);
      }
    }

    window.addEventListener("message", handleWindowMessage);
    return () => {
      window.removeEventListener("message", handleWindowMessage);
    };
  }, [handleSendMessage, initGuest, log]);

  useEffect(() => {
    return () => {
      clearLongPressTimeout();
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [clearLongPressTimeout]);

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
        <button onClick={() => setShowTemplatePanel(true)} className="p-1 rounded-full hover:bg-accent">
          <Blocks className="h-5 w-5" />
        </button>
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
        </div>
      )}

      {showTemplatePanel && (
        <div className="absolute inset-0 z-20 bg-black/30 flex items-start justify-center p-4">
          <div className="w-full max-w-lg mt-12 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div>
                <div className="text-sm font-semibold">Templates</div>
                <div className="text-xs text-muted-foreground">Installed globally, enabled per chat.</div>
              </div>
              <button onClick={() => setShowTemplatePanel(false)} className="p-1 rounded-full hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
              {installedTemplates.length === 0 ? (
                <div className="text-sm text-muted-foreground rounded-lg border border-dashed border-border p-3">
                  No templates installed yet. Send `HTML`, `HTML1`, `HTML2`, or `HTML3` in the chat to generate test templates.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {installedTemplates.map((template) => {
                    const enabled = chat.enabledTemplateIds.includes(template.id);
                    return (
                      <div
                        key={template.id}
                        className={`relative aspect-square rounded-xl border p-3 select-none cursor-pointer transition-colors ${enabled ? "border-primary bg-primary/5" : "border-border hover:bg-accent/50"}`}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          openTemplateMenu(template, event.clientX, event.clientY);
                        }}
                        onTouchStart={(event) => {
                          clearLongPressTimeout();
                          const touch = event.touches[0];
                          if (!touch) return;
                          longPressTimeoutRef.current = window.setTimeout(() => {
                            openTemplateMenu(template, touch.clientX, touch.clientY);
                            longPressTimeoutRef.current = null;
                          }, 450);
                        }}
                        onTouchEnd={clearLongPressTimeout}
                        onTouchCancel={clearLongPressTimeout}
                        onClick={() => {
                          setTemplateMenu(null);
                          updateEnabledTemplates(template.id, !enabled);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={(event) => updateEnabledTemplates(template.id, event.target.checked)}
                          onClick={(event) => event.stopPropagation()}
                          className="absolute left-3 top-3"
                        />
                        <div className="h-full pt-7 flex flex-col">
                          <div className="text-sm font-medium leading-tight line-clamp-2">{template.name}</div>
                          <div className="mt-2 text-[11px] text-muted-foreground leading-snug line-clamp-4 flex-1">
                            {template.description}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-2">Right click / hold</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {templateMenu && (
        <div
          className="fixed z-30 min-w-[160px] rounded-lg border border-border bg-card shadow-xl p-1"
          style={{ left: Math.max(12, templateMenu.x - 140), top: Math.max(12, templateMenu.y - 12) }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            onClick={() => {
              setPendingTemplateDelete(templateMenu.template);
              setTemplateMenu(null);
            }}
            className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-accent"
          >
            Delete template
          </button>
        </div>
      )}

      {pendingTemplateInstall && (
        <div className="absolute inset-0 z-30 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl p-4 space-y-4">
            <div>
              <div className="text-sm font-semibold">Install template?</div>
              <div className="text-sm text-muted-foreground mt-1">`{pendingTemplateInstall.name}` will be installed globally and enabled for this chat.</div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-sm font-medium">{pendingTemplateInstall.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{pendingTemplateInstall.description}</div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPendingTemplateInstall(null)}
                className="px-3 py-2 rounded-md border border-border text-sm hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmInstallTemplate}
                className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
              >
                Install
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingTemplateDelete && (
        <div className="absolute inset-0 z-30 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl p-4 space-y-4">
            <div>
              <div className="text-sm font-semibold">Delete template?</div>
              <div className="text-sm text-muted-foreground mt-1">`{pendingTemplateDelete.name}` will be removed globally and disabled in every chat.</div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-sm font-medium">{pendingTemplateDelete.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{pendingTemplateDelete.description}</div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPendingTemplateDelete(null)}
                className="px-3 py-2 rounded-md border border-border text-sm hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteTemplate(pendingTemplateDelete)}
                className="px-3 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-medium"
              >
                Delete
              </button>
            </div>
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
