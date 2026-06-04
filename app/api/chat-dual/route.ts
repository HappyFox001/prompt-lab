import path from 'node:path';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { NextRequest } from 'next/server';
import { buildProactiveSystemInstruction } from '@/lib/proactive-dialogue';
import type { ProactiveIntent } from '@/lib/types';

export const runtime = 'nodejs';

/**
 * Prompt Lab main LLM bridge.
 *
 * The UI keeps its local IndexedDB state, background analysis and feedback flow.
 * Only the realtime assistant text is delegated to sensory-llm-server main in
 * non-store mode, then converted back to Prompt Lab's lightweight SSE shape.
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

interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
  conversationId: string;
  numericStates?: NumericState[];
  systemPrompt?: string;
  proactiveIntent?: ProactiveIntent;
  eventFlowEnabled?: boolean;
}

const EMOTION_DELIMITER = '###EMOTION###';
const TEXT_DELIMITER = '###TEXT###';
const EVENT_DELIMITER = '###EVENT###';
const TRIGGER_DELIMITER = '###TRIGGER###';
const LOCAL_GRPC_NO_PROXY = '127.0.0.1,localhost,::1';

if (!process.env.NO_PROXY) {
  process.env.NO_PROXY = LOCAL_GRPC_NO_PROXY;
}
if (!process.env.no_proxy) {
  process.env.no_proxy = process.env.NO_PROXY || LOCAL_GRPC_NO_PROXY;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, conversationId, numericStates, systemPrompt, proactiveIntent, eventFlowEnabled } =
      (await req.json()) as ChatRequest;

    const sensoryModel = process.env.SENSORY_LLM_MAIN_MODEL || 'sensory-companion-main';

    const sensoryBody = {
        model: sensoryModel,
        messages: normalizeMessages(messages),
        stream: true,
        store: !!eventFlowEnabled,
        non_store: !eventFlowEnabled,
        trigger_bm25_enabled: !!eventFlowEnabled,
        other_prompt: buildOtherPrompt({
          messages,
          numericStates,
          systemPrompt,
          proactiveIntent,
        }),
    };

    const grpcStream = await postSensoryChatViaGrpc(sensoryBody, {
      conversationId: eventFlowEnabled ? conversationId : undefined,
    });
    return new Response(transformGrpcStream(grpcStream), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: unknown) {
    console.error('[chat-dual] sensory bridge error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        error: message || 'sensory-llm-server の呼び出し中にエラーが発生しました',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

type SensoryChatBody = {
  model: string;
  messages: Array<{ role: string; content: string }>;
  stream: boolean;
  store: boolean;
  non_store: boolean;
  trigger_bm25_enabled: boolean;
  other_prompt: string;
};

async function postSensoryChatViaGrpc(
  body: SensoryChatBody,
  options: { conversationId?: string } = {}
): Promise<NodeJS.ReadableStream> {
  const grpcTarget = process.env.SENSORY_LLM_GRPC_TARGET || '127.0.0.1:7871';
  const protoPath =
    process.env.SENSORY_LLM_PROTO_PATH ||
    path.resolve(process.cwd(), '../../sensory-llm-server/proto/sensory/llm/v1/llm.proto');
  const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const loaded = grpc.loadPackageDefinition(packageDefinition) as any;
  const Service = loaded.sensory.llm.v1.SensoryLLMService;
  const client = new Service(grpcTarget, grpc.credentials.createInsecure(), {
    'grpc.enable_http_proxy': 0,
  });
  await waitForGrpcReady(client, 3000);
  const metadata = new grpc.Metadata();
  const sensoryToken = process.env.SENSORY_LLM_INTERNAL_TOKEN;
  if (sensoryToken) metadata.set('authorization', `Bearer ${sensoryToken}`);

  const request = {
    model: body.model,
    messages: body.messages.map((message) => ({
      role: message.role,
      content: [{ text: message.content }],
    })),
    generation: {
      stream: true,
    },
    context: {
      conversation_id: options.conversationId || '',
      request_id: `prompt-lab-${Date.now()}`,
      caller: 'prompt-lab',
    },
    metadata: {
      other_prompt: body.other_prompt,
      non_store: body.non_store ? 'true' : 'false',
      trigger_bm25_enabled: body.trigger_bm25_enabled ? 'true' : 'false',
    },
  };

  return client.StreamChat(request, metadata);
}

function waitForGrpcReady(client: grpc.Client, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    client.waitForReady(Date.now() + timeoutMs, (error) => {
      if (error) {
        client.close();
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function normalizeMessages(messages: Array<{ role: string; content: string }>) {
  const normalized = messages
    .filter((message) => message.role !== 'system')
    .map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.content || '',
    }))
    .filter((message) => message.content.trim());

  return normalized.length > 0 ? normalized : [{ role: 'user', content: '' }];
}

function buildOtherPrompt(params: {
  messages: Array<{ role: string; content: string }>;
  numericStates?: NumericState[];
  systemPrompt?: string;
  proactiveIntent?: ProactiveIntent;
}): string {
  const sections: string[] = [];
  const seen = new Set<string>();

  const addSection = (content?: string) => {
    const value = content?.trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    sections.push(value);
  };

  addSection(params.systemPrompt);
  for (const message of params.messages) {
    if (message.role === 'system') {
      addSection(message.content);
    }
  }

  const statesPrompt = buildStatesPrompt(params.numericStates);
  if (statesPrompt) addSection(statesPrompt);

  if (params.proactiveIntent) {
    addSection(buildProactiveSystemInstruction(params.proactiveIntent));
  }

  return sections.join('\n\n---\n\n');
}

function buildStatesPrompt(numericStates?: NumericState[]): string {
  const enabledStates = (numericStates || []).filter((state) => state.enabled !== false);
  if (enabledStates.length === 0) return '';

  const rendered = enabledStates
    .map((state) => {
      if (state.id === 'default-affection') {
        const level = getAffectionLevel(state.value);
        return `- ${state.name}: ${state.value}/${state.max}【${level.label}】\n  → ${level.description}`;
      }
      if (state.id === 'default-trust') {
        const level = getTrustLevel(state.value);
        return `- ${state.name}: ${state.value}/${state.max}【${level.label}】\n  → ${level.description}`;
      }
      return `- ${state.name}: ${state.value}/${state.max}${
        state.description ? ` (${state.description})` : ''
      }`;
    })
    .join('\n');

  return `## Prompt Lab 一時状態\n以下の状態を参考にして、返信の口調や態度を厳格に調整してください：\n\n${rendered}`;
}

function transformGrpcStream(call: NodeJS.ReadableStream) {
  const encoder = new TextEncoder();
  let rawText = '';
  let textStartIndex = -1;
  let emittedTextLength = 0;
  let closed = false;

  return new ReadableStream({
    start(controller) {
      const enqueue = (chunk: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          closed = true;
        }
      };

      const emitJson = (payload: unknown) => {
        if (closed) return;
        enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      const closeStream = () => {
        if (closed) return;
        enqueue(encoder.encode('data: [DONE]\n\n'));
        if (closed) return;
        try {
          controller.close();
        } catch {
          // The response may already have been closed by Next.js after a client disconnect.
        } finally {
          closed = true;
        }
      };

      const emitNewText = (flush = false) => {
        if (closed) return;
        if (textStartIndex < 0) return;
        let text = rawText.slice(textStartIndex + TEXT_DELIMITER.length);
        const controlIndex = firstControlMarkerIndex(text);
        if (controlIndex >= 0) {
          text = text.slice(0, controlIndex).trimEnd();
        } else if (!flush && text.length > maxControlDelimiterLength()) {
          text = text.slice(0, text.length - maxControlDelimiterLength());
        }
        const delta = text.slice(emittedTextLength);
        if (!delta) return;
        emittedTextLength = text.length;
        emitJson({ content: delta });
      };

      call.on('data', (event: any) => {
        if (closed) return;
        const debug = event.debug;
        if (debug?.event === 'event_update' && debug.json_payload) {
          try {
            const payload = JSON.parse(debug.json_payload);
            emitJson({
              eventFlow: {
                ...payload,
                source: 'sensory-llm-server',
              },
            });
          } catch (error) {
            console.warn('[chat-dual] failed to parse gRPC event_update:', error);
          }
          return;
        }

        const text = event.delta?.text;
        if (typeof text === 'string' && text) {
          rawText += text;
          if (textStartIndex < 0) {
            textStartIndex = rawText.indexOf(TEXT_DELIMITER);
          }
          emitNewText();
        }
      });

      call.on('error', (error) => {
        if (closed) return;
        closed = true;
        try {
          controller.error(error);
        } catch {
          // The stream may already be closed by the runtime.
        }
      });

      call.on('end', () => {
        if (closed) return;
        emitNewText(true);
        const emotionalState = parseEmotionalState(rawText);
        if (emotionalState) {
          emitJson({ emotionalState });
        }
        closeStream();
      });
    },
    cancel() {
      closed = true;
      if (typeof (call as any).cancel === 'function') {
        (call as any).cancel();
      }
    },
  });
}

function firstControlMarkerIndex(text: string): number {
  const indexes = [EVENT_DELIMITER, TRIGGER_DELIMITER]
    .map((delimiter) => text.indexOf(delimiter))
    .filter((index) => index >= 0);
  return indexes.length > 0 ? Math.min(...indexes) : -1;
}

function maxControlDelimiterLength(): number {
  return Math.max(EVENT_DELIMITER.length, TRIGGER_DELIMITER.length);
}

function getDeltaContent(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices)) return undefined;
  const firstChoice = choices[0];
  if (!firstChoice || typeof firstChoice !== 'object') return undefined;
  const delta = (firstChoice as { delta?: unknown }).delta;
  if (!delta || typeof delta !== 'object') return undefined;
  const content = (delta as { content?: unknown }).content;
  return typeof content === 'string' ? content : undefined;
}

function parseEmotionalState(rawText: string) {
  const emotionIndex = rawText.indexOf(EMOTION_DELIMITER);
  if (emotionIndex < 0) return null;
  const emotionStart = emotionIndex + EMOTION_DELIMITER.length;
  const textIndex = rawText.indexOf(TEXT_DELIMITER, emotionStart);
  const rawJson =
    textIndex >= 0 ? rawText.slice(emotionStart, textIndex) : rawText.slice(emotionStart);

  try {
    const parsed = JSON.parse(rawJson.trim());
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (error) {
    console.warn('[chat-dual] failed to parse sensory emotion payload:', error);
  }
  return null;
}

function fallbackVisibleText(rawText: string): string {
  const emotionIndex = rawText.indexOf(EMOTION_DELIMITER);
  if (emotionIndex > 0) {
    return rawText.slice(0, emotionIndex).trim();
  }
  return rawText.trim();
}

function getAffectionLevel(value: number): { label: string; description: string } {
  if (value <= -80) return { label: '仇恨', description: '不仅不想和你说话，还想弄死你' };
  if (value <= -50) return { label: '憎恶', description: '打死不想和你说话，看见当做没看见' };
  if (value <= -20) return { label: '讨厌', description: '不想和你说话，但是你真要搭话，也会对你爱答不理' };
  if (value <= 20) return { label: '普通', description: '正常交流' };
  if (value <= 50) return { label: '友善', description: '想和你说话，愿意分享一些自己非私人的见闻' };
  if (value <= 80) return { label: '喜欢', description: '想和你说话，愿意分享一些自己私人的想法' };
  return { label: '爱', description: '无话不说' };
}

function getTrustLevel(value: number): { label: string; description: string } {
  if (value <= -80) return { label: '猜忌', description: '你只要开口就是在骗我，除非亲眼所见否则绝对不信' };
  if (value <= -50) return { label: '警惕', description: '只要内容不可被客观情况验证，那你说的就不对' };
  if (value <= -20) return { label: '怀疑', description: '如果无法立即验证，会保持怀疑态度，需要更多证据' };
  if (value <= 20) return { label: '中立', description: '保持理性判断，不会盲目相信也不会轻易否定' };
  if (value <= 50) return { label: '信任', description: '愿意相信你说的大部分内容，偶尔会验证' };
  if (value <= 80) return { label: '信赖', description: '深度信任，几乎不会怀疑你说的话' };
  return { label: '盲信', description: '无条件相信你说的一切' };
}
