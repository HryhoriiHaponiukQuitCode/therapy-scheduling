// Типи схеми бази. Оновлюйте разом із міграцією: готовий файл — у Summary прогону job db-check у CI
// (supabase gen types typescript --local на одноразовій базі); або npm run db:types після npx supabase link на ваш проєкт. Ця стартова версія написана вручну
// й описує лише таблицю з міграції 20261012000000_profiles_and_roles.sql.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          role: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          role?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          role?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          email: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      therapist_availability: {
        Row: {
          id: number;
          therapist_email: string;
          weekday: number;
          start_hour: number;
          end_hour: number;
        };
        Insert: {
          id?: never;
          therapist_email: string;
          weekday: number;
          start_hour: number;
          end_hour: number;
        };
        Update: {
          id?: never;
          therapist_email?: string;
          weekday?: number;
          start_hour?: number;
          end_hour?: number;
        };
        Relationships: [];
      };
      holds: {
        Row: {
          id: string;
          therapist_id: string;
          slot_start: string;
          client_id: string;
          created_at: string;
          created_by: string | null;
          confirmed_at: string | null;
          confirmed_by: string | null;
        };
        Insert: {
          id?: string;
          therapist_id: string;
          slot_start: string;
          client_id: string;
          created_at?: string;
          created_by?: string | null;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
        };
        Update: {
          id?: string;
          therapist_id?: string;
          slot_start?: string;
          client_id?: string;
          created_at?: string;
          created_by?: string | null;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "holds_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "holds_therapist_id_fkey";
            columns: ["therapist_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      hold_slot: {
        Args: {
          p_therapist_id: string;
          p_slot_start: string;
          p_client_id: string;
        };
        Returns: Database["public"]["Tables"]["holds"]["Row"];
      };
      confirm_hold: {
        Args: {
          p_hold_id: string;
        };
        Returns: Database["public"]["Tables"]["holds"]["Row"];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
