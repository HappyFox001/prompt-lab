'use client';

import { EmotionalState } from '@/lib/types';
import { Smile, Frown, Angry, AlertCircle, Zap, ThumbsUp, Brain, Sparkles } from 'lucide-react';

interface EmotionalStateBadgeProps {
  emotionalState: EmotionalState;
  compact?: boolean;
}

// 情感图标映射
const EMOTION_ICONS: Record<string, { icon: any; color: string; bgColor: string }> = {
  happy: { icon: Smile, color: 'text-yellow-500', bgColor: 'bg-yellow-50 dark:bg-yellow-950' },
  sad: { icon: Frown, color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-950' },
  angry: { icon: Angry, color: 'text-red-500', bgColor: 'bg-red-50 dark:bg-red-950' },
  surprised: { icon: AlertCircle, color: 'text-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-950' },
  excited: { icon: Zap, color: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-950' },
  neutral: { icon: ThumbsUp, color: 'text-gray-500', bgColor: 'bg-gray-50 dark:bg-gray-900' },
  anxious: { icon: AlertCircle, color: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-950' },
  thoughtful: { icon: Brain, color: 'text-indigo-500', bgColor: 'bg-indigo-50 dark:bg-indigo-950' },
  loving: { icon: Sparkles, color: 'text-pink-500', bgColor: 'bg-pink-50 dark:bg-pink-950' },
  playful: { icon: Smile, color: 'text-green-500', bgColor: 'bg-green-50 dark:bg-green-950' },
  curious: { icon: AlertCircle, color: 'text-cyan-500', bgColor: 'bg-cyan-50 dark:bg-cyan-950' },
  embarrassed: { icon: Frown, color: 'text-rose-500', bgColor: 'bg-rose-50 dark:bg-rose-950' },
  confident: { icon: ThumbsUp, color: 'text-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-950' },
  fear: { icon: AlertCircle, color: 'text-violet-500', bgColor: 'bg-violet-50 dark:bg-violet-950' },
  disgust: { icon: Angry, color: 'text-lime-500', bgColor: 'bg-lime-50 dark:bg-lime-950' },
};

// Intent 中文标签
const INTENT_LABELS: Record<string, string> = {
  agree: '同意',
  think: '思考',
  refuse: '拒绝',
  greet: '打招呼',
  listen: '倾听',
  question: '提问',
  explain: '解释',
  comfort: '安慰',
};

// Subtext 中文标签
const SUBTEXT_LABELS: Record<string, string> = {
  shy: '害羞',
  confident: '自信',
  hesitant: '犹豫',
  playful: '俏皮',
  serious: '严肃',
  gentle: '温柔',
  enthusiastic: '热情',
};

export function EmotionalStateBadge({ emotionalState, compact = false }: EmotionalStateBadgeProps) {
  const emotionConfig = EMOTION_ICONS[emotionalState.emotion] || EMOTION_ICONS.neutral;
  const EmotionIcon = emotionConfig.icon;

  if (compact) {
    // 紧凑模式：只显示核心信息
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-secondary border border-border-light">
        <EmotionIcon className={`h-4 w-4 ${emotionConfig.color}`} />
        <span className="text-xs font-medium text-text-primary capitalize">
          {emotionalState.emotion}
        </span>
        {emotionalState.intent && (
          <span className="text-xs text-text-secondary">
            · {INTENT_LABELS[emotionalState.intent] || emotionalState.intent}
          </span>
        )}
      </div>
    );
  }

  // 完整模式：显示所有信息
  return (
    <div className={`rounded-lg p-3 ${emotionConfig.bgColor} border border-border-light space-y-2`}>
      {/* 第一行：情感 + 强度 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <EmotionIcon className={`h-5 w-5 ${emotionConfig.color}`} />
          <span className="text-sm font-semibold text-text-primary capitalize">
            {emotionalState.emotion}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text-secondary">强度</span>
          <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${emotionConfig.color.replace('text-', 'bg-')} transition-all duration-300`}
              style={{ width: `${emotionalState.intensity * 100}%` }}
            />
          </div>
          <span className="text-xs font-medium text-text-secondary">
            {Math.round(emotionalState.intensity * 100)}%
          </span>
        </div>
      </div>

      {/* 第二行：Intent + Subtext */}
      {(emotionalState.intent || emotionalState.subtext) && (
        <div className="flex items-center gap-2 flex-wrap">
          {emotionalState.intent && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-xs font-medium text-blue-700 dark:text-blue-300">
              <span className="opacity-60">意图</span>
              {INTENT_LABELS[emotionalState.intent] || emotionalState.intent}
            </span>
          )}
          {emotionalState.subtext && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/30 text-xs font-medium text-purple-700 dark:text-purple-300">
              <span className="opacity-60">细节</span>
              {SUBTEXT_LABELS[emotionalState.subtext] || emotionalState.subtext}
            </span>
          )}
        </div>
      )}

      {/* 第三行：VAD 维度（可选） */}
      {(emotionalState.valence !== undefined ||
        emotionalState.arousal !== undefined ||
        emotionalState.dominance !== undefined) && (
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border-light/50">
          {emotionalState.valence !== undefined && (
            <div className="text-center">
              <div className="text-xs text-text-secondary">效价</div>
              <div className="text-sm font-semibold text-text-primary">
                {emotionalState.valence > 0 ? '+' : ''}
                {emotionalState.valence.toFixed(1)}
              </div>
            </div>
          )}
          {emotionalState.arousal !== undefined && (
            <div className="text-center">
              <div className="text-xs text-text-secondary">唤醒</div>
              <div className="text-sm font-semibold text-text-primary">
                {emotionalState.arousal.toFixed(1)}
              </div>
            </div>
          )}
          {emotionalState.dominance !== undefined && (
            <div className="text-center">
              <div className="text-xs text-text-secondary">支配</div>
              <div className="text-sm font-semibold text-text-primary">
                {emotionalState.dominance.toFixed(1)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 流式加载中的占位符
export function EmotionalStateSkeleton() {
  return (
    <div className="rounded-lg p-3 bg-gray-50 dark:bg-gray-900 border border-border-light space-y-2 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-5 w-5 bg-gray-300 dark:bg-gray-700 rounded" />
        <div className="h-4 w-20 bg-gray-300 dark:bg-gray-700 rounded" />
        <div className="h-4 w-24 bg-gray-300 dark:bg-gray-700 rounded ml-auto" />
      </div>
      <div className="flex gap-2">
        <div className="h-6 w-16 bg-gray-300 dark:bg-gray-700 rounded-md" />
        <div className="h-6 w-16 bg-gray-300 dark:bg-gray-700 rounded-md" />
      </div>
    </div>
  );
}
