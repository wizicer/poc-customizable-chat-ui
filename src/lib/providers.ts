export const PROVIDER_DEFAULT_MODELS = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-latest",
  deepseek: "deepseek-chat",
  moonshot: "moonshot-v1-8k",
  gemini: "gemini-1.5-flash",
} as const;

export type ProviderId = keyof typeof PROVIDER_DEFAULT_MODELS;

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  deepseek: "DeepSeek",
  moonshot: "Moonshot",
  gemini: "Google Gemini",
};

export function getDefaultModelForProvider(provider: string): string {
  return PROVIDER_DEFAULT_MODELS[provider as ProviderId] || PROVIDER_DEFAULT_MODELS.openai;
}

export function inferProviderFromModel(model: string): ProviderId {
  const normalized = model.trim().toLowerCase();
  if (normalized.startsWith("claude")) return "anthropic";
  if (normalized.startsWith("gemini")) return "gemini";
  if (normalized.startsWith("deepseek")) return "deepseek";
  if (normalized.startsWith("moonshot") || normalized.startsWith("kimi")) return "moonshot";
  return "openai";
}
