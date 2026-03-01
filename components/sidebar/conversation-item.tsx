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
  const [showDelete, setShowDelete] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除这个对话吗？')) {
      onDelete(conversation.id);
    }
  };

  return (
    <div
      className={cn(
        'group relative flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all',
        isActive
          ? 'bg-surface-hover text-text-primary font-medium'
          : 'text-text-secondary hover:bg-surface-hover/50 hover:text-text-primary'
      )}
      onClick={() => onSelect(conversation.id)}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      <MessageSquare className="icon-sm shrink-0 opacity-60" />
      <span className="flex-1 truncate">{conversation.title}</span>
      {showDelete && (
        <button
          onClick={handleDelete}
          className="shrink-0 rounded-lg p-1.5 hover:bg-surface-primary/80 transition-colors"
          aria-label="删除对话"
        >
          <Trash2 className="icon-sm text-text-tertiary hover:text-red-500 transition-colors" />
        </button>
      )}
    </div>
  );
}
