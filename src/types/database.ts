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
          // 상세 정보 캐싱 필드
          type: string | null;
          capacity: number | null;
          has_bus: boolean | null;
          bus_count: number | null;
          meal_type: string | null;
          has_after_school: boolean | null;
          area_per_child: number | null;
          phone: string | null;
          has_playground: boolean | null;
          detail_cached_at: string | null;
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
          // 상세 정보 캐싱 필드
          type?: string | null;
          capacity?: number | null;
          has_bus?: boolean | null;
          bus_count?: number | null;
          meal_type?: string | null;
          has_after_school?: boolean | null;
          area_per_child?: number | null;
          phone?: string | null;
          has_playground?: boolean | null;
          detail_cached_at?: string | null;
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
          // 상세 정보 캐싱 필드
          type?: string | null;
          capacity?: number | null;
          has_bus?: boolean | null;
          bus_count?: number | null;
          meal_type?: string | null;
          has_after_school?: boolean | null;
          area_per_child?: number | null;
          phone?: string | null;
          has_playground?: boolean | null;
          detail_cached_at?: string | null;
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

/**
 * DB에서 캐싱된 상세 데이터가 있는지 확인하는 타입 가드
 */
export function hasDetailCache(row: KindergartenRow): boolean {
  return row.detail_cached_at !== null && row.capacity !== null;
}
