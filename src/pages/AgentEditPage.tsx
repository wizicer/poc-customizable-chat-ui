import { useParams, useNavigate } from "react-router-dom";
import { useAgentsStore, AVATARS } from "@/stores/agents-store";
import { useChatsStore } from "@/stores/chats-store";
import { useConfigStore } from "@/stores/config-store";
import { ChevronLeft, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import type { Agent } from "@/types";

export function AgentEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { agents, addAgent, updateAgent, getAgent } = useAgentsStore();
  const { createChat } = useChatsStore();
  const { apiKeys } = useConfigStore();

  const isNew = id === "new";
  const existing = isNew ? undefined : getAgent(id!);

  const [form, setForm] = useState<Omit<Agent, "id">>({
    name: "",
    avatar: "🤖",
    systemPrompt: "",
    apiKeyId: null,
    oneTimeApiKey: "",
    customHtml: "",
  });

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name,
        avatar: existing.avatar,
        systemPrompt: existing.systemPrompt,
        apiKeyId: existing.apiKeyId,
        oneTimeApiKey: existing.oneTimeApiKey,
        customHtml: existing.customHtml,
      });
    }
  }, [existing]);

  function handleSave() {
    if (!form.name.trim()) return;
    if (isNew) {
      addAgent(form);
    } else {
      updateAgent(id!, form);
    }
    navigate(-1);
  }

  function handleStartChat() {
    const agentId = isNew ? addAgent(form) : id!;
    if (!isNew) updateAgent(id!, form);
    const agent = isNew ? { ...form, id: agentId } : getAgent(id!)!;
    const chatId = createChat(agentId, agent.name);
    navigate(`/chat/${chatId}`, { replace: true });
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card">
        <button
          onClick={() => navigate(-1)}
          className="p-1 rounded-full hover:bg-accent"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold flex-1">
          {isNew ? "New Agent" : "Edit Agent"}
        </h1>
        <button
          onClick={handleSave}
          className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md"
        >
          Save
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Avatar */}
        <div>
          <label className="text-sm font-medium mb-2 block">Avatar</label>
          <div className="flex flex-wrap gap-2">
            {AVATARS.map((a) => (
              <button
                key={a}
                onClick={() => setForm({ ...form, avatar: a })}
                className={`h-10 w-10 rounded-full flex items-center justify-center text-lg transition-all ${
                  form.avatar === a
                    ? "ring-2 ring-primary bg-primary/10 scale-110"
                    : "bg-muted hover:bg-accent"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="text-sm font-medium mb-1 block">Agent Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Code Assistant"
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* System Prompt */}
        <div>
          <label className="text-sm font-medium mb-1 block">
            System Prompt
          </label>
          <textarea
            value={form.systemPrompt}
            onChange={(e) =>
              setForm({ ...form, systemPrompt: e.target.value })
            }
            placeholder="You are a helpful assistant..."
            rows={4}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {/* API Key Selection */}
        <div>
          <label className="text-sm font-medium mb-1 block">API Key</label>
          <select
            value={form.apiKeyId || ""}
            onChange={(e) =>
              setForm({ ...form, apiKeyId: e.target.value || null })
            }
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Use one-time key below</option>
            {apiKeys.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name} ({k.provider})
              </option>
            ))}
          </select>
        </div>

        {/* One-time API Key */}
        {!form.apiKeyId && (
          <div>
            <label className="text-sm font-medium mb-1 block">
              One-time API Key
            </label>
            <input
              type="password"
              value={form.oneTimeApiKey}
              onChange={(e) =>
                setForm({ ...form, oneTimeApiKey: e.target.value })
              }
              placeholder="sk-..."
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        )}

        {/* Custom HTML */}
        <div>
          <label className="text-sm font-medium mb-1 block">
            Custom Chat HTML (optional)
          </label>
          <textarea
            value={form.customHtml}
            onChange={(e) =>
              setForm({ ...form, customHtml: e.target.value })
            }
            placeholder="Paste custom HTML/CSS/JS for the chat iframe..."
            rows={6}
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        {/* Start Chat */}
        <button
          onClick={handleStartChat}
          disabled={!form.name.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <MessageSquare className="h-4 w-4" />
          Start Chat
        </button>
      </div>
    </div>
  );
}
