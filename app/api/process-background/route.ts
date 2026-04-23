import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';

/**
 * 第二层：深度后台处理 API（Gemini Pro 3）
 *
 * 负责：
 * - 记忆总结
 * - 状态更新分析
 * - 事件提取
 * - 用户画像更新
 *
 * 特点：
 * - 异步调用，不阻塞对话
 * - 可以在对话后延迟触发（如 2-5 秒后）
 * - 使用更强大的 Pro 模型，深度理解
 */

interface NumericState {
  id: string;
  name: string;
  value: number;
  min: number;
  max: number;
  description?: string;
  isDefault?: boolean;
  enabled?: boolean;
}

// 好感度等级
function getAffectionLevel(value: number): { label: string; description: string } {
  if (value <= -80) return { label: '仇恨', description: '不仅不想和你说话，还想弄死你' };
  if (value <= -50) return { label: '憎恶', description: '打死不想和你说话，看见当做没看见' };
  if (value <= -20) return { label: '讨厌', description: '不想和你说话，但是你真要搭话，也会对你爱答不理' };
  if (value <= 20) return { label: '普通', description: '正常交流' };
  if (value <= 50) return { label: '友善', description: '想和你说话，愿意分享一些自己非私人的见闻' };
  if (value <= 80) return { label: '喜欢', description: '想和你说话，愿意分享一些自己私人的想法' };
  return { label: '爱', description: '无话不说' };
}

// 信赖度等级
function getTrustLevel(value: number): { label: string; description: string } {
  if (value <= -80) return { label: '猜忌', description: '你只要开口就是在骗我，除非亲眼所见否则绝对不信' };
  if (value <= -50) return { label: '警惕', description: '只要内容不可被客观情况验证，那你说的就不对' };
  if (value <= -20) return { label: '怀疑', description: '如果无法立即验证，会保持怀疑态度，需要更多证据' };
  if (value <= 20) return { label: '中立', description: '保持理性判断，不会盲目相信也不会轻易否定' };
  if (value <= 50) return { label: '信任', description: '愿意相信你说的大部分内容，偶尔会验证' };
  if (value <= 80) return { label: '信赖', description: '深度信任，几乎不会怀疑你说的话' };
  return { label: '盲信', description: '无条件相信你说的一切' };
}

interface MemoryEvent {
  timestamp: string;
  importance: number;
  content: string;
}

interface BackgroundProcessRequest {
  conversationId: string;
  messages: Array<{ role: string; content: string }>;
  recentResponse: string;
  numericStates?: NumericState[];
  memoryEvents?: MemoryEvent[];
  previousSummary?: string;
}

export async function POST(req: NextRequest) {
  try {
    const {
      conversationId,
      messages,
      recentResponse,
      numericStates,
      memoryEvents,
      previousSummary
    } = await req.json() as BackgroundProcessRequest;

    // 获取 Gemini API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEYが設定されていません' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const proModel = genAI.getGenerativeModel({
      model: process.env.GEMINI_PRO_MODEL || 'gemini-3.1-pro-preview',
      generationConfig: {
        temperature: 0.3, // 较低温度，保证稳定性
      }
    });

    // 构建深度分析提示词
    const prompt = buildDeepAnalysisPrompt({
      messages,
      recentResponse,
      numericStates,
      memoryEvents,
      previousSummary
    });

    console.log(`[后台处理] 开始分析对话 ${conversationId}`);

    const result = await proModel.generateContent(prompt);
    const response = result.response.text();

    // 解析 XML 响应
    const parsed = parseAnalysisResponse(response, numericStates);

    console.log(`[后台处理] 完成分析，提取了 ${parsed.stateUpdates?.length || 0} 个状态更新`);

    return new Response(
      JSON.stringify({
        success: true,
        conversationId,
        analysis: parsed,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[バックグラウンド処理] エラー:', error);
    return new Response(
      JSON.stringify({
        error: error?.message || 'バックグラウンド処理に失敗しました',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * 构建深度分析提示词
 */
function buildDeepAnalysisPrompt(params: {
  messages: Array<{ role: string; content: string }>;
  recentResponse: string;
  numericStates?: NumericState[];
  memoryEvents?: MemoryEvent[];
  previousSummary?: string;
}): string {
  const { messages, recentResponse, numericStates, memoryEvents, previousSummary } = params;

  // 对话历史（最近 20 条）
  const conversationHistory = messages
    .slice(-20)
    .map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}：${m.content}`)
    .join('\n\n');

  // 当前状态（对默认状态显示等级）
  const statesContext = numericStates && numericStates.length > 0
    ? `\n<numeric_states>\n${numericStates.map(s => {
      let levelInfo = '';
      if (s.id === 'default-affection') {
        const level = getAffectionLevel(s.value);
        levelInfo = ` level="${level.label}" level_description="${level.description}"`;
      } else if (s.id === 'default-trust') {
        const level = getTrustLevel(s.value);
        levelInfo = ` level="${level.label}" level_description="${level.description}"`;
      }
      return `  <state id="${s.id}" name="${s.name}" value="${s.value}" min="${s.min}" max="${s.max}"${levelInfo} description="${s.description || ''}" />`;
    }).join('\n')}\n</numeric_states>\n`
    : '';

  // 历史事件（最重要的 10 个）
  const eventsContext = memoryEvents && memoryEvents.length > 0
    ? `\n<memory_events>\n${memoryEvents
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 10)
      .map(e => `  <event timestamp="${e.timestamp}" importance="${e.importance}">${e.content}</event>`)
      .join('\n')}\n</memory_events>\n`
    : '';

  // 之前的总结
  const summaryContext = previousSummary
    ? `\n【前回の会話サマリー】\n${previousSummary}\n`
    : '';

  // 动态构建分析任务说明
  const tasks = [];
  const outputSections = [];

  // 只有在有声明状态时才要求分析状态更新
  if (numericStates && numericStates.length > 0) {
    tasks.push('1. **状態更新**：会話の内容に基づいて、各状態の調整が必要か判断（-10から+10）');

    // 动态生成状态更新示例（取前2个状态作为示例）
    const exampleUpdates = numericStates.slice(0, 2).map((state, index) => {
      const exampleDeltas = ['+3', '+2', '-1', '+5'];
      const exampleReasons = [
        `${state.name}が向上しました`,
        `会話により${state.name}が深まりました`,
        `${state.name}が若干変化しました`,
        `ユーザーの行動が${state.name}に影響しました`
      ];
      return `    <update id="${state.id}" delta="${exampleDeltas[index % exampleDeltas.length]}" reason="${exampleReasons[index % exampleReasons.length]}" />`;
    }).join('\n');

    outputSections.push(`  <state_updates>
${exampleUpdates}
  </state_updates>`);
  }

  // 只有在启用事件记忆时才要求提取事件
  if (memoryEvents !== undefined) {
    tasks.push(`${tasks.length + 1}. **イベント抽出**：会話に重要なイベントがあれば、抽出して重要度をマーク（1-10）`);
    outputSections.push(`  <event>
    <importance>8</importance>
    <description>ユーザーが初めて家族の背景や幼少期の経験を明かしました</description>
  </event>`);
  }

  // 总是要求生成记忆总结
  tasks.push(`${tasks.length + 1}. **記憶サマリー**：以前のサマリーを更新または拡張し、新しい会話内容を統合（200-300文字）`);
  outputSections.push(`  <summary>
    【ここに累積的なサマリーを出力し、以前のサマリーと新しい会話内容を統合してください】
  </summary>`);

  return `あなたはプロフェッショナルな会話アナリストです。以下の会話を深く分析し、重要な情報を抽出して構造化されたデータを出力してください。

${summaryContext}

${statesContext ? `## 現在の状態\n${statesContext}` : ''}

${eventsContext ? `## 過去の重要なイベント\n${eventsContext}` : ''}

## 会話履歴（最新20件）

${conversationHistory}

AIの最新返信：${recentResponse}

---

## 分析タスク

今回の会話を分析し、以下の内容を出力してください：

${tasks.join('\n')}

## 出力形式

以下のXML形式で厳密に出力してください：

<analysis>
${outputSections.join('\n\n')}
</analysis>

注意事項：
${numericStates && numericStates.length > 0 ? '- 宣言済みの状態IDのみを更新し、新しい状態を作成しないでください\n- 更新が必要な状態がない場合、<state_updates>は空でも構いません\n' : ''}${memoryEvents !== undefined ? '- 重要なイベントがない場合（重要度 < 6）、<event>タグは省略できます\n' : ''}- サマリーは客観的、三人称、時系列を保ってください

分析を開始してください：`;
}

/**
 * 解析 XML 格式的分析结果
 * @param response LLM 返回的 XML 响应
 * @param declaredStates 前端声明的状态列表（用于过滤）
 */
function parseAnalysisResponse(
  response: string,
  declaredStates?: NumericState[]
): {
  stateUpdates?: Array<{ id: string; delta: number; reason?: string }>;
  event?: { importance: number; description: string };
  summary?: string;
} {
  const result: {
    stateUpdates?: Array<{ id: string; delta: number; reason?: string }>;
    event?: { importance: number; description: string };
    summary?: string;
  } = {};

  try {
    // 提取状态更新（使用 [\s\S] 代替 . 和 s 标志，兼容性更好）
    const stateUpdatesMatch = response.match(/<state_updates>([\s\S]*?)<\/state_updates>/);
    if (stateUpdatesMatch) {
      const updates = [];
      const updateRegex = /<update id="([^"]+)" delta="([^"]+)"(?: reason="([^"]+)")? \/>/g;
      let match;
      while ((match = updateRegex.exec(stateUpdatesMatch[1])) !== null) {
        const stateId = match[1];

        // 只保留在声明状态列表中的更新
        if (!declaredStates || declaredStates.length === 0 || declaredStates.some(s => s.id === stateId)) {
          updates.push({
            id: stateId,
            delta: parseFloat(match[2]),
            reason: match[3] || undefined
          });
        } else {
          console.log(`[状态过滤] 忽略未声明的状态: ${stateId}`);
        }
      }
      if (updates.length > 0) {
        result.stateUpdates = updates;
      }
    }

    // 提取事件
    const eventMatch = response.match(/<event>\s*<importance>(\d+)<\/importance>\s*<description>([\s\S]*?)<\/description>\s*<\/event>/);
    if (eventMatch) {
      result.event = {
        importance: parseInt(eventMatch[1]),
        description: eventMatch[2].trim()
      };
    }

    // 提取总结
    const summaryMatch = response.match(/<summary>([\s\S]*?)<\/summary>/);
    if (summaryMatch) {
      result.summary = summaryMatch[1].trim();
    }

  } catch (error) {
    console.error('解析 XML 失败:', error);
  }

  return result;
}
