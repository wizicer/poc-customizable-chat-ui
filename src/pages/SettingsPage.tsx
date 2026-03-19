import { useConfigStore } from "@/stores/config-store";
import { applyTheme } from "@/lib/theme";
import { Sun, Moon, Monitor, Plus, Trash2, Eye, EyeOff, Info } from "lucide-react";
import { useState } from "react";
import type { Theme } from "@/types";

export function SettingsPage() {
  const { theme, setTheme, apiKeys, addApiKey, removeApiKey } =
    useConfigStore();
  const [showAbout, setShowAbout] = useState(false);
  const [showAddKey, setShowAddKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");
  const [newKeyProvider, setNewKeyProvider] = useState("openai");
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  const themes: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  function handleThemeChange(t: Theme) {
    setTheme(t);
    applyTheme(t);
  }

  function handleAddKey() {
    if (!newKeyName.trim() || !newKeyValue.trim()) return;
    addApiKey(newKeyName.trim(), newKeyValue.trim(), newKeyProvider);
    setNewKeyName("");
    setNewKeyValue("");
    setShowAddKey(false);
  }

  function toggleKeyVisibility(id: string) {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <h1 className="text-lg font-bold">Settings</h1>
        <button
          onClick={() => setShowAbout(true)}
          className="p-2 rounded-full hover:bg-accent transition-colors"
        >
          <Info className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Theme Selection */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">
            Theme
          </h2>
          <div className="flex gap-2">
            {themes.map((t) => (
              <button
                key={t.value}
                onClick={() => handleThemeChange(t.value)}
                className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-lg border transition-all ${
                  theme === t.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border hover:bg-accent text-muted-foreground"
                }`}
              >
                <t.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* API Key Management */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-muted-foreground">
              API Keys
            </h2>
            <button
              onClick={() => setShowAddKey(!showAddKey)}
              className="p-1.5 rounded-full hover:bg-accent transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {showAddKey && (
            <div className="p-3 mb-3 rounded-lg border border-border space-y-2">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key name (e.g. My OpenAI Key)"
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <select
                value={newKeyProvider}
                onChange={(e) => setNewKeyProvider(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="deepseek">DeepSeek</option>
                <option value="moonshot">Moonshot</option>
                <option value="gemini">Google Gemini</option>
              </select>
              <input
                type="password"
                value={newKeyValue}
                onChange={(e) => setNewKeyValue(e.target.value)}
                placeholder="API Key (sk-...)"
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={handleAddKey}
                disabled={!newKeyName.trim() || !newKeyValue.trim()}
                className="w-full py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
              >
                Add Key
              </button>
            </div>
          )}

          {apiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No API keys configured
            </p>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center gap-2 p-3 rounded-lg border border-border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{k.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {k.provider} ·{" "}
                      {visibleKeys.has(k.id)
                        ? k.key
                        : k.key.slice(0, 8) + "••••••••"}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleKeyVisibility(k.id)}
                    className="p-1.5 rounded-full hover:bg-accent text-muted-foreground"
                  >
                    {visibleKeys.has(k.id) ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => removeApiKey(k.id)}
                    className="p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* About Modal */}
      {showAbout && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAbout(false)}
        >
          <div
            className="bg-card rounded-xl p-6 max-w-sm w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold">About</h2>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">
                  Customizable Chat PoC
                </strong>
              </p>
              <p>
                A fully customizable, frontend-only chat application that
                connects directly to LLM providers.
              </p>
              <p>
                Chat interfaces are rendered in sandboxed iframes, allowing
                complete UI customization with HTML/CSS/JS.
              </p>
              <p>All data is stored locally in your browser.</p>
              <p className="text-xs">Version 0.0.1</p>
            </div>
            <button
              onClick={() => setShowAbout(false)}
              className="w-full py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
