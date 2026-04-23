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
        JSON.stringify({ error: 'GEMINI_API_KEYが設定されていません' }),
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
          let textBuffer = '';  // 新增：跨chunk缓冲区，用于检测分隔符

          for await (const chunk of result.stream) {
            const text = chunk.text();
            fullResponse += text;

            if (inEmotionSection) {
              // 已经进入情感区域，累积到 emotionBuffer，不输出
              emotionBuffer += text;
            } else {
              // 将新文本添加到缓冲区
              textBuffer += text;

              // 在缓冲区中检测分隔符
              const delimiter = '###EMOTION###';
              const delimiterIndex = textBuffer.indexOf(delimiter);

              if (delimiterIndex !== -1) {
                // 找到分隔符
                console.log('[情感分隔符] 检测到 ###EMOTION### 在位置:', delimiterIndex);
                inEmotionSection = true;

                // 分隔符之前的内容是正常文本
                const contentBeforeDelimiter = textBuffer.substring(0, delimiterIndex);
                if (contentBeforeDelimiter) {
                  fullTextContent += contentBeforeDelimiter;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: contentBeforeDelimiter })}\n\n`));
                }

                // 分隔符之后的内容是情感数据（修复：使用 delimiter.length 而不是硬编码）
                const contentAfterDelimiter = textBuffer.substring(delimiterIndex + delimiter.length);
                emotionBuffer = contentAfterDelimiter;
                console.log('[情感数据] 初始 buffer 长度:', emotionBuffer.length);

                // 清空文本缓冲区
                textBuffer = '';
              } else {
                // 未找到分隔符，检查是否可能跨chunk
                // 保留最后14个字符（以防分隔符被切分），输出其余部分
                if (textBuffer.length > 14) {
                  const safeOutput = textBuffer.substring(0, textBuffer.length - 14);
                  fullTextContent += safeOutput;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: safeOutput })}\n\n`));
                  textBuffer = textBuffer.substring(textBuffer.length - 14);
                }
              }
            }
          }

          // 流结束后的处理
          console.log('[流结束] inEmotionSection:', inEmotionSection, 'emotionBuffer 长度:', emotionBuffer.length);

          // 输出剩余的文本缓冲区（如果没有进入情感区域）
          if (!inEmotionSection && textBuffer) {
            fullTextContent += textBuffer;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: textBuffer })}\n\n`));
          }

          // 解析情感状态
          let emotionalState = null;
          if (emotionBuffer.trim()) {
            try {
              // 清理 emotion buffer：移除可能的额外文本和空白
              let cleanedBuffer = emotionBuffer.trim();

              // 尝试提取 JSON 对象（处理可能的前后多余文本）
              const jsonMatch = cleanedBuffer.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                cleanedBuffer = jsonMatch[0];
              } else {
                console.warn('[情感识别] 未找到有效的 JSON 对象，Buffer 长度:', emotionBuffer.length);
                throw new Error('未找到有效的 JSON 对象');
              }

              // 简单验证 JSON 完整性（花括号匹配）
              const openBraces = (cleanedBuffer.match(/\{/g) || []).length;
              const closeBraces = (cleanedBuffer.match(/\}/g) || []).length;
              if (openBraces !== closeBraces) {
                console.warn('[情感识别] JSON 花括号不匹配:', { openBraces, closeBraces });
                throw new Error('JSON 格式不完整');
              }

              // 尝试解析 JSON
              emotionalState = JSON.parse(cleanedBuffer);
              console.log('[情感识别] 成功:', emotionalState.emotion);
            } catch (e: any) {
              console.error('[情感识别] 失败:', e.message);
              // 不抛出错误到外层，确保文本内容能正常输出
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
        error: error?.message || 'APIの呼び出し中にエラーが発生しました'
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
    .map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}：${m.content}`)
    .join('\n\n');

  // 构建状态上下文（对默认状态显示等级和行为描述）
  const statesContext = numericStates && numericStates.length > 0
    ? `\n## 現在の状態\n\nあなたとユーザーの関係性を示す以下の状態を参考にして、返信の口調や態度を**厳格に**調整してください：\n\n${numericStates.map(s => {
        // 为默认状态提供等级描述
        if (s.id === 'default-affection') {
          const level = getAffectionLevel(s.value);
          return `- ${s.name}: ${s.value}/${s.max}【${level.label}】\n  → ${level.description}`;
        }
        if (s.id === 'default-trust') {
          const level = getTrustLevel(s.value);
          return `- ${s.name}: ${s.value}/${s.max}【${level.label}】\n  → ${level.description}`;
        }
        // 普通状态
        return `- ${s.name}: ${s.value}/${s.max}${s.description ? ` (${s.description})` : ''}`;
      }).join('\n')}\n\n**重要**：状態に基づいた態度の調整は必須です。例えば「讨厌」なら冷たく、「喜欢」なら親しみを込めて返信してください。\n`
    : '';

  const basePrompt = systemPrompt || 'あなたは親しみやすいAIアシスタントです。';

  return `${basePrompt}

## 【重要】ロールプレイの基本ルール

あなたは「キャラクター」として、ユーザーと**自然な会話**をしてください。以下のルールを厳守すること：

1. **一人称視点で話す** - 「私は〜」「僕は〜」など、キャラクターとして話す。決して三人称の物語のように「彼女は〜と言った」のような書き方をしない
2. **口語表現を使う** - 書き言葉ではなく、話し言葉で自然に返信する（「〜だよ」「〜ね」「〜なの」など）
3. **簡潔に話す** - 人間の会話のように、1〜3文程度の短い返信を心がける。長々と説明しない
4. **地の文を書かない** - 「〜と微笑んだ」「〜と言いながら」のような描写は不要。セリフだけで表現する
5. **自然なリアクション** - 質問されたら答える、話題を振られたら反応する、人間らしく会話する
${statesContext}
## 出力形式

以下の形式で**必ず**出力してください：
1. まず返信テキストを出力（簡潔に、1〜3文程度）
2. 次に区切り文字 ###EMOTION### を出力
3. 最後に感情状態のJSONを出力

【良い例】
うん、今日は天気いいね！散歩でもする？
###EMOTION###
{"emotion":"happy","intensity":0.6,"intent":"agree","valence":0.7,"arousal":0.5}

【悪い例 - 長すぎる、物語調】
今日は本当に良い天気ですね。青空が広がって、とても気持ちが良いです。こんな日は外に出て散歩したくなりますよね。一緒に公園に行きませんか？きっと楽しいと思いますよ。

感情パラメータの説明：
- emotion: 感情カテゴリ（必須）- happy, sad, angry, surprised, fear, disgust, neutral, excited, anxious, thoughtful, loving, playful, curious, embarrassed, confident
- intensity: 強度(0.0-1.0、必須)
- intent: インタラクション意図（任意）- agree, think, refuse, greet, listen, question, suggest
- subtext: 感情の詳細（任意）- shy, confident, hesitant, playful, teasing, caring
- valence: 感情価(-1.0から1.0、任意)
- arousal: 覚醒度(0.0-1.0、任意)

## 会話履歴

${conversationHistory}

最後のユーザーメッセージに、キャラクターとして自然に返信してください：`;
}
