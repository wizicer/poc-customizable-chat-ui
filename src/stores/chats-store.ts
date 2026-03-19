import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Chat } from "@/types";
import { v4 as uuidv4 } from "uuid";

interface ChatsState {
  chats: Chat[];
  createChat: (agentId: string, agentName: string) => string;
  updateChat: (id: string, data: Partial<Omit<Chat, "id">>) => void;
  removeChat: (id: string) => void;
  getChat: (id: string) => Chat | undefined;
  addTemplate: (chatId: string, name: string, html: string) => void;
  toggleTemplate: (chatId: string, templateId: string) => void;
  removeTemplate: (chatId: string, templateId: string) => void;
}

export const useChatsStore = create<ChatsState>()(
  persist(
    (set, get) => ({
      chats: [],

      createChat: (agentId, agentName) => {
        const id = uuidv4();
        const chat: Chat = {
          id,
          agentId,
          title: agentName,
          icon: "💬",
          lastMessage: "",
          lastMessageTime: Date.now(),
          unread: false,
          templates: [],
          contextPrompt: "",
        };
        set((s) => ({ chats: [chat, ...s.chats] }));
        return id;
      },

      updateChat: (id, data) =>
        set((s) => ({
          chats: s.chats.map((c) => (c.id === id ? { ...c, ...data } : c)),
        })),

      removeChat: (id) =>
        set((s) => ({ chats: s.chats.filter((c) => c.id !== id) })),

      getChat: (id) => get().chats.find((c) => c.id === id),

      addTemplate: (chatId, name, html) => {
        const templateId = uuidv4();
        set((s) => ({
          chats: s.chats.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  templates: [
                    ...c.templates,
                    { id: templateId, name, html, enabled: false },
                  ],
                }
              : c
          ),
        }));
      },

      toggleTemplate: (chatId, templateId) =>
        set((s) => ({
          chats: s.chats.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  templates: c.templates.map((t) =>
                    t.id === templateId ? { ...t, enabled: !t.enabled } : t
                  ),
                }
              : c
          ),
        })),

      removeTemplate: (chatId, templateId) =>
        set((s) => ({
          chats: s.chats.map((c) =>
            c.id === chatId
              ? {
                  ...c,
                  templates: c.templates.filter((t) => t.id !== templateId),
                }
              : c
          ),
        })),
    }),
    { name: "chat-chats" }
  )
);
