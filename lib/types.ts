export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  systemPromptId?: string; // 关联的系统提示词 ID
}

export interface ModelConfig {
  id: string;
  name: string;
  model: string;
}

export interface SystemPrompt {
  id: string;
  name: string;
  content: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
