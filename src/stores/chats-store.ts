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
  resetChatUI: (id: string) => void;
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
          lastMessage: "",
          lastMessageTime: Date.now(),
          unread: false,
          customHtml: "",
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

      resetChatUI: (id) =>
        set((s) => ({
          chats: s.chats.map((c) =>
            c.id === id ? { ...c, customHtml: "" } : c
          ),
        })),
    }),
    { name: "chat-chats" }
  )
);
