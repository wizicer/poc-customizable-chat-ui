import { useNavigate } from "react-router-dom";
import { useAgentsStore } from "@/stores/agents-store";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

export function AgentsPage() {
  const navigate = useNavigate();
  const { agents, removeAgent } = useAgentsStore();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <h1 className="text-lg font-bold">Agents</h1>
        <button
          onClick={() => navigate("/agent/new")}
          className="p-2 rounded-full hover:bg-accent transition-colors"
        >
          <Plus className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 p-8">
            <p className="text-lg font-medium">No agents</p>
            <p className="text-sm">Create an agent to start chatting</p>
          </div>
        ) : (
          agents.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-accent/50 cursor-pointer transition-colors"
              onClick={() => navigate(`/agent/${agent.id}`)}
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-xl shrink-0">
                {agent.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{agent.name}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {agent.systemPrompt || "No system prompt"}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirmDeleteId === agent.id) {
                    removeAgent(agent.id);
                    setConfirmDeleteId(null);
                  } else {
                    setConfirmDeleteId(agent.id);
                    setTimeout(() => setConfirmDeleteId(null), 3000);
                  }
                }}
                className="p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              {confirmDeleteId === agent.id && (
                <span className="text-xs text-destructive shrink-0">
                  Tap again
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
