import { useConfigStore } from "@/stores/config-store";
import { applyTheme } from "@/lib/theme";
import { ApiKeyForm } from "@/components/settings/ApiKeyForm";
import { Sun, Moon, Monitor, Plus, Trash2, Eye, EyeOff, Info } from "lucide-react";
import { useState } from "react";
import type { Theme } from "@/types";
import { getDefaultModelForProvider } from "@/lib/providers";
import { DEFAULT_PROXY_URL } from "@/lib/proxy";

export function SettingsPage() {
  const { theme, setTheme, apiKeys, addApiKey, updateApiKey, removeApiKey } =
    useConfigStore();
  const [showAbout, setShowAbout] = useState(false);
  const [showAddKey, setShowAddKey] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);

  const themes: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  function handleThemeChange(t: Theme) {
    setTheme(t);
    applyTheme(t);
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
            <div className="mb-3">
              <ApiKeyForm
                initialValues={{
                  name: "",
                  key: "",
                  provider: "openai",
                  model: getDefaultModelForProvider("openai"),
                  useProxy: false,
                  proxyUrl: DEFAULT_PROXY_URL,
                }}
                onSubmit={(values) => {
                  addApiKey(
                    values.name,
                    values.key,
                    values.provider,
                    values.model,
                    values.useProxy,
                    values.proxyUrl
                  );
                  setShowAddKey(false);
                }}
                onCancel={() => setShowAddKey(false)}
                submitLabel="Add Key"
              />
            </div>
          )}

          {apiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No API keys configured
            </p>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((k) => (
                <div key={k.id} className="p-3 rounded-lg border border-border space-y-3">
                  {editingKeyId === k.id ? (
                    <ApiKeyForm
                      initialValues={{
                        name: k.name,
                        key: k.key,
                        provider: k.provider,
                        model: k.model,
                        useProxy: k.useProxy,
                        proxyUrl: k.proxyUrl,
                      }}
                      onSubmit={(values) => {
                        updateApiKey(k.id, values);
                        setEditingKeyId(null);
                      }}
                      onCancel={() => setEditingKeyId(null)}
                      submitLabel="Save"
                    />
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{k.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {k.provider} · {k.model}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {k.useProxy ? `Proxy · ${k.proxyUrl}` : "Direct browser request"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-1">
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
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingKeyId(k.id)}
                          className="flex-1 py-2 rounded-md border border-border text-sm font-medium hover:bg-accent"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => removeApiKey(k.id)}
                          className="px-3 py-2 rounded-md border border-destructive text-destructive text-sm font-medium hover:bg-destructive/5"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  )}
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
