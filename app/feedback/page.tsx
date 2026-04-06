'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, User, MessageSquare, Calendar, Trash2, ChevronDown, ChevronUp, Search, FileText } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface Feedback {
  id: string;
  conversation_id: string;
  reviewer_name: string;
  description: string | null;
  created_at: string;
  system_prompt_name: string | null;
  system_prompt_content: string | null;
  user_prompt_name: string | null;
  user_prompt_content: string | null;
}

interface FeedbackMessage {
  id: string;
  feedback_id: string;
  message_id: string;
  message_role: string;
  message_content: string;
  message_timestamp: string | null;
  is_selected: number;
  context_position: number;
}

interface ReviewerStat {
  reviewer_name: string;
  count: number;
}

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [reviewerStats, setReviewerStats] = useState<ReviewerStat[]>([]);
  const [selectedReviewer, setSelectedReviewer] = useState<string | null>(null);
  const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null);
  const [feedbackMessages, setFeedbackMessages] = useState<Record<string, FeedbackMessage[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadFeedbacks = async (reviewer?: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (reviewer) params.set('reviewer', reviewer);

      const response = await fetch(`/api/feedback?${params}`);
      const data = await response.json();
      setFeedbacks(data.feedbacks || []);
    } catch (error) {
      console.error('Failed to load feedbacks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/feedback?stats=true');
      const data = await response.json();
      setReviewerStats(data.stats || []);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const loadFeedbackMessages = async (feedbackId: string) => {
    if (feedbackMessages[feedbackId]) return;

    try {
      const response = await fetch(`/api/feedback?id=${feedbackId}`);
      const data = await response.json();
      if (data.messages) {
        setFeedbackMessages((prev) => ({
          ...prev,
          [feedbackId]: data.messages,
        }));
      }
    } catch (error) {
      console.error('Failed to load feedback messages:', error);
    }
  };

  const deleteFeedback = async (id: string) => {
    if (!confirm('このフィードバックを削除しますか？')) return;

    try {
      await fetch(`/api/feedback?id=${id}`, { method: 'DELETE' });
      setFeedbacks((prev) => prev.filter((f) => f.id !== id));
      loadStats();
    } catch (error) {
      console.error('Failed to delete feedback:', error);
    }
  };

  useEffect(() => {
    loadStats();
    loadFeedbacks();
  }, []);

  useEffect(() => {
    loadFeedbacks(selectedReviewer || undefined);
  }, [selectedReviewer]);

  const toggleExpand = (feedbackId: string) => {
    if (expandedFeedback === feedbackId) {
      setExpandedFeedback(null);
    } else {
      setExpandedFeedback(feedbackId);
      loadFeedbackMessages(feedbackId);
    }
  };

  const cleanContent = (content: string): string => {
    const idx = content.indexOf('###EMOTION###');
    return idx !== -1 ? content.substring(0, idx).trim() : content;
  };

  const filteredFeedbacks = feedbacks.filter((f) =>
    searchTerm
      ? f.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.reviewer_name.toLowerCase().includes(searchTerm.toLowerCase())
      : true
  );

  return (
    <div className="min-h-screen bg-surface-primary">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-surface-primary border-b border-border-medium px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-text-secondary" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-text-primary">フィードバック履歴</h1>
              <p className="text-sm text-text-tertiary">
                全{feedbacks.length}件
              </p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="検索..."
              className="pl-10 pr-4 py-2 rounded-lg border border-border-medium bg-surface-primary text-text-primary placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all w-64"
            />
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* 担当者リスト */}
          <div className="w-64 flex-shrink-0">
            <div className="sticky top-24 bg-surface-secondary rounded-xl border border-border-medium p-4">
              <h2 className="text-sm font-semibold text-text-secondary mb-3">担当者</h2>
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedReviewer(null)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                    selectedReviewer === null
                      ? 'bg-accent/10 text-accent font-medium'
                      : 'hover:bg-surface-hover text-text-secondary'
                  )}
                >
                  全て ({reviewerStats.reduce((sum, s) => sum + s.count, 0)})
                </button>
                {reviewerStats.map((stat) => (
                  <button
                    key={stat.reviewer_name}
                    onClick={() => setSelectedReviewer(stat.reviewer_name)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between',
                      selectedReviewer === stat.reviewer_name
                        ? 'bg-accent/10 text-accent font-medium'
                        : 'hover:bg-surface-hover text-text-secondary'
                    )}
                  >
                    <span>{stat.reviewer_name}</span>
                    <span className="text-xs bg-surface-hover rounded-full px-2 py-0.5">
                      {stat.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* フィードバックリスト */}
          <div className="flex-1 space-y-4">
            {isLoading ? (
              <div className="text-center py-12 text-text-tertiary">読み込み中...</div>
            ) : filteredFeedbacks.length === 0 ? (
              <div className="text-center py-12 text-text-tertiary">
                {searchTerm ? '該当するフィードバックがありません' : 'フィードバックがありません'}
              </div>
            ) : (
              filteredFeedbacks.map((feedback) => (
                <div
                  key={feedback.id}
                  className="bg-surface-secondary rounded-xl border border-border-medium overflow-hidden"
                >
                  {/* ヘッダー */}
                  <div
                    className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-surface-hover transition-colors"
                    onClick={() => toggleExpand(feedback.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-text-primary">
                            {feedback.reviewer_name}
                          </span>
                          <span className="text-xs text-text-tertiary flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(feedback.created_at).toLocaleString('ja-JP')}
                          </span>
                        </div>
                        {feedback.description && (
                          <p className="text-sm text-text-secondary mt-1 line-clamp-1">
                            {feedback.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFeedback(feedback.id);
                        }}
                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-text-tertiary hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      {expandedFeedback === feedback.id ? (
                        <ChevronUp className="h-5 w-5 text-text-tertiary" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-text-tertiary" />
                      )}
                    </div>
                  </div>

                  {/* 詳細 */}
                  {expandedFeedback === feedback.id && (
                    <div className="border-t border-border-medium px-5 py-4 space-y-4">
                      {/* プロンプト情報 */}
                      {(feedback.system_prompt_name || feedback.user_prompt_name) && (
                        <div className="space-y-2">
                          <h3 className="text-sm font-semibold text-text-secondary mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            プロンプト情報
                          </h3>
                          <div className="grid grid-cols-2 gap-3">
                            {feedback.system_prompt_name && (
                              <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded">
                                    System
                                  </span>
                                  <span className="text-sm font-medium text-text-primary">
                                    {feedback.system_prompt_name}
                                  </span>
                                </div>
                                {feedback.system_prompt_content && (
                                  <p className="text-xs text-text-tertiary line-clamp-3 whitespace-pre-wrap">
                                    {feedback.system_prompt_content.slice(0, 200)}
                                    {feedback.system_prompt_content.length > 200 && '...'}
                                  </p>
                                )}
                              </div>
                            )}
                            {feedback.user_prompt_name && (
                              <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-semibold text-blue-600 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded">
                                    User
                                  </span>
                                  <span className="text-sm font-medium text-text-primary">
                                    {feedback.user_prompt_name}
                                  </span>
                                </div>
                                {feedback.user_prompt_content && (
                                  <p className="text-xs text-text-tertiary line-clamp-3 whitespace-pre-wrap">
                                    {feedback.user_prompt_content.slice(0, 200)}
                                    {feedback.user_prompt_content.length > 200 && '...'}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* メッセージ */}
                      <div>
                        <h3 className="text-sm font-semibold text-text-secondary mb-2">
                          選択されたメッセージ
                        </h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {(feedbackMessages[feedback.id] || []).map((msg) => (
                            <div
                              key={msg.id}
                              className="flex gap-2 p-3 rounded-lg bg-surface-primary"
                            >
                              <div
                                className={cn(
                                  'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center',
                                  msg.message_role === 'user'
                                    ? 'bg-blue-100 dark:bg-blue-900/30'
                                    : 'bg-emerald-100 dark:bg-emerald-900/30'
                                )}
                              >
                                {msg.message_role === 'user' ? (
                                  <User className="h-3 w-3 text-blue-600" />
                                ) : (
                                  <MessageSquare className="h-3 w-3 text-emerald-600" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-medium text-text-secondary">
                                  {msg.message_role === 'user' ? 'ユーザー' : 'AI'}
                                </span>
                                <p className="text-sm text-text-primary">
                                  {cleanContent(msg.message_content)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 説明 */}
                      {feedback.description && (
                        <div>
                          <h3 className="text-sm font-semibold text-text-secondary mb-2">
                            問題の説明
                          </h3>
                          <p className="text-sm text-text-primary bg-surface-primary p-3 rounded-lg">
                            {feedback.description}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
