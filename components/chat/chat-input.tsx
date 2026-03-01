'use client';

import { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
  onStop?: () => void;
}

export function ChatInput({ onSend, disabled, isLoading, onStop }: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动调整 textarea 高度
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
    <div className="bg-surface-primary px-6 py-6">
      <div className="mx-auto max-w-3xl">
        <div className="relative flex items-end gap-3">
          {/* 输入框容器 */}
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Send a message..."
              disabled={disabled || isLoading}
              rows={1}
              className={cn(
                'w-full resize-none rounded-2xl border bg-surface-primary px-5 py-3.5 text-text-primary placeholder:text-text-tertiary transition-all duration-200',
                'max-h-[200px] overflow-y-auto leading-relaxed',
                'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20',
                (disabled || isLoading)
                  ? 'border-border-light opacity-50 cursor-not-allowed'
                  : 'border-border-medium hover:border-accent/50 shadow-sm hover:shadow-md'
              )}
            />
          </div>

          {/* 发送/停止按钮 */}
          {isLoading ? (
            <Button
              variant="submit"
              onClick={onStop}
              className="h-11 w-11 shrink-0 rounded-xl p-0 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
              aria-label="停止生成"
            >
              <Square className="h-4 w-4" fill="currentColor" strokeWidth={2} />
            </Button>
          ) : (
            <Button
              variant="submit"
              onClick={handleSubmit}
              disabled={!input.trim() || disabled}
              className={cn(
                'h-11 w-11 shrink-0 rounded-xl p-0 shadow-md transition-all duration-200',
                input.trim() && !disabled
                  ? 'hover:scale-105 active:scale-95 hover:shadow-lg'
                  : 'opacity-40 cursor-not-allowed'
              )}
              aria-label="发送消息"
            >
              <Send className="h-4 w-4" strokeWidth={2} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
