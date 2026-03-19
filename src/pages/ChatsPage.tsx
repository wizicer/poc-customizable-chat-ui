import { useNavigate } from "react-router-dom";
import { useChatsStore } from "@/stores/chats-store";
import { useAgentsStore } from "@/stores/agents-store";
import { useMessagesStore } from "@/stores/messages-store";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

export function ChatsPage() {
  const navigate = useNavigate();
  const { chats, removeChat } = useChatsStore();
  const { agents } = useAgentsStore();
  const { clearMessages } = useMessagesStore();
  const [swipedId, setSwipedId] = useState<string | null>(null);

  const sortedChats = [...chats].sort(
    (a, b) => b.lastMessageTime - a.lastMessageTime
  );

  function startNewChat() {
    navigate("/chat/new");
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <h1 className="text-lg font-bold">Chats</h1>
        <button
          onClick={startNewChat}
          className="p-2 rounded-full hover:bg-accent transition-colors"
        >
          <Plus className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {sortedChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2 p-8">
            <p className="text-lg font-medium">No chats yet</p>
            <p className="text-sm text-center">
              Go to Agents tab to create an agent and start chatting
            </p>
          </div>
        ) : (
          sortedChats.map((chat) => {
            const agent = agents.find((a) => a.id === chat.agentId);
            return (
              <div
                key={chat.id}
                className="relative overflow-hidden"
                onContextMenu={(e) => {
                  e.preventDefault();
                  setSwipedId(swipedId === chat.id ? null : chat.id);
                }}
              >
                <div
                  className="flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => {
                    setSwipedId(null);
                    navigate(`/chat/${chat.id}`);
                  }}
                >
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-xl shrink-0">
                    {chat.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">
                        {chat.title}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(chat.lastMessageTime).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {chat.lastMessage || "No messages yet"}
                    </p>
                  </div>
                  {chat.unread && (
                    <div className="h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
                  )}
                </div>

                {swipedId === chat.id && (
                  <div className="absolute right-0 top-0 bottom-0 flex border-b border-border">
                    <button
                      onClick={() => {
                        clearMessages(chat.id);
                        removeChat(chat.id);
                        setSwipedId(null);
                      }}
                      className="w-20 bg-destructive text-destructive-foreground flex flex-col items-center justify-center text-xs gap-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
