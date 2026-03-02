export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      credits: {
        Row: {
          id: string;
          user_id: string | null;
          balance: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          balance?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          balance?: number;
          updated_at?: string;
        };
      };
      credit_transactions: {
        Row: {
          id: string;
          user_id: string | null;
          amount: number;
          type: "purchase" | "spend";
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          amount: number;
          type: "purchase" | "spend";
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          amount?: number;
          type?: "purchase" | "spend";
          description?: string | null;
          created_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          canvas_state: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          canvas_state?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          canvas_state?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      assets: {
        Row: {
          id: string;
          user_id: string | null;
          project_id: string | null;
          type: "product_photo" | "glb" | "video" | "render" | null;
          storage_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          project_id?: string | null;
          type?: "product_photo" | "glb" | "video" | "render" | null;
          storage_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          project_id?: string | null;
          type?: "product_photo" | "glb" | "video" | "render" | null;
          storage_url?: string | null;
          created_at?: string;
        };
      };
      avatars: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          rpm_avatar_url: string | null;
          glb_url: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          rpm_avatar_url?: string | null;
          glb_url?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          rpm_avatar_url?: string | null;
          glb_url?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      pipeline_jobs: {
        Row: {
          id: string;
          user_id: string | null;
          project_id: string | null;
          status: "pending" | "running" | "complete" | "failed" | null;
          node_graph: Json | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          project_id?: string | null;
          status?: "pending" | "running" | "complete" | "failed" | null;
          node_graph?: Json | null;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          project_id?: string | null;
          status?: "pending" | "running" | "complete" | "failed" | null;
          node_graph?: Json | null;
          created_at?: string;
          completed_at?: string | null;
        };
      };
      pipeline_job_nodes: {
        Row: {
          id: string;
          job_id: string | null;
          node_id: string | null;
          node_type: string | null;
          status: string | null;
          input_urls: Json | null;
          output_urls: Json | null;
          error: string | null;
          credits_used: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id?: string | null;
          node_id?: string | null;
          node_type?: string | null;
          status?: string | null;
          input_urls?: Json | null;
          output_urls?: Json | null;
          error?: string | null;
          credits_used?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string | null;
          node_id?: string | null;
          node_type?: string | null;
          status?: string | null;
          input_urls?: Json | null;
          output_urls?: Json | null;
          error?: string | null;
          credits_used?: number;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
