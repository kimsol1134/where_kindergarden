import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { QuestionRow } from '@/types/community';

// Mock the supabase client with per-test setup
const mockFrom = vi.fn();

vi.mock('../client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { fetchQuestions, fetchQuestion, createQuestion, getTodayQuestionCount } from '../questions';

const mockQuestionRow: QuestionRow = {
  id: 'q-123',
  kindergarten_id: 'K001',
  author_id: 'user-1',
  author_nickname: '학부모1',
  category: 'meal',
  title: '급식은 어떤가요?',
  content: '맛있나요?',
  answer_count: 2,
  created_at: '2025-01-20T10:00:00Z',
};

function createFetchChain(resolvedValue: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue(resolvedValue),
        }),
      }),
    }),
  };
}

function createFetchWithCategoryChain(resolvedValue: { data: unknown; error: unknown }) {
  const categoryEq = vi.fn().mockResolvedValue(resolvedValue);
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            eq: categoryEq,
          }),
        }),
      }),
    }),
    _categoryEq: categoryEq,
  };
}

describe('questions CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchQuestions', () => {
    it('should fetch questions for a kindergarten', async () => {
      mockFrom.mockReturnValue(
        createFetchChain({ data: [mockQuestionRow], error: null })
      );

      const result = await fetchQuestions('K001');

      expect(mockFrom).toHaveBeenCalledWith('questions');
      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('q-123');
      expect(result.data[0].kindergartenId).toBe('K001');
      expect(result.data[0].authorNickname).toBe('학부모1');
      expect(result.data[0].category).toBe('meal');
      expect(result.data[0].title).toBe('급식은 어떤가요?');
      expect(result.data[0].answerCount).toBe(2);
    });

    it('should filter by category when provided', async () => {
      const chain = createFetchWithCategoryChain({ data: [mockQuestionRow], error: null });
      mockFrom.mockReturnValue(chain);

      await fetchQuestions('K001', { category: 'meal' });

      expect(chain._categoryEq).toHaveBeenCalledWith('category', 'meal');
    });

    it('should return empty array on error', async () => {
      mockFrom.mockReturnValue(
        createFetchChain({ data: null, error: { message: 'Network error' } })
      );

      const result = await fetchQuestions('K001');

      expect(result.data).toEqual([]);
      expect(result.error).toBe('Network error');
    });

    it('should transform snake_case to camelCase', async () => {
      mockFrom.mockReturnValue(
        createFetchChain({ data: [mockQuestionRow], error: null })
      );

      const result = await fetchQuestions('K001');

      expect(result.data[0]).toEqual({
        id: 'q-123',
        kindergartenId: 'K001',
        authorId: 'user-1',
        authorNickname: '학부모1',
        category: 'meal',
        title: '급식은 어떤가요?',
        content: '맛있나요?',
        answerCount: 2,
        createdAt: '2025-01-20T10:00:00Z',
      });
    });
  });

  describe('fetchQuestion', () => {
    it('should fetch a single question by id', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockQuestionRow,
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await fetchQuestion('q-123');

      expect(result.data).not.toBeNull();
      expect(result.data?.id).toBe('q-123');
      expect(result.data?.title).toBe('급식은 어떤가요?');
    });

    it('should return null on not found', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' },
              }),
            }),
          }),
        }),
      });

      const result = await fetchQuestion('nonexistent');

      expect(result.data).toBeNull();
      expect(result.error).toBe('Not found');
    });
  });

  describe('createQuestion', () => {
    it('should create a new question with correct params', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockQuestionRow,
            error: null,
          }),
        }),
      });
      mockFrom.mockReturnValue({ insert: mockInsert });

      const result = await createQuestion(
        {
          kindergartenId: 'K001',
          category: 'meal',
          title: '급식은 어떤가요?',
          content: '맛있나요?',
        },
        'user-1',
        '학부모1'
      );

      expect(mockFrom).toHaveBeenCalledWith('questions');
      expect(mockInsert).toHaveBeenCalledWith({
        kindergarten_id: 'K001',
        author_id: 'user-1',
        author_nickname: '학부모1',
        category: 'meal',
        title: '급식은 어떤가요?',
        content: '맛있나요?',
      });
      expect(result.data).not.toBeNull();
      expect(result.data?.category).toBe('meal');
    });

    it('should pass null for content when not provided', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...mockQuestionRow, content: null },
            error: null,
          }),
        }),
      });
      mockFrom.mockReturnValue({ insert: mockInsert });

      await createQuestion(
        { kindergartenId: 'K001', category: 'other', title: 'test' },
        'user-1',
        '유저'
      );

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ content: null })
      );
    });

    it('should handle insert errors', async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Insert failed' },
            }),
          }),
        }),
      });

      const result = await createQuestion(
        { kindergartenId: 'K001', category: 'other', title: 'test' },
        'user-1',
        '유저'
      );

      expect(result.data).toBeNull();
      expect(result.error).toBe('Insert failed');
    });
  });

  describe('getTodayQuestionCount', () => {
    it('should return count of today questions', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              count: 3,
            }),
          }),
        }),
      });

      const count = await getTodayQuestionCount('user-1');

      expect(count).toBe(3);
    });

    it('should return 0 when count is null', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              count: null,
            }),
          }),
        }),
      });

      const count = await getTodayQuestionCount('user-1');

      expect(count).toBe(0);
    });
  });
});
