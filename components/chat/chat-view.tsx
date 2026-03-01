'use client';

import { useState, useEffect } from 'react';
import { Message, Conversation, SystemPrompt } from '@/lib/types';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';
import { ModelSelector } from './model-selector';
import { Sidebar } from '@/components/sidebar/sidebar';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { SystemPromptDialog } from './system-prompt-dialog';
import { indexedDB_storage } from '@/lib/indexeddb';
import { FileText } from 'lucide-react';

export function ChatView() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [isPromptDialogOpen, setIsPromptDialogOpen] = useState(false);
  const [currentSystemPrompt, setCurrentSystemPrompt] = useState<SystemPrompt | null>(null);

  // 初始化：从 IndexedDB 加载或创建新对话
  useEffect(() => {
    async function loadData() {
      // 加载默认模型
      try {
        const res = await fetch('/api/models');
        if (!res.ok) {
          const errorText = await res.text();
          console.error('Failed to load models:', res.status, errorText);
          return;
        }
        const data = await res.json();
        setSelectedModelId(data.defaultModelId || data.models[0]?.id || '');
      } catch (error) {
        console.error('Failed to load default model:', error);
      }

      // 加载对话历史
      const saved = await indexedDB_storage.getConversations();
      if (saved.length > 0) {
        setConversations(saved);
        setCurrentConversationId(saved[0].id);
      } else {
        const newConv = createNewConversation();
        setConversations([newConv]);
        setCurrentConversationId(newConv.id);
        await indexedDB_storage.saveConversation(newConv);
      }
    }
    loadData();
  }, []);

  // 保存对话到 IndexedDB（防抖）
  useEffect(() => {
    if (conversations.length > 0) {
      const timer = setTimeout(() => {
        indexedDB_storage.saveConversations(conversations);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [conversations]);

  // 加载当前对话的系统提示词
  useEffect(() => {
    async function loadSystemPrompt() {
      const currentConv = conversations.find((c) => c.id === currentConversationId);
      if (currentConv?.systemPromptId) {
        const prompt = await indexedDB_storage.getSystemPrompt(currentConv.systemPromptId);
        setCurrentSystemPrompt(prompt);
      } else {
        setCurrentSystemPrompt(null);
      }
    }
    loadSystemPrompt();
  }, [currentConversationId, conversations]);

  // 获取当前对话
  const currentConversation = conversations.find(
    (c) => c.id === currentConversationId
  );

  const handleSend = async (content: string) => {
    if (!currentConversationId || !selectedModelId) return;

    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    // 更新对话，添加用户消息
    setConversations((prevConvs) =>
      prevConvs.map((conv) => {
        if (conv.id === currentConversationId) {
          const updatedMessages = [...conv.messages, userMessage];
          // 如果是第一条消息，用它作为标题
          const title =
            conv.messages.length === 0
              ? content.slice(0, 30) + (content.length > 30 ? '...' : '')
              : conv.title;
          return {
            ...conv,
            title,
            messages: updatedMessages,
            updatedAt: new Date(),
          };
        }
        return conv;
      })
    );

    setIsLoading(true);

    // 创建临时的 AI 消息（用于流式更新）
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    // 添加空的 AI 消息
    setConversations((prevConvs) =>
      prevConvs.map((conv) => {
        if (conv.id === currentConversationId) {
          return {
            ...conv,
            messages: [...conv.messages, assistantMessage],
            updatedAt: new Date(),
          };
        }
        return conv;
      })
    );

    try {
      // 获取所有消息用于上下文
      const currentConv = conversations.find((c) => c.id === currentConversationId);
      const allMessages = [...(currentConv?.messages || []), userMessage];

      // 构建发送的消息数组，如果有系统提示词，添加到开头
      const messagesToSend = currentSystemPrompt
        ? [
            { role: 'system' as const, content: currentSystemPrompt.content },
            ...allMessages.map((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
          ]
        : allMessages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          }));

      // 调用 API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messagesToSend,
          modelId: selectedModelId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '调用 API 失败');
      }

      // 处理流式响应
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('无法读取响应流');
      }

      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;

                // 更新 AI 消息内容
                setConversations((prevConvs) =>
                  prevConvs.map((conv) => {
                    if (conv.id === currentConversationId) {
                      return {
                        ...conv,
                        messages: conv.messages.map((msg) =>
                          msg.id === assistantMessageId
                            ? { ...msg, content: fullContent }
                            : msg
                        ),
                        updatedAt: new Date(),
                      };
                    }
                    return conv;
                  })
                );
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Error calling API:', error);

      // 更新为错误消息
      setConversations((prevConvs) =>
        prevConvs.map((conv) => {
          if (conv.id === currentConversationId) {
            return {
              ...conv,
              messages: conv.messages.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: `❌ Error: ${error.message}\n\n请检查：\n• 模型配置是否正确\n• API Key 是否有效\n• 网络连接是否正常\n• API 服务是否可用`,
                    }
                  : msg
              ),
            };
          }
          return conv;
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = () => {
    setIsLoading(false);
  };

  const handleNewConversation = () => {
    const newConv = createNewConversation();
    setConversations((prev) => [newConv, ...prev]);
    setCurrentConversationId(newConv.id);
    indexedDB_storage.saveConversation(newConv);
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
  };

  const handleDeleteConversation = async (id: string) => {
    await indexedDB_storage.deleteConversation(id);

    setConversations((prev) => {
      const remaining = prev.filter((c) => c.id !== id);

      // 如果删除的是当前对话
      if (id === currentConversationId) {
        if (remaining.length > 0) {
          setCurrentConversationId(remaining[0].id);
        } else {
          // 如果没有对话了，创建新对话
          const newConv = createNewConversation();
          setCurrentConversationId(newConv.id);
          indexedDB_storage.saveConversation(newConv);
          return [newConv];
        }
      }

      return remaining;
    });
  };

  const handleSelectSystemPrompt = async (promptId: string | undefined) => {
    // 更新当前对话的系统提示词
    setConversations((prevConvs) =>
      prevConvs.map((conv) => {
        if (conv.id === currentConversationId) {
          return {
            ...conv,
            systemPromptId: promptId,
            updatedAt: new Date(),
          };
        }
        return conv;
      })
    );

    // 加载系统提示词内容
    if (promptId) {
      const prompt = await indexedDB_storage.getSystemPrompt(promptId);
      setCurrentSystemPrompt(prompt);
    } else {
      setCurrentSystemPrompt(null);
    }
  };

  return (
    <div className="flex h-screen bg-surface-primary">
      {/* 侧边栏 */}
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
      />

      {/* 主聊天区域 */}
      <div className="flex flex-1 flex-col">
        {/* 头部 - 优化样式，移除边框 */}
        <header className="bg-surface-primary px-6 py-3 sticky top-0 z-10">
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            <ModelSelector
              selectedModelId={selectedModelId}
              onModelChange={setSelectedModelId}
            />
            <div className="flex items-center gap-3">
              {/* 系统提示词按钮 */}
              <button
                onClick={() => setIsPromptDialogOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border-medium hover:border-accent hover:bg-surface-hover transition-all text-text-secondary hover:text-accent"
                title="系统提示词"
              >
                <FileText className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {currentSystemPrompt?.name || '系统提示词'}
                </span>
              </button>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* 消息列表 */}
        <div className="flex-1 overflow-hidden">
          <MessageList messages={currentConversation?.messages || []} />
        </div>

        {/* 输入框 */}
        <ChatInput
          onSend={handleSend}
          isLoading={isLoading}
          onStop={handleStop}
        />
      </div>

      {/* 系统提示词对话框 */}
      <SystemPromptDialog
        isOpen={isPromptDialogOpen}
        onClose={() => setIsPromptDialogOpen(false)}
        currentPromptId={currentConversation?.systemPromptId}
        onSelectPrompt={handleSelectSystemPrompt}
      />
    </div>
  );
}

// 创建新对话
function createNewConversation(): Conversation {
  return {
    id: Date.now().toString(),
    title: 'New Chat',
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
