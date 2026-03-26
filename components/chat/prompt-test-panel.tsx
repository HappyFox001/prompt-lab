'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit2, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PromptTestItem {
  id: string;
  name: string;
  content: string;
  enabled: boolean;
  color?: string;
  isPreset?: boolean;
  category?: string;
}

interface PromptTestPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onTestPromptsChange: (prompts: PromptTestItem[]) => void;
  activePrompts: PromptTestItem[];
  onWidthChange?: (width: number) => void;
}

export function PromptTestPanel({
  isOpen,
  onClose,
  onTestPromptsChange,
  activePrompts,
  onWidthChange,
}: PromptTestPanelProps) {
  const [panelWidth, setPanelWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const [testPrompts, setTestPrompts] = useState<PromptTestItem[]>(activePrompts);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editContent, setEditContent] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const panelRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);

  // 同步外部状态
  useEffect(() => {
    setTestPrompts(activePrompts);
  }, [activePrompts]);

  // 通知父组件宽度变化
  useEffect(() => {
    const displayWidth = isCollapsed ? 48 : panelWidth;
    onWidthChange?.(displayWidth);
  }, [panelWidth, isCollapsed, onWidthChange]);

  // 处理拖拽调整宽度
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 300 && newWidth <= 800) {
        setPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleTogglePrompt = (id: string) => {
    const updated = testPrompts.map((p) =>
      p.id === id ? { ...p, enabled: !p.enabled } : p
    );
    setTestPrompts(updated);
    onTestPromptsChange(updated);
  };

  const handleStartEdit = (prompt: PromptTestItem) => {
    setEditingId(prompt.id);
    setEditName(prompt.name);
    setEditContent(prompt.content);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;

    const updated = testPrompts.map((p) =>
      p.id === editingId
        ? { ...p, name: editName.trim(), content: editContent.trim() }
        : p
    );
    setTestPrompts(updated);
    onTestPromptsChange(updated);
    setEditingId(null);
    setEditName('');
    setEditContent('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditContent('');
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个提示词片段吗？')) {
      const updated = testPrompts.filter((p) => p.id !== id);
      setTestPrompts(updated);
      onTestPromptsChange(updated);
    }
  };

  const handleAddNew = () => {
    const newPrompt: PromptTestItem = {
      id: `custom-prompt-${Date.now()}`,
      name: '自定义片段',
      content: '',
      enabled: false,
      color: getRandomColor(),
      isPreset: false,
    };
    setTestPrompts([...testPrompts, newPrompt]);
    setEditingId(newPrompt.id);
    setEditName(newPrompt.name);
    setEditContent(newPrompt.content);
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (!isOpen) return null;

  const displayWidth = isCollapsed ? 48 : panelWidth;

  // 内部组件：提示词项
  const PromptItem = ({ prompt }: { prompt: PromptTestItem }) => {
    const isExpanded = expandedIds.has(prompt.id);

    return (
      <div
        className={cn(
          'rounded-lg border transition-all overflow-hidden',
          prompt.enabled
            ? 'border-accent bg-accent/5'
            : 'border-border-medium bg-surface-secondary hover:border-accent/50'
        )}
      >
        {editingId === prompt.id ? (
          // 编辑模式
          <div className="p-3 space-y-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-2 py-1 text-sm rounded border border-border-medium bg-surface-primary text-text-primary focus:border-accent focus:outline-none"
              placeholder="提示词名称"
              autoFocus
            />
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full px-2 py-1 text-xs rounded border border-border-medium bg-surface-primary text-text-primary focus:border-accent focus:outline-none resize-none font-mono"
              rows={6}
              placeholder="提示词内容"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-2 py-1 text-xs rounded bg-accent text-white hover:bg-accent-hover transition-colors flex items-center justify-center gap-1"
              >
                <Check className="h-3 w-3" />
                保存
              </button>
              <button
                onClick={handleCancelEdit}
                className="flex-1 px-2 py-1 text-xs rounded border border-border-medium hover:bg-surface-hover transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          // 显示模式
          <div className="p-2.5">
            <div className="flex items-start gap-2">
              {/* 颜色指示器 */}
              <div
                className="w-1 h-full rounded-full mt-1 shrink-0"
                style={{ backgroundColor: prompt.color || '#888' }}
              />

              {/* 内容区 */}
              <div className="flex-1 min-w-0">
                {/* 标题行 - 可点击展开/收起 */}
                <div
                  className="flex items-center justify-between gap-2 mb-2 cursor-pointer"
                  onClick={() => toggleExpanded(prompt.id)}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-sm font-medium text-text-primary truncate">
                      {prompt.name}
                    </span>
                    {prompt.isPreset && (
                      <span className="px-1.5 py-0.5 text-xs rounded bg-accent/10 text-accent shrink-0">
                        预设
                      </span>
                    )}
                    {prompt.category && (
                      <span className="px-1.5 py-0.5 text-xs rounded bg-surface-tertiary text-text-tertiary shrink-0">
                        {prompt.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {/* 展开/收起图标 */}
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5 text-text-tertiary" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-text-tertiary" />
                    )}
                  </div>
                </div>

                {/* 展开的详细内容 */}
                {isExpanded && (
                  <div className="space-y-2 mb-2">
                    {/* 提示词内容 */}
                    {prompt.content && (
                      <div className="bg-surface-primary rounded p-2 border border-border-light">
                        <p className="text-xs text-text-secondary font-mono whitespace-pre-wrap">
                          {prompt.content}
                        </p>
                      </div>
                    )}

                    {/* 编辑/删除按钮（仅自定义片段） */}
                    {!prompt.isPreset && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(prompt);
                          }}
                          className="px-2 py-1 text-xs rounded hover:bg-surface-hover transition-colors text-text-tertiary hover:text-text-primary flex items-center gap-1"
                        >
                          <Edit2 className="h-3 w-3" />
                          编辑
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(prompt.id);
                          }}
                          className="px-2 py-1 text-xs rounded hover:bg-red-500/10 transition-colors text-text-tertiary hover:text-red-500 flex items-center gap-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          删除
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 启用/禁用开关 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTogglePrompt(prompt.id);
                  }}
                  className={cn(
                    'w-full px-2 py-1 rounded text-xs font-medium transition-all',
                    prompt.enabled
                      ? 'bg-accent text-white hover:bg-accent-hover'
                      : 'bg-surface-hover text-text-secondary hover:bg-surface-primary'
                  )}
                >
                  {prompt.enabled ? '✓ 已启用' : '启用'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* 面板 */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 h-screen bg-surface-primary border-l border-border-light z-50 flex transition-all duration-300"
        style={{ width: displayWidth }}
      >
        {/* 拖拽调整宽度的手柄 */}
        {!isCollapsed && (
          <div
            ref={resizeRef}
            className="w-1 hover:w-1.5 bg-border-light hover:bg-accent cursor-col-resize transition-all"
            onMouseDown={() => setIsResizing(true)}
          />
        )}

        {/* 内容区域 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 头部 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-light bg-surface-secondary">
            <div className="flex items-center gap-2">
              {!isCollapsed && (
                <h3 className="text-base font-semibold text-text-primary">
                  提示词增强
                </h3>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors text-text-secondary hover:text-text-primary"
                title={isCollapsed ? '展开' : '收起'}
              >
                {isCollapsed ? (
                  <ChevronLeft className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* 列表区域 */}
          {!isCollapsed && (
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {/* 添加新按钮 */}
              <button
                onClick={handleAddNew}
                className="w-full px-3 py-2 rounded-lg border-2 border-dashed border-border-medium hover:border-accent hover:bg-surface-hover transition-all text-text-secondary hover:text-accent flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                <span className="text-sm font-medium">添加自定义片段</span>
              </button>

              {/* 提示词列表 */}
              {testPrompts.length === 0 ? (
                <div className="text-center py-12 text-text-tertiary">
                  <p className="text-sm">暂无提示词片段</p>
                  <p className="text-xs mt-2">点击上方按钮添加自定义片段</p>
                </div>
              ) : (
                <>
                  {/* 预设片段 */}
                  {testPrompts.filter(p => p.isPreset).length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-medium text-text-tertiary mb-2 px-1">
                        预设片段
                      </div>
                      <div className="space-y-2">
                        {testPrompts.filter(p => p.isPreset).map((prompt) => (
                          <PromptItem key={prompt.id} prompt={prompt} />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 自定义片段 */}
                  {testPrompts.filter(p => !p.isPreset).length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-text-tertiary mb-2 px-1">
                        自定义片段
                      </div>
                      <div className="space-y-2">
                        {testPrompts.filter(p => !p.isPreset).map((prompt) => (
                          <PromptItem key={prompt.id} prompt={prompt} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* 折叠状态下的提示 */}
          {isCollapsed && (
            <div className="flex-1 flex flex-col items-center justify-start pt-4 gap-3">
              {testPrompts.filter(p => p.enabled).map((prompt) => (
                <div
                  key={prompt.id}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: prompt.color || '#888' }}
                  title={prompt.name}
                >
                  {prompt.name.charAt(0)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// 随机颜色生成器
function getRandomColor(): string {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
    '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
    '#ec4899', '#f43f5e',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
