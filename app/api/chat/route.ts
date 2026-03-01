import OpenAI from 'openai';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages, modelId } = await req.json();

    // 读取模型配置
    const modelsConfig = process.env.MODELS_CONFIG;
    if (!modelsConfig) {
      return new Response(
        JSON.stringify({ error: '未配置模型，请在 .env.local 文件中设置 MODELS_CONFIG' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const models = JSON.parse(modelsConfig);
    const selectedModelConfig = models.find((m: any) => m.id === modelId) || models[0];

    if (!selectedModelConfig) {
      return new Response(
        JSON.stringify({ error: '未找到指定的模型配置' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 验证 API Key
    if (!selectedModelConfig.apiKey) {
      return new Response(
        JSON.stringify({ error: `模型 ${selectedModelConfig.name} 未配置 API Key` }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 创建 OpenAI 客户端
    const openai = new OpenAI({
      apiKey: selectedModelConfig.apiKey,
      baseURL: selectedModelConfig.baseURL,
    });

    // 创建流式响应
    const stream = await openai.chat.completions.create({
      model: selectedModelConfig.model,
      messages: messages,
      stream: true,
      temperature: 0.7,
    });

    // 创建 ReadableStream
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              const data = `data: ${JSON.stringify({ content })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
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
