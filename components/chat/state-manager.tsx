'use client';

import { useState } from 'react';
import { NumericState } from '@/lib/types';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StateManagerProps {
  states: NumericState[];
  onUpdateStates: (states: NumericState[]) => void;
}

export function StateManager({ states, onUpdateStates }: StateManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<NumericState>>({
    name: '',
    value: 50,
    min: 0,
    max: 100,
    description: '',
    color: '#10b981',
  });

  const handleAdd = () => {
    if (!formData.name) return;

    const newState: NumericState = {
      id: Date.now().toString(),
      name: formData.name,
      value: formData.value || 50,
      min: formData.min || 0,
      max: formData.max || 100,
      description: formData.description,
      color: formData.color || '#10b981',
    };

    onUpdateStates([...states, newState]);
    setIsAdding(false);
    setFormData({ name: '', value: 50, min: 0, max: 100, description: '', color: '#10b981' });
  };

  const handleEdit = (state: NumericState) => {
    setEditingId(state.id);
    setFormData(state);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;

    const updated = states.map(s =>
      s.id === editingId
        ? { ...s, ...formData } as NumericState
        : s
    );

    onUpdateStates(updated);
    setEditingId(null);
    setFormData({ name: '', value: 50, min: 0, max: 100, description: '', color: '#10b981' });
  };

  const handleDelete = (id: string) => {
    onUpdateStates(states.filter(s => s.id !== id));
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', value: 50, min: 0, max: 100, description: '', color: '#10b981' });
  };

  return (
    <div className="space-y-4">
      {/* 状态列表 */}
      <div className="space-y-2">
        {states.map((state) => (
          <div key={state.id}>
            {editingId === state.id ? (
              <StateForm
                formData={formData}
                setFormData={setFormData}
                onSave={handleSaveEdit}
                onCancel={handleCancel}
              />
            ) : (
              <StateCard
                state={state}
                onEdit={() => handleEdit(state)}
                onDelete={() => handleDelete(state.id)}
              />
            )}
          </div>
        ))}
      </div>

      {/* 添加新状态 */}
      {isAdding ? (
        <StateForm
          formData={formData}
          setFormData={setFormData}
          onSave={handleAdd}
          onCancel={handleCancel}
        />
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-border-medium hover:border-accent hover:bg-accent/5 transition-all text-text-tertiary hover:text-accent"
        >
          <Plus className="h-4 w-4" />
          <span className="text-sm font-medium">添加状态</span>
        </button>
      )}
    </div>
  );
}

// 状态卡片
function StateCard({
  state,
  onEdit,
  onDelete,
}: {
  state: NumericState;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const percentage = ((state.value - state.min) / (state.max - state.min)) * 100;

  return (
    <div className="group rounded-lg border border-border-light bg-surface-secondary p-4 hover:border-border-medium transition-all">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-text-primary">{state.name}</h4>
            <span className="text-xs text-text-tertiary">
              {state.value} / {state.max}
            </span>
          </div>
          {state.description && (
            <p className="text-xs text-text-tertiary">{state.description}</p>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-1.5 rounded hover:bg-surface-hover transition-colors"
            title="编辑"
          >
            <Edit2 className="h-3.5 w-3.5 text-text-tertiary hover:text-accent" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded hover:bg-surface-hover transition-colors"
            title="删除"
          >
            <Trash2 className="h-3.5 w-3.5 text-text-tertiary hover:text-red-500" />
          </button>
        </div>
      </div>

      {/* 进度条 */}
      <div className="relative h-2 bg-surface-tertiary rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            backgroundColor: state.color || '#10b981',
          }}
        />
      </div>
    </div>
  );
}

// 状态表单
function StateForm({
  formData,
  setFormData,
  onSave,
  onCancel,
}: {
  formData: Partial<NumericState>;
  setFormData: (data: Partial<NumericState>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-lg border border-border-medium bg-surface-primary p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-text-tertiary mb-1 block">名称</label>
          <input
            type="text"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="好感度"
            className="w-full px-2 py-1.5 text-sm rounded border border-border-light bg-surface-secondary text-text-primary focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <div>
          <label className="text-xs text-text-tertiary mb-1 block">颜色</label>
          <input
            type="color"
            value={formData.color || '#10b981'}
            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
            className="w-full h-[34px] rounded border border-border-light cursor-pointer"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-text-tertiary mb-1 block">最小值</label>
          <input
            type="number"
            value={formData.min ?? 0}
            onChange={(e) => setFormData({ ...formData, min: Number(e.target.value) })}
            className="w-full px-2 py-1.5 text-sm rounded border border-border-light bg-surface-secondary text-text-primary focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <div>
          <label className="text-xs text-text-tertiary mb-1 block">当前值</label>
          <input
            type="number"
            value={formData.value ?? 50}
            onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
            className="w-full px-2 py-1.5 text-sm rounded border border-border-light bg-surface-secondary text-text-primary focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <div>
          <label className="text-xs text-text-tertiary mb-1 block">最大值</label>
          <input
            type="number"
            value={formData.max ?? 100}
            onChange={(e) => setFormData({ ...formData, max: Number(e.target.value) })}
            className="w-full px-2 py-1.5 text-sm rounded border border-border-light bg-surface-secondary text-text-primary focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-text-tertiary mb-1 block">描述（可选）</label>
        <input
          type="text"
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="用于记录角色对用户的情感"
          className="w-full px-2 py-1.5 text-sm rounded border border-border-light bg-surface-secondary text-text-primary focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button
          onClick={onSave}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-accent text-white rounded text-sm hover:bg-accent-hover transition-colors"
        >
          <Save className="h-3.5 w-3.5" />
          保存
        </button>
        <button
          onClick={onCancel}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-surface-tertiary text-text-secondary rounded text-sm hover:bg-surface-hover transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          取消
        </button>
      </div>
    </div>
  );
}
