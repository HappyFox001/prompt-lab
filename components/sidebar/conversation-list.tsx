'use client';

import { Conversation } from '@/lib/types';
import { ConversationItem } from './conversation-item';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ConversationListProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
}

export function ConversationList({
  conversations,
  currentConversationId,
  onSelectConversation,
  onDeleteConversation,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center space-y-2">
          <p className="text-sm text-text-tertiary">暂无对话历史</p>
          <p className="text-xs text-text-tertiary">点击"新对话"开始</p>
        </div>
      </div>
    );
  }

  // 按时间分组
  const today: Conversation[] = [];
  const yesterday: Conversation[] = [];
  const lastWeek: Conversation[] = [];
  const older: Conversation[] = [];

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  const lastWeekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

  conversations.forEach((conv) => {
    const updatedAt = new Date(conv.updatedAt);
    if (updatedAt >= todayStart) {
      today.push(conv);
    } else if (updatedAt >= yesterdayStart) {
      yesterday.push(conv);
    } else if (updatedAt >= lastWeekStart) {
      lastWeek.push(conv);
    } else {
      older.push(conv);
    }
  });

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-6 p-3">
        {today.length > 0 && (
          <div className="space-y-1">
            <h3 className="mb-2 px-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">
              今天
            </h3>
            {today.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === currentConversationId}
                onSelect={onSelectConversation}
                onDelete={onDeleteConversation}
              />
            ))}
          </div>
        )}

        {yesterday.length > 0 && (
          <div className="space-y-1">
            <h3 className="mb-2 px-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">
              昨天
            </h3>
            {yesterday.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === currentConversationId}
                onSelect={onSelectConversation}
                onDelete={onDeleteConversation}
              />
            ))}
          </div>
        )}

        {lastWeek.length > 0 && (
          <div className="space-y-1">
            <h3 className="mb-2 px-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">
              过去 7 天
            </h3>
            {lastWeek.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === currentConversationId}
                onSelect={onSelectConversation}
                onDelete={onDeleteConversation}
              />
            ))}
          </div>
        )}

        {older.length > 0 && (
          <div className="space-y-1">
            <h3 className="mb-2 px-3 text-xs font-semibold text-text-tertiary uppercase tracking-wider">
              更早
            </h3>
            {older.map((conv) => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                isActive={conv.id === currentConversationId}
                onSelect={onSelectConversation}
                onDelete={onDeleteConversation}
              />
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
