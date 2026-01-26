import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AnswerRow } from '@/types/community';

// Mock the supabase client with per-test setup
const mockFrom = vi.fn();

vi.mock('../client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { fetchAnswers, createAnswer, toggleUpvote, getTodayAnswerCount } from '../answers';

const mockAnswerRow: AnswerRow = {
  id: 'a-1',
  question_id: 'q-123',
  author_id: 'user-2',
  author_nickname: '답변자',
  content: '급식 맛있어요!',
  relation: 'current_parent',
  upvote_count: 3,
  created_at: '2025-01-20T12:00:00Z',
};

function createChainedQuery(resolvedValue: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue(resolvedValue),
          }),
        }),
      }),
    }),
  };
}

describe('answers CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchAnswers', () => {
    it('should fetch answers for a question without auth', async () => {
      mockFrom.mockReturnValue(
        createChainedQuery({ data: [mockAnswerRow], error: null })
      );

      const result = await fetchAnswers('q-123');

      expect(mockFrom).toHaveBeenCalledWith('answers');
      expect(result.error).toBeNull();
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('a-1');
      expect(result.data[0].questionId).toBe('q-123');
      expect(result.data[0].content).toBe('급식 맛있어요!');
      expect(result.data[0].relation).toBe('current_parent');
      expect(result.data[0].upvoteCount).toBe(3);
      expect(result.data[0].hasUpvoted).toBe(false);
    });

    it('should include upvote status for authenticated user', async () => {
      // First call: fetch answers
      mockFrom.mockReturnValueOnce(
        createChainedQuery({ data: [mockAnswerRow], error: null })
      );
      // Second call: fetch upvotes
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [{ answer_id: 'a-1' }],
            }),
          }),
        }),
      });

      const result = await fetchAnswers('q-123', 'user-1');

      expect(result.data[0].hasUpvoted).toBe(true);
    });

    it('should mark hasUpvoted false when user has not upvoted', async () => {
      mockFrom.mockReturnValueOnce(
        createChainedQuery({ data: [mockAnswerRow], error: null })
      );
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [],
            }),
          }),
        }),
      });

      const result = await fetchAnswers('q-123', 'user-1');

      expect(result.data[0].hasUpvoted).toBe(false);
    });

    it('should return empty array on error', async () => {
      mockFrom.mockReturnValue(
        createChainedQuery({ data: null, error: { message: 'DB error' } })
      );

      const result = await fetchAnswers('q-123');

      expect(result.data).toEqual([]);
      expect(result.error).toBe('DB error');
    });
  });

  describe('createAnswer', () => {
    it('should create an answer with correct transform', async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockAnswerRow,
              error: null,
            }),
          }),
        }),
      });

      const result = await createAnswer(
        { questionId: 'q-123', content: '급식 맛있어요!', relation: 'current_parent' },
        'user-2',
        '답변자'
      );

      expect(result.data).not.toBeNull();
      expect(result.data?.relation).toBe('current_parent');
      expect(result.data?.hasUpvoted).toBe(false);
    });

    it('should handle insert error', async () => {
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

      const result = await createAnswer(
        { questionId: 'q-123', content: 'test', relation: 'other' },
        'user-1',
        '유저'
      );

      expect(result.data).toBeNull();
      expect(result.error).toBe('Insert failed');
    });
  });

  describe('toggleUpvote', () => {
    it('should delete upvote when hasUpvoted is true', async () => {
      mockFrom.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      });

      const result = await toggleUpvote('a-1', 'user-1', true);

      expect(mockFrom).toHaveBeenCalledWith('answer_upvotes');
      expect(result.error).toBeNull();
    });

    it('should insert upvote when hasUpvoted is false', async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      });

      const result = await toggleUpvote('a-1', 'user-1', false);

      expect(mockFrom).toHaveBeenCalledWith('answer_upvotes');
      expect(result.error).toBeNull();
    });
  });

  describe('getTodayAnswerCount', () => {
    it('should return today answer count', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({
              count: 5,
            }),
          }),
        }),
      });

      const count = await getTodayAnswerCount('user-1');

      expect(count).toBe(5);
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

      const count = await getTodayAnswerCount('user-1');

      expect(count).toBe(0);
    });
  });
});
