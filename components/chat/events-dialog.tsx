'use client';

import { X } from 'lucide-react';
import { MemoryEvent } from '@/lib/types';
import { EventMemory } from './event-memory';

interface EventsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  events: MemoryEvent[];
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function EventsDialog({
  isOpen,
  onClose,
  events,
  enabled,
  onToggle,
}: EventsDialogProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm fade-in"
        onClick={onClose}
      />

      {/* 对话框 */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl max-h-[80vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border-light bg-surface-primary shadow-2xl fade-in flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b border-border-light">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">イベントメモリ</h2>
            <p className="text-sm text-text-tertiary mt-1">
              AIが重要な会話イベントを自動的に抽出・記録します
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          <EventMemory events={events} enabled={enabled} onToggle={onToggle} />
        </div>
      </div>
    </>
  );
}
