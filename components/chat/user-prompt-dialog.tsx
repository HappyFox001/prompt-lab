'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Plus, Trash2, Check, User } from 'lucide-react';
import { UserPrompt } from '@/lib/types';
import { indexedDB_storage } from '@/lib/indexeddb';
import { cn } from '@/lib/utils';
import { DEFAULT_USER_PROMPTS } from '@/lib/default-prompts';

interface UserPromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentPromptId?: string;
  onSelectPrompt: (promptId: string | undefined) => void;
}

export function UserPromptDialog({
  isOpen,
  onClose,
  currentPromptId,
  onSelectPrompt,
}: UserPromptDialogProps) {
  const [prompts, setPrompts] = useState<UserPrompt[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Partial<UserPrompt>>({
    name: '',
    content: '',
    description: '',
  });

  // 加载用户提示词列表
  useEffect(() => {
    if (isOpen) {
      loadPrompts();
    }
  }, [isOpen]);

  const loadPrompts = async () => {
    const loaded = await indexedDB_storage.getUserPrompts();
    setPrompts(loaded);
  };

  const handleCreateNew = () => {
    setEditingPrompt({
      name: '',
      content: '',
      description: '',
    });
    setIsEditing(true);
  };

  const handleEdit = (prompt: UserPrompt) => {
    setEditingPrompt(prompt);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editingPrompt.name?.trim() || !editingPrompt.content?.trim()) {
      return;
    }

    const now = new Date();
    const prompt: UserPrompt = {
      id: editingPrompt.id || `user-prompt-${Date.now()}`,
      name: editingPrompt.name.trim(),
      content: editingPrompt.content.trim(),
      description: editingPrompt.description?.trim() || '',
      createdAt: editingPrompt.createdAt || now,
      updatedAt: now,
    };

    await indexedDB_storage.saveUserPrompt(prompt);
    await loadPrompts();
    setIsEditing(false);
    setEditingPrompt({ name: '', content: '', description: '' });
  };

  const handleDelete = async (id: string) => {
    if (confirm('このユーザープロンプトを削除してもよろしいですか？')) {
      await indexedDB_storage.deleteUserPrompt(id);
      await loadPrompts();
      if (currentPromptId === id) {
        onSelectPrompt(undefined);
      }
    }
  };

  const handleSelect = (promptId: string | undefined) => {
    onSelectPrompt(promptId);
    onClose();
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingPrompt({ name: '', content: '', description: '' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-surface-primary rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-border-light">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <User className="h-5 w-5 text-accent" />
            {isEditing ? (editingPrompt.id ? 'ユーザープロンプトを編集' : 'ユーザープロンプトを作成') : 'ユーザープロンプト管理'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
          >
            <X className="h-5 w-5 text-text-secondary" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {isEditing ? (
            // 编辑表单
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  プロンプト名 *
                </label>
                <input
                  type="text"
                  value={editingPrompt.name || ''}
                  onChange={(e) => setEditingPrompt({ ...editingPrompt, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-border-medium bg-surface-primary text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                  placeholder="例：好奇心旺盛な学生、プロの評論家、友達"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  簡単な説明（任意）
                </label>
                <input
                  type="text"
                  value={editingPrompt.description || ''}
                  onChange={(e) => setEditingPrompt({ ...editingPrompt, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-border-medium bg-surface-primary text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                  placeholder="このプロンプトの用途や特徴を簡単に説明"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  ユーザー役割設定 *
                  <span className="ml-2 text-xs text-text-tertiary">
                    製品ユーザーを演じて、日本語で対話
                  </span>
                </label>
                <div className="mb-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-xs text-blue-900 font-medium mb-1">📝 以下の情報を含める必要があります：</p>
                  <ul className="text-xs text-blue-800 space-y-0.5 ml-4">
                    <li>• ユーザー年齢（例：25歳）</li>
                    <li>• ユーザー身分/職業（例：大学生、会社員）</li>
                    <li>• 使用する製品（例：学習管理システム、ECプラットフォーム）</li>
                    <li>• ユーザーの性格特徴と行動パターン</li>
                    <li>• <strong>重要：すべての会話は日本語で行う必要があります</strong></li>
                  </ul>
                </div>
                <textarea
                  value={editingPrompt.content || ''}
                  onChange={(e) => setEditingPrompt({ ...editingPrompt, content: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-border-medium bg-surface-primary text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all resize-none"
                  rows={14}
                  placeholder={`あなたは製品ユーザーとして、以下の役割を演じて製品機能をテストします：

年齢：25歳
身分：大学生
使用製品：オンライン学習プラットフォーム

性格特徴：
- 新機能に興味津々
- 製品の問題を発見するのが得意
- 積極的に使用フィードバックを提供する
- ユーザー体験の細部にこだわる

言語要件：すべての会話は日本語で行う必要があります

行動パターン：
- 様々な機能を試す
- 問題に遭遇したら質問する
- 理解できないところは説明を求める`}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="submit"
                  onClick={handleSave}
                  disabled={!editingPrompt.name?.trim() || !editingPrompt.content?.trim()}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-2" />
                  保存
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleCancelEdit}
                  className="flex-1"
                >
                  キャンセル
                </Button>
              </div>
            </div>
          ) : (
            // 列表视图
            <div className="space-y-3">
              {/* 创建新提示词按钮 */}
              <button
                onClick={handleCreateNew}
                className="w-full px-4 py-3 rounded-lg border-2 border-dashed border-border-medium hover:border-accent hover:bg-surface-hover transition-all text-text-secondary hover:text-accent flex items-center justify-center gap-2"
              >
                <Plus className="h-5 w-5" />
                <span className="font-medium">新しいユーザープロンプトを作成</span>
              </button>

              {/* 无提示词选项 */}
              <button
                onClick={() => handleSelect(undefined)}
                className={cn(
                  'w-full px-4 py-3 rounded-lg border transition-all text-left',
                  !currentPromptId
                    ? 'border-accent bg-accent/5 text-accent'
                    : 'border-border-medium hover:border-accent/50 hover:bg-surface-hover'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">ユーザープロンプトなし</div>
                  {!currentPromptId && (
                    <Check className="h-5 w-5 text-accent" />
                  )}
                </div>
                <div className="text-xs text-text-tertiary mt-1">
                  自動提案を使用しない
                </div>
              </button>

              {/* デフォルト提示词列表 */}
              {DEFAULT_USER_PROMPTS.map((prompt) => (
                <div
                  key={prompt.id}
                  className={cn(
                    'w-full px-4 py-3 rounded-lg border transition-all',
                    currentPromptId === prompt.id
                      ? 'border-accent bg-accent/5'
                      : 'border-border-medium hover:border-accent/50 hover:bg-surface-hover'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <button
                      onClick={() => handleSelect(prompt.id)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-medium text-text-primary">{prompt.name}</div>
                        {currentPromptId === prompt.id && (
                          <Check className="h-4 w-4 text-accent" />
                        )}
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 font-medium">
                          デフォルト
                        </span>
                      </div>
                      {prompt.description && (
                        <div className="text-xs text-text-tertiary mb-1">
                          {prompt.description}
                        </div>
                      )}
                      <div className="text-sm text-text-secondary line-clamp-2">
                        {prompt.content}
                      </div>
                    </button>
                  </div>
                </div>
              ))}

              {/* ユーザー作成の提示词列表 */}
              {prompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className={cn(
                    'w-full px-4 py-3 rounded-lg border transition-all',
                    currentPromptId === prompt.id
                      ? 'border-accent bg-accent/5'
                      : 'border-border-medium hover:border-accent/50 hover:bg-surface-hover'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <button
                      onClick={() => handleSelect(prompt.id)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-text-primary">{prompt.name}</div>
                        {currentPromptId === prompt.id && (
                          <Check className="h-4 w-4 text-accent" />
                        )}
                      </div>
                      {prompt.description && (
                        <div className="text-xs text-text-tertiary mt-1">
                          {prompt.description}
                        </div>
                      )}
                      <div className="text-sm text-text-secondary mt-2 line-clamp-2">
                        {prompt.content}
                      </div>
                    </button>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleEdit(prompt)}
                        className="p-2 rounded-lg hover:bg-surface-hover transition-colors text-text-secondary hover:text-text-primary"
                        title="編集"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(prompt.id)}
                        className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-text-secondary hover:text-red-500"
                        title="削除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {prompts.length === 0 && DEFAULT_USER_PROMPTS.length === 0 && (
                <div className="text-center py-12 text-text-tertiary">
                  <p>まだユーザープロンプトが作成されていません</p>
                  <p className="text-sm mt-2">上のボタンをクリックして最初のプロンプトを作成</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
