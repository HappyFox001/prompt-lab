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
    .map((m) => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`)
    .join('\n');

  return `你是一个对话助手，根据以下信息生成用户的下一句话：

【用户角色设定】
${params.userPrompt}

【最近的对话历史】
${conversationHistory}

【AI 最新回复】
${params.lastAIResponse}

${
  params.rejectionReason
    ? `
【上次建议被拒绝的原因】
${params.rejectionReason}

请根据拒绝原因改进建议。
`
    : ''
}

要求：
1. 严格遵循【用户角色设定】中的性格和行为模式
2. 与对话上下文自然连贯
3. 使用符合角色的适当语气和措辞
4. 简洁（2-3句话以内）
5. 不要有任何前缀或说明。只输出用户应该说的内容。

请直接输出用户应该说的话：`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userPrompt, messages, lastAIResponse, rejectionReason } = body;

    // 入力验证
    if (!userPrompt || !messages || !lastAIResponse) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
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

    // 调用 Gemini Pro 生成建议
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const suggestion = response.text();

    if (!suggestion || suggestion.trim().length === 0) {
      return NextResponse.json(
        { error: '建议生成失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      suggestion: suggestion.trim(),
    });
  } catch (error) {
    console.error('建议生成错误:', error);
    return NextResponse.json(
      {
        error: '生成建议时发生错误',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
