export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ats_connections: {
        Row: {
          api_key: string
          config: Json
          created_at: string
          created_by: string | null
          deleted_at: string | null
          display_name: string
          id: string
          last_error: string | null
          last_sync_at: string | null
          organization_id: string
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          api_key: string
          config?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          display_name: string
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          organization_id: string
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          config?: Json
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          display_name?: string
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          organization_id?: string
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ats_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ats_imports: {
        Row: {
          candidate_id: string | null
          connection_id: string
          created_at: string
          error: string | null
          external_candidate_id: string
          external_job_id: string | null
          id: string
          job_requisition_id: string | null
          metadata: Json
          organization_id: string
          provider: string
          status: string
        }
        Insert: {
          candidate_id?: string | null
          connection_id: string
          created_at?: string
          error?: string | null
          external_candidate_id: string
          external_job_id?: string | null
          id?: string
          job_requisition_id?: string | null
          metadata?: Json
          organization_id: string
          provider: string
          status?: string
        }
        Update: {
          candidate_id?: string | null
          connection_id?: string
          created_at?: string
          error?: string | null
          external_candidate_id?: string
          external_job_id?: string | null
          id?: string
          job_requisition_id?: string | null
          metadata?: Json
          organization_id?: string
          provider?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ats_imports_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ats_imports_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "ats_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ats_imports_job_requisition_id_fkey"
            columns: ["job_requisition_id"]
            isOneToOne: false
            referencedRelation: "job_requisitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ats_imports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          organization_id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          organization_id: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          organization_id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          candidate_email: string | null
          candidate_name: string | null
          created_at: string
          deleted_at: string | null
          id: string
          job_requisition_id: string
          organization_id: string
          parsed_profile: Json | null
          raw_resume_text: string | null
          resume_storage_path: string
          search_tsv: unknown
          uploaded_by: string | null
        }
        Insert: {
          candidate_email?: string | null
          candidate_name?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          job_requisition_id: string
          organization_id: string
          parsed_profile?: Json | null
          raw_resume_text?: string | null
          resume_storage_path: string
          search_tsv?: unknown
          uploaded_by?: string | null
        }
        Update: {
          candidate_email?: string | null
          candidate_name?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          job_requisition_id?: string
          organization_id?: string
          parsed_profile?: Json | null
          raw_resume_text?: string | null
          resume_storage_path?: string
          search_tsv?: unknown
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_job_requisition_id_fkey"
            columns: ["job_requisition_id"]
            isOneToOne: false
            referencedRelation: "job_requisitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_requisitions: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          extracted_requirements: Json
          id: string
          organization_id: string
          raw_jd_text: string
          status: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deleted_at?: string | null
          extracted_requirements?: Json
          id?: string
          organization_id: string
          raw_jd_text: string
          status?: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          extracted_requirements?: Json
          id?: string
          organization_id?: string
          raw_jd_text?: string
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_requisitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      match_evaluations: {
        Row: {
          candidate_id: string
          created_at: string
          gated_by_must_have: boolean
          id: string
          job_requisition_id: string
          model_version: string
          organization_id: string
          overall_confidence: Database["public"]["Enums"]["confidence_level"]
          overall_score: number
          pipeline_run_id: string | null
          requirement_breakdown: Json
          summary_text: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          gated_by_must_have?: boolean
          id?: string
          job_requisition_id: string
          model_version: string
          organization_id: string
          overall_confidence?: Database["public"]["Enums"]["confidence_level"]
          overall_score: number
          pipeline_run_id?: string | null
          requirement_breakdown: Json
          summary_text: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          gated_by_must_have?: boolean
          id?: string
          job_requisition_id?: string
          model_version?: string
          organization_id?: string
          overall_confidence?: Database["public"]["Enums"]["confidence_level"]
          overall_score?: number
          pipeline_run_id?: string | null
          requirement_breakdown?: Json
          summary_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_evaluations_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_evaluations_job_requisition_id_fkey"
            columns: ["job_requisition_id"]
            isOneToOne: false
            referencedRelation: "job_requisitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_evaluations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          candidates_used_this_period: number
          created_at: string
          deleted_at: string | null
          id: string
          monthly_candidate_quota: number
          name: string
          onboarding_completed_at: string | null
          period_started_at: string
          plan: Database["public"]["Enums"]["plan_tier"]
          stripe_customer_id: string | null
        }
        Insert: {
          candidates_used_this_period?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          monthly_candidate_quota?: number
          name: string
          onboarding_completed_at?: string | null
          period_started_at?: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          stripe_customer_id?: string | null
        }
        Update: {
          candidates_used_this_period?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          monthly_candidate_quota?: number
          name?: string
          onboarding_completed_at?: string | null
          period_started_at?: string
          plan?: Database["public"]["Enums"]["plan_tier"]
          stripe_customer_id?: string | null
        }
        Relationships: []
      }
      pipeline_runs: {
        Row: {
          candidate_id: string | null
          completed_at: string | null
          created_at: string
          current_stage: string | null
          error_code: string | null
          error_message: string | null
          id: string
          job_requisition_id: string
          organization_id: string
          progress: number
          started_at: string | null
          status: Database["public"]["Enums"]["pipeline_stage"]
        }
        Insert: {
          candidate_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_stage?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          job_requisition_id: string
          organization_id: string
          progress?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["pipeline_stage"]
        }
        Update: {
          candidate_id?: string | null
          completed_at?: string | null
          created_at?: string
          current_stage?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          job_requisition_id?: string
          organization_id?: string
          progress?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["pipeline_stage"]
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_runs_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_runs_job_requisition_id_fkey"
            columns: ["job_requisition_id"]
            isOneToOne: false
            referencedRelation: "job_requisitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          email: string
          full_name: string | null
          id: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          full_name?: string | null
          id: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_embeddings: {
        Row: {
          candidate_id: string
          chunk_index: number
          content: string
          created_at: string
          embedding: string
          id: string
          organization_id: string
        }
        Insert: {
          candidate_id: string
          chunk_index?: number
          content: string
          created_at?: string
          embedding: string
          id?: string
          organization_id: string
        }
        Update: {
          candidate_id?: string
          chunk_index?: number
          content?: string
          created_at?: string
          embedding?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_embeddings_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_embeddings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_screens: {
        Row: {
          candidate_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          duration_seconds: number | null
          error_message: string | null
          id: string
          job_requisition_id: string
          organization_id: string
          questions: Json
          recording_storage_path: string | null
          status: string
          structured_notes: Json | null
          summary: string | null
          transcript_text: string | null
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          job_requisition_id: string
          organization_id: string
          questions?: Json
          recording_storage_path?: string | null
          status?: string
          structured_notes?: Json | null
          summary?: string | null
          transcript_text?: string | null
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          job_requisition_id?: string
          organization_id?: string
          questions?: Json
          recording_storage_path?: string | null
          status?: string
          structured_notes?: Json | null
          summary?: string | null
          transcript_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_screens_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_screens_job_requisition_id_fkey"
            columns: ["job_requisition_id"]
            isOneToOne: false
            referencedRelation: "job_requisitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_screens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_org: { Args: never; Returns: string }
      has_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: { Args: { _org_id: string }; Returns: boolean }
      search_candidates: {
        Args: { _limit?: number; _query: string }
        Returns: {
          candidate_email: string
          candidate_name: string
          created_at: string
          id: string
          job_requisition_id: string
          rank: number
        }[]
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "recruiter" | "viewer"
      confidence_level: "high" | "medium" | "low"
      job_status: "open" | "closed" | "archived"
      pipeline_stage:
        | "queued"
        | "extracting"
        | "scoring"
        | "explaining"
        | "complete"
        | "failed"
      plan_tier: "free" | "starter" | "growth" | "scale"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "admin", "recruiter", "viewer"],
      confidence_level: ["high", "medium", "low"],
      job_status: ["open", "closed", "archived"],
      pipeline_stage: [
        "queued",
        "extracting",
        "scoring",
        "explaining",
        "complete",
        "failed",
      ],
      plan_tier: ["free", "starter", "growth", "scale"],
    },
  },
} as const
