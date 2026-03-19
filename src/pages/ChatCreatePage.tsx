import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, MessageSquarePlus } from "lucide-react";
import { EmojiPicker } from "@/components/EmojiPicker";
import { useAgentsStore } from "@/stores/agents-store";
import { useChatsStore } from "@/stores/chats-store";

export function ChatCreatePage() {
  const navigate = useNavigate();
  const { agents } = useAgentsStore();
  const { createChat } = useChatsStore();
  const [icon, setIcon] = useState("💬");
  const [title, setTitle] = useState("");
  const [agentId, setAgentId] = useState<string>(agents[0]?.id || "");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === agentId),
    [agents, agentId]
  );

  function handleCreateChat() {
    if (!title.trim() || !agentId) return;
    const chatId = createChat({
      agentId,
      icon: icon.trim() || "💬",
      title: title.trim(),
    });
    navigate(`/chat/${chatId}`, { replace: true });
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card">
        <button onClick={() => navigate(-1)} className="p-1 rounded-full hover:bg-accent">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold flex-1">New Topic Chat</h1>
        <button
          onClick={handleCreateChat}
          disabled={!title.trim() || !agentId}
          className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md disabled:opacity-50"
        >
          Create
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <label className="text-sm font-medium mb-2 block">Chat Icon</label>
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker((value) => !value)}
              className="h-14 w-14 rounded-2xl border border-border bg-muted flex items-center justify-center text-2xl hover:bg-accent transition-colors"
            >
              {icon || "💬"}
            </button>
            {showEmojiPicker && (
              <div className="absolute left-0 top-16 z-20">
                <EmojiPicker
                  value={icon}
                  onChange={setIcon}
                  onClose={() => setShowEmojiPicker(false)}
                />
              </div>
            )}
          </div>
          <input
            type="text"
            value={icon}
            onChange={(event) => setIcon(event.target.value)}
            placeholder="Pick or type a custom icon"
            className="w-full mt-3 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Topic Name</label>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Product feedback sync"
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Choose the target agent</label>
          <div className="space-y-2">
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => setAgentId(agent.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                  agentId === agent.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent/60"
                }`}
              >
                <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-xl shrink-0">
                  {agent.avatar || "🤖"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{agent.name}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {agent.systemPrompt || "No system prompt"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-sm font-medium mb-1">Preview</div>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-xl">
              {icon || "💬"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{title || "Untitled topic"}</div>
              <div className="text-sm text-muted-foreground truncate">
                {selectedAgent ? `Talking to ${selectedAgent.name}` : "Select an agent"}
              </div>
            </div>
            <MessageSquarePlus className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}
