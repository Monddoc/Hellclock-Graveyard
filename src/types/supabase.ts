/** Supabase generated types for `deaths` table (minimal for client). */
export interface Database {
  public: {
    Tables: {
      deaths: {
        Row: {
          id: string;
          user_id: string;
          character_name: string;
          class_id: number;
          level: number;
          damage_taken: number | null;
          career_seconds: number | null;
          career_runs: number | null;
          career_kills: number | null;
          career_bosses: number | null;
          career_gold: number | null;
          career_soulstones: number | null;
          is_hardcore: boolean;
          death_date: string;
          unique_hash: string;
          respects_paid: number;
          report_count: number;
          skill_ids: number[] | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          character_name: string;
          class_id: number;
          level: number;
          damage_taken?: number | null;
          career_seconds?: number | null;
          career_runs?: number | null;
          career_kills?: number | null;
          career_bosses?: number | null;
          career_gold?: number | null;
          career_soulstones?: number | null;
          is_hardcore?: boolean;
          death_date?: string;
          unique_hash: string;
          respects_paid?: number;
          report_count?: number;
          skill_ids?: number[] | null;
        };
        Update: Partial<Database['public']['Tables']['deaths']['Insert']>;
      };
    };
  };
}
