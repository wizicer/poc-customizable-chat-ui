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
  html: string;
  enabled: boolean;
}

export interface Chat {
  id: string;
  agentId: string;
  title: string;
  icon: string;
  lastMessage: string;
  lastMessageTime: number;
  unread: boolean;
  templates: ChatTemplate[];
  contextPrompt: string;
}

export interface Message {
  id: string;
  chatId: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  isTemplate?: boolean;
  templateData?: string;
}

export type Theme = "light" | "dark" | "system";

export interface IframeMessage {
  action: string;
  payload?: unknown;
}
