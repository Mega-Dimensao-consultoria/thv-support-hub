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
      avaliacoes: {
        Row: {
          chamado_id: string
          data_avaliacao: string
          feedback_texto: string | null
          id: string
          nota: number
        }
        Insert: {
          chamado_id: string
          data_avaliacao?: string
          feedback_texto?: string | null
          id?: string
          nota: number
        }
        Update: {
          chamado_id?: string
          data_avaliacao?: string
          feedback_texto?: string | null
          id?: string
          nota?: number
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: true
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
        ]
      }
      chamados: {
        Row: {
          atendente_id: string | null
          data_atualizacao: string
          data_criacao: string
          departamento_id: string
          empresa_solicitante_id: string | null
          gestor_aprovador_id: string | null
          id: string
          mensagem_inicial: string | null
          protocolo: string | null
          solicitante_id: string
          status: Database["public"]["Enums"]["chamado_status"]
          topico_id: string
        }
        Insert: {
          atendente_id?: string | null
          data_atualizacao?: string
          data_criacao?: string
          departamento_id: string
          empresa_solicitante_id?: string | null
          gestor_aprovador_id?: string | null
          id?: string
          mensagem_inicial?: string | null
          protocolo?: string | null
          solicitante_id: string
          status?: Database["public"]["Enums"]["chamado_status"]
          topico_id: string
        }
        Update: {
          atendente_id?: string | null
          data_atualizacao?: string
          data_criacao?: string
          departamento_id?: string
          empresa_solicitante_id?: string | null
          gestor_aprovador_id?: string | null
          id?: string
          mensagem_inicial?: string | null
          protocolo?: string | null
          solicitante_id?: string
          status?: Database["public"]["Enums"]["chamado_status"]
          topico_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chamados_atendente_id_fkey"
            columns: ["atendente_id"]
            isOneToOne: false
            referencedRelation: "perfis_usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamados_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamados_empresa_solicitante_id_fkey"
            columns: ["empresa_solicitante_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamados_gestor_aprovador_id_fkey"
            columns: ["gestor_aprovador_id"]
            isOneToOne: false
            referencedRelation: "perfis_usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamados_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "perfis_usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamados_topico_id_fkey"
            columns: ["topico_id"]
            isOneToOne: false
            referencedRelation: "topicos_suporte"
            referencedColumns: ["id"]
          },
        ]
      }
      departamentos: {
        Row: {
          created_at: string
          gestor_id: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          gestor_id?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          gestor_id?: string | null
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "departamentos_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "perfis_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      gestor_departamentos: {
        Row: {
          created_at: string
          departamento_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          departamento_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          departamento_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gestor_departamentos_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens_chamado: {
        Row: {
          chamado_id: string
          data_envio: string
          id: string
          mensagem: string
          usuario_id: string
        }
        Insert: {
          chamado_id: string
          data_envio?: string
          id?: string
          mensagem: string
          usuario_id: string
        }
        Update: {
          chamado_id?: string
          data_envio?: string
          id?: string
          mensagem?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_chamado_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_chamado_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfis_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis_usuarios: {
        Row: {
          bloqueado: boolean
          bloqueado_em: string | null
          bloqueado_por: string | null
          created_at: string
          email: string
          empresa_id: string | null
          id: string
          nome: string
          nome_historico: string | null
          removido: boolean
          removido_em: string | null
          updated_at: string
        }
        Insert: {
          bloqueado?: boolean
          bloqueado_em?: string | null
          bloqueado_por?: string | null
          created_at?: string
          email: string
          empresa_id?: string | null
          id: string
          nome: string
          nome_historico?: string | null
          removido?: boolean
          removido_em?: string | null
          updated_at?: string
        }
        Update: {
          bloqueado?: boolean
          bloqueado_em?: string | null
          bloqueado_por?: string | null
          created_at?: string
          email?: string
          empresa_id?: string | null
          id?: string
          nome?: string
          nome_historico?: string | null
          removido?: boolean
          removido_em?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfis_usuarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      perguntas_triagem: {
        Row: {
          created_at: string
          id: string
          opcoes: string[] | null
          ordem: number
          pergunta_texto: string
          tipo_campo: Database["public"]["Enums"]["tipo_campo"]
          topico_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          opcoes?: string[] | null
          ordem?: number
          pergunta_texto: string
          tipo_campo?: Database["public"]["Enums"]["tipo_campo"]
          topico_id: string
        }
        Update: {
          created_at?: string
          id?: string
          opcoes?: string[] | null
          ordem?: number
          pergunta_texto?: string
          tipo_campo?: Database["public"]["Enums"]["tipo_campo"]
          topico_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perguntas_triagem_topico_id_fkey"
            columns: ["topico_id"]
            isOneToOne: false
            referencedRelation: "topicos_suporte"
            referencedColumns: ["id"]
          },
        ]
      }
      respostas_triagem: {
        Row: {
          chamado_id: string
          created_at: string
          id: string
          pergunta_texto: string
          resposta_texto: string | null
        }
        Insert: {
          chamado_id: string
          created_at?: string
          id?: string
          pergunta_texto: string
          resposta_texto?: string | null
        }
        Update: {
          chamado_id?: string
          created_at?: string
          id?: string
          pergunta_texto?: string
          resposta_texto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "respostas_triagem_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      topicos_suporte: {
        Row: {
          created_at: string
          departamento_id: string
          id: string
          titulo: string
        }
        Insert: {
          created_at?: string
          departamento_id: string
          id?: string
          titulo: string
        }
        Update: {
          created_at?: string
          departamento_id?: string
          id?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "topicos_suporte_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_empresa: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active: { Args: { _user_id: string }; Returns: boolean }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_dept_gestor: {
        Args: { _dept_id: string; _user_id: string }
        Returns: boolean
      }
      is_gestor_of_dept: {
        Args: { _dept_id: string; _user_id: string }
        Returns: boolean
      }
      is_gestor_of_user: {
        Args: { _gestor_id: string; _target_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "solicitante" | "atendente" | "gestor" | "admin"
      chamado_status:
        | "aguardando_aprovacao"
        | "atribuido"
        | "concluido"
        | "aguardando_tratativa"
        | "aguardando_tratativa_externa"
        | "aguardando_solicitante"
        | "reprovado"
        | "sem_resolucao"
      tipo_campo: "texto" | "multipla_escolha"
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
      app_role: ["solicitante", "atendente", "gestor", "admin"],
      chamado_status: [
        "aguardando_aprovacao",
        "atribuido",
        "concluido",
        "aguardando_tratativa",
        "aguardando_tratativa_externa",
        "aguardando_solicitante",
        "reprovado",
        "sem_resolucao",
      ],
      tipo_campo: ["texto", "multipla_escolha"],
    },
  },
} as const
