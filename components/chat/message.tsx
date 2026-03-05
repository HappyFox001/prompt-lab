'use client';

import { Message as MessageType } from '@/lib/types';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Sparkles, Copy, Check, Edit2, X, Save } from 'lucide-react';
import { useState } from 'react';

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
      <div className="mx-auto flex max-w-3xl gap-6">
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
        </div>
      </div>
    </div>
  );
}
