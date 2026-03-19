import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAgentsStore } from "@/stores/agents-store";
import { useChatsStore } from "@/stores/chats-store";
import { EmojiPicker } from "@/components/EmojiPicker";
import { ChevronLeft } from "lucide-react";

export function ChatCreatePage() {
  const navigate = useNavigate();
  const { agents } = useAgentsStore();
  const { createChat, updateChat } = useChatsStore();
  
  const [icon, setIcon] = useState("💬");
  const [title, setTitle] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState(agents[0]?.id || "");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  function handleCreate() {
    if (!title.trim() || !selectedAgentId) return;
    
    const agent = agents.find((a) => a.id === selectedAgentId);
    if (!agent) return;

    const chatId = createChat(selectedAgentId, title.trim());
    updateChat(chatId, { icon });
    navigate(`/chat/${chatId}`);
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
        <button
          onClick={() => navigate("/chats")}
          className="p-1 rounded-full hover:bg-accent"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold">New Chat</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <section>
          <label className="block text-sm font-medium mb-2">Icon</label>
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="w-16 h-16 text-3xl rounded-xl border-2 border-border hover:border-primary transition-colors flex items-center justify-center bg-card"
            >
              {icon}
            </button>
            {showEmojiPicker && (
              <div className="absolute top-20 left-0 z-50">
                <EmojiPicker
                  value={icon}
                  onChange={setIcon}
                  onClose={() => setShowEmojiPicker(false)}
                />
              </div>
            )}
          </div>
        </section>

        <section>
          <label className="block text-sm font-medium mb-2">Chat Name</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter chat name..."
            className="w-full px-4 py-2.5 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </section>

        <section>
          <label className="block text-sm font-medium mb-2">Select Agent</label>
          {agents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No agents available. Create one first.
            </p>
          ) : (
            <div className="space-y-2">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgentId(agent.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    selectedAgentId === agent.id
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <div className="text-2xl">{agent.avatar}</div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{agent.name}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {agent.systemPrompt || "No system prompt"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="p-4 border-t border-border bg-card">
        <button
          onClick={handleCreate}
          disabled={!title.trim() || !selectedAgentId}
          className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
        >
          Create Chat
        </button>
      </div>
    </div>
  );
}
