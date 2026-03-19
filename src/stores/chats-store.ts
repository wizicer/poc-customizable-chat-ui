import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Chat } from "@/types";
import { v4 as uuidv4 } from "uuid";

function normalizeChat(chat: Partial<Chat>): Chat {
  return {
    id: chat.id || uuidv4(),
    agentId: chat.agentId || "",
    icon: chat.icon || "💬",
    title: chat.title || "Untitled Topic",
    lastMessage: chat.lastMessage || "",
    lastMessageTime: chat.lastMessageTime || Date.now(),
    unread: chat.unread || false,
    customHtml: chat.customHtml || "",
    contextPrompt: chat.contextPrompt || "",
    memoryEnabled: chat.memoryEnabled ?? true,
    memoryPrompt: chat.memoryPrompt || "",
    enabledTemplateIds: chat.enabledTemplateIds || [],
  };
}

interface ChatsState {
  chats: Chat[];
  createChat: (data: Pick<Chat, "agentId" | "icon" | "title">) => string;
  updateChat: (id: string, data: Partial<Omit<Chat, "id">>) => void;
  removeChat: (id: string) => void;
  getChat: (id: string) => Chat | undefined;
  resetChatUI: (id: string) => void;
}

export const useChatsStore = create<ChatsState>()(
  persist(
    (set, get) => ({
      chats: [],

      createChat: ({ agentId, icon, title }) => {
        const id = uuidv4();
        const chat: Chat = {
          id,
          agentId,
          icon,
          title,
          lastMessage: "",
          lastMessageTime: Date.now(),
          unread: false,
          customHtml: "",
          contextPrompt: "",
          memoryEnabled: true,
          memoryPrompt: "",
          enabledTemplateIds: [],
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

      resetChatUI: (id) =>
        set((s) => ({
          chats: s.chats.map((c) =>
            c.id === id
              ? { ...c, customHtml: "", enabledTemplateIds: [] }
              : c
          ),
        })),
    }),
    {
      name: "chat-chats",
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as { chats?: Partial<Chat>[] } | undefined;
        return {
          chats: (state?.chats || []).map((chat) => normalizeChat(chat)),
        };
      },
    }
  )
);
