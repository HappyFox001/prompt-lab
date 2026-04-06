'use client';

import { ConversationList } from './conversation-list';
import { Button } from '@/components/ui/button';
import { Plus, PanelLeftClose, PanelLeft } from 'lucide-react';
import { Conversation } from '@/lib/types';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
}

export function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (isCollapsed) {
    return (
      <div className="flex h-screen w-12 flex-col bg-surface-secondary p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          className="h-10 w-10 hover:bg-surface-hover"
          aria-label="サイドバーを展開"
        >
          <PanelLeft className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-64 flex-col bg-surface-secondary">
      {/* 头部 */}
      <div className="flex items-center gap-2 p-3">
        <Button
          variant="ghost"
          onClick={onNewConversation}
          className="flex-1 justify-start gap-2 font-medium hover:bg-surface-hover transition-colors duration-200"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          <span>新規チャット</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(true)}
          className="h-9 w-9 shrink-0 hover:bg-surface-hover transition-colors duration-200"
          aria-label="サイドバーを閉じる"
        >
          <PanelLeftClose className="h-4 w-4" strokeWidth={2} />
        </Button>
      </div>

      {/* 对话列表 */}
      <div className="flex-1 overflow-hidden">
        <ConversationList
          conversations={conversations}
          currentConversationId={currentConversationId}
          onSelectConversation={onSelectConversation}
          onDeleteConversation={onDeleteConversation}
        />
      </div>

      {/* 底部用户区域 */}
      <div className="p-3">
        <div className="flex items-center gap-3 rounded-lg p-3 hover:bg-surface-hover transition-all duration-200 cursor-pointer">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-sm font-semibold shadow-md">
            U
          </div>
          <span className="flex-1 text-sm font-medium text-text-primary">ユーザー</span>
        </div>
      </div>
    </div>
  );
}
