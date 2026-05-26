import http from 'node:http';
import { Readable } from 'node:stream';
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
}

const EMOTION_DELIMITER = '###EMOTION###';
const TEXT_DELIMITER = '###TEXT###';
const CHAT_COMPLETIONS_PATH = '/v1/chat/completions';

export async function POST(req: NextRequest) {
  try {
    const { messages, numericStates, systemPrompt, proactiveIntent } =
      (await req.json()) as ChatRequest;

    const sensoryModel = process.env.SENSORY_LLM_MAIN_MODEL || 'sensory-companion-main';

    const response = await postSensoryChat(
      JSON.stringify({
        model: sensoryModel,
        messages: normalizeMessages(messages),
        stream: true,
        store: false,
        non_store: true,
        other_prompt: buildOtherPrompt({
          messages,
          numericStates,
          systemPrompt,
          proactiveIntent,
        }),
      })
    );

    if (!response.ok) {
      const detail = await response.text();
      return new Response(
        JSON.stringify({
          error: 'sensory-llm-server の呼び出しに失敗しました',
          details: detail.slice(0, 1000),
        }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!response.body) {
      return new Response(
        JSON.stringify({ error: 'sensory-llm-server から応答ストリームが返されませんでした' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(transformSensoryStream(response.body), {
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

async function postSensoryChat(body: string): Promise<Response> {
  const socketPath = process.env.SENSORY_LLM_SOCKET_PATH || process.env.SOCKET_PATH;
  const sensoryToken = process.env.SENSORY_LLM_INTERNAL_TOKEN;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body).toString(),
    ...(sensoryToken ? { Authorization: `Bearer ${sensoryToken}` } : {}),
  };

  if (socketPath) {
    return postSensoryChatViaSocket({
      socketPath,
      body,
      headers,
    });
  }

  const sensoryBaseUrl = (
    process.env.SENSORY_LLM_BASE_URL || 'http://127.0.0.1:7870'
  ).replace(/\/$/, '');

  return fetch(`${sensoryBaseUrl}${CHAT_COMPLETIONS_PATH}`, {
    method: 'POST',
    headers,
    body,
  });
}

function postSensoryChatViaSocket(params: {
  socketPath: string;
  body: string;
  headers: Record<string, string>;
}): Promise<Response> {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        socketPath: params.socketPath,
        path: CHAT_COMPLETIONS_PATH,
        method: 'POST',
        headers: params.headers,
      },
      (incoming) => {
        const body = Readable.toWeb(incoming) as ReadableStream<Uint8Array>;
        resolve(
          new Response(body, {
            status: incoming.statusCode || 500,
            statusText: incoming.statusMessage,
            headers: toWebHeaders(incoming.headers),
          })
        );
      }
    );

    request.on('error', reject);
    request.write(params.body);
    request.end();
  });
}

function toWebHeaders(headers: http.IncomingHttpHeaders): Headers {
  const result = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      for (const item of value) result.append(key, item);
    } else if (value !== undefined) {
      result.set(key, value);
    }
  }
  return result;
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

function transformSensoryStream(body: ReadableStream<Uint8Array>) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      const reader = body.getReader();
      let sseBuffer = '';
      let rawText = '';
      let textStartIndex = -1;
      let emittedTextLength = 0;

      const emitJson = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      const emitNewText = () => {
        if (textStartIndex < 0) return;
        const text = rawText.slice(textStartIndex + TEXT_DELIMITER.length);
        const delta = text.slice(emittedTextLength);
        if (!delta) return;
        emittedTextLength = text.length;
        emitJson({ content: delta });
      };

      const processData = (data: string) => {
        if (!data || data === '[DONE]') return;
        let payload: unknown;
        try {
          payload = JSON.parse(data);
        } catch {
          return;
        }
        const content = getDeltaContent(payload);
        if (typeof content !== 'string' || !content) return;

        rawText += content;
        if (textStartIndex < 0) {
          textStartIndex = rawText.indexOf(TEXT_DELIMITER);
        }
        emitNewText();
      };

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split(/\r?\n/);
          sseBuffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            processData(line.slice(5).trim());
          }
        }

        if (sseBuffer.startsWith('data:')) {
          processData(sseBuffer.slice(5).trim());
        }

        if (textStartIndex < 0) {
          const fallbackText = fallbackVisibleText(rawText);
          if (fallbackText) {
            emitJson({ content: fallbackText });
          }
        }

        const emotionalState = parseEmotionalState(rawText);
        if (emotionalState) {
          emitJson({ emotionalState });
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    },
  });
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
