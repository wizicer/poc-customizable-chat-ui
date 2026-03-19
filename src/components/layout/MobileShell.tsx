import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { MessageSquare, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "/chats", label: "Chats", icon: MessageSquare },
  { path: "/agents", label: "Agents", icon: Users },
  { path: "/settings", label: "Settings", icon: Settings },
] as const;

export function MobileShell() {
  const location = useLocation();
  const navigate = useNavigate();

  const isDetailView =
    location.pathname.startsWith("/chat/") ||
    location.pathname.startsWith("/agent/");

  return (
    <div className="flex flex-col h-full w-full bg-background">
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>

      {!isDetailView && (
        <nav className="flex border-t border-border bg-card shrink-0">
          {tabs.map((tab) => {
            const active = location.pathname.startsWith(tab.path);
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
