import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const modelsConfig = process.env.MODELS_CONFIG;
    const defaultModelId = process.env.DEFAULT_MODEL_ID;

    if (!modelsConfig) {
      return NextResponse.json({ error: '未配置模型' }, { status: 500 });
    }

    const models = JSON.parse(modelsConfig);

    // 返回模型列表（不包含 API Key）
    const publicModels = models.map((model: any) => ({
      id: model.id,
      name: model.name,
      model: model.model,
    }));

    return NextResponse.json({
      models: publicModels,
      defaultModelId: defaultModelId || models[0]?.id,
    });
  } catch (error) {
    console.error('Error loading models:', error);
    return NextResponse.json({ error: '加载模型配置失败' }, { status: 500 });
  }
}
