import { MobileShell } from "./MobileShell";
import { MessageSquare } from "lucide-react";

export function DesktopShell() {
  return (
    <div className="hidden md:flex h-full w-full bg-muted">
      {/* Left sidebar - brand area */}
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

      {/* Center - mobile frame */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-[390px] h-[844px] max-h-[90vh] rounded-[2.5rem] border-[8px] border-foreground/20 shadow-2xl overflow-hidden bg-background">
          <MobileShell />
        </div>
      </div>

      {/* Right sidebar - info area */}
      <aside className="w-64 flex flex-col items-center justify-center p-8">
        <div className="text-center space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Quick Tips</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>💬 Create agents with custom system prompts</p>
            <p>🎨 Customize chat UI with HTML/CSS/JS</p>
            <p>🔑 Manage multiple API keys</p>
            <p>🛡️ Sandbox isolation for safety</p>
            <p>📱 Native mobile experience</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
