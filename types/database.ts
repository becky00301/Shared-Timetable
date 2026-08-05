export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          name: string | null;
          avatar: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          name?: string | null;
          avatar?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          description: string | null;
          slug: string;
          kind: "weekly" | "daterange";
          invite_token: string;
          embed_token: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          description?: string | null;
          slug: string;
          kind?: "weekly" | "daterange";
          invite_token?: string;
          embed_token?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
        Relationships: [];
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: "owner" | "editor" | "viewer";
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role: "owner" | "editor" | "viewer";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["project_members"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "project_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      project_days: {
        Row: {
          id: string;
          project_id: string;
          date: string;
          sort_order: number;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          date: string;
          sort_order?: number;
          note?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["project_days"]["Insert"]>;
        Relationships: [];
      };
      project_notes: {
        Row: {
          id: string;
          project_id: string;
          creator_id: string | null;
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          creator_id?: string | null;
          body: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["project_notes"]["Insert"]>;
        Relationships: [];
      };
      schedule_items: {
        Row: {
          id: string;
          project_id: string;
          day_id: string;
          creator_id: string | null;
          title: string;
          description: string | null;
          location: string | null;
          start_time: string;
          end_time: string;
          color: string | null;
          all_day: boolean;
          end_day_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          day_id: string;
          creator_id?: string | null;
          title: string;
          description?: string | null;
          location?: string | null;
          start_time: string;
          end_time: string;
          color?: string | null;
          all_day?: boolean;
          end_day_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["schedule_items"]["Insert"]>;
        Relationships: [];
      };
      availability: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          day_id: string;
          start_time: string;
          end_time: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          day_id: string;
          start_time: string;
          end_time: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["availability"]["Insert"]>;
        Relationships: [];
      };
      attachments: {
        Row: {
          id: string;
          project_id: string;
          schedule_item_id: string;
          type: "link" | "image" | "pdf" | "map";
          url: string;
          title: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          schedule_item_id: string;
          type: "link" | "image" | "pdf" | "map";
          url: string;
          title?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["attachments"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      join_project_by_invite: {
        Args: { token: string };
        Returns: string;
      };
      get_embedded_timetable: {
        Args: { embed_token_value: string };
        Returns: Json;
      };
      prepare_account_deletion: {
        Args: { target_user_id: string };
        Returns: Array<{ transferred: number; deleted: number }>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
