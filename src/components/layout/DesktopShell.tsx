import { MobileShell } from "./MobileShell";
import { useLocation } from "react-router-dom";
import { MessageSquare } from "lucide-react";

export function DesktopShell() {
  const location = useLocation();

  const quickTips = location.pathname.startsWith("/chat/")
    ? [
        "Use the settings panel to switch topic icon and memory behavior",
        "Send `HTML` to generate a reference plugin template card",
        "Enable or disable installed templates to reload the chat theme",
        "Watch the console for host, guest, and API debug logs",
      ]
    : location.pathname.startsWith("/agent/") || location.pathname.startsWith("/agents")
      ? [
          "Agents define the system prompt and preferred API key",
          "Use the emoji picker or custom text for agent avatars",
          "Delete actions live inside the agent detail page",
          "You can start a new topic chat directly from an agent",
        ]
      : location.pathname.startsWith("/settings")
        ? [
            "Each API key now stores both provider and model",
            "Edit an existing key to change provider, model, or secret",
            "Provider-specific defaults help prevent wrong endpoint routing",
            "Theme changes apply immediately across the app shell",
          ]
        : [
            "Create topic chats and assign them to the right agent",
            "Topic icons can be changed later from the chat settings panel",
            "Templates follow a host/guest plugin architecture inside the iframe",
            "Use local settings to keep API keys and chat data in your browser",
          ];

  return (
    <div className="hidden md:flex h-full w-full bg-muted">
      <aside className="w-64 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-primary/5 to-primary/10">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <MessageSquare className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            Customizable Chat
          </h1>
          <p className="text-sm text-muted-foreground">
            Fully customizable AI chat interface with sandbox rendering
          </p>
        </div>
      </aside>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-[390px] h-[844px] max-h-[90vh] rounded-[2.5rem] border-[8px] border-foreground/20 shadow-2xl overflow-hidden bg-background">
          <MobileShell />
        </div>
      </div>

      <aside className="w-64 flex flex-col items-center justify-center p-8">
        <div className="text-center space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Quick Tips</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            {quickTips.map((tip) => (
              <p key={tip}>{tip}</p>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
