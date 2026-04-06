'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, History, Settings, Sparkles, User, Edit2, Save, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Message, MemorySummary } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ContextDialogProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  memorySummary?: MemorySummary;
  contextWindowSize: number;
  onSaveSettings: (contextWindowSize: number) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onUpdateSummary?: () => Promise<void>;
}

type Tab = 'history' | 'settings';

export function ContextDialog({
  isOpen,
  onClose,
  messages,
  memorySummary,
  contextWindowSize,
  onSaveSettings,
  onEditMessage,
  onUpdateSummary,
}: ContextDialogProps) {
  const [activeTab, setActiveTab] = useState<Tab>('history');
  const [windowSize, setWindowSize] = useState(contextWindowSize);
  const [isUpdatingSummary, setIsUpdatingSummary] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setWindowSize(contextWindowSize);
      setActiveTab('history');
    }
  }, [isOpen, contextWindowSize]);

  const handleSave = () => {
    onSaveSettings(windowSize);
    onClose();
  };

  const handleUpdateSummary = async () => {
    if (!onUpdateSummary) return;
    setIsUpdatingSummary(true);
    try {
      await onUpdateSummary();
    } finally {
      setIsUpdatingSummary(false);
    }
  };

  if (!isOpen) return null;

  // 计算哪些消息在当前上下文窗口中
  const recentMessageIds = new Set(
    messages.slice(-contextWindowSize).map((m) => m.id)
  );

  // 计算哪些消息已被摘要
  const summarizedUpToIndex = memorySummary?.summarizedUpToIndex ?? 0;

  return (
    <>
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm fade-in"
        onClick={onClose}
      />

      {/* 对话框 */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-6xl max-h-[85vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border-light bg-surface-primary shadow-2xl fade-in flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b border-border-light">
          <h2 className="text-xl font-semibold text-text-primary">会話コンテキスト</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-text-tertiary transition-colors hover:bg-surface-hover hover:text-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 标签页 */}
        <div className="flex gap-1 px-6 pt-4 border-b border-border-light">
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              'px-4 py-2 rounded-t-lg text-sm font-medium transition-all',
              activeTab === 'history'
                ? 'bg-surface-secondary text-text-primary border-b-2 border-accent'
                : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-hover'
            )}
          >
            <div className="flex items-center gap-2">
              <History className="h-4 w-4" />
              履歴
            </div>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              'px-4 py-2 rounded-t-lg text-sm font-medium transition-all',
              activeTab === 'settings'
                ? 'bg-surface-secondary text-text-primary border-b-2 border-accent'
                : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-hover'
            )}
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              設定
            </div>
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 左侧：历史记录或设置 */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'history' ? (
              <HistoryTab
                messages={messages}
                recentMessageIds={recentMessageIds}
                summarizedUpToIndex={summarizedUpToIndex}
                onEditMessage={onEditMessage}
              />
            ) : (
              <SettingsTab
                windowSize={windowSize}
                setWindowSize={setWindowSize}
              />
            )}
          </div>

          {/* 右侧：摘要展示区域 */}
          {activeTab === 'history' && (
            <SummarySidebar
              memorySummary={memorySummary}
              onUpdateSummary={handleUpdateSummary}
              isUpdating={isUpdatingSummary}
            />
          )}
        </div>

        {/* 底部按钮 */}
        {activeTab === 'settings' && (
          <div className="flex justify-end gap-3 p-6 border-t border-border-light">
            <Button variant="ghost" onClick={onClose}>
              キャンセル
            </Button>
            <Button variant="submit" onClick={handleSave}>
              設定を保存
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

// 右侧摘要展示区域
function SummarySidebar({
  memorySummary,
  onUpdateSummary,
  isUpdating,
}: {
  memorySummary?: MemorySummary;
  onUpdateSummary?: () => void;
  isUpdating: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div
      className={cn(
        'border-l border-border-light bg-surface-secondary transition-all duration-300',
        isExpanded ? 'w-96' : 'w-12'
      )}
    >
      {isExpanded ? (
        <div className="h-full flex flex-col">
          {/* 标题栏 */}
          <div className="flex items-center justify-between p-4 border-b border-border-light">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold text-text-primary">会話要約</span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 rounded hover:bg-surface-hover transition-colors"
              title="折りたたむ"
            >
              <ChevronUp className="h-4 w-4 text-text-tertiary" />
            </button>
          </div>

          {/* 摘要内容 */}
          <div className="flex-1 overflow-y-auto p-4">
            {memorySummary ? (
              <div className="space-y-3">
                <div className="text-xs text-text-tertiary">
                  第{memorySummary.summarizedUpToIndex}件のメッセージまで要約済み ·{' '}
                  {new Date(memorySummary.lastUpdated).toLocaleString('ja-JP', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                  {memorySummary.content}
                </div>
              </div>
            ) : (
              <div className="text-sm text-text-tertiary text-center py-8">
                要約なし
                <br />
                5往復の会話後に自動生成
              </div>
            )}
          </div>

          {/* 手动更新按钮 */}
          <div className="p-4 border-t border-border-light">
            <button
              onClick={onUpdateSummary}
              disabled={isUpdating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <RefreshCw className={cn('h-4 w-4', isUpdating && 'animate-spin')} />
              {isUpdating ? '生成中...' : '手動で要約を更新'}
            </button>
          </div>
        </div>
      ) : (
        <div className="h-full flex items-start justify-center pt-4">
          <button
            onClick={() => setIsExpanded(true)}
            className="p-2 rounded hover:bg-surface-hover transition-colors"
            title="要約を展開"
          >
            <ChevronDown className="h-4 w-4 text-text-tertiary rotate-90" />
          </button>
        </div>
      )}
    </div>
  );
}

// 历史记录标签页
function HistoryTab({
  messages,
  recentMessageIds,
  summarizedUpToIndex,
  onEditMessage,
}: {
  messages: Message[];
  recentMessageIds: Set<string>;
  summarizedUpToIndex: number;
  onEditMessage?: (messageId: string, newContent: string) => void;
}) {
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const handleStartEdit = (messageId: string, content: string) => {
    setEditingMessageId(messageId);
    setEditContent(content);
  };

  const handleSaveEdit = (messageId: string) => {
    if (editContent.trim() && onEditMessage) {
      onEditMessage(messageId, editContent.trim());
    }
    setEditingMessageId(null);
    setEditContent('');
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  return (
    <div className="space-y-6">
      {/* 说明 */}
      <div className="text-sm text-text-secondary space-y-2">
        <p>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-accent/10 text-accent font-medium">
            <span className="w-2 h-2 rounded-full bg-accent"></span>
            緑の枠線
          </span>
          {' '}現在AIに送信されているメッセージ
        </p>
        <p>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-tertiary text-text-tertiary font-medium">
            要約済み
          </span>
          {' '}要約に含まれているメッセージ
        </p>
      </div>

      {/* 消息列表 */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-text-primary">
          完全な会話履歴（{messages.length}）
        </h3>
        <div className="space-y-2">
          {messages.map((message, index) => {
            const isInContext = recentMessageIds.has(message.id);
            const isSummarized = index < summarizedUpToIndex;
            const isUser = message.role === 'user';
            const isEditing = editingMessageId === message.id;

            return (
              <div
                key={message.id}
                className={cn(
                  'group rounded-lg p-3 transition-all',
                  isInContext
                    ? 'border-2 border-accent bg-accent/5'
                    : 'border border-border-light bg-surface-secondary hover:border-border-medium'
                )}
              >
                <div className="flex items-start gap-3">
                  {/* 头像 */}
                  <div
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                      isUser
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                        : 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                    )}
                  >
                    {isUser ? (
                      <User className="h-4 w-4 text-white" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-white" />
                    )}
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-text-primary">
                          {isUser ? 'You' : 'AI'}
                        </span>
                        <span className="text-xs text-text-tertiary">
                          #{index + 1}
                        </span>
                        {isInContext && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-accent text-white font-medium">
                            現在のコンテキスト
                          </span>
                        )}
                        {isSummarized && !isInContext && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-surface-tertiary text-text-tertiary font-medium">
                            要約済み
                          </span>
                        )}
                      </div>
                      {/* 编辑按钮 */}
                      {onEditMessage && !isEditing && (
                        <button
                          onClick={() => handleStartEdit(message.id, message.content)}
                          className="opacity-0 group-hover:opacity-100 rounded p-1.5 hover:bg-surface-hover transition-all"
                          title="メッセージを編集"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-text-tertiary hover:text-accent" />
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full min-h-[80px] p-2 rounded-lg border border-border-medium bg-surface-primary text-text-primary text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 resize-y"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(message.id)}
                            className="flex items-center gap-1 px-2 py-1 bg-accent text-white rounded text-xs hover:bg-accent-hover transition-colors"
                          >
                            <Save className="h-3 w-3" />
                            保存
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="flex items-center gap-1 px-2 py-1 bg-surface-tertiary text-text-secondary rounded text-xs hover:bg-surface-hover transition-colors"
                          >
                            <X className="h-3 w-3" />
                            キャンセル
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-text-secondary whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// 设置标签页
function SettingsTab({
  windowSize,
  setWindowSize,
}: {
  windowSize: number;
  setWindowSize: (size: number) => void;
}) {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* 上下文窗口大小 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-text-primary">
            コンテキストウィンドウサイズ
          </label>
          <span className="text-sm font-semibold text-accent">
            {windowSize}件のメッセージ
          </span>
        </div>
        <input
          type="range"
          min="5"
          max="50"
          step="5"
          value={windowSize}
          onChange={(e) => setWindowSize(Number(e.target.value))}
          className="w-full"
        />
        <p className="text-xs text-text-tertiary">
          最近の{windowSize}件のメッセージのみAIに送信します。古い会話は自動的に要約されて保存されます。
        </p>
      </div>

      {/* 摘要设置说明 */}
      <div className="rounded-lg border border-border-light bg-surface-secondary p-4 space-y-3">
        <h4 className="text-sm font-semibold text-text-primary">要約生成ルール</h4>
        <div className="space-y-2 text-sm text-text-secondary">
          <p>• 5往復の会話（10件のメッセージ）ごとに要約を自動生成</p>
          <p>• 新しい要約は以前の要約内容を統合し、一貫性を保ちます</p>
          <p>• 要約はコンテキストとしてAIに送信され、長期記憶を保持します</p>
          <p>• 完全な会話履歴は常に保存され、いつでも閲覧・編集できます</p>
          <p>• 履歴ページで手動で要約を更新できます</p>
        </div>
      </div>
    </div>
  );
}
