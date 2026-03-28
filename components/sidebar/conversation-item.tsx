'use client';

import { Conversation } from '@/lib/types';
import { cn } from '@/lib/utils';
import { MessageSquare, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
}: ConversationItemProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除这个对话吗？')) {
      onDelete(conversation.id);
    }
  };

  // 限制标题最多显示15个字符
  const displayTitle = conversation.title.length > 15
    ? conversation.title.slice(0, 15) + '...'
    : conversation.title;

  return (
    <div
      className={cn(
        'group relative flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-all',
        isActive
          ? 'bg-surface-hover text-text-primary font-medium'
          : 'text-text-secondary hover:bg-surface-hover/50 hover:text-text-primary'
      )}
      onClick={() => onSelect(conversation.id)}
    >
      <MessageSquare className="h-4 w-4 shrink-0 opacity-60" strokeWidth={2} />
      <span className="flex-1 min-w-0 truncate" title={conversation.title}>
        {displayTitle}
      </span>
      <button
        onClick={handleDelete}
        className="shrink-0 rounded-lg p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 transition-all ml-auto"
        aria-label="删除对话"
      >
        <Trash2 className="h-4 w-4 text-text-tertiary hover:text-red-500 transition-colors" strokeWidth={2} />
      </button>
    </div>
  );
}
