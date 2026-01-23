import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { UserProfile, UserProfileRow } from '@/types/community';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  pendingAction: (() => void) | null;
}

interface AuthActions {
  initialize: () => Promise<void>;
  signInWithOtp: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  setProfile: (profile: UserProfile) => void;
  fetchProfile: () => Promise<UserProfile | null>;
  createProfile: (nickname: string) => Promise<{ error: string | null }>;
  openAuthModal: (pendingAction?: () => void) => void;
  closeAuthModal: () => void;
  requireAuth: (action: () => void) => void;
}

function transformProfileRow(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    nickname: row.nickname,
    createdAt: row.created_at,
  };
}

export const useAuthStore = create<AuthState & AuthActions>()((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  isAuthModalOpen: false,
  pendingAction: null,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      set({ user: session.user });
      await get().fetchProfile();
    }
    set({ isLoading: false });

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        set({ user: session.user });
        await get().fetchProfile();
        const { pendingAction } = get();
        if (pendingAction) {
          pendingAction();
          set({ pendingAction: null });
        }
      } else if (event === 'SIGNED_OUT') {
        set({ user: null, profile: null });
      }
    });
  },

  signInWithOtp: async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    });
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },

  setProfile: (profile: UserProfile) => {
    set({ profile });
  },

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error || !data) {
      return null;
    }

    const profile = transformProfileRow(data as UserProfileRow);
    set({ profile });
    return profile;
  },

  createProfile: async (nickname: string) => {
    const { user } = get();
    if (!user) return { error: '로그인이 필요합니다.' };

    const trimmedNickname = nickname.trim();
    if (trimmedNickname.length < 2 || trimmedNickname.length > 20) {
      return { error: '닉네임은 2~20자여야 합니다.' };
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .insert({ id: user.id, nickname: trimmedNickname })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { error: '이미 사용 중인 닉네임입니다.' };
      }
      return { error: error.message };
    }

    const profile = transformProfileRow(data as UserProfileRow);
    set({ profile });
    return { error: null };
  },

  openAuthModal: (pendingAction?: () => void) => {
    set({ isAuthModalOpen: true, pendingAction: pendingAction ?? null });
  },

  closeAuthModal: () => {
    set({ isAuthModalOpen: false, pendingAction: null });
  },

  requireAuth: (action: () => void) => {
    const { user, profile } = get();
    if (user && profile) {
      action();
    } else {
      get().openAuthModal(action);
    }
  },
}));
