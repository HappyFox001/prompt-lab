// 默认数值状态配置（Layer 2 预设，不可编辑/删除）
import { NumericState } from './types';

// 好感度等级描述
export const AFFECTION_LEVELS = {
  hatred: { min: -100, max: -80, label: '仇恨', description: '不仅不想和你说话，还想弄死你' },
  loathing: { min: -80, max: -50, label: '憎恶', description: '打死不想和你说话，看见当做没看见' },
  dislike: { min: -50, max: -20, label: '讨厌', description: '不想和你说话，但是你真要搭话，也会对你爱答不理' },
  normal: { min: -20, max: 20, label: '普通', description: '正常交流' },
  friendly: { min: 20, max: 50, label: '友善', description: '想和你说话，愿意分享一些自己非私人的见闻' },
  like: { min: 50, max: 80, label: '喜欢', description: '想和你说话，愿意分享一些自己私人的想法' },
  love: { min: 80, max: 100, label: '爱', description: '无话不说' },
} as const;

// 信赖度等级描述
export const TRUST_LEVELS = {
  suspicion: { min: -100, max: -80, label: '猜忌', description: '你只要开口就是在骗我，除非亲眼所见否则绝对不信' },
  vigilance: { min: -80, max: -50, label: '警惕', description: '只要内容不可被客观情况验证，那你说的就不对' },
  doubt: { min: -50, max: -20, label: '怀疑', description: '如果无法立即验证，会保持怀疑态度，需要更多证据' },
  neutral: { min: -20, max: 20, label: '中立', description: '保持理性判断，不会盲目相信也不会轻易否定' },
  trust: { min: 20, max: 50, label: '信任', description: '愿意相信你说的大部分内容，偶尔会验证' },
  reliance: { min: 50, max: 80, label: '信赖', description: '深度信任，几乎不会怀疑你说的话' },
  blindFaith: { min: 80, max: 100, label: '盲信', description: '无条件相信你说的一切' },
} as const;

// 获取当前好感度等级
export function getAffectionLevel(value: number): typeof AFFECTION_LEVELS[keyof typeof AFFECTION_LEVELS] {
  if (value <= -80) return AFFECTION_LEVELS.hatred;
  if (value <= -50) return AFFECTION_LEVELS.loathing;
  if (value <= -20) return AFFECTION_LEVELS.dislike;
  if (value <= 20) return AFFECTION_LEVELS.normal;
  if (value <= 50) return AFFECTION_LEVELS.friendly;
  if (value <= 80) return AFFECTION_LEVELS.like;
  return AFFECTION_LEVELS.love;
}

// 获取当前信赖度等级
export function getTrustLevel(value: number): typeof TRUST_LEVELS[keyof typeof TRUST_LEVELS] {
  if (value <= -80) return TRUST_LEVELS.suspicion;
  if (value <= -50) return TRUST_LEVELS.vigilance;
  if (value <= -20) return TRUST_LEVELS.doubt;
  if (value <= 20) return TRUST_LEVELS.neutral;
  if (value <= 50) return TRUST_LEVELS.trust;
  if (value <= 80) return TRUST_LEVELS.reliance;
  return TRUST_LEVELS.blindFaith;
}

// 默认状态定义
export const DEFAULT_NUMERIC_STATES: NumericState[] = [
  {
    id: 'default-affection',
    name: '好感',
    value: 0, // 初始值：普通
    min: -50, // 对玩家的取值范围 -50~100
    max: 100,
    description: `キャラクターのプレイヤーに対する好感度。
-50~-20: 讨厌（不想说话，爱答不理）
-20~20: 普通（正常交流）
20~50: 友善（愿意分享非私人见闻）
50~80: 喜欢（愿意分享私人想法）
80~100: 爱（无话不说）`,
    color: '#ec4899', // pink-500
    isDefault: true,
    enabled: true, // 默认启用
  },
  {
    id: 'default-trust',
    name: '信赖',
    value: 0, // 初始值：中立
    min: -50, // 对玩家的取值范围 -50~100
    max: 100,
    description: `キャラクターのプレイヤーに対する信頼度。
-50~-20: 怀疑（需要更多证据）
-20~20: 中立（理性判断）
20~50: 信任（相信大部分内容）
50~80: 信赖（深度信任）
80~100: 盲信（无条件相信）`,
    color: '#3b82f6', // blue-500
    isDefault: true,
    enabled: true, // 默认启用
  },
];

// 为 NPC 角色使用的状态（更宽的取值范围）
export const NPC_NUMERIC_STATES: NumericState[] = [
  {
    id: 'npc-affection',
    name: '好感',
    value: 0,
    min: -100, // NPC 对其他角色 -100~80
    max: 80,
    description: `キャラクター間の好感度。
-100~-80: 仇恨（想弄死对方）
-80~-50: 憎恶（完全无视）
-50~-20: 讨厌（爱答不理）
-20~20: 普通（正常交流）
20~50: 友善（分享非私人见闻）
50~80: 喜欢（分享私人想法）`,
    color: '#ec4899',
    isDefault: true,
    enabled: true,
  },
  {
    id: 'npc-trust',
    name: '信赖',
    value: 0,
    min: -100,
    max: 80,
    description: `キャラクター間の信頼度。
-100~-80: 猜忌（除非亲眼所见否则不信）
-80~-50: 警惕（只信客观可验证的）
-50~-20: 怀疑（需要更多证据）
-20~20: 中立（理性判断）
20~50: 信任（相信大部分内容）
50~80: 信赖（深度信任）`,
    color: '#3b82f6',
    isDefault: true,
    enabled: true,
  },
];

// 获取好感度的行为指导（用于 prompt）
export function getAffectionBehaviorGuide(value: number): string {
  const level = getAffectionLevel(value);
  return `当前好感度: ${value} (${level.label}) - ${level.description}`;
}

// 获取信赖度的行为指导（用于 prompt）
export function getTrustBehaviorGuide(value: number): string {
  const level = getTrustLevel(value);
  return `当前信赖度: ${value} (${level.label}) - ${level.description}`;
}
