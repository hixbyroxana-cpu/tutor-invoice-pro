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
      business_settings: {
        Row: {
          account_holder: string | null
          account_number: string | null
          address: string | null
          bank_name: string | null
          business_name: string | null
          email: string | null
          id: string
          invoice_prefix: string
          payment_notes: string | null
          phone: string | null
          sort_code: string | null
          stripe_account_id: string | null
          stripe_charges_enabled: boolean
          stripe_onboarded_at: string | null
          tutor_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          address?: string | null
          bank_name?: string | null
          business_name?: string | null
          email?: string | null
          id?: string
          invoice_prefix?: string
          payment_notes?: string | null
          phone?: string | null
          sort_code?: string | null
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean
          stripe_onboarded_at?: string | null
          tutor_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          address?: string | null
          bank_name?: string | null
          business_name?: string | null
          email?: string | null
          id?: string
          invoice_prefix?: string
          payment_notes?: string | null
          phone?: string | null
          sort_code?: string | null
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean
          stripe_onboarded_at?: string | null
          tutor_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoice_counter: {
        Row: {
          next_number: number
          user_id: string
        }
        Insert: {
          next_number?: number
          user_id: string
        }
        Update: {
          next_number?: number
          user_id?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          duration: number
          hourly_rate: number
          id: string
          invoice_id: string
          lesson_date: string
          notes: string | null
          position: number
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string
          duration?: number
          hourly_rate?: number
          id?: string
          invoice_id: string
          lesson_date: string
          notes?: string | null
          position?: number
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          duration?: number
          hourly_rate?: number
          id?: string
          invoice_id?: string
          lesson_date?: string
          notes?: string | null
          position?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_address: string | null
          client_email: string | null
          client_name: string
          client_parent_name: string | null
          client_phone: string | null
          created_at: string
          hourly_rate: number
          id: string
          invoice_date: string
          invoice_number: string
          invoice_title: string
          notes: string | null
          paid_at: string | null
          payment_deadline: string | null
          pdf_exported_at: string | null
          sent_to_parent_at: string | null
          status: string
          stripe_checkout_url: string | null
          stripe_session_id: string | null
          student_id: string | null
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          client_address?: string | null
          client_email?: string | null
          client_name: string
          client_parent_name?: string | null
          client_phone?: string | null
          created_at?: string
          hourly_rate?: number
          id?: string
          invoice_date?: string
          invoice_number: string
          invoice_title: string
          notes?: string | null
          paid_at?: string | null
          payment_deadline?: string | null
          pdf_exported_at?: string | null
          sent_to_parent_at?: string | null
          status?: string
          stripe_checkout_url?: string | null
          stripe_session_id?: string | null
          student_id?: string | null
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          client_address?: string | null
          client_email?: string | null
          client_name?: string
          client_parent_name?: string | null
          client_phone?: string | null
          created_at?: string
          hourly_rate?: number
          id?: string
          invoice_date?: string
          invoice_number?: string
          invoice_title?: string
          notes?: string | null
          paid_at?: string | null
          payment_deadline?: string | null
          pdf_exported_at?: string | null
          sent_to_parent_at?: string | null
          status?: string
          stripe_checkout_url?: string | null
          stripe_session_id?: string | null
          student_id?: string | null
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          archived: boolean
          billing_address: string | null
          created_at: string
          default_duration: number
          email: string | null
          full_name: string
          hourly_fee: number
          id: string
          notes: string | null
          parent_name: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          billing_address?: string | null
          created_at?: string
          default_duration?: number
          email?: string | null
          full_name: string
          hourly_fee?: number
          id?: string
          notes?: string | null
          parent_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          billing_address?: string | null
          created_at?: string
          default_duration?: number
          email?: string | null
          full_name?: string
          hourly_fee?: number
          id?: string
          notes?: string | null
          parent_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      next_invoice_number: { Args: never; Returns: number }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
