import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Message } from "@/types";
import { v4 as uuidv4 } from "uuid";

interface MessagesState {
  messages: Record<string, Message[]>;
  addMessage: (chatId: string, role: Message["role"], content: string, extra?: Partial<Message>) => Message;
  getMessages: (chatId: string) => Message[];
  clearMessages: (chatId: string) => void;
  updateMessage: (chatId: string, messageId: string, content: string) => void;
}

export const useMessagesStore = create<MessagesState>()(
  persist(
    (set, get) => ({
      messages: {},

      addMessage: (chatId, role, content, extra) => {
        const msg: Message = {
          id: uuidv4(),
          chatId,
          role,
          content,
          timestamp: Date.now(),
          ...extra,
        };
        set((s) => ({
          messages: {
            ...s.messages,
            [chatId]: [...(s.messages[chatId] || []), msg],
          },
        }));
        return msg;
      },

      getMessages: (chatId) => get().messages[chatId] || [],

      clearMessages: (chatId) =>
        set((s) => {
          const copy = { ...s.messages };
          delete copy[chatId];
          return { messages: copy };
        }),

      updateMessage: (chatId, messageId, content) =>
        set((s) => ({
          messages: {
            ...s.messages,
            [chatId]: (s.messages[chatId] || []).map((m) =>
              m.id === messageId ? { ...m, content } : m
            ),
          },
        })),
    }),
    { name: "chat-messages" }
  )
);
