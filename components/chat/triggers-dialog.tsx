'use client';

import { useMemo, useState } from 'react';
import { Check, Edit2, Plus, Save, Trash2, X, Zap } from 'lucide-react';
import type { TriggerEvent } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ensureTriggerBm25, mergeDefaultTriggers } from '@/lib/triggers';

interface TriggersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  triggers: TriggerEvent[];
  onChange: (triggers: TriggerEvent[]) => void;
}

const emptyForm: Partial<TriggerEvent> = {
  name: '',
  roleViewKeys: [],
  playerViewKeys: [],
  description: '',
  enabled: true,
};

export function TriggersDialog({ isOpen, onClose, triggers, onChange }: TriggersDialogProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<TriggerEvent>>(emptyForm);

  const sortedTriggers = useMemo(() => {
    return mergeDefaultTriggers(triggers).sort((a, b) => {
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      const ae = a.enabled ? 1 : 0;
      const be = b.enabled ? 1 : 0;
      if (ae !== be) return be - ae;
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });
  }, [triggers]);

  if (!isOpen) return null;

  const reset = () => setForm(emptyForm);

  const parseLines = (value: string) => value.split('\n').map((line) => line.trim()).filter(Boolean);

  const handleAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    reset();
  };

  const handleEdit = (trigger: TriggerEvent) => {
    if (trigger.isDefault) return;
    setEditingId(trigger.id);
    setIsAdding(false);
    setForm({
      ...trigger,
      roleViewKeys: [...(trigger.roleViewKeys || [])],
      playerViewKeys: [...(trigger.playerViewKeys || [])],
    });
  };

  const handleToggle = (id: string) => {
    const target = sortedTriggers.find((trigger) => trigger.id === id);
    if (target?.isDefault) return;

    const next = sortedTriggers.map((trigger) =>
      trigger.id === id ? ensureTriggerBm25({ ...trigger, enabled: !trigger.enabled, updatedAt: new Date() }) : trigger
    );
    onChange(next);
  };

  const handleDelete = (id: string) => {
    const target = sortedTriggers.find((trigger) => trigger.id === id);
    if (!target || target.isDefault) return;
    if (!confirm('このTriggerを削除しますか？')) return;
    onChange(sortedTriggers.filter((trigger) => trigger.id !== id));
  };

  const commit = () => {
    if (!form.name?.trim() || !form.description?.trim()) return;
    const now = new Date();
    const trigger = ensureTriggerBm25({
      id: editingId || `trigger-${Date.now()}`,
      name: form.name.trim(),
      roleViewKeys: form.roleViewKeys || [],
      playerViewKeys: form.playerViewKeys || [],
      description: form.description.trim(),
      enabled: form.enabled ?? true,
      isDefault: false,
      createdAt: editingId ? form.createdAt || now : now,
      updatedAt: now,
    });

    const next = editingId
      ? sortedTriggers.map((item) => (item.id === editingId ? trigger : item))
      : [...sortedTriggers, trigger];

    onChange(next);
    setIsAdding(false);
    setEditingId(null);
    reset();
  };

  const cancel = () => {
    setIsAdding(false);
    setEditingId(null);
    reset();
  };

  const editor = (
    <div className="rounded-lg border border-border-medium bg-surface-primary p-4 space-y-3">
      <div>
        <label className="text-xs text-text-tertiary mb-1 block">Trigger名</label>
        <input
          type="text"
          value={form.name || ''}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          placeholder="例：tutorial_room_change"
          className="w-full px-3 py-2 text-sm rounded border border-border-light bg-surface-secondary text-text-primary focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="text-xs text-text-tertiary mb-1 block">角色主视角描述（一行一个）</label>
          <textarea
            value={(form.roleViewKeys || []).join('\n')}
            onChange={(event) => setForm({ ...form, roleViewKeys: parseLines(event.target.value) })}
            rows={8}
            className="w-full px-3 py-2 text-sm rounded border border-border-medium bg-surface-primary text-text-primary focus:border-accent focus:ring-2 focus:ring-accent/20 resize-none"
          />
        </div>
        <div>
          <label className="text-xs text-text-tertiary mb-1 block">玩家视角描述（一行一个）</label>
          <textarea
            value={(form.playerViewKeys || []).join('\n')}
            onChange={(event) => setForm({ ...form, playerViewKeys: parseLines(event.target.value) })}
            rows={8}
            className="w-full px-3 py-2 text-sm rounded border border-border-medium bg-surface-primary text-text-primary focus:border-accent focus:ring-2 focus:ring-accent/20 resize-none"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-text-tertiary mb-1 block">description（マッチ時にシステムプロンプトに追加）</label>
        <textarea
          value={form.description || ''}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          rows={7}
          className="w-full px-3 py-2 text-sm rounded border border-border-medium bg-surface-primary text-text-primary focus:border-accent focus:ring-2 focus:ring-accent/20 resize-none"
        />
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={commit} className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-accent text-white rounded text-sm hover:bg-accent-hover transition-colors">
          <Save className="h-3.5 w-3.5" /> 保存
        </button>
        <button onClick={cancel} className="flex-1 px-3 py-1.5 bg-surface-tertiary text-text-secondary rounded text-sm hover:bg-surface-hover transition-colors">
          キャンセル
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-surface-primary rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-border-light">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light">
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <Zap className="h-5 w-5 text-accent" /> Trigger（BM25）
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-hover transition-colors">
            <X className="h-5 w-5 text-text-secondary" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!isAdding && editingId === null && (
            <button
              onClick={handleAdd}
              className="w-full px-4 py-3 rounded-lg border-2 border-dashed border-border-medium hover:border-accent hover:bg-surface-hover transition-all text-text-secondary hover:text-accent flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" />
              <span className="font-medium">Triggerを追加</span>
            </button>
          )}

          {(isAdding || editingId) && editor}

          <div className="space-y-2">
            {sortedTriggers.map((trigger) => (
              <div key={trigger.id} className={cn('w-full px-4 py-3 rounded-lg border transition-all', trigger.enabled ? 'border-accent bg-accent/5' : 'border-border-medium hover:border-accent/50 hover:bg-surface-hover')}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-medium text-text-primary">{trigger.name}</div>
                      {trigger.isDefault && <span className="rounded bg-surface-tertiary px-2 py-0.5 text-[11px] text-text-tertiary">default</span>}
                      {trigger.enabled && <Check className="h-4 w-4 text-accent" />}
                    </div>
                    <div className="text-xs text-text-tertiary">
                      角色主视角 {trigger.roleViewKeys?.length || 0} / 玩家视角 {trigger.playerViewKeys?.length || 0} / BM25 {trigger.bm25 ? 'ready' : 'missing'}
                    </div>
                    <div className="text-sm text-text-secondary mt-2 line-clamp-2 whitespace-pre-wrap">{trigger.description}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggle(trigger.id)}
                      disabled={trigger.isDefault}
                      className={cn(
                        'px-2 py-1 text-xs rounded transition-colors',
                        trigger.enabled ? 'bg-accent text-white hover:bg-accent-hover' : 'bg-surface-tertiary text-text-secondary hover:bg-surface-hover',
                        trigger.isDefault && 'cursor-not-allowed opacity-80'
                      )}
                    >
                      {trigger.isDefault ? '固定' : trigger.enabled ? '有効' : '有効化'}
                    </button>
                    <button
                      onClick={() => handleEdit(trigger)}
                      disabled={trigger.isDefault}
                      className="p-2 rounded-lg hover:bg-surface-hover transition-colors text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                      title={trigger.isDefault ? 'default Trigger は編集できません' : '編集'}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(trigger.id)}
                      disabled={trigger.isDefault}
                      className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-text-secondary hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed"
                      title={trigger.isDefault ? 'default Trigger は削除できません' : '削除'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
