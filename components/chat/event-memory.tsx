'use client';

import { MemoryEvent } from '@/lib/types';
import { Calendar, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventMemoryProps {
  events: MemoryEvent[];
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function EventMemory({ events, enabled, onToggle }: EventMemoryProps) {
  // 重要度でソート
  const sortedEvents = [...events].sort((a, b) => b.importance - a.importance);

  return (
    <div className="space-y-4">
      {/* スイッチ */}
      <div className="flex items-center justify-between p-4 rounded-lg border border-border-light bg-surface-secondary">
        <div>
          <h4 className="text-sm font-semibold text-text-primary mb-1">イベントメモリ</h4>
          <p className="text-xs text-text-tertiary">
            AIが重要な会話イベントを自動記録します
          </p>
        </div>
        <button
          onClick={() => onToggle(!enabled)}
          className={cn(
            'relative w-14 h-7 rounded-full transition-all duration-300 shadow-inner',
            enabled
              ? 'bg-gradient-to-r from-accent to-emerald-500'
              : 'bg-gray-600 dark:bg-gray-700'
          )}
        >
          <div
            className={cn(
              'absolute top-0.5 w-6 h-6 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center',
              enabled
                ? 'translate-x-7 bg-white'
                : 'translate-x-0.5 bg-gray-300 dark:bg-gray-400'
            )}
          >
            <div className={cn(
              'w-2 h-2 rounded-full transition-all duration-300',
              enabled ? 'bg-accent' : 'bg-gray-500'
            )} />
          </div>
        </button>
      </div>

      {/* イベントリスト */}
      {events.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-text-tertiary uppercase tracking-wide">
            イベント記録 ({events.length})
          </h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sortedEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}

      {events.length === 0 && enabled && (
        <div className="text-center py-8 text-sm text-text-tertiary">
          イベント記録がありません
          <br />
          AIが会話中に自動生成します
        </div>
      )}
    </div>
  );
}

function EventCard({ event }: { event: MemoryEvent }) {
  return (
    <div className="rounded-lg border border-border-light bg-surface-secondary p-3 hover:border-border-medium transition-all">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
          <Calendar className="h-3 w-3" />
          <span>
            {new Date(event.timestamp).toLocaleString('ja-JP', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(event.importance, 10) }).map((_, i) => (
            <Star
              key={i}
              className={cn(
                'h-2.5 w-2.5',
                i < Math.floor(event.importance / 2)
                  ? 'text-yellow-500 fill-yellow-500'
                  : 'text-gray-400'
              )}
            />
          ))}
        </div>
      </div>
      <p className="text-sm text-text-secondary leading-relaxed">{event.content}</p>
    </div>
  );
}
