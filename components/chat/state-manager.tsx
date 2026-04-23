'use client';

import { useState } from 'react';
import { NumericState } from '@/lib/types';
import { Plus, Trash2, Edit2, Save, X, Lock, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAffectionLevel, getTrustLevel } from '@/lib/default-states';

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
      enabled: true, // 新添加的状态默认启用
    };

    onUpdateStates([...states, newState]);
    setIsAdding(false);
    setFormData({ name: '', value: 50, min: 0, max: 100, description: '', color: '#10b981' });
  };

  const handleEdit = (state: NumericState) => {
    // 默认状态不可编辑
    if (state.isDefault) return;
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
    // 查找状态，如果是默认状态则不允许删除
    const state = states.find(s => s.id === id);
    if (state?.isDefault) return;
    onUpdateStates(states.filter(s => s.id !== id));
  };

  const handleToggleEnabled = (id: string) => {
    const updated = states.map(s =>
      s.id === id
        ? { ...s, enabled: !s.enabled }
        : s
    );
    onUpdateStates(updated);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', value: 50, min: 0, max: 100, description: '', color: '#10b981' });
  };

  // 分离默认状态和用户自定义状态
  const defaultStates = states.filter(s => s.isDefault);
  const customStates = states.filter(s => !s.isDefault);

  return (
    <div className="space-y-6">
      {/* 默认状态（不可编辑/删除） */}
      {defaultStates.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-text-tertiary uppercase tracking-wider">
            <Lock className="h-3 w-3" />
            <span>デフォルトステータス</span>
          </div>
          <div className="space-y-2">
            {defaultStates.map((state) => (
              <DefaultStateCard
                key={state.id}
                state={state}
                onToggleEnabled={() => handleToggleEnabled(state.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 用户自定义状态 */}
      <div className="space-y-3">
        {customStates.length > 0 && (
          <div className="text-xs text-text-tertiary uppercase tracking-wider">
            カスタムステータス
          </div>
        )}
        <div className="space-y-2">
          {customStates.map((state) => (
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
                  onToggleEnabled={() => handleToggleEnabled(state.id)}
                />
              )}
            </div>
          ))}
        </div>

        {/* 新规ステータス追加 */}
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
            <span className="text-sm font-medium">ステータスを追加</span>
          </button>
        )}
      </div>
    </div>
  );
}

// 获取状态等级标签
function getStateLevelLabel(state: NumericState): { label: string; description: string } | null {
  if (state.id === 'default-affection') {
    const level = getAffectionLevel(state.value);
    return { label: level.label, description: level.description };
  }
  if (state.id === 'default-trust') {
    const level = getTrustLevel(state.value);
    return { label: level.label, description: level.description };
  }
  return null;
}

// 默认状态卡片（带锁定标识，不可编辑/删除，但可开关）
function DefaultStateCard({
  state,
  onToggleEnabled,
}: {
  state: NumericState;
  onToggleEnabled: () => void;
}) {
  const percentage = ((state.value - state.min) / (state.max - state.min)) * 100;
  const isEnabled = state.enabled !== false; // 默认为启用
  const levelInfo = getStateLevelLabel(state);

  return (
    <div className={cn(
      "rounded-lg border bg-surface-secondary p-4 transition-all",
      isEnabled ? "border-border-light" : "border-border-light/50 opacity-60"
    )}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="h-3 w-3 text-text-quaternary" />
            <h4 className="text-sm font-semibold text-text-primary">{state.name}</h4>
            <span className="text-xs text-text-tertiary">
              {state.value} / {state.max}
            </span>
            {levelInfo && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: `${state.color}20`,
                  color: state.color
                }}
              >
                {levelInfo.label}
              </span>
            )}
          </div>
          {levelInfo && (
            <p className="text-xs text-text-tertiary ml-5">{levelInfo.description}</p>
          )}
        </div>
        <button
          onClick={onToggleEnabled}
          className={cn(
            "p-1.5 rounded transition-colors",
            isEnabled
              ? "text-accent hover:bg-accent/10"
              : "text-text-quaternary hover:bg-surface-hover"
          )}
          title={isEnabled ? "クリックして無効化" : "クリックして有効化"}
        >
          {isEnabled ? (
            <ToggleRight className="h-5 w-5" />
          ) : (
            <ToggleLeft className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* プログレスバー */}
      <div className="relative h-2 bg-surface-tertiary rounded-full overflow-hidden">
        {/* 显示负值区域（如果有） */}
        {state.min < 0 && (
          <div
            className="absolute inset-y-0 bg-surface-hover"
            style={{
              left: 0,
              width: `${Math.abs(state.min) / (state.max - state.min) * 100}%`,
            }}
          />
        )}
        {/* 零点标记 */}
        {state.min < 0 && state.max > 0 && (
          <div
            className="absolute inset-y-0 w-px bg-text-quaternary"
            style={{
              left: `${Math.abs(state.min) / (state.max - state.min) * 100}%`,
            }}
          />
        )}
        <div
          className={cn(
            "absolute inset-y-0 rounded-full transition-all duration-300",
            !isEnabled && "opacity-40"
          )}
          style={{
            left: state.value >= 0
              ? `${Math.abs(state.min) / (state.max - state.min) * 100}%`
              : `${(state.value - state.min) / (state.max - state.min) * 100}%`,
            width: state.value >= 0
              ? `${state.value / (state.max - state.min) * 100}%`
              : `${(Math.abs(state.min) - Math.abs(state.value)) / (state.max - state.min) * 100}%`,
            backgroundColor: state.color || '#10b981',
          }}
        />
      </div>

      {/* 范围标签 */}
      <div className="flex justify-between mt-1 text-[10px] text-text-quaternary">
        <span>{state.min}</span>
        <span>{state.max}</span>
      </div>
    </div>
  );
}

// 用户自定义状态卡片（可编辑/删除/开关）
function StateCard({
  state,
  onEdit,
  onDelete,
  onToggleEnabled,
}: {
  state: NumericState;
  onEdit: () => void;
  onDelete: () => void;
  onToggleEnabled: () => void;
}) {
  const percentage = ((state.value - state.min) / (state.max - state.min)) * 100;
  const isEnabled = state.enabled !== false;

  return (
    <div className={cn(
      "group rounded-lg border bg-surface-secondary p-4 transition-all",
      isEnabled ? "border-border-light hover:border-border-medium" : "border-border-light/50 opacity-60"
    )}>
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
        <div className="flex gap-1">
          {/* 开关按钮 */}
          <button
            onClick={onToggleEnabled}
            className={cn(
              "p-1.5 rounded transition-colors",
              isEnabled
                ? "text-accent hover:bg-accent/10"
                : "text-text-quaternary hover:bg-surface-hover"
            )}
            title={isEnabled ? "クリックして無効化" : "クリックして有効化"}
          >
            {isEnabled ? (
              <ToggleRight className="h-4 w-4" />
            ) : (
              <ToggleLeft className="h-4 w-4" />
            )}
          </button>
          {/* 编辑/删除按钮 */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onEdit}
              className="p-1.5 rounded hover:bg-surface-hover transition-colors"
              title="編集"
            >
              <Edit2 className="h-3.5 w-3.5 text-text-tertiary hover:text-accent" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded hover:bg-surface-hover transition-colors"
              title="削除"
            >
              <Trash2 className="h-3.5 w-3.5 text-text-tertiary hover:text-red-500" />
            </button>
          </div>
        </div>
      </div>

      {/* プログレスバー */}
      <div className="relative h-2 bg-surface-tertiary rounded-full overflow-hidden">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-all duration-300",
            !isEnabled && "opacity-40"
          )}
          style={{
            width: `${percentage}%`,
            backgroundColor: state.color || '#10b981',
          }}
        />
      </div>
    </div>
  );
}

// 状态编辑表单
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
          <label className="text-xs text-text-tertiary mb-1 block">名前</label>
          <input
            type="text"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="好感度"
            className="w-full px-2 py-1.5 text-sm rounded border border-border-light bg-surface-secondary text-text-primary focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <div>
          <label className="text-xs text-text-tertiary mb-1 block">色</label>
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
          <label className="text-xs text-text-tertiary mb-1 block">最小値</label>
          <input
            type="number"
            value={formData.min ?? 0}
            onChange={(e) => setFormData({ ...formData, min: Number(e.target.value) })}
            className="w-full px-2 py-1.5 text-sm rounded border border-border-light bg-surface-secondary text-text-primary focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <div>
          <label className="text-xs text-text-tertiary mb-1 block">現在値</label>
          <input
            type="number"
            value={formData.value ?? 50}
            onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
            className="w-full px-2 py-1.5 text-sm rounded border border-border-light bg-surface-secondary text-text-primary focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <div>
          <label className="text-xs text-text-tertiary mb-1 block">最大値</label>
          <input
            type="number"
            value={formData.max ?? 100}
            onChange={(e) => setFormData({ ...formData, max: Number(e.target.value) })}
            className="w-full px-2 py-1.5 text-sm rounded border border-border-light bg-surface-secondary text-text-primary focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-text-tertiary mb-1 block">説明（任意）</label>
        <input
          type="text"
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="キャラクターのユーザーに対する感情を記録"
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
          キャンセル
        </button>
      </div>
    </div>
  );
}
