import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ApiKeyEntry, ChatTemplate, Theme } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { getDefaultModelForProvider } from "@/lib/providers";
import { DEFAULT_PROXY_URL } from "@/lib/proxy";

function normalizeApiKey(entry: Partial<ApiKeyEntry>): ApiKeyEntry {
  const provider = entry.provider || "openai";
  return {
    id: entry.id || uuidv4(),
    name: entry.name || "Unnamed Key",
    key: entry.key || "",
    provider,
    model: entry.model || getDefaultModelForProvider(provider),
    useProxy: entry.useProxy ?? false,
    proxyUrl: entry.proxyUrl || DEFAULT_PROXY_URL,
  };
}

function normalizeTemplate(template: Partial<ChatTemplate>): ChatTemplate {
  return {
    id: template.id || uuidv4(),
    name: template.name || "Unnamed Template",
    description: template.description || "",
    css: template.css || "",
    js: template.js || "",
  };
}

function readLegacyChatTemplates(): ChatTemplate[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem("chat-chats");
    if (!raw) return [];

    const parsed = JSON.parse(raw) as {
      state?: { chats?: Array<{ installedTemplates?: Partial<ChatTemplate>[] }> };
      chats?: Array<{ installedTemplates?: Partial<ChatTemplate>[] }>;
    };

    const chats = parsed.state?.chats || parsed.chats || [];
    const templateMap = new Map<string, ChatTemplate>();

    chats.forEach((chat) => {
      (chat.installedTemplates || []).forEach((template) => {
        const normalized = normalizeTemplate(template);
        templateMap.set(normalized.id, normalized);
      });
    });

    return [...templateMap.values()];
  } catch {
    return [];
  }
}

interface ConfigState {
  theme: Theme;
  apiKeys: ApiKeyEntry[];
  installedTemplates: ChatTemplate[];
  defaultModel: string;
  setTheme: (theme: Theme) => void;
  addApiKey: (name: string, key: string, provider: string, model: string, useProxy: boolean, proxyUrl: string) => void;
  updateApiKey: (id: string, data: Partial<Omit<ApiKeyEntry, "id">>) => void;
  removeApiKey: (id: string) => void;
  installTemplate: (template: ChatTemplate) => void;
  setDefaultModel: (model: string) => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      theme: "system",
      apiKeys: [],
      installedTemplates: [],
      defaultModel: "gpt-4o-mini",

      setTheme: (theme) => set({ theme }),

      addApiKey: (name, key, provider, model, useProxy, proxyUrl) =>
        set((s) => ({
          apiKeys: [
            ...s.apiKeys,
            normalizeApiKey({ id: uuidv4(), name, key, provider, model, useProxy, proxyUrl }),
          ],
        })),

      updateApiKey: (id, data) =>
        set((s) => ({
          apiKeys: s.apiKeys.map((k) => (k.id === id ? normalizeApiKey({ ...k, ...data, id }) : k)),
        })),

      removeApiKey: (id) =>
        set((s) => ({ apiKeys: s.apiKeys.filter((k) => k.id !== id) })),

      installTemplate: (template) =>
        set((s) => ({
          installedTemplates: s.installedTemplates.some((entry) => entry.id === template.id)
            ? s.installedTemplates.map((entry) =>
                entry.id === template.id ? normalizeTemplate(template) : entry
              )
            : [...s.installedTemplates, normalizeTemplate(template)],
        })),

      setDefaultModel: (model) => set({ defaultModel: model }),
    }),
    {
      name: "chat-config",
      version: 3,
      migrate: (persistedState) => {
        const state = persistedState as {
          theme?: Theme;
          apiKeys?: Partial<ApiKeyEntry>[];
          installedTemplates?: Partial<ChatTemplate>[];
          defaultModel?: string;
        } | undefined;

        const installedTemplates = [
          ...(state?.installedTemplates || []).map((template) => normalizeTemplate(template)),
          ...readLegacyChatTemplates(),
        ].reduce<ChatTemplate[]>((all, template) => {
          if (all.some((entry) => entry.id === template.id)) {
            return all.map((entry) => (entry.id === template.id ? template : entry));
          }
          return [...all, template];
        }, []);

        return {
          theme: state?.theme || "system",
          apiKeys: (state?.apiKeys || []).map((entry) => normalizeApiKey(entry)),
          installedTemplates,
          defaultModel: state?.defaultModel || "gpt-4o-mini",
        };
      },
    }
  )
);
