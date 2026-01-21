/**
 * Supabase 데이터베이스 타입 정의
 */

export interface Database {
  public: {
    Tables: {
      kindergartens: {
        Row: {
          id: number;
          kindercode: string;
          name: string;
          address: string;
          lat: number;
          lng: number;
          sido_code: string | null;
          sigungu_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          kindercode: string;
          name: string;
          address: string;
          lat: number;
          lng: number;
          sido_code?: string | null;
          sigungu_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          kindercode?: string;
          name?: string;
          address?: string;
          lat?: number;
          lng?: number;
          sido_code?: string | null;
          sigungu_code?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type KindergartenRow = Database['public']['Tables']['kindergartens']['Row'];
export type KindergartenInsert = Database['public']['Tables']['kindergartens']['Insert'];
export type KindergartenUpdate = Database['public']['Tables']['kindergartens']['Update'];
