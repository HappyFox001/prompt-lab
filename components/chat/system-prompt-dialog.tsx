'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Plus, Trash2, Check, ChevronRight, ChevronDown, Edit2 } from 'lucide-react';
import { SystemPrompt } from '@/lib/types';
import { indexedDB_storage } from '@/lib/indexeddb';
import { cn } from '@/lib/utils';

// XML 节点类型
interface XMLNode {
  tag: string;
  attributes: Record<string, string>;
  children: XMLNode[];
  text: string;
  startIndex: number;
  endIndex: number;
}

// 检测内容是否包含 XML 标签
function hasXMLTags(content: string): boolean {
  return /<[^>]+>/.test(content);
}

// 解析 XML 为树形结构
function parseXMLToTree(xml: string): XMLNode[] {
  const nodes: XMLNode[] = [];
  const stack: XMLNode[] = [];

  // 匹配开始标签、结束标签和文本
  const tagRegex = /<\/?([A-Za-z_][\w\-]*)((?:\s+[\w\-]+(?:="[^"]*")?)*)\s*>/g;
  let lastIndex = 0;
  let match;

  while ((match = tagRegex.exec(xml)) !== null) {
    const fullMatch = match[0];
    const tagName = match[1];
    const attributesStr = match[2];
    const isClosing = fullMatch.startsWith('</');

    // 处理标签之间的文本
    if (match.index > lastIndex) {
      const text = xml.slice(lastIndex, match.index).trim();
      if (text && stack.length > 0) {
        stack[stack.length - 1].text += text;
      }
    }

    if (isClosing) {
      // 结束标签
      if (stack.length > 0 && stack[stack.length - 1].tag === tagName) {
        const node = stack.pop()!;
        node.endIndex = match.index + fullMatch.length;

        if (stack.length > 0) {
          stack[stack.length - 1].children.push(node);
        } else {
          nodes.push(node);
        }
      }
    } else {
      // 开始标签
      const attributes: Record<string, string> = {};
      const attrRegex = /([\w\-]+)="([^"]*)"/g;
      let attrMatch;
      while ((attrMatch = attrRegex.exec(attributesStr)) !== null) {
        attributes[attrMatch[1]] = attrMatch[2];
      }

      const node: XMLNode = {
        tag: tagName,
        attributes,
        children: [],
        text: '',
        startIndex: match.index,
        endIndex: 0,
      };

      stack.push(node);
    }

    lastIndex = match.index + fullMatch.length;
  }

  return nodes;
}

// XML 树形编辑器组件
function XMLTreeEditor({
  content,
  onChange
}: {
  content: string;
  onChange: (newContent: string) => void;
}) {
  const [nodes, setNodes] = useState<XMLNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    try {
      const parsed = parseXMLToTree(content);
      setNodes(parsed);
      // 默认展开第一层
      const firstLevel = new Set(parsed.map((n, i) => `0-${i}`));
      setExpandedNodes(firstLevel);
    } catch (error) {
      console.error('XML 解析失败:', error);
    }
  }, [content]);

  const getNodePath = (indices: number[]): string => {
    return indices.join('-');
  };

  const toggleExpand = (path: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedNodes(newExpanded);
  };

  const startEdit = (node: XMLNode, path: string) => {
    setEditingNode(path);
    setEditValue(node.text);
  };

  const saveEdit = (node: XMLNode) => {
    if (editValue !== node.text) {
      // 找到这个节点在原始 XML 中的位置并替换
      const tagPattern = new RegExp(
        `<${node.tag}([^>]*)>([\\s\\S]*?)</${node.tag}>`,
        'g'
      );

      let matchCount = 0;
      const newContent = content.replace(tagPattern, (match, attrs, oldText) => {
        matchCount++;
        // 简单的匹配：如果文本内容相同，就替换
        if (oldText.trim() === node.text.trim()) {
          return `<${node.tag}${attrs}>${editValue}</${node.tag}>`;
        }
        return match;
      });

      onChange(newContent);
    }
    setEditingNode(null);
  };

  const renderNode = (node: XMLNode, indices: number[]): React.ReactElement => {
    const path = getNodePath(indices);
    const isExpanded = expandedNodes.has(path);
    const hasChildren = node.children.length > 0;
    const isLeaf = !hasChildren && node.text.trim();
    const isEditing = editingNode === path;
    const level = indices.length - 1;

    return (
      <div key={path} className="text-xs">
        <div
          className={cn(
            'flex items-start gap-1 py-0.5 rounded hover:bg-surface-hover transition-colors',
            level > 0 && 'ml-4'
          )}
        >
          {/* 展开/折叠图标 */}
          {hasChildren ? (
            <div
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(path);
              }}
              className="cursor-pointer mt-0.5"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 text-text-tertiary" />
              ) : (
                <ChevronRight className="h-3 w-3 text-text-tertiary" />
              )}
            </div>
          ) : (
            <div className="w-3" />
          )}

          {/* 标签名 */}
          <div className="flex-1">
            <span className="font-mono text-accent">
              &lt;{node.tag}
              {Object.keys(node.attributes).length > 0 && (
                <span className="text-text-tertiary">
                  {Object.entries(node.attributes).map(([key, val]) => (
                    <span key={key}> {key}="{val}"</span>
                  ))}
                </span>
              )}
              &gt;
            </span>

            {/* 叶子节点的文本内容 */}
            {isLeaf && (
              <div className="mt-1 ml-4">
                {isEditing ? (
                  <div className="flex gap-2">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 px-2 py-1 text-xs rounded border border-accent bg-surface-primary text-text-primary focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          saveEdit(node);
                        }}
                        className="px-2 py-1 rounded bg-accent text-white text-xs hover:bg-accent-hover"
                      >
                        保存
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingNode(null);
                        }}
                        className="px-2 py-1 rounded border border-border-medium text-xs hover:bg-surface-hover"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(node, path);
                    }}
                    className="group cursor-pointer"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-text-secondary whitespace-pre-wrap flex-1">
                        {node.text}
                      </span>
                      <Edit2 className="h-3 w-3 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 子节点 */}
            {hasChildren && isExpanded && (
              <div className="mt-1">
                {node.children.map((child, idx) =>
                  renderNode(child, [...indices, idx])
                )}
              </div>
            )}

            {/* 结束标签 */}
            {hasChildren && isExpanded && (
              <span className="font-mono text-accent">
                &lt;/{node.tag}&gt;
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (nodes.length === 0) {
    return (
      <div className="text-xs text-text-tertiary line-clamp-2">
        {content.slice(0, 100)}...
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
      {nodes.map((node, idx) => renderNode(node, [0, idx]))}
    </div>
  );
}

// 简化的 XML 预览组件（用于列表）
function XMLPreview({ content }: { content: string }) {
  const [nodes, setNodes] = useState<XMLNode[]>([]);

  useEffect(() => {
    try {
      const parsed = parseXMLToTree(content);
      setNodes(parsed);
    } catch (error) {
      console.error('XML 解析失败:', error);
    }
  }, [content]);

  if (nodes.length === 0) {
    return (
      <div className="text-xs text-text-tertiary line-clamp-2">
        {content.slice(0, 100)}...
      </div>
    );
  }

  const countTags = (nodes: XMLNode[]): number => {
    return nodes.reduce((count, node) => {
      return count + 1 + countTags(node.children);
    }, 0);
  };

  const totalTags = countTags(nodes);

  return (
    <div className="mt-2 space-y-1">
      {nodes.slice(0, 3).map((node, idx) => (
        <div key={idx} className="text-xs font-mono text-accent">
          &lt;{node.tag}&gt;
          {node.children.length > 0 && (
            <span className="text-text-tertiary ml-2">
              ({node.children.length} 個のサブタグ)
            </span>
          )}
        </div>
      ))}
      {totalTags > 3 && (
        <div className="text-xs text-text-tertiary">
          合計 {totalTags} 個のタグ
        </div>
      )}
    </div>
  );
}

interface SystemPromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentPromptId?: string;
  onSelectPrompt: (promptId: string | undefined) => void;
}

export function SystemPromptDialog({
  isOpen,
  onClose,
  currentPromptId,
  onSelectPrompt,
}: SystemPromptDialogProps) {
  const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Partial<SystemPrompt>>({
    name: '',
    content: '',
  });
  const [editMode, setEditMode] = useState<'text' | 'tree'>('text');

  // 加载系统提示词列表
  useEffect(() => {
    if (isOpen) {
      loadPrompts();
    }
  }, [isOpen]);

  const loadPrompts = async () => {
    const loaded = await indexedDB_storage.getSystemPrompts();
    setPrompts(loaded);
  };

  const handleCreateNew = () => {
    setEditingPrompt({
      name: '',
      content: '',
    });
    setIsEditing(true);
  };

  const handleEdit = (prompt: SystemPrompt) => {
    setEditingPrompt(prompt);
    setEditMode(hasXMLTags(prompt.content) ? 'tree' : 'text');
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editingPrompt.name?.trim() || !editingPrompt.content?.trim()) {
      return;
    }

    const now = new Date();
    const prompt: SystemPrompt = {
      id: editingPrompt.id || `prompt-${Date.now()}`,
      name: editingPrompt.name.trim(),
      content: editingPrompt.content.trim(),
      createdAt: editingPrompt.createdAt || now,
      updatedAt: now,
    };

    await indexedDB_storage.saveSystemPrompt(prompt);
    await loadPrompts();
    setIsEditing(false);
    setEditingPrompt({ name: '', content: '' });
  };

  const handleDelete = async (id: string) => {
    if (confirm('このシステムプロンプトを削除してもよろしいですか？')) {
      await indexedDB_storage.deleteSystemPrompt(id);
      await loadPrompts();
      if (currentPromptId === id) {
        onSelectPrompt(undefined);
      }
    }
  };

  const handleSelect = (promptId: string) => {
    onSelectPrompt(promptId);
    onClose();
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingPrompt({ name: '', content: '' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-surface-primary rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-border-light">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <h2 className="text-xl font-semibold text-text-primary">
            {isEditing ? (editingPrompt.id ? 'システムプロンプトを編集' : 'システムプロンプトを作成') : 'システムプロンプト管理'}
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
                  placeholder="例：ファンタジー世界ナレーションエンジン、プロフェッショナルコードアシスタント"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-text-primary">
                    プロンプト内容 *
                    <span className="ml-2 text-xs text-text-tertiary">XML形式対応</span>
                  </label>
                  {hasXMLTags(editingPrompt.content || '') && (
                    <div className="flex gap-1 rounded-lg border border-border-light p-1">
                      <button
                        onClick={() => setEditMode('text')}
                        className={cn(
                          'px-3 py-1 text-xs rounded transition-all',
                          editMode === 'text'
                            ? 'bg-accent text-white'
                            : 'text-text-secondary hover:text-text-primary'
                        )}
                      >
                        テキスト編集
                      </button>
                      <button
                        onClick={() => setEditMode('tree')}
                        className={cn(
                          'px-3 py-1 text-xs rounded transition-all',
                          editMode === 'tree'
                            ? 'bg-accent text-white'
                            : 'text-text-secondary hover:text-text-primary'
                        )}
                      >
                        ツリー編集
                      </button>
                    </div>
                  )}
                </div>

                {editMode === 'text' || !hasXMLTags(editingPrompt.content || '') ? (
                  <textarea
                    value={editingPrompt.content || ''}
                    onChange={(e) => setEditingPrompt({ ...editingPrompt, content: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-border-medium bg-surface-primary text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all resize-none font-mono text-sm"
                    rows={16}
                    placeholder="システムプロンプトの内容を入力してください。XML形式の構造化記述に対応しています..."
                  />
                ) : (
                  <div className="w-full px-4 py-3 rounded-lg border border-border-medium bg-surface-primary">
                    <XMLTreeEditor
                      content={editingPrompt.content || ''}
                      onChange={(newContent) =>
                        setEditingPrompt({ ...editingPrompt, content: newContent })
                      }
                    />
                  </div>
                )}
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
                <span className="font-medium">新しいシステムプロンプトを作成</span>
              </button>

              {/* 无提示词选项 */}
              <button
                onClick={() => handleSelect(undefined as any)}
                className={cn(
                  'w-full px-4 py-3 rounded-lg border transition-all text-left',
                  !currentPromptId
                    ? 'border-accent bg-accent/5 text-accent'
                    : 'border-border-medium hover:border-accent/50 hover:bg-surface-hover'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">システムプロンプトなし</div>
                  {!currentPromptId && (
                    <Check className="h-5 w-5 text-accent" />
                  )}
                </div>
              </button>

              {/* 提示词列表 */}
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
                        {hasXMLTags(prompt.content) && (
                          <span className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent font-mono">
                            XML
                          </span>
                        )}
                      </div>
                      <XMLPreview content={prompt.content} />
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

              {prompts.length === 0 && (
                <div className="text-center py-12 text-text-tertiary">
                  <p>まだシステムプロンプトが作成されていません</p>
                  <p className="text-sm mt-2">上のボタンをクリックして最初のプロンプトを作成してください</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
