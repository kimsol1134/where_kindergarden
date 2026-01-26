/**
 * Q&A 커뮤니티 관련 타입 정의
 */

/** 질문 카테고리 */
export type QuestionCategory =
  | 'meal'
  | 'teacher'
  | 'facility'
  | 'bus'
  | 'program'
  | 'safety'
  | 'cost'
  | 'other';

/** 답변자 관계 */
export type AnswerRelation =
  | 'current_parent'
  | 'graduated_parent'
  | 'prospective'
  | 'other';

/** 카테고리 라벨 매핑 */
export const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  meal: '급식',
  teacher: '선생님',
  facility: '시설',
  bus: '통학버스',
  program: '프로그램',
  safety: '안전',
  cost: '비용',
  other: '기타',
};

/** 관계 라벨 매핑 */
export const RELATION_LABELS: Record<AnswerRelation, string> = {
  current_parent: '재원 학부모',
  graduated_parent: '졸업 학부모',
  prospective: '입학 예정',
  other: '기타',
};

/** 사용자 프로필 */
export interface UserProfile {
  id: string;
  nickname: string;
  createdAt: string;
}

/** 질문 */
export interface Question {
  id: string;
  kindergartenId: string;
  authorId: string;
  authorNickname: string;
  category: QuestionCategory;
  title: string;
  content: string | null;
  answerCount: number;
  createdAt: string;
}

/** 답변 */
export interface Answer {
  id: string;
  questionId: string;
  authorId: string;
  authorNickname: string;
  content: string;
  relation: AnswerRelation;
  upvoteCount: number;
  createdAt: string;
  hasUpvoted?: boolean;
}

/** 질문 작성 입력 */
export interface QuestionInput {
  kindergartenId: string;
  category: QuestionCategory;
  title: string;
  content?: string;
}

/** 답변 작성 입력 */
export interface AnswerInput {
  questionId: string;
  content: string;
  relation: AnswerRelation;
}

/** DB row → Question 변환용 raw 타입 */
export interface QuestionRow {
  id: string;
  kindergarten_id: string;
  author_id: string;
  author_nickname: string;
  category: QuestionCategory;
  title: string;
  content: string | null;
  answer_count: number;
  created_at: string;
}

/** DB row → Answer 변환용 raw 타입 */
export interface AnswerRow {
  id: string;
  question_id: string;
  author_id: string;
  author_nickname: string;
  content: string;
  relation: AnswerRelation;
  upvote_count: number;
  created_at: string;
}

/** DB row → UserProfile 변환용 raw 타입 */
export interface UserProfileRow {
  id: string;
  nickname: string;
  created_at: string;
}
