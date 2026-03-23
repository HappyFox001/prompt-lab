import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';

/**
 * 双层 LLM 架构
 *
 * 第一层（实时响应）：Gemini Flash 3
 * - 快速对话响应
 * - 输出结构化情感状态
 *
 * 第二层（深度处理）：Gemini Pro 3
 * - 异步后台运行
 * - 负责记忆总结、状态更新、事件提取
 */

interface NumericState {
  id: string;
  name: string;
  value: number;
  min: number;
  max: number;
  description?: string;
}

interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  conversationId: string;
  numericStates?: NumericState[];
  systemPrompt?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, conversationId, numericStates, systemPrompt } = await req.json() as ChatRequest;

    // 获取 Gemini API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: '未配置 GEMINI_API_KEY' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // ==================== 第一层：快速响应（Gemini Flash 3）====================
    const flashModel = genAI.getGenerativeModel({
      model: process.env.GEMINI_FLASH_MODEL || 'gemini-3-flash-preview'
    });

    // 构建第一层提示词（情感识别 + 对话响应）
    const layer1Prompt = buildLayer1Prompt(messages, numericStates, systemPrompt);

    // 流式响应
    const result = await flashModel.generateContentStream(layer1Prompt);

    // 创建 ReadableStream
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = '';
          let fullTextContent = '';  // 只包含文本，不包含分隔符和情感数据
          let emotionBuffer = '';
          let inEmotionSection = false;

          for await (const chunk of result.stream) {
            const text = chunk.text();
            fullResponse += text;

            // 检测情感数据分隔符
            if (text.includes('###EMOTION###')) {
              inEmotionSection = true;
              // 输出分隔符之前的文本
              const parts = text.split('###EMOTION###');
              if (parts[0]) {
                fullTextContent += parts[0];
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: parts[0] })}\n\n`));
              }
              if (parts[1]) {
                emotionBuffer = parts[1];
              }
              continue;
            }

            if (inEmotionSection) {
              // 在情感区域，累积到 emotionBuffer，不输出
              emotionBuffer += text;
            } else {
              // 正常文本流式输出
              fullTextContent += text;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`));
            }
          }

          // 解析情感状态
          let emotionalState = null;
          if (emotionBuffer.trim()) {
            try {
              emotionalState = JSON.parse(emotionBuffer.trim());
              console.log('[情感识别]', emotionalState);
            } catch (e) {
              console.error('解析情感状态失败:', e, 'Buffer:', emotionBuffer);
            }
          }

          // 发送最终的情感状态
          if (emotionalState) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ emotionalState })}\n\n`));
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();

          // ==================== 第二层：异步后台处理（不阻塞响应）====================
          // 注意：后台处理由前端延迟调用 /api/process-background 完成
          // 这里不再触发，避免重复处理

        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return new Response(
      JSON.stringify({
        error: error?.message || '调用 API 时发生错误'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * 构建第一层提示词（快速响应 + 情感识别）
 */
function buildLayer1Prompt(
  messages: Array<{ role: string; content: string }>,
  numericStates?: NumericState[],
  systemPrompt?: string
): string {
  const conversationHistory = messages
    .slice(-10) // 只保留最近 10 条消息
    .map(m => `${m.role === 'user' ? '用户' : 'AI'}：${m.content}`)
    .join('\n\n');

  // 构建状态上下文
  const statesContext = numericStates && numericStates.length > 0
    ? `\n## 当前状态\n\n以下是你和用户之间的关系状态，请在回复时参考这些状态，调整你的语气和态度：\n\n${numericStates.map(s =>
        `- ${s.name}: ${s.value}/${s.max}${s.description ? ` (${s.description})` : ''}`
      ).join('\n')}\n`
    : '';

  const basePrompt = systemPrompt || '你是一个友善的AI助手。';

  return `${basePrompt}请用中文回复用户，并在回复后输出情感状态。
${statesContext}
## 输出格式

请按以下格式输出：
1. 先输出回复文本
2. 然后输出分隔符 ###EMOTION###
3. 最后输出情感状态 JSON

示例：
你好！很高兴认识你～
###EMOTION###
{"emotion":"happy","intensity":0.7,"intent":"greet","valence":0.8,"arousal":0.6}

情感参数说明：
- emotion: 情绪类别，必须从以下选项中选择：happy, sad, angry, surprised, fear, disgust, neutral, excited, anxious, thoughtful, loving, playful, curious, embarrassed, confident
- intensity: 强度(0.0-1.0)
- intent: 交互意图（可选）- agree(同意), think(思考), refuse(拒绝), greet(打招呼), listen(倾听)
- subtext: 情绪细节（可选）- shy(害羞), confident(自信), hesitant(犹豫), playful(俏皮)
- valence: 效价(-1.0到1.0，可选)
- arousal: 唤醒度(0.0-1.0，可选)
- dominance: 支配度(0.0-1.0，可选)

## 对话历史

${conversationHistory}

请回复最后一条用户消息：`;
}
