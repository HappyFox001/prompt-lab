// 可用的标签选项（可以在客户端和服务端使用）
export const FEEDBACK_TAGS = [
  { id: 'realistic', label: 'リアルさ', color: '#3b82f6' },
  { id: 'character-stable', label: 'キャラクター安定性', color: '#8b5cf6' },
  { id: 'world-realism', label: '世界観のリアリティ', color: '#10b981' },
  { id: 'natural-chat', label: '会話の自然さ', color: '#f59e0b' },
  { id: 'story-experience', label: 'ストーリー体験', color: '#ec4899' },
] as const;

export type FeedbackTag = typeof FEEDBACK_TAGS[number];
