'use client';

import { Message as MessageType } from '@/lib/types';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Sparkles, Copy, Check, Edit2, X, Save, TrendingUp, TrendingDown, Calendar, Star } from 'lucide-react';
import { useState } from 'react';
import { EmotionalStateBadge } from './emotional-state-badge';

interface MessageProps {
  message: MessageType;
  onEdit?: (messageId: string, newContent: string) => void;
}

export function Message({ message, onEdit }: MessageProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartEdit = () => {
    setEditContent(message.content);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && onEdit) {
      onEdit(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  return (
    <div
      className={cn(
        'group w-full py-8 px-4 transition-colors duration-200 fade-in',
        !isUser && 'bg-surface-message hover:bg-surface-message-hover'
      )}
    >
      <div className="flex max-w-4xl gap-6 pl-4">
        {/* 头像 */}
        <div className="flex-shrink-0">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full shadow-md transition-all duration-200 hover:scale-105 hover:shadow-lg',
              isUser
                ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                : 'bg-gradient-to-br from-emerald-500 to-emerald-600'
            )}
          >
            {isUser ? (
              <User className="h-5 w-5 text-white" strokeWidth={2} />
            ) : (
              <Sparkles className="h-5 w-5 text-white" strokeWidth={2} />
            )}
          </div>
        </div>

        {/* 消息内容 */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* 角色标签和操作按钮 */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-text-primary">
              {isUser ? 'You' : 'AI'}
            </span>
            <div className="flex gap-1">
              {isUser && onEdit && !isEditing && (
                <button
                  onClick={handleStartEdit}
                  className="opacity-0 group-hover:opacity-100 rounded-lg p-2 hover:bg-surface-hover transition-all duration-200"
                  aria-label="编辑消息"
                  title="编辑消息"
                >
                  <Edit2 className="h-4 w-4 text-text-tertiary hover:text-text-secondary" strokeWidth={2} />
                </button>
              )}
              {!isUser && message.content && (
                <button
                  onClick={handleCopy}
                  className="opacity-0 group-hover:opacity-100 rounded-lg p-2 hover:bg-surface-hover transition-all duration-200"
                  aria-label="复制消息"
                  title="复制消息"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                  ) : (
                    <Copy className="h-4 w-4 text-text-tertiary hover:text-text-secondary" strokeWidth={2} />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* 消息文本或编辑框 */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {isUser && isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full min-h-[100px] p-3 rounded-lg border border-border-medium bg-surface-primary text-text-primary focus:border-accent focus:ring-2 focus:ring-accent/20 resize-y"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    className="flex items-center gap-1 px-3 py-1.5 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors text-sm"
                  >
                    <Save className="h-3.5 w-3.5" />
                    保存
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center gap-1 px-3 py-1.5 bg-surface-secondary text-text-secondary rounded-lg hover:bg-surface-hover transition-colors text-sm"
                  >
                    <X className="h-3.5 w-3.5" />
                    取消
                  </button>
                </div>
              </div>
            ) : isUser ? (
              <p className="text-text-primary whitespace-pre-wrap leading-relaxed m-0">
                {message.content}
              </p>
            ) : (
              <div className="markdown-content text-text-primary">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* 状态更新显示 */}
          {!isUser && message.metadata?.stateUpdates && message.metadata.stateUpdates.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wide flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3" />
                状态变化
              </div>
              <div className="flex flex-wrap gap-2">
                {message.metadata.stateUpdates.map((update, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 hover:shadow-md',
                      update.delta > 0
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700'
                        : update.delta < 0
                        ? 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700'
                    )}
                  >
                    <div
                      className={cn(
                        'flex items-center justify-center h-6 w-6 rounded-full',
                        update.delta > 0
                          ? 'bg-emerald-100 dark:bg-emerald-900/50'
                          : update.delta < 0
                          ? 'bg-red-100 dark:bg-red-900/50'
                          : 'bg-gray-100 dark:bg-gray-700'
                      )}
                    >
                      {update.delta > 0 ? (
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
                      ) : update.delta < 0 ? (
                        <TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400" strokeWidth={2.5} />
                      ) : null}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-text-secondary">
                        {update.stateName}
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <span
                          className={cn(
                            'text-sm font-bold',
                            update.delta > 0
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : update.delta < 0
                              ? 'text-red-700 dark:text-red-300'
                              : 'text-gray-700 dark:text-gray-300'
                          )}
                        >
                          {update.delta > 0 ? '+' : ''}{update.delta}
                        </span>
                        <span className="text-xs text-text-tertiary">
                          → {update.newValue}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 情感状态显示 */}
          {!isUser && message.emotionalState && (
            <div className="mt-4 space-y-2">
              <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">
                情感状态
              </div>
              <EmotionalStateBadge emotionalState={message.emotionalState} />
            </div>
          )}

          {/* 事件记录显示 */}
          {!isUser && message.metadata?.event && (
            <div className="mt-4 space-y-2">
              <div className="text-xs font-semibold text-text-tertiary uppercase tracking-wide flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                事件记录
              </div>
              <div className="relative overflow-hidden rounded-lg border border-amber-300 dark:border-amber-700 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 p-4 shadow-sm hover:shadow-md transition-all duration-200">
                {/* 装饰性背景光效 */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-200 dark:bg-yellow-600 rounded-full blur-3xl opacity-10 -z-10" />

                <div className="flex items-start gap-3">
                  {/* 重要性指示器 */}
                  <div className="flex-shrink-0 flex flex-col items-center gap-1">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: Math.min(message.metadata?.event?.importance || 0, 10) }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'h-3 w-3',
                            i < Math.ceil((message.metadata?.event?.importance || 0) / 2)
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-amber-300 dark:text-amber-700'
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                      重要度 {message.metadata?.event?.importance || 0}
                    </span>
                  </div>

                  {/* 事件描述 */}
                  <p className="flex-1 text-sm text-text-primary leading-relaxed font-medium">
                    {message.metadata?.event?.description || ''}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
