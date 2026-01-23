import { describe, it, expect } from 'vitest';
import {
  CATEGORY_LABELS,
  RELATION_LABELS,
  type QuestionCategory,
  type AnswerRelation,
  type QuestionRow,
  type AnswerRow,
  type UserProfileRow,
} from '../community';

describe('Community types', () => {
  describe('CATEGORY_LABELS', () => {
    it('should have labels for all categories', () => {
      const categories: QuestionCategory[] = [
        'meal', 'teacher', 'facility', 'bus',
        'program', 'safety', 'cost', 'other',
      ];
      categories.forEach((cat) => {
        expect(CATEGORY_LABELS[cat]).toBeDefined();
        expect(typeof CATEGORY_LABELS[cat]).toBe('string');
        expect(CATEGORY_LABELS[cat].length).toBeGreaterThan(0);
      });
    });

    it('should have expected Korean labels', () => {
      expect(CATEGORY_LABELS.meal).toBe('급식');
      expect(CATEGORY_LABELS.teacher).toBe('선생님');
      expect(CATEGORY_LABELS.facility).toBe('시설');
      expect(CATEGORY_LABELS.bus).toBe('통학버스');
      expect(CATEGORY_LABELS.program).toBe('프로그램');
      expect(CATEGORY_LABELS.safety).toBe('안전');
      expect(CATEGORY_LABELS.cost).toBe('비용');
      expect(CATEGORY_LABELS.other).toBe('기타');
    });
  });

  describe('RELATION_LABELS', () => {
    it('should have labels for all relations', () => {
      const relations: AnswerRelation[] = [
        'current_parent', 'graduated_parent', 'prospective', 'other',
      ];
      relations.forEach((rel) => {
        expect(RELATION_LABELS[rel]).toBeDefined();
        expect(typeof RELATION_LABELS[rel]).toBe('string');
        expect(RELATION_LABELS[rel].length).toBeGreaterThan(0);
      });
    });

    it('should have expected Korean labels', () => {
      expect(RELATION_LABELS.current_parent).toBe('재원 학부모');
      expect(RELATION_LABELS.graduated_parent).toBe('졸업 학부모');
      expect(RELATION_LABELS.prospective).toBe('입학 예정');
      expect(RELATION_LABELS.other).toBe('기타');
    });
  });

  describe('Row type shapes', () => {
    it('QuestionRow should have expected fields', () => {
      const row: QuestionRow = {
        id: 'q-1',
        kindergarten_id: 'K001',
        author_id: 'u-1',
        author_nickname: '테스트유저',
        category: 'meal',
        title: '급식 질문',
        content: '내용',
        answer_count: 3,
        created_at: '2025-01-01T00:00:00Z',
      };
      expect(row.id).toBe('q-1');
      expect(row.kindergarten_id).toBe('K001');
      expect(row.category).toBe('meal');
      expect(row.answer_count).toBe(3);
    });

    it('AnswerRow should have expected fields', () => {
      const row: AnswerRow = {
        id: 'a-1',
        question_id: 'q-1',
        author_id: 'u-2',
        author_nickname: '답변자',
        content: '답변 내용',
        relation: 'current_parent',
        upvote_count: 5,
        created_at: '2025-01-02T00:00:00Z',
      };
      expect(row.id).toBe('a-1');
      expect(row.relation).toBe('current_parent');
      expect(row.upvote_count).toBe(5);
    });

    it('UserProfileRow should have expected fields', () => {
      const row: UserProfileRow = {
        id: 'u-1',
        nickname: '닉네임',
        created_at: '2025-01-01T00:00:00Z',
      };
      expect(row.id).toBe('u-1');
      expect(row.nickname).toBe('닉네임');
    });
  });
});
