import { supabase } from './client';
import type {
  Question,
  QuestionInput,
  QuestionRow,
  QuestionCategory,
} from '@/types/community';

function transformQuestionRow(row: QuestionRow): Question {
  return {
    id: row.id,
    kindergartenId: row.kindergarten_id,
    authorId: row.author_id,
    authorNickname: row.author_nickname,
    category: row.category,
    title: row.title,
    content: row.content,
    answerCount: row.answer_count,
    createdAt: row.created_at,
  };
}

/** 유치원별 질문 목록 조회 */
export async function fetchQuestions(
  kindergartenId: string,
  options?: { category?: QuestionCategory }
): Promise<{ data: Question[]; error: string | null }> {
  let query = supabase
    .from('questions')
    .select('*')
    .eq('kindergarten_id', kindergartenId)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false });

  if (options?.category) {
    query = query.eq('category', options.category);
  }

  const { data, error } = await query;

  if (error) {
    return { data: [], error: error.message };
  }

  return {
    data: (data as QuestionRow[]).map(transformQuestionRow),
    error: null,
  };
}

/** 질문 단건 조회 */
export async function fetchQuestion(
  questionId: string
): Promise<{ data: Question | null; error: string | null }> {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('id', questionId)
    .eq('is_hidden', false)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: transformQuestionRow(data as QuestionRow),
    error: null,
  };
}

/** 질문 작성 */
export async function createQuestion(
  input: QuestionInput,
  authorId: string,
  authorNickname: string
): Promise<{ data: Question | null; error: string | null }> {
  const { data, error } = await supabase
    .from('questions')
    .insert({
      kindergarten_id: input.kindergartenId,
      author_id: authorId,
      author_nickname: authorNickname,
      category: input.category,
      title: input.title,
      content: input.content ?? null,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return {
    data: transformQuestionRow(data as QuestionRow),
    error: null,
  };
}

/** 질문 삭제 (본인만 가능 - RLS 처리) */
export async function deleteQuestion(
  questionId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', questionId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

/** 오늘 작성한 질문 수 조회 (Rate limiting) */
export async function getTodayQuestionCount(
  authorId: string
): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', authorId)
    .gte('created_at', today.toISOString());

  return count ?? 0;
}
