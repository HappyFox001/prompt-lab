import { NumericState, MemoryEvent } from './types';

/**
 * 构建发送给LLM的提示词，包含状态和事件信息
 */
export function buildContextPrompt(
  numericStates: NumericState[],
  memoryEvents: MemoryEvent[],
  enableEventMemory: boolean
): string {
  let prompt = '';

  // 添加数值化状态信息
  if (numericStates.length > 0) {
    prompt += '<numeric_states>\n';
    numericStates.forEach((state) => {
      prompt += `  <state id="${state.id}" name="${state.name}" value="${state.value}" min="${state.min}" max="${state.max}"`;
      if (state.description) {
        prompt += ` description="${state.description}"`;
      }
      prompt += ' />\n';
    });
    prompt += '</numeric_states>\n\n';
  }

  // 添加事件记忆信息
  if (enableEventMemory && memoryEvents.length > 0) {
    prompt += '<memory_events>\n';
    // 只添加最近20个事件，避免过长
    const recentEvents = memoryEvents.slice(-20);
    recentEvents.forEach((event) => {
      const timestamp = new Date(event.timestamp).toISOString();
      prompt += `  <event timestamp="${timestamp}" importance="${event.importance}">${event.content}</event>\n`;
    });
    prompt += '</memory_events>\n\n';
  }

  return prompt;
}

/**
 * 构建LLM输出格式说明
 */
export function buildOutputFormatInstruction(
  hasStates: boolean,
  enableEventMemory: boolean
): string {
  if (!hasStates && !enableEventMemory) return '';

  let instruction = '【重要】你必须严格按照以下XML格式回复，否则系统无法解析：\n\n';
  instruction += '<response>\n';
  instruction += '  <content>\n';
  instruction += '    你的回复内容（正常对话）\n';
  instruction += '  </content>\n';

  if (hasStates) {
    instruction += '  <state_updates>\n';
    instruction += '    <!-- 根据对话内容更新相关状态值 -->\n';
    instruction += '    <update id="状态ID" delta="数值变化" />\n';
    instruction += '    <!-- 例如：用户表达好感时 <update id="affection" delta="+5" /> -->\n';
    instruction += '    <!-- 可以有多个update标签 -->\n';
    instruction += '  </state_updates>\n';
  }

  if (enableEventMemory) {
    instruction += '  <event>\n';
    instruction += '    <importance>数字1-10</importance>\n';
    instruction += '    <!-- 重要性：1-3日常闲聊 4-6有意义对话 7-8重要交流 9-10关键事件 -->\n';
    instruction += '    <description>简洁描述这次对话的重要事件（一句话）</description>\n';
    instruction += '  </event>\n';
  }

  instruction += '</response>\n\n';
  instruction += '注意：\n';
  instruction += '- 所有内容都必须包裹在<response>标签内\n';
  instruction += '- <content>标签是必需的，包含你的正常回复\n';

  if (hasStates) {
    instruction += '- <state_updates>在对话有明显情感/态度变化时才添加\n';
  }

  if (enableEventMemory) {
    instruction += '- <event>只在对话有值得记录的内容时添加\n';
  }

  return instruction;
}

/**
 * 解析LLM响应中的内容
 */
export function parseLLMResponse(response: string): {
  content: string;
  stateUpdates: Array<{ id: string; delta: number }>;
  event: { importance: number; description: string } | null;
} {
  const result = {
    content: '',
    stateUpdates: [] as Array<{ id: string; delta: number }>,
    event: null as { importance: number; description: string } | null,
  };

  // 检查是否包含XML标签
  if (!response.includes('<response>')) {
    // 没有XML格式，直接返回全部内容
    result.content = response;
    return result;
  }

  // 提取content
  const contentMatch = response.match(/<content>([\s\S]*?)<\/content>/);
  if (contentMatch) {
    result.content = contentMatch[1].trim();
  }

  // 提取state_updates
  const stateUpdatesMatch = response.match(/<state_updates>([\s\S]*?)<\/state_updates>/);
  if (stateUpdatesMatch) {
    const updates = stateUpdatesMatch[1].matchAll(/<update\s+id="([^"]+)"\s+delta="([^"]+)"\s*\/>/g);
    for (const match of updates) {
      const id = match[1];
      const deltaStr = match[2];
      const delta = parseFloat(deltaStr);
      if (!isNaN(delta)) {
        result.stateUpdates.push({ id, delta });
      }
    }
  }

  // 提取event
  const eventMatch = response.match(/<event>([\s\S]*?)<\/event>/);
  if (eventMatch) {
    const importanceMatch = eventMatch[1].match(/<importance>(\d+)<\/importance>/);
    const descriptionMatch = eventMatch[1].match(/<description>([\s\S]*?)<\/description>/);

    if (importanceMatch && descriptionMatch) {
      result.event = {
        importance: parseInt(importanceMatch[1]),
        description: descriptionMatch[1].trim(),
      };
    }
  }

  return result;
}

/**
 * 应用状态更新
 */
export function applyStateUpdates(
  states: NumericState[],
  updates: Array<{ id: string; delta: number }>
): NumericState[] {
  return states.map((state) => {
    const update = updates.find((u) => u.id === state.id);
    if (update) {
      const newValue = Math.max(
        state.min,
        Math.min(state.max, state.value + update.delta)
      );
      return { ...state, value: newValue };
    }
    return state;
  });
}
