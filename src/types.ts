export interface ApiKeyEntry {
  id: string;
  name: string;
  key: string;
  provider: string;
}

export interface Agent {
  id: string;
  name: string;
  avatar: string;
  systemPrompt: string;
  apiKeyId: string | null;
  oneTimeApiKey: string;
  customHtml: string;
}

export interface ChatTemplate {
  id: string;
  name: string;
  description: string;
  css: string;
}

export interface Chat {
  id: string;
  agentId: string;
  icon: string;
  title: string;
  lastMessage: string;
  lastMessageTime: number;
  unread: boolean;
  customHtml: string;
  contextPrompt: string;
  memoryEnabled: boolean;
  memoryPrompt: string;
  installedTemplates: ChatTemplate[];
  enabledTemplateIds: string[];
}

export interface Message {
  id: string;
  chatId: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  clientMessageId?: string;
  isTemplate?: boolean;
  templateData?: string;
}

export type Theme = "light" | "dark" | "system";

export interface IframeMessage {
  action: string;
  payload?: unknown;
}
