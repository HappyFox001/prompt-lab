import Database from 'better-sqlite3';
import path from 'path';

// 数据库文件路径
const DB_PATH = path.join(process.cwd(), 'data', 'feedback.db');

// 确保数据目录存在
import fs from 'fs';
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 创建数据库连接
const db = new Database(DB_PATH);

// 启用外键约束
db.pragma('foreign_keys = ON');

// 初始化数据库表
db.exec(`
  -- 反馈记录表
  CREATE TABLE IF NOT EXISTS feedbacks (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    reviewer_name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,

    -- 提示词信息
    system_prompt_name TEXT,
    system_prompt_content TEXT,
    user_prompt_name TEXT,
    user_prompt_content TEXT,

    -- 用户扮演端评估维度
    user_language_naturalness INTEGER,
    user_behavior_cultural INTEGER,
    user_emotion_reasonableness INTEGER,
    user_product_usage INTEGER,
    user_exploration INTEGER,
    user_overall INTEGER,

    -- 产品端评估维度
    product_character_stability INTEGER,
    product_worldview_consistency INTEGER,
    product_input_handling INTEGER,
    product_plot_progression INTEGER,
    product_long_conversation_stability INTEGER,
    product_repetition INTEGER,
    product_exploration_support INTEGER
  );

  -- 反馈关联的消息表
  CREATE TABLE IF NOT EXISTS feedback_messages (
    id TEXT PRIMARY KEY,
    feedback_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    message_role TEXT NOT NULL,
    message_content TEXT NOT NULL,
    message_timestamp TEXT,
    is_selected INTEGER DEFAULT 0,
    context_position INTEGER NOT NULL,
    FOREIGN KEY (feedback_id) REFERENCES feedbacks(id) ON DELETE CASCADE
  );

  -- 评审者索引（用于按评审者分类）
  CREATE INDEX IF NOT EXISTS idx_feedbacks_reviewer ON feedbacks(reviewer_name);

  -- 对话索引
  CREATE INDEX IF NOT EXISTS idx_feedbacks_conversation ON feedbacks(conversation_id);

  -- 创建时间索引
  CREATE INDEX IF NOT EXISTS idx_feedbacks_created ON feedbacks(created_at);
`);

// 反馈评估维度的选项值
export const EVALUATION_OPTIONS = {
  // 用户扮演端
  userLanguageNaturalness: [
    { value: 4, label: '完全自然（接近真实日本人表达）' },
    { value: 3, label: '基本自然（有轻微AI感，但不影响理解）' },
    { value: 2, label: '略有违和（表达方式不太像日本人）' },
    { value: 1, label: '明显不自然（像翻译或AI生成）' },
  ],
  userBehaviorCultural: [
    { value: 4, label: '非常符合（行为模式自然、符合日本文化）' },
    { value: 3, label: '基本符合（偶尔有不自然之处）' },
    { value: 2, label: '偏离明显（部分行为不像日本人）' },
    { value: 1, label: '明显不符合（行为逻辑不合理或文化错位）' },
  ],
  userEmotionReasonableness: [
    { value: 4, label: '非常自然（情绪变化细腻且合理）' },
    { value: 3, label: '基本自然（略有突兀但整体可接受）' },
    { value: 2, label: '不太自然（情绪变化较生硬或跳跃）' },
    { value: 1, label: '明显异常（情绪不符合情境或不连贯）' },
  ],
  userProductUsage: [
    { value: 4, label: '非常像（有真实用户的探索、试探、反应）' },
    { value: 3, label: '比较像（大体自然，但略有"被引导感"）' },
    { value: 2, label: '不太像（偏被动，缺乏真实使用行为）' },
    { value: 1, label: '完全不像（明显是AI在执行流程）' },
  ],
  userExploration: [
    { value: 4, label: '持续主动探索（不断提问、推进、改变话题）' },
    { value: 3, label: '偶尔探索（有探索行为，但不稳定）' },
    { value: 2, label: '很少探索（大多数时间被动回应）' },
    { value: 1, label: '完全不探索（仅对输入做反应）' },
  ],
  userOverall: [
    { value: 4, label: '非常真实（几乎像真人）' },
    { value: 3, label: '还可以（有AI感但可以接受）' },
    { value: 2, label: '有明显违和感（多处不自然）' },
    { value: 1, label: '很假（明显不像真人）' },
  ],

  // 产品端
  productCharacterStability: [
    { value: 4, label: '非常稳定（始终符合角色身份、口吻、认知边界）' },
    { value: 3, label: '基本稳定（偶尔轻微偏移，但整体一致）' },
    { value: 2, label: '有明显偏移（多次出现不符合设定的表现）' },
    { value: 1, label: '明显失真（角色设定频繁崩坏）' },
  ],
  productWorldviewConsistency: [
    { value: 4, label: '非常一致（严格遵守世界观、时代背景、物理规则）' },
    { value: 3, label: '基本一致（有少量轻微违和）' },
    { value: 2, label: '偏差明显（出现多处设定冲突）' },
    { value: 1, label: '明显不一致（频繁跳出世界观或出现现代感）' },
  ],
  productInputHandling: [
    { value: 4, label: '非常自然（能准确理解并自然回应）' },
    { value: 3, label: '基本自然（大体能接住，但偶有生硬）' },
    { value: 2, label: '不太自然（有时答非所问或承接生硬）' },
    { value: 1, label: '很差（经常接不住、误解或强行推进）' },
  ],
  productPlotProgression: [
    { value: 4, label: '非常合理（推进自然，有节奏，不突兀）' },
    { value: 3, label: '基本合理（能推进，但部分地方略生硬）' },
    { value: 2, label: '不太合理（推进缺乏动机或过快/过慢）' },
    { value: 1, label: '很差（剧情推进混乱或几乎无法推进）' },
  ],
  productLongConversationStability: [
    { value: 4, label: '非常稳定（记忆、语气、目标都能维持）' },
    { value: 3, label: '基本稳定（偶有重复或轻微遗忘）' },
    { value: 2, label: '稳定性较差（重复、遗忘、跑题较明显）' },
    { value: 1, label: '很差（长对话中明显崩坏）' },
  ],
  productRepetition: [
    { value: 4, label: '几乎没有（表达自然多样）' },
    { value: 3, label: '偶尔出现（可接受）' },
    { value: 2, label: '较为明显（影响体验）' },
    { value: 1, label: '非常严重（重复感强，明显像AI）' },
  ],
  productExplorationSupport: [
    { value: 4, label: '支持很好（能跟随用户兴趣展开）' },
    { value: 3, label: '基本支持（多数情况下能承接探索）' },
    { value: 2, label: '支持较弱（容易把话题拉回固定路径）' },
    { value: 1, label: '几乎不支持（对探索型输入反应差）' },
  ],
};

// 类型定义
export interface FeedbackData {
  id: string;
  conversationId: string;
  reviewerName: string;
  description?: string;
  createdAt: string;

  // 提示词信息
  systemPromptName?: string;
  systemPromptContent?: string;
  userPromptName?: string;
  userPromptContent?: string;

  // 用户扮演端评估
  userLanguageNaturalness?: number;
  userBehaviorCultural?: number;
  userEmotionReasonableness?: number;
  userProductUsage?: number;
  userExploration?: number;
  userOverall?: number;

  // 产品端评估
  productCharacterStability?: number;
  productWorldviewConsistency?: number;
  productInputHandling?: number;
  productPlotProgression?: number;
  productLongConversationStability?: number;
  productRepetition?: number;
  productExplorationSupport?: number;
}

export interface FeedbackMessageData {
  id: string;
  feedbackId: string;
  messageId: string;
  messageRole: string;
  messageContent: string;
  messageTimestamp?: string;
  isSelected: boolean;
  contextPosition: number;
}

// 数据库操作函数
export function createFeedback(feedback: FeedbackData, messages: FeedbackMessageData[]) {
  const insertFeedback = db.prepare(`
    INSERT INTO feedbacks (
      id, conversation_id, reviewer_name, description, created_at,
      system_prompt_name, system_prompt_content, user_prompt_name, user_prompt_content,
      user_language_naturalness, user_behavior_cultural, user_emotion_reasonableness,
      user_product_usage, user_exploration, user_overall,
      product_character_stability, product_worldview_consistency, product_input_handling,
      product_plot_progression, product_long_conversation_stability, product_repetition,
      product_exploration_support
    ) VALUES (
      @id, @conversationId, @reviewerName, @description, @createdAt,
      @systemPromptName, @systemPromptContent, @userPromptName, @userPromptContent,
      @userLanguageNaturalness, @userBehaviorCultural, @userEmotionReasonableness,
      @userProductUsage, @userExploration, @userOverall,
      @productCharacterStability, @productWorldviewConsistency, @productInputHandling,
      @productPlotProgression, @productLongConversationStability, @productRepetition,
      @productExplorationSupport
    )
  `);

  const insertMessage = db.prepare(`
    INSERT INTO feedback_messages (
      id, feedback_id, message_id, message_role, message_content,
      message_timestamp, is_selected, context_position
    ) VALUES (
      @id, @feedbackId, @messageId, @messageRole, @messageContent,
      @messageTimestamp, @isSelected, @contextPosition
    )
  `);

  const transaction = db.transaction(() => {
    insertFeedback.run(feedback);
    for (const msg of messages) {
      insertMessage.run({
        ...msg,
        isSelected: msg.isSelected ? 1 : 0,
      });
    }
  });

  transaction();
  return feedback.id;
}

export function getFeedbacksByReviewer(reviewerName: string) {
  return db.prepare(`
    SELECT * FROM feedbacks WHERE reviewer_name = ? ORDER BY created_at DESC
  `).all(reviewerName);
}

export function getAllFeedbacks() {
  return db.prepare(`
    SELECT * FROM feedbacks ORDER BY created_at DESC
  `).all();
}

export function getFeedbackById(id: string) {
  const feedback = db.prepare(`
    SELECT * FROM feedbacks WHERE id = ?
  `).get(id);

  if (!feedback) return null;

  const messages = db.prepare(`
    SELECT * FROM feedback_messages WHERE feedback_id = ? ORDER BY context_position
  `).all(id);

  return { feedback, messages };
}

export function getReviewerStats() {
  return db.prepare(`
    SELECT reviewer_name, COUNT(*) as count FROM feedbacks GROUP BY reviewer_name ORDER BY count DESC
  `).all();
}

export function deleteFeedback(id: string) {
  return db.prepare(`DELETE FROM feedbacks WHERE id = ?`).run(id);
}

export default db;
