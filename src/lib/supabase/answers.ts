import { supabase } from './client';
import type {
  Answer,
  AnswerInput,
  AnswerRow,
} from '@/types/community';

function transformAnswerRow(row: AnswerRow, hasUpvoted?: boolean): Answer {
  return {
    id: row.id,
    questionId: row.question_id,
    authorId: row.author_id,
    authorNickname: row.author_nickname,
    content: row.content,
    relation: row.relation,
    upvoteCount: row.upvote_count,
    createdAt: row.created_at,
    hasUpvoted,
  };
}

/** 질문별 답변 목록 조회 */
export async function fetchAnswers(
  questionId: string,
  currentUserId?: string
): Promise<{ data: Answer[]; error: string | null }> {
  const { data, error } = await supabase
    .from('answers')
    .select('*')
    .eq('question_id', questionId)
    .eq('is_hidden', false)
    .order('upvote_count', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  const answers = data as AnswerRow[];

  // 현재 사용자의 좋아요 여부 확인
  if (currentUserId && answers.length > 0) {
    const answerIds = answers.map((a) => a.id);
    const { data: upvotes } = await supabase
      .from('answer_upvotes')
      .select('answer_id')
      .eq('user_id', currentUserId)
      .in('answer_id', answerIds);

    const upvotedSet = new Set(
      (upvotes ?? []).map((u: { answer_id: string }) => u.answer_id)
    );

    return {
      data: answers.map((row) =>
        transformAnswerRow(row, upvotedSet.has(row.id))
      ),
      error: null,
    };
  }

  return {
    data: answers.map((row) => transformAnswerRow(row, false)),
    error: null,
  };
}

/** 답변 작성 */
export async function createAnswer(
  input: AnswerInput,
  authorId: string,
  authorNickname: string
): Promise<{ data: Answer | null; error: string | null }> {
  const { data, error } = await supabase
    .from('answers')
    .insert({
      question_id: input.questionId,
      author_id: authorId,
      author_nickname: authorNickname,
      content: input.content,
      relation: input.relation,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: transformAnswerRow(data as AnswerRow, false),
    error: null,
  };
}

/** 답변 삭제 (본인만 가능 - RLS 처리) */
export async function deleteAnswer(
  answerId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('answers')
    .delete()
    .eq('id', answerId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

/** 좋아요 토글 */
export async function toggleUpvote(
  answerId: string,
  userId: string,
  hasUpvoted: boolean
): Promise<{ error: string | null }> {
  if (hasUpvoted) {
    const { error } = await supabase
      .from('answer_upvotes')
      .delete()
      .eq('user_id', userId)
      .eq('answer_id', answerId);
    return { error: error?.message ?? null };
  } else {
    const { error } = await supabase
      .from('answer_upvotes')
      .insert({ user_id: userId, answer_id: answerId });
    return { error: error?.message ?? null };
  }
}

/** 오늘 작성한 답변 수 조회 (Rate limiting) */
export async function getTodayAnswerCount(
  authorId: string
): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', authorId)
    .gte('created_at', today.toISOString());

  return count ?? 0;
}
