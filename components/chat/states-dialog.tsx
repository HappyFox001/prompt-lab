'use client';

import { X } from 'lucide-react';
import { NumericState } from '@/lib/types';
import { StateManager } from './state-manager';

interface StatesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  states: NumericState[];
  onUpdateStates: (states: NumericState[]) => void;
}

export function StatesDialog({
  isOpen,
  onClose,
  states,
  onUpdateStates,
}: StatesDialogProps) {
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
            <h2 className="text-xl font-semibold text-text-primary">数值化状态</h2>
            <p className="text-sm text-text-tertiary mt-1">
              AI会根据对话内容自动更新这些状态值
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
          <StateManager states={states} onUpdateStates={onUpdateStates} />
        </div>
      </div>
    </>
  );
}
