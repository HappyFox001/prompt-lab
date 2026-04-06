import { NextRequest, NextResponse } from 'next/server';
import {
  createFeedback,
  getAllFeedbacks,
  getFeedbacksByReviewer,
  getFeedbackById,
  getReviewerStats,
  deleteFeedback,
  FeedbackData,
  FeedbackMessageData,
} from '@/lib/sqlite';
import { v4 as uuidv4 } from 'uuid';

// 获取反馈列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reviewer = searchParams.get('reviewer');
    const id = searchParams.get('id');
    const stats = searchParams.get('stats');

    if (stats === 'true') {
      const reviewerStats = getReviewerStats();
      return NextResponse.json({ stats: reviewerStats });
    }

    if (id) {
      const result = getFeedbackById(id);
      if (!result) {
        return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
      }
      return NextResponse.json(result);
    }

    if (reviewer) {
      const feedbacks = getFeedbacksByReviewer(reviewer);
      return NextResponse.json({ feedbacks });
    }

    const feedbacks = getAllFeedbacks();
    return NextResponse.json({ feedbacks });
  } catch (error) {
    console.error('Error fetching feedbacks:', error);
    return NextResponse.json({ error: 'Failed to fetch feedbacks' }, { status: 500 });
  }
}

// 创建新反馈
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      conversationId,
      reviewerName,
      description,
      selectedMessages, // 改为选中的消息ID数组
      evaluations,
      systemPrompt,
      userPrompt,
    } = body;

    if (!conversationId || !reviewerName || !selectedMessages || selectedMessages.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: conversationId, reviewerName, selectedMessages' },
        { status: 400 }
      );
    }

    const feedbackId = uuidv4();
    const now = new Date().toISOString();

    const feedback: FeedbackData = {
      id: feedbackId,
      conversationId,
      reviewerName: reviewerName.trim(),
      description: description?.trim() || undefined,
      createdAt: now,
      // 提示词信息
      systemPromptName: systemPrompt?.name,
      systemPromptContent: systemPrompt?.content,
      userPromptName: userPrompt?.name,
      userPromptContent: userPrompt?.content,
      // 用户扮演端评估
      userLanguageNaturalness: evaluations?.userLanguageNaturalness,
      userBehaviorCultural: evaluations?.userBehaviorCultural,
      userEmotionReasonableness: evaluations?.userEmotionReasonableness,
      userProductUsage: evaluations?.userProductUsage,
      userExploration: evaluations?.userExploration,
      userOverall: evaluations?.userOverall,
      // 产品端评估
      productCharacterStability: evaluations?.productCharacterStability,
      productWorldviewConsistency: evaluations?.productWorldviewConsistency,
      productInputHandling: evaluations?.productInputHandling,
      productPlotProgression: evaluations?.productPlotProgression,
      productLongConversationStability: evaluations?.productLongConversationStability,
      productRepetition: evaluations?.productRepetition,
      productExplorationSupport: evaluations?.productExplorationSupport,
    };

    // 只保存选中的消息
    const messages: FeedbackMessageData[] = selectedMessages.map(
      (msg: { id: string; role: string; content: string; timestamp?: string }, index: number) => ({
        id: uuidv4(),
        feedbackId,
        messageId: msg.id,
        messageRole: msg.role,
        messageContent: msg.content,
        messageTimestamp: msg.timestamp,
        isSelected: true, // 全部是选中的
        contextPosition: index,
      })
    );

    createFeedback(feedback, messages);

    return NextResponse.json({
      success: true,
      feedbackId,
      message: 'Feedback created successfully',
    });
  } catch (error) {
    console.error('Error creating feedback:', error);
    return NextResponse.json({ error: 'Failed to create feedback' }, { status: 500 });
  }
}

// 删除反馈
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing feedback id' }, { status: 400 });
    }

    deleteFeedback(id);
    return NextResponse.json({ success: true, message: 'Feedback deleted successfully' });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    return NextResponse.json({ error: 'Failed to delete feedback' }, { status: 500 });
  }
}
