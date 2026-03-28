import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Message } from '@/lib/types';

// 初始化 Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// 构建用户建议提示词
function buildUserSuggestionPrompt(params: {
  userPrompt: string;
  messages: Message[];
  lastAIResponse: string;
  rejectionReason?: string;
}): string {
  const conversationHistory = params.messages
    .slice(-15) // 只取最近15条
    .map((m) => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.content}`)
    .join('\n');

  return `あなたは対話アシスタントとして、製品ユーザーテスト時の発言内容を生成するのを手伝います。

【ユーザー役割設定】
${params.userPrompt}

【最近の対話履歴】
${conversationHistory}

【AI/システムの最新返信】
${params.lastAIResponse}

${
  params.rejectionReason
    ? `
【前回の提案が却下された理由】
${params.rejectionReason}

却下理由に基づいて提案を改善してください。
`
    : ''
}

コア要件：
1. **言語**：必ず日本語で出力すること（これが最も重要な要件です）
2. **役割**：【ユーザー役割設定】に記載された製品ユーザーを厳密に演じる
3. **リアリティ**：実際のユーザーが製品を使用する際の自然な反応と語気を模倣する
4. **一貫性**：対話履歴に基づいて、文脈に沿った返答をする
5. **製品志向**：製品機能、ユーザー体験、潜在的な問題に焦点を当てる
6. **簡潔性**：2〜3文以内に収める
7. **純粋な出力**：前置きや説明、メタ記述を一切含めない

ユーザーが言うべき内容を日本語で直接出力してください：`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userPrompt, messages, lastAIResponse, rejectionReason } = body;

    console.log('[suggest-user-input] 收到请求:', {
      hasUserPrompt: !!userPrompt,
      messagesCount: messages?.length || 0,
      lastAIResponse: lastAIResponse?.substring(0, 50),
      hasRejectionReason: !!rejectionReason,
    });

    // 入力验证
    if (!userPrompt) {
      console.error('[suggest-user-input] 缺少 userPrompt');
      return NextResponse.json(
        { error: '缺少用户提示词' },
        { status: 400 }
      );
    }

    if (!messages) {
      console.error('[suggest-user-input] 缺少 messages');
      return NextResponse.json(
        { error: '缺少对话历史' },
        { status: 400 }
      );
    }

    if (!lastAIResponse) {
      console.error('[suggest-user-input] 缺少 lastAIResponse');
      return NextResponse.json(
        { error: '缺少 AI 回复' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('[suggest-user-input] 未设置 GEMINI_API_KEY');
      return NextResponse.json(
        { error: '未设置 GEMINI_API_KEY' },
        { status: 500 }
      );
    }

    // 构建提示词
    const prompt = buildUserSuggestionPrompt({
      userPrompt,
      messages,
      lastAIResponse,
      rejectionReason,
    });

    console.log('[suggest-user-input] 构建的提示词长度:', prompt.length);

    // 调用 Gemini Pro 生成建议（使用 Pro 模型以获得更好的角色扮演效果）
    try {
      const modelName = process.env.GEMINI_PRO_MODEL || 'gemini-3.1-pro-preview';
      console.log('[suggest-user-input] 使用模型:', modelName);

      const model = genAI.getGenerativeModel({ model: modelName });

      // 添加超时控制（30秒）
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('API 调用超时（30秒）')), 30000);
      });

      const generatePromise = model.generateContent(prompt);

      console.log('[suggest-user-input] 开始调用 Gemini API...');
      const result = await Promise.race([generatePromise, timeoutPromise]);

      console.log('[suggest-user-input] API 调用成功，解析响应...');
      const response = await result.response;

      // 检查响应是否有效
      if (!response) {
        console.error('[suggest-user-input] 响应对象为空');
        return NextResponse.json(
          { error: 'API 返回了空响应' },
          { status: 500 }
        );
      }

      const suggestion = response.text();
      console.log('[suggest-user-input] 生成的建议:', suggestion?.substring(0, 100));

      if (!suggestion || suggestion.trim().length === 0) {
        console.error('[suggest-user-input] 生成的建议为空');
        return NextResponse.json(
          { error: '建议生成失败：返回内容为空' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        suggestion: suggestion.trim(),
      });
    } catch (apiError: any) {
      console.error('[suggest-user-input] Gemini API 调用错误:', {
        message: apiError?.message,
        name: apiError?.name,
        stack: apiError?.stack?.substring(0, 500),
      });

      return NextResponse.json(
        {
          error: 'Gemini API 调用失败',
          details: apiError instanceof Error ? apiError.message : String(apiError),
          type: apiError?.name || 'Unknown',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[suggest-user-input] 未预期的错误:', error);
    return NextResponse.json(
      {
        error: '生成建议时发生错误',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
