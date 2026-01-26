import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase client
const mockGetSession = vi.fn();
const mockSignInWithOtp = vi.fn();
const mockSignOut = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSelectSingle = vi.fn();
const mockInsertSelectSingle = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      signInWithOtp: (opts: unknown) => mockSignInWithOtp(opts),
      signOut: () => mockSignOut(),
      onAuthStateChange: (cb: unknown) => mockOnAuthStateChange(cb),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => mockSelectSingle(),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: () => mockInsertSelectSingle(),
        }),
      }),
    }),
  },
}));

import { useAuthStore } from '../authStore';

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the store
    useAuthStore.setState({
      user: null,
      profile: null,
      isLoading: true,
      isAuthModalOpen: false,
      pendingAction: null,
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.profile).toBeNull();
      expect(state.isLoading).toBe(true);
      expect(state.isAuthModalOpen).toBe(false);
      expect(state.pendingAction).toBeNull();
    });
  });

  describe('signInWithOtp', () => {
    it('should call supabase signInWithOtp with email', async () => {
      mockSignInWithOtp.mockResolvedValue({ error: null });

      const result = await useAuthStore.getState().signInWithOtp('test@example.com');

      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        email: 'test@example.com',
        options: { shouldCreateUser: true },
      });
      expect(result.error).toBeNull();
    });

    it('should return error message on failure', async () => {
      mockSignInWithOtp.mockResolvedValue({
        error: { message: 'Rate limit exceeded' },
      });

      const result = await useAuthStore.getState().signInWithOtp('test@example.com');

      expect(result.error).toBe('Rate limit exceeded');
    });
  });

  describe('signOut', () => {
    it('should clear user and profile', async () => {
      useAuthStore.setState({
        user: { id: 'user-1' } as ReturnType<typeof useAuthStore.getState>['user'],
        profile: { id: 'user-1', nickname: 'Test', createdAt: '2025-01-01' },
      });

      mockSignOut.mockResolvedValue({});

      await useAuthStore.getState().signOut();

      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().profile).toBeNull();
    });
  });

  describe('createProfile', () => {
    it('should reject nicknames shorter than 2 chars', async () => {
      useAuthStore.setState({
        user: { id: 'user-1' } as ReturnType<typeof useAuthStore.getState>['user'],
      });

      const result = await useAuthStore.getState().createProfile('A');

      expect(result.error).toBe('닉네임은 2~20자여야 합니다.');
    });

    it('should reject nicknames longer than 20 chars', async () => {
      useAuthStore.setState({
        user: { id: 'user-1' } as ReturnType<typeof useAuthStore.getState>['user'],
      });

      const result = await useAuthStore.getState().createProfile('A'.repeat(21));

      expect(result.error).toBe('닉네임은 2~20자여야 합니다.');
    });

    it('should return error when not logged in', async () => {
      const result = await useAuthStore.getState().createProfile('닉네임');

      expect(result.error).toBe('로그인이 필요합니다.');
    });

    it('should handle duplicate nickname error', async () => {
      useAuthStore.setState({
        user: { id: 'user-1' } as ReturnType<typeof useAuthStore.getState>['user'],
      });
      mockInsertSelectSingle.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'unique_violation' },
      });

      const result = await useAuthStore.getState().createProfile('중복닉네임');

      expect(result.error).toBe('이미 사용 중인 닉네임입니다.');
    });

    it('should set profile on success', async () => {
      useAuthStore.setState({
        user: { id: 'user-1' } as ReturnType<typeof useAuthStore.getState>['user'],
      });
      mockInsertSelectSingle.mockResolvedValue({
        data: { id: 'user-1', nickname: '새닉네임', created_at: '2025-01-20T00:00:00Z' },
        error: null,
      });

      const result = await useAuthStore.getState().createProfile('새닉네임');

      expect(result.error).toBeNull();
      expect(useAuthStore.getState().profile?.nickname).toBe('새닉네임');
    });
  });

  describe('openAuthModal / closeAuthModal', () => {
    it('should open modal with pending action', () => {
      const action = vi.fn();
      useAuthStore.getState().openAuthModal(action);

      expect(useAuthStore.getState().isAuthModalOpen).toBe(true);
      expect(useAuthStore.getState().pendingAction).toBe(action);
    });

    it('should close modal and clear pending action', () => {
      useAuthStore.setState({ isAuthModalOpen: true, pendingAction: vi.fn() });

      useAuthStore.getState().closeAuthModal();

      expect(useAuthStore.getState().isAuthModalOpen).toBe(false);
      expect(useAuthStore.getState().pendingAction).toBeNull();
    });
  });

  describe('requireAuth', () => {
    it('should execute action immediately if user and profile exist', () => {
      const action = vi.fn();
      useAuthStore.setState({
        user: { id: 'user-1' } as ReturnType<typeof useAuthStore.getState>['user'],
        profile: { id: 'user-1', nickname: 'Test', createdAt: '2025-01-01' },
      });

      useAuthStore.getState().requireAuth(action);

      expect(action).toHaveBeenCalled();
      expect(useAuthStore.getState().isAuthModalOpen).toBe(false);
    });

    it('should open auth modal if user is not logged in', () => {
      const action = vi.fn();

      useAuthStore.getState().requireAuth(action);

      expect(action).not.toHaveBeenCalled();
      expect(useAuthStore.getState().isAuthModalOpen).toBe(true);
      expect(useAuthStore.getState().pendingAction).toBe(action);
    });
  });
});
