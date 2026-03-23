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
        JSON.stringify({ error: '未配置 GEMINI_API_KEY' }),
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
    const parsed = parseAnalysisResponse(response);

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
    console.error('[后台处理] 错误:', error);
    return new Response(
      JSON.stringify({
        error: error?.message || '后台处理失败',
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
    .map(m => `${m.role === 'user' ? '用户' : 'AI'}：${m.content}`)
    .join('\n\n');

  // 当前状态
  const statesContext = numericStates && numericStates.length > 0
    ? `\n<numeric_states>\n${numericStates.map(s =>
      `  <state id="${s.id}" name="${s.name}" value="${s.value}" min="${s.min}" max="${s.max}" description="${s.description || ''}" />`
    ).join('\n')}\n</numeric_states>\n`
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
    ? `\n【之前的对话总结】\n${previousSummary}\n`
    : '';

  return `你是一个专业的对话分析师。请深度分析以下对话，提取关键信息并输出结构化数据。

${summaryContext}

## 当前状态
${statesContext}

## 历史重要事件
${eventsContext}

## 对话历史（最近 20 条）

${conversationHistory}

AI 最新回复：${recentResponse}

---

## 分析任务

请分析本轮对话，输出以下内容：

1. **状态更新**：根据对话内容，判断各个状态是否需要调整（-10 到 +10）
2. **事件提取**：如果对话中有重要事件，提取并标注重要性（1-10）
3. **记忆总结**：更新或扩展之前的总结，整合新的对话内容（200-300字）

## 输出格式

请严格按照以下 XML 格式输出：

<analysis>
  <state_updates>
    <update id="affection" delta="+3" reason="用户分享了私密话题，增加亲密感" />
    <update id="trust" delta="+2" reason="建立了更深层次的沟通" />
  </state_updates>

  <event>
    <importance>8</importance>
    <description>用户首次透露了家庭背景和童年经历</description>
  </event>

  <summary>
    【请在这里输出累积式总结，整合之前的总结和新的对话内容】
  </summary>
</analysis>

注意事项：
- 如果没有需要更新的状态，<state_updates> 可以为空
- 如果没有重要事件（重要性 < 6），可以省略 <event> 标签
- 总结要保持客观、第三人称、时间顺序

请开始分析：`;
}

/**
 * 解析 XML 格式的分析结果
 */
function parseAnalysisResponse(response: string): {
  stateUpdates?: Array<{ id: string; delta: number; reason?: string }>;
  event?: { importance: number; description: string };
  summary?: string;
} {
  const result: any = {};

  try {
    // 提取状态更新（使用 [\s\S] 代替 . 和 s 标志，兼容性更好）
    const stateUpdatesMatch = response.match(/<state_updates>([\s\S]*?)<\/state_updates>/);
    if (stateUpdatesMatch) {
      const updates = [];
      const updateRegex = /<update id="([^"]+)" delta="([^"]+)"(?: reason="([^"]+)")? \/>/g;
      let match;
      while ((match = updateRegex.exec(stateUpdatesMatch[1])) !== null) {
        updates.push({
          id: match[1],
          delta: parseFloat(match[2]),
          reason: match[3] || undefined
        });
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
