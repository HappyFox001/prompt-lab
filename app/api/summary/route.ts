import OpenAI from 'openai';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages, modelId, previousSummary } = await req.json();

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: '消息列表不能为空' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 读取模型配置
    const modelsConfig = process.env.MODELS_CONFIG;
    if (!modelsConfig) {
      return new Response(
        JSON.stringify({ error: '未配置模型' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const models = JSON.parse(modelsConfig);
    const selectedModelConfig = models.find((m: any) => m.id === modelId) || models[0];

    if (!selectedModelConfig?.apiKey) {
      return new Response(
        JSON.stringify({ error: '模型配置无效' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 创建 OpenAI 客户端
    const openai = new OpenAI({
      apiKey: selectedModelConfig.apiKey,
      baseURL: selectedModelConfig.baseURL,
    });

    // 构建摘要提示词（累积式）
    const summaryPrompt = previousSummary
      ? `请更新并扩展之前的对话摘要，整合新的对话内容。要求：
1. 保留之前摘要中的重要信息
2. 整合新对话的关键内容
3. 使用200-300字的篇幅
4. 采用第三人称客观描述
5. 按时间顺序组织内容

【之前的摘要】
${previousSummary}

【新的对话内容】
${messages.map((m: any) => `${m.role === 'user' ? '用户' : 'AI'}：${m.content}`).join('\n\n')}`
      : `请用简洁的语言总结以下对话的核心内容和关键信息。要求：
1. 保留重要的事实、决定和结论
2. 使用100-200字的篇幅
3. 采用第三人称客观描述
4. 重点突出对话中的关键信息

对话内容：
${messages.map((m: any) => `${m.role === 'user' ? '用户' : 'AI'}：${m.content}`).join('\n\n')}`;

    // 调用 LLM 生成摘要
    const response = await openai.chat.completions.create({
      model: selectedModelConfig.model,
      messages: [
        {
          role: 'user',
          content: summaryPrompt,
        },
      ],
      temperature: 0.3, // 使用较低的温度以获得更稳定的摘要
      max_tokens: 300,
    });

    const summary = response.choices[0]?.message?.content || '';

    return new Response(
      JSON.stringify({ summary }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Summary API Error:', error);
    return new Response(
      JSON.stringify({
        error: error?.message || '生成摘要时发生错误',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
