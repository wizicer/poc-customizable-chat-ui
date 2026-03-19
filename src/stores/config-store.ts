import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ApiKeyEntry, Theme } from "@/types";
import { v4 as uuidv4 } from "uuid";
import { getDefaultModelForProvider } from "@/lib/providers";

function normalizeApiKey(entry: Partial<ApiKeyEntry>): ApiKeyEntry {
  const provider = entry.provider || "openai";
  return {
    id: entry.id || uuidv4(),
    name: entry.name || "Unnamed Key",
    key: entry.key || "",
    provider,
    model: entry.model || getDefaultModelForProvider(provider),
  };
}

interface ConfigState {
  theme: Theme;
  apiKeys: ApiKeyEntry[];
  defaultModel: string;
  setTheme: (theme: Theme) => void;
  addApiKey: (name: string, key: string, provider: string, model: string) => void;
  updateApiKey: (id: string, data: Partial<Omit<ApiKeyEntry, "id">>) => void;
  removeApiKey: (id: string) => void;
  setDefaultModel: (model: string) => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      theme: "system",
      apiKeys: [],
      defaultModel: "gpt-4o-mini",

      setTheme: (theme) => set({ theme }),

      addApiKey: (name, key, provider, model) =>
        set((s) => ({
          apiKeys: [...s.apiKeys, { id: uuidv4(), name, key, provider, model }],
        })),

      updateApiKey: (id, data) =>
        set((s) => ({
          apiKeys: s.apiKeys.map((k) => (k.id === id ? { ...k, ...data } : k)),
        })),

      removeApiKey: (id) =>
        set((s) => ({ apiKeys: s.apiKeys.filter((k) => k.id !== id) })),

      setDefaultModel: (model) => set({ defaultModel: model }),
    }),
    {
      name: "chat-config",
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as {
          theme?: Theme;
          apiKeys?: Partial<ApiKeyEntry>[];
          defaultModel?: string;
        } | undefined;
        return {
          theme: state?.theme || "system",
          apiKeys: (state?.apiKeys || []).map((entry) => normalizeApiKey(entry)),
          defaultModel: state?.defaultModel || "gpt-4o-mini",
        };
      },
    }
  )
);
