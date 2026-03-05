export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isEditing?: boolean; // 是否处于编辑状态
}

export interface MemorySummary {
  content: string; // 累积式摘要内容
  summarizedUpToIndex: number; // 已摘要到第几条消息（索引）
  lastUpdated: Date;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  memorySummary?: MemorySummary; // 单一累积式摘要
  createdAt: Date;
  updatedAt: Date;
  systemPromptId?: string; // 关联的系统提示词 ID
  contextWindowSize?: number; // 发送给LLM的最近消息条数，默认10
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
