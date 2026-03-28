'use client';

import { useState, useEffect } from 'react';
import { Message, Conversation, SystemPrompt, MemorySummary, NumericState, MemoryEvent, PromptTestItem, UserPrompt } from '@/lib/types';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';
// ModelSelector 已移除（双层架构使用固定模型）
import { Sidebar } from '@/components/sidebar/sidebar';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { SystemPromptDialog } from './system-prompt-dialog';
import { UserPromptDialog } from './user-prompt-dialog';
import { SuggestionConfirmDialog } from './suggestion-confirm-dialog';
import { ContextDialog } from './context-dialog';
import { StatesDialog } from './states-dialog';
import { EventsDialog } from './events-dialog';
import { PromptTestPanel } from './prompt-test-panel';
import { indexedDB_storage } from '@/lib/indexeddb';
import { FileText, History } from 'lucide-react';
import { buildContextPrompt, buildOutputFormatInstruction, parseLLMResponse, applyStateUpdates } from '@/lib/xml-parser';
import { PRESET_PROMPTS } from '@/lib/preset-prompts';

export function ChatView() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // selectedModelId 已移除（双层架构使用固定模型）
  const [isPromptDialogOpen, setIsPromptDialogOpen] = useState(false);
  const [isUserPromptDialogOpen, setIsUserPromptDialogOpen] = useState(false);
  const [isSuggestionDialogOpen, setIsSuggestionDialogOpen] = useState(false);
  const [isContextDialogOpen, setIsContextDialogOpen] = useState(false);
  const [isStatesDialogOpen, setIsStatesDialogOpen] = useState(false);
  const [isEventsDialogOpen, setIsEventsDialogOpen] = useState(false);
  const [isTestPanelOpen, setIsTestPanelOpen] = useState(true);
  const [testPanelWidth, setTestPanelWidth] = useState(280); // 右侧面板宽度
  const [currentSystemPrompt, setCurrentSystemPrompt] = useState<SystemPrompt | null>(null);
  const [currentUserPrompt, setCurrentUserPrompt] = useState<UserPrompt | null>(null);
  const [testPrompts, setTestPrompts] = useState<PromptTestItem[]>([]);
  const [suggestedText, setSuggestedText] = useState('');
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);

  // 初始化：从 IndexedDB 加载或创建新对话
  useEffect(() => {
    async function loadData() {
      // 双层架构：不再需要加载模型配置

      // 加载对话历史
      const saved = await indexedDB_storage.getConversations();
      if (saved.length > 0) {
        // 兼容旧数据：移除旧的memorySummaries数组，设置默认值
        const updatedConversations = saved.map(conv => {
          const { memorySummaries, ...rest } = conv as any;
          return {
            ...rest,
            contextWindowSize: conv.contextWindowSize || 10,
          };
        });
        setConversations(updatedConversations);
        setCurrentConversationId(updatedConversations[0].id);
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

  // 加载当前对话的用户提示词
  useEffect(() => {
    async function loadUserPrompt() {
      const currentConv = conversations.find((c) => c.id === currentConversationId);
      if (currentConv?.userPromptId) {
        const prompt = await indexedDB_storage.getUserPrompt(currentConv.userPromptId);
        setCurrentUserPrompt(prompt);
      } else {
        setCurrentUserPrompt(null);
      }
    }
    loadUserPrompt();
  }, [currentConversationId, conversations]);

  // 获取当前对话
  const currentConversation = conversations.find(
    (c) => c.id === currentConversationId
  );

  // 从当前对话加载测试提示词
  useEffect(() => {
    if (currentConversation?.testPrompts) {
      setTestPrompts(currentConversation.testPrompts);
    } else {
      setTestPrompts([]);
    }
  }, [currentConversationId, currentConversation?.testPrompts]);

  const handleSend = async (content: string) => {
    if (!currentConversationId) return;

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

    let fullContent = ''; // 移到外层作用域以便 finally 块访问

    try {
      // 获取当前对话
      const currentConv = conversations.find((c) => c.id === currentConversationId);
      if (!currentConv) return;

      const allMessages = [...currentConv.messages, userMessage];
      const contextWindowSize = currentConv.contextWindowSize || 10;
      const memorySummary = currentConv.memorySummary;

      // 只取最近N条消息
      const recentMessages = allMessages.slice(-contextWindowSize);

      // 构建上下文：历史摘要 + 最近消息
      const contextMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];

      // 1. 添加系统提示词（如果有）
      if (currentSystemPrompt) {
        contextMessages.push({
          role: 'system',
          content: currentSystemPrompt.content,
        });
      }

      // 2. 添加累积摘要作为上下文（如果有）
      if (memorySummary && memorySummary.content) {
        contextMessages.push({
          role: 'system',
          content: `以下は以前の会話のサマリーです。文脈を理解するのに役立ちます：\n\n${memorySummary.content}`,
        });
      }

      // 3. 添加启用的提示词增强片段
      const enabledPrompts = testPrompts.filter(p => p.enabled);
      if (enabledPrompts.length > 0) {
        const promptEnhancements = enabledPrompts
          .map(p => p.content)
          .filter(c => c.trim())
          .join('\n\n---\n\n');

        if (promptEnhancements) {
          contextMessages.push({
            role: 'system',
            content: `【ロールプレイ強化ガイドライン】\n以下のガイドラインに従って、より自然で一貫性のあるロールプレイを心がけてください。\n\n${promptEnhancements}`,
          });
        }
      }

      // 4. 添加最近的消息（不再添加状态信息，由后端处理）
      const messagesToSend = [
        ...contextMessages,
        ...recentMessages.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      ];

      // 注意：状态信息、事件信息、输出格式说明现在由后端自动处理

      // 调试：打印完整的消息内容
      console.log('=== 发送给LLM的完整Prompt ===');
      console.log('系统提示词数量:', contextMessages.length);
      console.log('最近消息数量:', recentMessages.length);
      console.log('状态数量:', (currentConv.numericStates || []).length);
      console.log('事件数量:', (currentConv.memoryEvents || []).length);
      console.log('事件记忆开启:', currentConv.enableEventMemory || false);
      console.log('\n完整消息列表:');
      messagesToSend.forEach((msg, idx) => {
        console.log(`\n[${idx}] ${msg.role.toUpperCase()}:`);
        console.log(msg.content.substring(0, 500) + (msg.content.length > 500 ? '...' : ''));
      });
      console.log('\n=================================\n');

      // 调用双层架构 API（第一层：快速响应）
      const response = await fetch('/api/chat-dual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messagesToSend,
          conversationId: currentConversationId,
          numericStates: currentConv.numericStates || [],
          systemPrompt: currentSystemPrompt?.content || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'API 调用失败');
      }

      // 处理流式响应
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('无法读取响应流');
      }

      let emotionalState = null;

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

              // 处理文本内容
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

              // 处理情感状态
              if (parsed.emotionalState) {
                emotionalState = parsed.emotionalState;
                console.log('[情感状态]', emotionalState);
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }

      // 流式响应完成后，保存情感状态
      if (emotionalState) {
        setConversations((prevConvs) =>
          prevConvs.map((conv) => {
            if (conv.id === currentConversationId) {
              return {
                ...conv,
                messages: conv.messages.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, emotionalState }
                    : msg
                ),
                updatedAt: new Date(),
              };
            }
            return conv;
          })
        );
      }

      // ==================== 第二层：后台深度处理（延迟 3 秒触发）====================
      setTimeout(async () => {
        try {
          const currentConv = conversations.find((c) => c.id === currentConversationId);
          if (!currentConv) return;

          // 检查是否需要后台处理：只在有声明状态或启用事件记忆时才触发
          const hasStates = (currentConv.numericStates || []).length > 0;
          const hasEventMemory = currentConv.enableEventMemory || false;

          if (!hasStates && !hasEventMemory) {
            console.log('[后台处理] 跳过：未声明状态且未启用事件记忆');
            return;
          }

          console.log('[后台处理] 3秒后开始深度分析...');

          const bgResponse = await fetch('/api/process-background', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              conversationId: currentConversationId,
              messages: [...currentConv.messages, { role: 'user', content }, { role: 'assistant', content: fullContent }],
              recentResponse: fullContent,
              numericStates: currentConv.numericStates || [],
              memoryEvents: currentConv.memoryEvents || [],
              previousSummary: currentConv.memorySummary?.content || '',
            }),
          });

          if (!bgResponse.ok) {
            throw new Error('后台处理失败');
          }

          const result = await bgResponse.json();
          console.log('[后台处理] 完成:', result);

          if (result.success && result.analysis) {
            // 应用状态更新（只有当有声明状态时）
            if (result.analysis.stateUpdates && result.analysis.stateUpdates.length > 0) {
              setConversations((prevConvs) =>
                prevConvs.map((conv) => {
                  if (conv.id === currentConversationId) {
                    // 只处理有对应声明状态的更新
                    const validUpdates = result.analysis.stateUpdates.filter((update: any) =>
                      conv.numericStates?.some((s) => s.id === update.id)
                    );

                    if (validUpdates.length === 0) {
                      console.log('[状态更新] 跳过：没有匹配的声明状态');
                      return conv;
                    }

                    const updatedStates = applyStateUpdates(
                      conv.numericStates || [],
                      validUpdates
                    );

                    // 构建 metadata - 只包含有效的更新
                    const stateUpdatesMetadata = validUpdates.map((update: any) => {
                      const state = conv.numericStates?.find((s) => s.id === update.id);
                      const updatedState = updatedStates.find((s) => s.id === update.id);
                      return {
                        id: update.id,
                        delta: update.delta,
                        stateName: state?.name || '',
                        newValue: updatedState?.value || 0,
                        color: state?.color,
                      };
                    }).filter((u: { stateName: string }) => u.stateName); // 过滤掉没有名称的

                    console.log('[状态更新]', stateUpdatesMetadata);

                    // 更新消息的 metadata
                    const updatedMessages = conv.messages.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, metadata: { ...msg.metadata, stateUpdates: stateUpdatesMetadata } }
                        : msg
                    );

                    return {
                      ...conv,
                      numericStates: updatedStates,
                      messages: updatedMessages,
                      updatedAt: new Date(),
                    };
                  }
                  return conv;
                })
              );
            }

            // 添加事件（只在启用事件记忆时）
            if (result.analysis.event && currentConv.enableEventMemory) {
              const newEvent: MemoryEvent = {
                id: Date.now().toString(),
                timestamp: new Date(),
                content: result.analysis.event.description,
                importance: result.analysis.event.importance,
              };

              console.log('[新事件]', newEvent);

              setConversations((prevConvs) =>
                prevConvs.map((conv) => {
                  if (conv.id === currentConversationId) {
                    // 更新消息的 metadata
                    const updatedMessages = conv.messages.map((msg) =>
                      msg.id === assistantMessageId
                        ? {
                            ...msg,
                            metadata: {
                              ...msg.metadata,
                              event: {
                                importance: newEvent.importance,
                                description: newEvent.content,
                              },
                            },
                          }
                        : msg
                    );

                    return {
                      ...conv,
                      memoryEvents: [...(conv.memoryEvents || []), newEvent],
                      messages: updatedMessages,
                      updatedAt: new Date(),
                    };
                  }
                  return conv;
                })
              );
            }

            // 更新记忆总结
            if (result.analysis.summary) {
              setConversations((prevConvs) =>
                prevConvs.map((conv) => {
                  if (conv.id === currentConversationId) {
                    return {
                      ...conv,
                      memorySummary: {
                        content: result.analysis.summary,
                        summarizedUpToIndex: conv.messages.length,
                        lastUpdated: new Date(),
                      },
                      updatedAt: new Date(),
                    };
                  }
                  return conv;
                })
              );

              console.log('[记忆总结] 已更新');
            }
          }
        } catch (error) {
          console.error('[后台处理] 错误:', error);
          // 后台处理失败不影响对话
        }
      }, 3000);
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
                      content: `❌ 错误: ${error.message}\n\n请检查：\n• 模型配置是否正确\n• API 密钥是否有效\n• 网络连接是否正常\n• API 服务是否可用`,
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

      // 检查是否需要自动生成用户输入建议
      const currentConv = conversations.find((c) => c.id === currentConversationId);
      if (currentConv?.autoSuggestEnabled && currentConv?.userPromptId && fullContent) {
        setTimeout(() => {
          generateSuggestion(fullContent, undefined);
        }, 500);
      }
    }
  };

  // 生成用户输入建议
  const generateSuggestion = async (lastAIResponse: string, rejectionReason?: string) => {
    if (!currentConversationId || !currentUserPrompt) return;

    setIsGeneratingSuggestion(true);
    try {
      const currentConv = conversations.find((c) => c.id === currentConversationId);
      if (!currentConv) return;

      const response = await fetch('/api/suggest-user-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt: currentUserPrompt.content,
          messages: currentConv.messages.slice(-15), // 最近15条
          lastAIResponse,
          rejectionReason,
        }),
      });

      if (!response.ok) {
        throw new Error('建议生成失败');
      }

      const { suggestion } = await response.json();
      setSuggestedText(suggestion);
      setIsSuggestionDialogOpen(true);
    } catch (error) {
      console.error('建议生成错误:', error);
      // 错误提示（可选）
    } finally {
      setIsGeneratingSuggestion(false);
    }
  };

  // 确认发送建议
  const handleConfirmSuggestion = () => {
    setIsSuggestionDialogOpen(false);
    // suggestedText 已经填充到输入框，用户点击确认后直接发送
    if (suggestedText.trim()) {
      handleSend(suggestedText.trim());
      setSuggestedText('');
    }
  };

  // 拒绝建议并重新生成
  const handleRejectSuggestion = (reason: string) => {
    const currentConv = conversations.find((c) => c.id === currentConversationId);
    if (!currentConv) return;

    const lastAssistantMessage = [...currentConv.messages]
      .reverse()
      .find((m) => m.role === 'assistant');

    if (lastAssistantMessage) {
      generateSuggestion(lastAssistantMessage.content, reason);
    }
  };

  // 手动更新摘要（双层架构中已自动处理，此函数保留以兼容 UI）
  const handleManualUpdateSummary = async () => {
    console.log('[摘要] 双层架构中摘要会在后台自动生成，无需手动触发');
    // 在双层架构中，摘要会在每次对话后自动在后台生成
    // 此函数保留以兼容现有 UI，但不再执行实际操作
  };

  // 双层架构中摘要已自动生成，此函数已移除

  const handleStop = () => {
    setIsLoading(false);
  };

  const handleEditMessage = (messageId: string, newContent: string) => {
    if (!currentConversationId) return;

    setConversations((prevConvs) =>
      prevConvs.map((conv) => {
        if (conv.id === currentConversationId) {
          return {
            ...conv,
            messages: conv.messages.map((msg) =>
              msg.id === messageId ? { ...msg, content: newContent } : msg
            ),
            updatedAt: new Date(),
          };
        }
        return conv;
      })
    );
  };

  const handleSaveContextSettings = (contextWindowSize: number) => {
    if (!currentConversationId) return;

    setConversations((prevConvs) =>
      prevConvs.map((conv) => {
        if (conv.id === currentConversationId) {
          return {
            ...conv,
            contextWindowSize,
            updatedAt: new Date(),
          };
        }
        return conv;
      })
    );
  };

  const handleUpdateStates = (states: NumericState[]) => {
    if (!currentConversationId) return;

    setConversations((prevConvs) =>
      prevConvs.map((conv) => {
        if (conv.id === currentConversationId) {
          return {
            ...conv,
            numericStates: states,
            updatedAt: new Date(),
          };
        }
        return conv;
      })
    );
  };

  const handleToggleEventMemory = (enabled: boolean) => {
    if (!currentConversationId) return;

    setConversations((prevConvs) =>
      prevConvs.map((conv) => {
        if (conv.id === currentConversationId) {
          return {
            ...conv,
            enableEventMemory: enabled,
            updatedAt: new Date(),
          };
        }
        return conv;
      })
    );
  };

  const handleTestPromptsChange = (prompts: PromptTestItem[]) => {
    if (!currentConversationId) return;

    setTestPrompts(prompts);
    setConversations((prevConvs) =>
      prevConvs.map((conv) => {
        if (conv.id === currentConversationId) {
          return {
            ...conv,
            testPrompts: prompts,
            updatedAt: new Date(),
          };
        }
        return conv;
      })
    );
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

  const handleSelectUserPrompt = async (promptId: string | undefined, autoSuggest: boolean) => {
    // 更新当前对话的用户提示词和自动建议设置
    setConversations((prevConvs) =>
      prevConvs.map((conv) => {
        if (conv.id === currentConversationId) {
          return {
            ...conv,
            userPromptId: promptId,
            autoSuggestEnabled: autoSuggest,
            updatedAt: new Date(),
          };
        }
        return conv;
      })
    );

    // 加载用户提示词内容
    if (promptId) {
      const prompt = await indexedDB_storage.getUserPrompt(promptId);
      setCurrentUserPrompt(prompt);
    } else {
      setCurrentUserPrompt(null);
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
      <div
        className="flex flex-1 flex-col transition-all duration-300"
        style={{ marginRight: `${testPanelWidth}px` }}
      >
        {/* 头部 - 优化样式，移除边框 */}
        <header className="bg-surface-primary px-6 py-3 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-secondary">
                gemini 3.0 flash
              </span>
            </div>
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
              {/* 上下文按钮 */}
              <button
                onClick={() => setIsContextDialogOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border-medium hover:border-accent hover:bg-surface-hover transition-all text-text-secondary hover:text-accent"
                title="查看上下文"
              >
                <History className="h-4 w-4" />
                <span className="text-sm font-medium">上下文</span>
              </button>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* 消息列表 */}
        <div className="flex-1 overflow-hidden">
          <MessageList
            messages={currentConversation?.messages || []}
            onEditMessage={handleEditMessage}
          />
        </div>

        {/* 输入框 */}
        <ChatInput
          onSend={handleSend}
          isLoading={isLoading}
          onStop={handleStop}
          onOpenStates={() => setIsStatesDialogOpen(true)}
          onOpenEvents={() => setIsEventsDialogOpen(true)}
          onOpenUserPrompt={() => setIsUserPromptDialogOpen(true)}
          suggestedText={suggestedText}
          onSuggestedTextChange={setSuggestedText}
        />
      </div>

      {/* 系统提示词对话框 */}
      <SystemPromptDialog
        isOpen={isPromptDialogOpen}
        onClose={() => setIsPromptDialogOpen(false)}
        currentPromptId={currentConversation?.systemPromptId}
        onSelectPrompt={handleSelectSystemPrompt}
      />

      {/* 用户提示词对话框 */}
      <UserPromptDialog
        isOpen={isUserPromptDialogOpen}
        onClose={() => setIsUserPromptDialogOpen(false)}
        currentPromptId={currentConversation?.userPromptId}
        autoSuggestEnabled={currentConversation?.autoSuggestEnabled}
        onSelectPrompt={handleSelectUserPrompt}
      />

      {/* 建议确认对话框 */}
      <SuggestionConfirmDialog
        isOpen={isSuggestionDialogOpen}
        onClose={() => {
          setIsSuggestionDialogOpen(false);
          setSuggestedText('');
        }}
        suggestion={suggestedText}
        onConfirm={handleConfirmSuggestion}
        onReject={handleRejectSuggestion}
        isGenerating={isGeneratingSuggestion}
      />

      {/* 上下文对话框 */}
      <ContextDialog
        isOpen={isContextDialogOpen}
        onClose={() => setIsContextDialogOpen(false)}
        messages={currentConversation?.messages || []}
        memorySummary={currentConversation?.memorySummary}
        contextWindowSize={currentConversation?.contextWindowSize || 10}
        onSaveSettings={handleSaveContextSettings}
        onEditMessage={handleEditMessage}
        onUpdateSummary={handleManualUpdateSummary}
      />

      {/* 数值状态对话框 */}
      <StatesDialog
        isOpen={isStatesDialogOpen}
        onClose={() => setIsStatesDialogOpen(false)}
        states={currentConversation?.numericStates || []}
        onUpdateStates={handleUpdateStates}
      />

      {/* 事件记忆对话框 */}
      <EventsDialog
        isOpen={isEventsDialogOpen}
        onClose={() => setIsEventsDialogOpen(false)}
        events={currentConversation?.memoryEvents || []}
        enabled={currentConversation?.enableEventMemory || false}
        onToggle={handleToggleEventMemory}
      />

      {/* 测试提示词面板 */}
      <PromptTestPanel
        isOpen={isTestPanelOpen}
        onClose={() => setIsTestPanelOpen(false)}
        activePrompts={testPrompts}
        onTestPromptsChange={handleTestPromptsChange}
        onWidthChange={setTestPanelWidth}
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
    contextWindowSize: 10,
    numericStates: [],
    memoryEvents: [],
    enableEventMemory: false,
    testPrompts: [...PRESET_PROMPTS], // 添加预设提示词片段（默认禁用）
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
