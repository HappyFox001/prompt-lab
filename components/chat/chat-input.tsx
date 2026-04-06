'use client';

import { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Square, Activity, Calendar, User, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  onStop?: () => void;
  onOpenStates?: () => void;
  onOpenEvents?: () => void;
  onOpenUserPrompt?: () => void;
  suggestedText?: string;
  onSuggestedTextChange?: (text: string) => void;
  autoDialogEnabled?: boolean;
  onToggleAutoDialog?: () => void;
  hasUserPrompt?: boolean;
}

export function ChatInput({
  onSend,
  disabled,
  isLoading,
  onStop,
  onOpenStates,
  onOpenEvents,
  onOpenUserPrompt,
  suggestedText = '',
  onSuggestedTextChange,
  autoDialogEnabled = false,
  onToggleAutoDialog,
  hasUserPrompt = false,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // テキストエリアの高さを自動調整
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if (input.trim() && !disabled && !isLoading) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="bg-surface-primary px-6 py-4">
      <div className="max-w-2xl mx-auto">
        <div className="relative flex items-center gap-2">
          {/* 左側の機能ボタン */}
          <div className="flex gap-1">
            {onOpenUserPrompt && (
              <button
                onClick={onOpenUserPrompt}
                className="h-10 w-10 flex items-center justify-center rounded-lg border border-border-light bg-surface-secondary text-text-tertiary hover:text-accent hover:border-accent hover:bg-accent/5 transition-all"
                title="ユーザープロンプト"
              >
                <User className="h-4 w-4" strokeWidth={2} />
              </button>
            )}
            {onOpenStates && (
              <button
                onClick={onOpenStates}
                className="h-10 w-10 flex items-center justify-center rounded-lg border border-border-light bg-surface-secondary text-text-tertiary hover:text-accent hover:border-accent hover:bg-accent/5 transition-all"
                title="数値ステータス"
              >
                <Activity className="h-4 w-4" strokeWidth={2} />
              </button>
            )}
            {onOpenEvents && (
              <button
                onClick={onOpenEvents}
                className="h-10 w-10 flex items-center justify-center rounded-lg border border-border-light bg-surface-secondary text-text-tertiary hover:text-accent hover:border-accent hover:bg-accent/5 transition-all"
                title="イベントメモリ"
              >
                <Calendar className="h-4 w-4" strokeWidth={2} />
              </button>
            )}
          </div>

          {/* 入力欄 */}
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="メッセージを入力..."
              disabled={disabled || isLoading}
              rows={1}
              className={cn(
                'w-full resize-none rounded-xl border bg-surface-primary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary transition-all duration-200',
                'max-h-[200px] overflow-y-auto leading-relaxed',
                'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20',
                (disabled || isLoading)
                  ? 'border-border-light opacity-50 cursor-not-allowed'
                  : 'border-border-medium hover:border-accent/50 shadow-sm hover:shadow-md'
              )}
            />
          </div>

          {/* 送信/停止ボタン */}
          {isLoading ? (
            <Button
              variant="submit"
              onClick={onStop}
              className="h-10 w-10 shrink-0 rounded-lg p-0 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
              aria-label="生成を停止"
            >
              <Square className="h-4 w-4" fill="currentColor" strokeWidth={2} />
            </Button>
          ) : (
            <Button
              variant="submit"
              onClick={handleSubmit}
              disabled={!input.trim() || disabled}
              className={cn(
                'h-10 w-10 shrink-0 rounded-lg p-0 shadow-md transition-all duration-200',
                input.trim() && !disabled
                  ? 'hover:scale-105 active:scale-95 hover:shadow-lg'
                  : 'opacity-40 cursor-not-allowed'
              )}
              aria-label="メッセージを送信"
            >
              <Send className="h-4 w-4" strokeWidth={2} />
            </Button>
          )}

          {/* 自動対話スイッチ */}
          {hasUserPrompt && onToggleAutoDialog && (
            <button
              onClick={onToggleAutoDialog}
              disabled={disabled || isLoading}
              className={cn(
                'h-10 w-10 shrink-0 flex items-center justify-center rounded-lg border transition-all duration-200',
                autoDialogEnabled
                  ? 'border-accent bg-accent text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95'
                  : 'border-border-medium bg-surface-secondary text-text-tertiary hover:border-accent hover:text-accent hover:bg-accent/5',
                (disabled || isLoading) && 'opacity-50 cursor-not-allowed'
              )}
              title={autoDialogEnabled ? '自動対話を停止' : '自動対話を開始'}
              aria-label={autoDialogEnabled ? '自動対話を停止' : '自動対話を開始'}
            >
              {autoDialogEnabled ? (
                <Pause className="h-4 w-4" strokeWidth={2} />
              ) : (
                <Play className="h-4 w-4" strokeWidth={2} />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
