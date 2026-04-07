'use client';

import { useState, useEffect, useRef } from 'react';
import { Message, SystemPrompt, UserPrompt } from '@/lib/types';
import { X, MessageSquare, User, ChevronDown, ChevronUp, Check, AlertCircle, CheckSquare, Square, FileText, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FEEDBACK_TAGS } from '@/lib/feedback-constants';

interface FeedbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  triggerMessage: Message | null;
  allMessages: Message[];
  conversationId: string;
  systemPrompt: SystemPrompt | null;
  userPrompt: UserPrompt | null;
}

export function FeedbackDialog({
  isOpen,
  onClose,
  triggerMessage,
  allMessages,
  conversationId,
  systemPrompt,
  userPrompt,
}: FeedbackDialogProps) {
  const [reviewerName, setReviewerName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 選択されたメッセージIDのセット
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());

  // 選択されたタグ
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  // メッセージリストとトリガーメッセージの ref
  const messageListRef = useRef<HTMLDivElement>(null);
  const triggerMessageRef = useRef<HTMLDivElement>(null);

  // プロンプト展開状態
  const [promptSectionExpanded, setPromptSectionExpanded] = useState(false);

  // トリガーメッセージが変わったら選択状態を初期化（トリガーメッセージのみ選択）
  useEffect(() => {
    if (triggerMessage && isOpen) {
      setSelectedMessageIds(new Set([triggerMessage.id]));
    }
  }, [triggerMessage, isOpen]);

  // トリガーメッセージを中央にスクロール
  useEffect(() => {
    if (isOpen && triggerMessageRef.current && messageListRef.current) {
      setTimeout(() => {
        if (triggerMessageRef.current && messageListRef.current) {
          const container = messageListRef.current;
          const element = triggerMessageRef.current;
          const containerHeight = container.clientHeight;
          const elementTop = element.offsetTop;
          const elementHeight = element.clientHeight;
          container.scrollTop = elementTop - (containerHeight / 2) + (elementHeight / 2);
        }
      }, 100);
    }
  }, [isOpen, triggerMessage]);

  // フォームリセット
  const resetForm = () => {
    setReviewerName('');
    setDescription('');
    setSelectedMessageIds(new Set());
    setSelectedTags(new Set());
    setSuccess(false);
    setError(null);
  };

  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!reviewerName.trim()) {
      setError('名前を入力してください');
      return;
    }

    if (selectedMessageIds.size === 0) {
      setError('メッセージを1つ以上選択してください');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const selectedMessages = allMessages
        .filter((m) => selectedMessageIds.has(m.id))
        .map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp?.toISOString?.() || m.timestamp,
        }));

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          reviewerName: reviewerName.trim(),
          description: description.trim(),
          selectedMessages,
          tags: Array.from(selectedTags),
          evaluations: {},
          systemPrompt: systemPrompt
            ? { name: systemPrompt.name, content: systemPrompt.content }
            : null,
          userPrompt: userPrompt
            ? { name: userPrompt.name, content: userPrompt.content }
            : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '送信に失敗しました');
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        resetForm();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '送信に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const cleanContent = (content: string): string => {
    const idx = content.indexOf('###EMOTION###');
    return idx !== -1 ? content.substring(0, idx).trim() : content;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-surface-primary rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-border-medium flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-medium bg-surface-secondary">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <MessageSquare className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">フィードバック</h2>
              <p className="text-sm text-text-tertiary">関連メッセージを選択して送信</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
          >
            <X className="h-5 w-5 text-text-tertiary" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {success && (
            <div className="flex items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 rounded-lg">
              <Check className="h-5 w-5 text-emerald-600" />
              <span className="text-emerald-700 dark:text-emerald-300 font-medium">送信完了！</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-700 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-700 dark:text-red-300">{error}</span>
            </div>
          )}

          {/* プロンプト情報 */}
          <div className="space-y-3">
            <button
              onClick={() => setPromptSectionExpanded(!promptSectionExpanded)}
              className="flex items-center justify-between w-full p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
            >
              <span className="font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                プロンプト情報（自動添付）
              </span>
              {promptSectionExpanded ? (
                <ChevronUp className="h-5 w-5 text-purple-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-purple-600" />
              )}
            </button>

            {promptSectionExpanded && (
              <div className="space-y-3 pl-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded">
                      System Prompt
                    </span>
                    <span className="text-sm text-text-secondary">
                      {systemPrompt?.name || '未設定'}
                    </span>
                  </div>
                  {systemPrompt?.content && (
                    <div className="text-xs text-text-tertiary bg-surface-secondary p-2 rounded max-h-32 overflow-y-auto whitespace-pre-wrap">
                      {systemPrompt.content.slice(0, 500)}
                      {systemPrompt.content.length > 500 && '...'}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded">
                      User Prompt
                    </span>
                    <span className="text-sm text-text-secondary">
                      {userPrompt?.name || '未設定'}
                    </span>
                  </div>
                  {userPrompt?.content && (
                    <div className="text-xs text-text-tertiary bg-surface-secondary p-2 rounded max-h-32 overflow-y-auto whitespace-pre-wrap">
                      {userPrompt.content.slice(0, 500)}
                      {userPrompt.content.length > 500 && '...'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* メッセージ選択 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-secondary">
                メッセージ選択 <span className="text-accent">({selectedMessageIds.size}件選択中)</span>
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedMessageIds(new Set(allMessages.map((m) => m.id)))}
                  className="text-xs px-2 py-1 text-accent hover:bg-accent/10 rounded transition-colors"
                >
                  全選択
                </button>
                <button
                  onClick={() => setSelectedMessageIds(new Set())}
                  className="text-xs px-2 py-1 text-text-tertiary hover:bg-surface-hover rounded transition-colors"
                >
                  クリア
                </button>
              </div>
            </div>
            <div
              ref={messageListRef}
              className="border border-border-medium rounded-lg overflow-hidden max-h-72 overflow-y-auto"
            >
              {allMessages.map((msg) => {
                const isSelected = selectedMessageIds.has(msg.id);
                const isTrigger = msg.id === triggerMessage?.id;
                return (
                  <div
                    key={msg.id}
                    ref={isTrigger ? triggerMessageRef : undefined}
                    onClick={() => toggleMessageSelection(msg.id)}
                    className={cn(
                      'flex gap-3 p-3 border-b border-border-light last:border-b-0 cursor-pointer transition-colors',
                      isSelected
                        ? 'bg-accent/10 hover:bg-accent/15'
                        : 'hover:bg-surface-hover',
                      isTrigger && 'border-l-4 border-l-amber-500'
                    )}
                  >
                    <div className="flex-shrink-0 pt-0.5">
                      {isSelected ? (
                        <CheckSquare className="h-5 w-5 text-accent" />
                      ) : (
                        <Square className="h-5 w-5 text-text-tertiary" />
                      )}
                    </div>

                    <div
                      className={cn(
                        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                        msg.role === 'user' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'
                      )}
                    >
                      {msg.role === 'user' ? (
                        <User className="h-4 w-4 text-blue-600" />
                      ) : (
                        <MessageSquare className="h-4 w-4 text-emerald-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-text-secondary">
                          {msg.role === 'user' ? 'ユーザー' : 'AI'}
                        </span>
                        {isTrigger && (
                          <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">
                            選択点
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-primary line-clamp-2">
                        {cleanContent(msg.content)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* タグ選択 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text-secondary flex items-center gap-2">
              <Tag className="h-4 w-4" />
              問題カテゴリー（複数選択可）
            </h3>
            <div className="flex flex-wrap gap-2">
              {FEEDBACK_TAGS.map((tag) => {
                const isSelected = selectedTags.has(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
                      isSelected
                        ? 'text-white shadow-md'
                        : 'bg-surface-secondary text-text-secondary hover:bg-surface-hover border-border-medium'
                    )}
                    style={
                      isSelected
                        ? {
                            backgroundColor: tag.color,
                            borderColor: tag.color,
                          }
                        : {}
                    }
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* レビュアー名 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text-secondary">
              担当者名 <span className="text-red-500">*</span>
            </h3>
            <input
              type="text"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              placeholder="名前を入力"
              className="w-full px-4 py-2.5 rounded-lg border border-border-medium bg-surface-primary text-text-primary placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
            />
          </div>

          {/* 説明 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text-secondary">問題の説明</h3>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="問題点や改善提案を入力..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-border-medium bg-surface-primary text-text-primary placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all resize-y"
            />
          </div>
        </div>

        {/* フッター */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-medium bg-surface-secondary">
          <button
            onClick={onClose}
            className="px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !reviewerName.trim() || selectedMessageIds.size === 0}
            className={cn(
              'px-6 py-2 rounded-lg font-medium transition-all',
              isSubmitting || !reviewerName.trim() || selectedMessageIds.size === 0
                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-accent hover:bg-accent-hover text-white shadow-md hover:shadow-lg'
            )}
          >
            {isSubmitting ? '送信中...' : '送信'}
          </button>
        </div>
      </div>
    </div>
  );
}
