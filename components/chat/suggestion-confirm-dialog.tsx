'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Check, RefreshCw, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuggestionConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  suggestion: string;
  onConfirm: () => void;
  onReject: (reason: string) => void;
  isGenerating: boolean;
}

export function SuggestionConfirmDialog({
  isOpen,
  onClose,
  suggestion,
  onConfirm,
  onReject,
  isGenerating,
}: SuggestionConfirmDialogProps) {
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleRejectClick = () => {
    setShowRejectInput(true);
  };

  const handleRegenerate = () => {
    onReject(rejectionReason.trim());
    setRejectionReason('');
    setShowRejectInput(false);
  };

  const handleClose = () => {
    setShowRejectInput(false);
    setRejectionReason('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-surface-primary rounded-2xl shadow-2xl overflow-hidden border border-border-light">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            AI 建议确认
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
            disabled={isGenerating}
          >
            <X className="h-5 w-5 text-text-secondary" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-6 space-y-4">
          {/* 提示信息 */}
          <div className="px-4 py-3 rounded-lg bg-accent/10 border border-accent/20">
            <p className="text-sm text-text-primary">
              以下内容已填入输入框，你可以编辑后再发送。
            </p>
          </div>

          {/* 建议内容 */}
          <div className="px-4 py-3 rounded-lg bg-surface-secondary border border-border-light">
            <div className="text-sm text-text-primary whitespace-pre-wrap">
              {suggestion}
            </div>
          </div>

          {/* 操作按钮 */}
          {!showRejectInput ? (
            <div className="flex gap-3 pt-2">
              <Button
                variant="submit"
                onClick={onConfirm}
                disabled={isGenerating}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                直接发送
              </Button>
              <Button
                variant="ghost"
                onClick={handleRejectClick}
                disabled={isGenerating}
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                拒绝并重新生成
              </Button>
            </div>
          ) : (
            // 拒绝原因输入
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  拒绝原因（可选）
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-border-medium bg-surface-primary text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all resize-none"
                  rows={3}
                  placeholder="例如：更口语化一些、问题集中到一个、更具体一些..."
                  disabled={isGenerating}
                  autoFocus
                />
                <div className="text-xs text-text-tertiary mt-1">
                  填写原因可以让 AI 参考改进。也可以留空直接重新生成。
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="submit"
                  onClick={handleRegenerate}
                  disabled={isGenerating}
                  className="flex-1"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      重新生成
                    </>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowRejectInput(false);
                    setRejectionReason('');
                  }}
                  disabled={isGenerating}
                  className="flex-1"
                >
                  取消
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
