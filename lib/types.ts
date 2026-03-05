export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isEditing?: boolean; // 是否处于编辑状态
}

export interface MemorySummary {
  id: string;
  content: string; // 摘要内容
  messageRange: { start: number; end: number }; // 对应的消息索引范围
  createdAt: Date;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  memorySummaries: MemorySummary[]; // 历史对话摘要（累积式）
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
