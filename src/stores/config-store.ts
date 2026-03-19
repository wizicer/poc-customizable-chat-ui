import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ApiKeyEntry, Theme } from "@/types";
import { v4 as uuidv4 } from "uuid";

interface ConfigState {
  theme: Theme;
  apiKeys: ApiKeyEntry[];
  defaultModel: string;
  setTheme: (theme: Theme) => void;
  addApiKey: (name: string, key: string, provider: string) => void;
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

      addApiKey: (name, key, provider) =>
        set((s) => ({
          apiKeys: [...s.apiKeys, { id: uuidv4(), name, key, provider }],
        })),

      updateApiKey: (id, data) =>
        set((s) => ({
          apiKeys: s.apiKeys.map((k) => (k.id === id ? { ...k, ...data } : k)),
        })),

      removeApiKey: (id) =>
        set((s) => ({ apiKeys: s.apiKeys.filter((k) => k.id !== id) })),

      setDefaultModel: (model) => set({ defaultModel: model }),
    }),
    { name: "chat-config" }
  )
);
