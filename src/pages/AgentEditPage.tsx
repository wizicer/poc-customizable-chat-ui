import { useParams, useNavigate } from "react-router-dom";
import { useAgentsStore } from "@/stores/agents-store";
import { useChatsStore } from "@/stores/chats-store";
import { useConfigStore } from "@/stores/config-store";
import { EmojiPicker } from "@/components/EmojiPicker";
import { ChevronLeft, MessageSquare, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import type { Agent } from "@/types";

export function AgentEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addAgent, updateAgent, getAgent, removeAgent } = useAgentsStore();
  const { createChat } = useChatsStore();
  const { apiKeys } = useConfigStore();

  const isNew = id === "new";
  const existing = isNew ? undefined : getAgent(id!);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
    const chatId = createChat({
      agentId,
      icon: agent.avatar || "💬",
      title: agent.name,
    });
    navigate(`/chat/${chatId}`, { replace: true });
  }

  function handleDelete() {
    if (!id || isNew) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      window.setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    removeAgent(id);
    navigate("/agents", { replace: true });
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
        <div>
          <label className="text-sm font-medium mb-2 block">Avatar</label>
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker((value) => !value)}
              className="h-14 w-14 rounded-2xl border border-border bg-muted flex items-center justify-center text-2xl hover:bg-accent transition-colors"
            >
              {form.avatar || "🤖"}
            </button>
            {showEmojiPicker && (
              <div className="absolute left-0 top-16 z-20">
                <EmojiPicker
                  value={form.avatar}
                  onChange={(emoji) => setForm({ ...form, avatar: emoji })}
                  onClose={() => setShowEmojiPicker(false)}
                />
              </div>
            )}
          </div>
          <input
            type="text"
            value={form.avatar}
            onChange={(e) => setForm({ ...form, avatar: e.target.value })}
            placeholder="Pick or type a custom icon"
            className="w-full mt-3 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

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

        <button
          onClick={handleStartChat}
          disabled={!form.name.trim()}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-md bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <MessageSquare className="h-4 w-4" />
          Start Chat
        </button>

        {!isNew && (
          <button
            onClick={handleDelete}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-md border border-destructive text-destructive font-medium hover:bg-destructive/5"
          >
            <Trash2 className="h-4 w-4" />
            {confirmDelete ? "Tap again to delete" : "Delete Agent"}
          </button>
        )}
      </div>
    </div>
  );
}
