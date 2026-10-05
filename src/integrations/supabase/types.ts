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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          label: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          label: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          label?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      cost_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
          notes: string
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          description: string
          expense_date?: string
          id?: string
          notes?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          notes?: string
          updated_at?: string
        }
        Relationships: []
      }
      cost_items: {
        Row: {
          active: boolean
          base_unit: string
          created_at: string
          id: string
          is_standard: boolean
          kind: string
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_unit: string
          created_at?: string
          id?: string
          is_standard?: boolean
          kind?: string
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_unit?: string
          created_at?: string
          id?: string
          is_standard?: boolean
          kind?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      cost_purchase_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          presentation: string
          purchase_id: string
          purchase_unit_price: number | null
          quantity: number
          total_cost: number
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          presentation?: string
          purchase_id: string
          purchase_unit_price?: number | null
          quantity: number
          total_cost: number
          unit: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          presentation?: string
          purchase_id?: string
          purchase_unit_price?: number | null
          quantity?: number
          total_cost?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_purchase_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "cost_item_prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_purchase_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "cost_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "cost_purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_purchases: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string
          purchase_date: string
          supplier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string
          purchase_date?: string
          supplier?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string
          purchase_date?: string
          supplier?: string
          updated_at?: string
        }
        Relationships: []
      }
      cost_recipe_components: {
        Row: {
          created_at: string
          id: string
          item_id: string
          quantity: number
          recipe_id: string
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          quantity: number
          recipe_id: string
          unit: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          quantity?: number
          recipe_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_recipe_components_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "cost_item_prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_recipe_components_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "cost_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_recipe_components_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "cost_recipe_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_recipe_components_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "cost_recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_recipes: {
        Row: {
          active: boolean
          created_at: string
          id: string
          labor_cost: number
          name: string
          notes: string
          overhead_percent: number
          product_id: string | null
          updated_at: string
          yield_label: string
          yield_quantity: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          labor_cost?: number
          name: string
          notes?: string
          overhead_percent?: number
          product_id?: string | null
          updated_at?: string
          yield_label?: string
          yield_quantity?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          labor_cost?: number
          name?: string
          notes?: string
          overhead_percent?: number
          product_id?: string | null
          updated_at?: string
          yield_label?: string
          yield_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "cost_recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string | null
          created_at: string
          customer_name: string
          customer_phone: string
          delivery_fee: number
          id: string
          mode: Database["public"]["Enums"]["order_mode"]
          mp_payment_id: string | null
          mp_preference_id: string | null
          notes: string | null
          payment_status: string
          status: Database["public"]["Enums"]["order_status"]
          stock_deducted: boolean
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          customer_name: string
          customer_phone?: string
          delivery_fee?: number
          id?: string
          mode: Database["public"]["Enums"]["order_mode"]
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          notes?: string | null
          payment_status?: string
          status?: Database["public"]["Enums"]["order_status"]
          stock_deducted?: boolean
          subtotal: number
          total: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          customer_name?: string
          customer_phone?: string
          delivery_fee?: number
          id?: string
          mode?: Database["public"]["Enums"]["order_mode"]
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          notes?: string | null
          payment_status?: string
          status?: Database["public"]["Enums"]["order_status"]
          stock_deducted?: boolean
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          badge: string | null
          category: string
          created_at: string
          description: string
          featured: boolean
          id: string
          image_url: string
          name: string
          price: number
          stock: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          badge?: string | null
          category: string
          created_at?: string
          description?: string
          featured?: boolean
          id?: string
          image_url?: string
          name: string
          price: number
          stock?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          badge?: string | null
          category?: string
          created_at?: string
          description?: string
          featured?: boolean
          id?: string
          image_url?: string
          name?: string
          price?: number
          stock?: number
          updated_at?: string
        }
        Relationships: []
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
      cost_item_prices: {
        Row: {
          active: boolean | null
          base_unit: string | null
          id: string | null
          kind: string | null
          name: string | null
          purchased_total: number | null
          unit_cost: number | null
        }
        Relationships: []
      }
      cost_recipe_summary: {
        Row: {
          active: boolean | null
          component_cost: number | null
          direct_cost: number | null
          id: string | null
          labor_cost: number | null
          margin_percent: number | null
          name: string | null
          overhead_percent: number | null
          product_id: string | null
          product_name: string | null
          sale_price: number | null
          total_cost: number | null
          unit_cost: number | null
          unit_profit: number | null
          unpriced_items: number | null
          yield_label: string | null
          yield_quantity: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      claim_first_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_order_paid: {
        Args: { _mp_payment_id: string; _order_id: string }
        Returns: undefined
      }
      place_order: {
        Args: {
          _address: string
          _customer_name: string
          _customer_phone: string
          _delivery_fee: number
          _items: Json
          _mode: Database["public"]["Enums"]["order_mode"]
          _notes?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user"
      order_mode: "entrega" | "retirada"
      order_status:
        | "pendente"
        | "preparando"
        | "saiu_entrega"
        | "concluido"
        | "cancelado"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
      order_mode: ["entrega", "retirada"],
      order_status: [
        "pendente",
        "preparando",
        "saiu_entrega",
        "concluido",
        "cancelado",
      ],
    },
  },
} as const
