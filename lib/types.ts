// 情感类别（与 sensory-server 保持一致）
export type EmotionCategory =
  | 'happy' | 'sad' | 'angry' | 'surprised' | 'fear' | 'disgust'
  | 'neutral' | 'excited' | 'anxious' | 'thoughtful' | 'loving'
  | 'playful' | 'curious' | 'embarrassed' | 'confident';

// 情感状态（与 sensory-server 保持一致）
export interface EmotionalState {
  emotion: EmotionCategory;
  intensity: number; // 0.0-1.0

  // 交互意图（对应轨道二：交互响应）
  intent?: string; // "agree", "think", "refuse", "greet", "listen"

  // 情绪细节（对应轨道三：情绪表达）
  subtext?: string; // "shy", "confident", "hesitant", "playful"

  // VAD 维度（可选）
  valence?: number;   // 效价 (-1.0 到 1.0)
  arousal?: number;   // 唤醒度 (0.0-1.0)
  dominance?: number; // 支配度 (0.0-1.0)
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isEditing?: boolean; // 是否处于编辑状态

  // 新增：情感状态（第一层 LLM 输出）
  emotionalState?: EmotionalState;

  // 保留：状态更新和事件（第二层 LLM 输出）
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
