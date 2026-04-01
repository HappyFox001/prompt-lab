'use client';

import { useMemo, useState } from 'react';
import { X, Plus, Trash2, Edit2, Save, Check, Tag } from 'lucide-react';
import { ExternalEvent } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ExternalEventsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  events: ExternalEvent[];
  onChange: (events: ExternalEvent[]) => void;
}

export function ExternalEventsDialog({ isOpen, onClose, events, onChange }: ExternalEventsDialogProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<ExternalEvent>>({ name: '', content: '', keys: [], enabled: true });

  const sortedEvents = useMemo(() => {
    return [...(events || [])].sort((a, b) => {
      // 启用的在前，按更新时间降序
      const ae = a.enabled ? 1 : 0;
      const be = b.enabled ? 1 : 0;
      if (ae !== be) return be - ae;
      const at = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bt = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bt - at;
    });
  }, [events]);

  if (!isOpen) return null;

  const resetForm = () => setForm({ name: '', content: '', keys: [], enabled: true });

  const handleAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    resetForm();
  };

  const handleEdit = (ev: ExternalEvent) => {
    setEditingId(ev.id);
    setIsAdding(false);
    setForm({ ...ev, keys: [...(ev.keys || [])] });
  };

  const handleDelete = (id: string) => {
    if (!confirm('确定要删除此外部事件吗？')) return;
    onChange((events || []).filter(e => e.id !== id));
  };

  const handleToggle = (id: string) => {
    const next = (events || []).map(e => (e.id === id ? { ...e, enabled: !e.enabled, updatedAt: new Date() } : e));
    onChange(next);
  };

  const commit = () => {
    if (!form.name?.trim() || !form.content?.trim()) return;
    const keysArr = (Array.isArray(form.keys) ? form.keys : (form.keys || [])) as string[];
    const cleanKeys = keysArr.map(k => k.trim()).filter(Boolean);
    const now = new Date();

    if (editingId) {
      const next = (events || []).map(e =>
        e.id === editingId ? { ...e, name: form.name!.trim(), content: form.content!.trim(), keys: cleanKeys, enabled: form.enabled ?? true, updatedAt: now } : e
      );
      onChange(next);
      setEditingId(null);
      resetForm();
    } else {
      const ev: ExternalEvent = {
        id: `ext-${Date.now()}`,
        name: form.name!.trim(),
        content: form.content!.trim(),
        keys: cleanKeys,
        enabled: form.enabled ?? true,
        createdAt: now,
        updatedAt: now,
      };
      onChange([...(events || []), ev]);
      setIsAdding(false);
      resetForm();
    }
  };

  const cancel = () => {
    setIsAdding(false);
    setEditingId(null);
    resetForm();
  };

  const Editor = (
    <div className="rounded-lg border border-border-medium bg-surface-primary p-4 space-y-3">
      <div>
        <label className="text-xs text-text-tertiary mb-1 block">事件名称</label>
        <input
          type="text"
          value={form.name || ''}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="例如：营销活动、节假日、版本发布"
          className="w-full px-3 py-2 text-sm rounded border border-border-light bg-surface-secondary text-text-primary focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </div>
      <div>
        <label className="text-xs text-text-tertiary mb-1 block">匹配关键词（用逗号或空格分隔）</label>
        <input
          type="text"
          value={(form.keys || []).join(', ')}
          onChange={(e) => {
            const raw = e.target.value;
            const arr = raw.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
            setForm({ ...form, keys: arr });
          }}
          placeholder="黑五, 打折, 促销, バグ, リリース"
          className="w-full px-3 py-2 text-sm rounded border border-border-light bg-surface-secondary text-text-primary focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </div>
      <div>
        <label className="text-xs text-text-tertiary mb-1 block">注入内容（命中时加入系统提示词）</label>
        <textarea
          value={form.content || ''}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          rows={6}
          placeholder="此事件的说明、上下文、限制或应答侧重点（建议简洁、日语/中文均可）"
          className="w-full px-3 py-2 text-sm rounded border border-border-medium bg-surface-primary text-text-primary focus:border-accent focus:ring-2 focus:ring-accent/20 resize-none"
        />
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={commit} className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-accent text-white rounded text-sm hover:bg-accent-hover transition-colors">
          <Save className="h-3.5 w-3.5" /> 保存
        </button>
        <button onClick={cancel} className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-surface-tertiary text-text-secondary rounded text-sm hover:bg-surface-hover transition-colors">
          取消
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-surface-primary rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-border-light">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <Tag className="h-5 w-5 text-accent" /> 外部事件（关键词触发）
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-hover transition-colors">
            <X className="h-5 w-5 text-text-secondary" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* 添加按钮 */}
          {!isAdding && editingId === null && (
            <button
              onClick={handleAdd}
              className="w-full px-4 py-3 rounded-lg border-2 border-dashed border-border-medium hover:border-accent hover:bg-surface-hover transition-all text-text-secondary hover:text-accent flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" />
              <span className="font-medium">添加外部事件</span>
            </button>
          )}

          {(isAdding || editingId) && Editor}

          {/* 列表 */}
          {sortedEvents.length > 0 ? (
            <div className="space-y-2">
              {sortedEvents.map(ev => (
                <div key={ev.id} className={cn('w-full px-4 py-3 rounded-lg border transition-all', ev.enabled ? 'border-accent bg-accent/5' : 'border-border-medium hover:border-accent/50 hover:bg-surface-hover')}> 
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-medium text-text-primary">{ev.name}</div>
                        {ev.enabled && <Check className="h-4 w-4 text-accent" />}
                      </div>
                      {ev.keys?.length ? (
                        <div className="text-xs text-text-tertiary">关键词：{ev.keys.join(', ')}</div>
                      ) : (
                        <div className="text-xs text-text-tertiary">无关键词（将不会被触发）</div>
                      )}
                      <div className="text-sm text-text-secondary mt-2 line-clamp-2">{ev.content}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => handleToggle(ev.id)} className={cn('px-2 py-1 text-xs rounded transition-colors', ev.enabled ? 'bg-accent text-white hover:bg-accent-hover' : 'bg-surface-tertiary text-text-secondary hover:bg-surface-hover')}>{ev.enabled ? '已启用' : '启用'}</button>
                      <button onClick={() => handleEdit(ev)} className="p-2 rounded-lg hover:bg-surface-hover transition-colors text-text-secondary hover:text-text-primary" title="编辑">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(ev.id)} className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-text-secondary hover:text-red-500" title="删除">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-text-tertiary">
              还没有外部事件，点击上方按钮创建
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

