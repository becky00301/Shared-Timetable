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
      };
      projects: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          description: string | null;
          slug: string;
          invite_token: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          description?: string | null;
          slug: string;
          invite_token: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
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
      };
      project_days: {
        Row: {
          id: string;
          project_id: string;
          date: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          date: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["project_days"]["Insert"]>;
      };
      schedule_items: {
        Row: {
          id: string;
          project_id: string;
          day_id: string;
          creator_id: string;
          title: string;
          description: string | null;
          location: string | null;
          start_time: string;
          end_time: string;
          color: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          day_id: string;
          creator_id: string;
          title: string;
          description?: string | null;
          location?: string | null;
          start_time: string;
          end_time: string;
          color?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["schedule_items"]["Insert"]>;
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
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
