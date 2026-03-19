import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Agent } from "@/types";
import { v4 as uuidv4 } from "uuid";

const AVATARS = ["🤖", "🧠", "💡", "🎯", "🦊", "🐱", "🌟", "🔮", "🎨", "🚀"];

interface AgentsState {
  agents: Agent[];
  addAgent: (data: Omit<Agent, "id">) => string;
  updateAgent: (id: string, data: Partial<Omit<Agent, "id">>) => void;
  removeAgent: (id: string) => void;
  getAgent: (id: string) => Agent | undefined;
}

export const useAgentsStore = create<AgentsState>()(
  persist(
    (set, get) => ({
      agents: [
        {
          id: "default-assistant",
          name: "Default Assistant",
          avatar: "🤖",
          systemPrompt: "You are a helpful assistant.",
          apiKeyId: null,
          oneTimeApiKey: "",
          customHtml: "",
        },
      ],

      addAgent: (data) => {
        const id = uuidv4();
        set((s) => ({ agents: [...s.agents, { ...data, id }] }));
        return id;
      },

      updateAgent: (id, data) =>
        set((s) => ({
          agents: s.agents.map((a) => (a.id === id ? { ...a, ...data } : a)),
        })),

      removeAgent: (id) =>
        set((s) => ({ agents: s.agents.filter((a) => a.id !== id) })),

      getAgent: (id) => get().agents.find((a) => a.id === id),
    }),
    { name: "chat-agents" }
  )
);

export { AVATARS };
