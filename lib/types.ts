export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isEditing?: boolean; // 是否处于编辑状态
  metadata?: {
    stateUpdates?: Array<{
      id: string;
      delta: number;
      stateName: string;
      newValue: number;
      color?: string;
    }>;
    event?: {
      importance: number;
      description: string;
    };
  };
}

export interface MemorySummary {
  content: string; // 累积式摘要内容
  summarizedUpToIndex: number; // 已摘要到第几条消息（索引）
  lastUpdated: Date;
}

export interface NumericState {
  id: string;
  name: string; // 显示名称，如"好感度"
  value: number; // 当前值
  min: number; // 最小值
  max: number; // 最大值
  description?: string; // 描述
  color?: string; // 显示颜色
}

export interface MemoryEvent {
  id: string;
  timestamp: Date;
  content: string; // 事件描述
  importance: number; // 重要性等级 1-10
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  memorySummary?: MemorySummary; // 单一累积式摘要
  numericStates?: NumericState[]; // 数值化状态
  memoryEvents?: MemoryEvent[]; // 事件记忆
  enableEventMemory?: boolean; // 是否启用事件记忆
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
