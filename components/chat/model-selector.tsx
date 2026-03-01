'use client';

import { useEffect, useState } from 'react';
import { ModelConfig } from '@/lib/types';
import { ChevronDown, Sparkles, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModelSelectorProps {
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
}

export function ModelSelector({ selectedModelId, onModelChange }: ModelSelectorProps) {
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/models')
      .then(async (res) => {
        if (!res.ok) {
          const errorText = await res.text();
          console.error('Failed to load models:', res.status, errorText);
          throw new Error(`HTTP ${res.status}: ${errorText}`);
        }
        return res.json();
      })
      .then((data) => {
        setModels(data.models || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load models:', error);
        setLoading(false);
      });
  }, []);

  const selectedModel = models.find((m) => m.id === selectedModelId);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border-light bg-surface-secondary px-3 py-1.5">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
        <span className="text-sm text-text-tertiary">加载中...</span>
      </div>
    );
  }

  if (models.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 rounded-xl border bg-surface-secondary px-3 py-1.5 text-sm font-medium transition-all',
          isOpen
            ? 'border-accent shadow-sm'
            : 'border-border-light hover:border-border-medium hover:shadow-sm'
        )}
      >
        <Sparkles className="icon-sm text-accent" />
        <span className="text-text-primary">
          {selectedModel?.name || '选择模型'}
        </span>
        <ChevronDown
          className={cn(
            'icon-sm text-text-tertiary transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* 下拉菜单 */}
          <div className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border border-border-light bg-surface-primary backdrop-blur-sm shadow-2xl fade-in" style={{ backgroundColor: 'var(--surface-primary)' }}>
            <div className="p-2">
              <div className="mb-2 px-3 py-2 text-xs font-semibold text-text-tertiary uppercase tracking-wide">
                可用模型
              </div>
              <div className="space-y-1">
                {models.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      onModelChange(model.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full rounded-lg px-3 py-2.5 text-left transition-all',
                      selectedModelId === model.id
                        ? 'bg-surface-hover shadow-sm'
                        : 'hover:bg-surface-hover/50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                        selectedModelId === model.id
                          ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                          : 'bg-surface-tertiary'
                      )}>
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          'truncate text-sm font-medium',
                          selectedModelId === model.id
                            ? 'text-text-primary'
                            : 'text-text-secondary'
                        )}>
                          {model.name}
                        </div>
                        <div className="truncate text-xs text-text-tertiary">
                          {model.model}
                        </div>
                      </div>
                      {selectedModelId === model.id && (
                        <Check className="h-4 w-4 shrink-0 text-accent" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
