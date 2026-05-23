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
      conversations: {
        Row: {
          buyer_id: string
          created_at: string
          farmer_id: string
          id: string
          last_message_at: string
          listing_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          farmer_id: string
          id?: string
          last_message_at?: string
          listing_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          farmer_id?: string
          id?: string
          last_message_at?: string
          listing_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          availability: Database["public"]["Enums"]["equipment_availability"]
          category: Database["public"]["Enums"]["equipment_category"]
          created_at: string
          delivery_available: boolean
          deposit: number
          description: string
          id: string
          image_url: string | null
          location: string
          name: string
          owner_id: string
          phone: string
          price_per_day: number
          price_per_month: number
          price_per_week: number
          province: string
          rating: number
          specs: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          availability?: Database["public"]["Enums"]["equipment_availability"]
          category?: Database["public"]["Enums"]["equipment_category"]
          created_at?: string
          delivery_available?: boolean
          deposit?: number
          description?: string
          id?: string
          image_url?: string | null
          location?: string
          name: string
          owner_id: string
          phone?: string
          price_per_day?: number
          price_per_month?: number
          price_per_week?: number
          province?: string
          rating?: number
          specs?: string
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          availability?: Database["public"]["Enums"]["equipment_availability"]
          category?: Database["public"]["Enums"]["equipment_category"]
          created_at?: string
          delivery_available?: boolean
          deposit?: number
          description?: string
          id?: string
          image_url?: string | null
          location?: string
          name?: string
          owner_id?: string
          phone?: string
          price_per_day?: number
          price_per_month?: number
          price_per_week?: number
          province?: string
          rating?: number
          specs?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      equipment_bookings: {
        Row: {
          contact_phone: string
          created_at: string
          delivery: boolean
          delivery_address: string
          deposit: number
          end_date: string
          equipment_id: string | null
          equipment_name: string
          id: string
          notes: string
          owner_id: string
          renter_id: string
          start_date: string
          status: Database["public"]["Enums"]["equipment_booking_status"]
          total_cost: number
          updated_at: string
        }
        Insert: {
          contact_phone?: string
          created_at?: string
          delivery?: boolean
          delivery_address?: string
          deposit?: number
          end_date: string
          equipment_id?: string | null
          equipment_name?: string
          id?: string
          notes?: string
          owner_id: string
          renter_id: string
          start_date: string
          status?: Database["public"]["Enums"]["equipment_booking_status"]
          total_cost?: number
          updated_at?: string
        }
        Update: {
          contact_phone?: string
          created_at?: string
          delivery?: boolean
          delivery_address?: string
          deposit?: number
          end_date?: string
          equipment_id?: string | null
          equipment_name?: string
          id?: string
          notes?: string
          owner_id?: string
          renter_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["equipment_booking_status"]
          total_cost?: number
          updated_at?: string
        }
        Relationships: []
      }
      farmer_details: {
        Row: {
          bio: string
          cover_url: string | null
          created_at: string
          follower_count: number
          province: string
          speciality: string
          trust_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string
          cover_url?: string | null
          created_at?: string
          follower_count?: number
          province?: string
          speciality?: string
          trust_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string
          cover_url?: string | null
          created_at?: string
          follower_count?: number
          province?: string
          speciality?: string
          trust_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "farmer_details_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_follows: {
        Row: {
          created_at: string
          farmer_id: string
          follower_id: string
        }
        Insert: {
          created_at?: string
          farmer_id: string
          follower_id: string
        }
        Update: {
          created_at?: string
          farmer_id?: string
          follower_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "farmer_follows_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      farmer_reviews: {
        Row: {
          comment: string
          created_at: string
          farmer_id: string
          id: string
          rating: number
          reviewer_id: string
        }
        Insert: {
          comment?: string
          created_at?: string
          farmer_id: string
          id?: string
          rating: number
          reviewer_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          farmer_id?: string
          id?: string
          rating?: number
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "farmer_reviews_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "farmer_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          category: Database["public"]["Enums"]["listing_category"]
          created_at: string
          delivery_available: boolean
          description: string
          farmer_id: string
          id: string
          image_url: string | null
          location: string
          price: number
          province: string
          quantity: number
          rating: number
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          unit: string
          updated_at: string
          view_count: number
        }
        Insert: {
          category?: Database["public"]["Enums"]["listing_category"]
          created_at?: string
          delivery_available?: boolean
          description?: string
          farmer_id: string
          id?: string
          image_url?: string | null
          location?: string
          price: number
          province?: string
          quantity?: number
          rating?: number
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          unit?: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["listing_category"]
          created_at?: string
          delivery_available?: boolean
          description?: string
          farmer_id?: string
          id?: string
          image_url?: string | null
          location?: string
          price?: number
          province?: string
          quantity?: number
          rating?: number
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          unit?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          offer_price: number | null
          offer_quantity: number | null
          offer_status: Database["public"]["Enums"]["offer_status"] | null
          read_at: string | null
          sender_id: string
          type: Database["public"]["Enums"]["message_type"]
        }
        Insert: {
          content?: string
          conversation_id: string
          created_at?: string
          id?: string
          offer_price?: number | null
          offer_quantity?: number | null
          offer_status?: Database["public"]["Enums"]["offer_status"] | null
          read_at?: string | null
          sender_id: string
          type?: Database["public"]["Enums"]["message_type"]
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          offer_price?: number | null
          offer_quantity?: number | null
          offer_status?: Database["public"]["Enums"]["offer_status"] | null
          read_at?: string | null
          sender_id?: string
          type?: Database["public"]["Enums"]["message_type"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          created_at: string
          farmer_id: string
          id: string
          listing_id: string | null
          listing_title: string
          notes: string | null
          order_code: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          proof_url: string | null
          quantity: number
          total_amount: number
          unit: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          farmer_id: string
          id?: string
          listing_id?: string | null
          listing_title?: string
          notes?: string | null
          order_code: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          proof_url?: string | null
          quantity?: number
          total_amount?: number
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          farmer_id?: string
          id?: string
          listing_id?: string | null
          listing_title?: string
          notes?: string | null
          order_code?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          proof_url?: string | null
          quantity?: number
          total_amount?: number
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      shop_products: {
        Row: {
          created_at: string
          description: string
          id: string
          image_url: string | null
          name: string
          price: number
          shop_id: string
          stock_quantity: number
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          name: string
          price?: number
          shop_id: string
          stock_quantity?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          shop_id?: string
          stock_quantity?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          banner_url: string | null
          category: Database["public"]["Enums"]["shop_category"]
          created_at: string
          description: string
          email: string
          id: string
          location: string
          logo_url: string | null
          name: string
          owner_id: string
          phone: string
          province: string
          rating: number
          updated_at: string
          verified: boolean
          whatsapp: string
        }
        Insert: {
          banner_url?: string | null
          category?: Database["public"]["Enums"]["shop_category"]
          created_at?: string
          description?: string
          email?: string
          id?: string
          location?: string
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string
          province?: string
          rating?: number
          updated_at?: string
          verified?: boolean
          whatsapp?: string
        }
        Update: {
          banner_url?: string | null
          category?: Database["public"]["Enums"]["shop_category"]
          created_at?: string
          description?: string
          email?: string
          id?: string
          location?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string
          province?: string
          rating?: number
          updated_at?: string
          verified?: boolean
          whatsapp?: string
        }
        Relationships: []
      }
      transport_bookings: {
        Row: {
          buyer_id: string
          cargo: string
          contact_phone: string
          created_at: string
          destination: string
          estimated_weight_kg: number
          id: string
          notes: string
          owner_id: string
          pickup: string
          scheduled_date: string | null
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          buyer_id: string
          cargo?: string
          contact_phone?: string
          created_at?: string
          destination?: string
          estimated_weight_kg?: number
          id?: string
          notes?: string
          owner_id: string
          pickup?: string
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          buyer_id?: string
          cargo?: string
          contact_phone?: string
          created_at?: string
          destination?: string
          estimated_weight_kg?: number
          id?: string
          notes?: string
          owner_id?: string
          pickup?: string
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_bookings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_request_responses: {
        Row: {
          contact_phone: string
          created_at: string
          id: string
          message: string
          quoted_price: number
          request_id: string
          responder_id: string
        }
        Insert: {
          contact_phone?: string
          created_at?: string
          id?: string
          message?: string
          quoted_price?: number
          request_id: string
          responder_id: string
        }
        Update: {
          contact_phone?: string
          created_at?: string
          id?: string
          message?: string
          quoted_price?: number
          request_id?: string
          responder_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_request_responses_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "transport_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_requests: {
        Row: {
          budget: number
          cargo: string
          contact_phone: string
          created_at: string
          destination: string
          estimated_weight_kg: number
          id: string
          pickup: string
          poster_id: string
          scheduled_date: string | null
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
        }
        Insert: {
          budget?: number
          cargo?: string
          contact_phone?: string
          created_at?: string
          destination?: string
          estimated_weight_kg?: number
          id?: string
          pickup?: string
          poster_id: string
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Update: {
          budget?: number
          cargo?: string
          contact_phone?: string
          created_at?: string
          destination?: string
          estimated_weight_kg?: number
          id?: string
          pickup?: string
          poster_id?: string
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          availability: Database["public"]["Enums"]["vehicle_availability"]
          capacity_kg: number
          created_at: string
          description: string
          id: string
          image_url: string | null
          location: string
          name: string
          owner_id: string
          phone: string
          price_per_km: number
          price_per_trip: number
          province: string
          rating: number
          type: Database["public"]["Enums"]["vehicle_type"]
          updated_at: string
          whatsapp: string
        }
        Insert: {
          availability?: Database["public"]["Enums"]["vehicle_availability"]
          capacity_kg?: number
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          location?: string
          name?: string
          owner_id: string
          phone?: string
          price_per_km?: number
          price_per_trip?: number
          province?: string
          rating?: number
          type?: Database["public"]["Enums"]["vehicle_type"]
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          availability?: Database["public"]["Enums"]["vehicle_availability"]
          capacity_kg?: number
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          location?: string
          name?: string
          owner_id?: string
          phone?: string
          price_per_km?: number
          price_per_trip?: number
          province?: string
          rating?: number
          type?: Database["public"]["Enums"]["vehicle_type"]
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      recompute_trust_score: {
        Args: { _farmer_id: string }
        Returns: undefined
      }
    }
    Enums: {
      booking_status:
        | "pending"
        | "confirmed"
        | "in_transit"
        | "completed"
        | "cancelled"
      equipment_availability: "available" | "unavailable" | "maintenance"
      equipment_booking_status:
        | "pending"
        | "confirmed"
        | "active"
        | "completed"
        | "cancelled"
        | "rejected"
      equipment_category:
        | "tractors"
        | "combine_harvesters"
        | "irrigation_systems"
        | "generators"
        | "balers"
        | "planters"
        | "sprayers"
        | "tillage_equipment"
        | "other"
      listing_category:
        | "produce"
        | "livestock"
        | "poultry"
        | "dairy"
        | "grain"
        | "other"
      listing_status: "active" | "sold" | "draft" | "archived"
      message_type: "text" | "offer"
      offer_status: "pending" | "accepted" | "declined"
      payment_method:
        | "ecocash"
        | "onemoney"
        | "zipit"
        | "cash_on_delivery"
        | "card"
      payment_status:
        | "pending"
        | "awaiting_confirmation"
        | "paid"
        | "failed"
        | "cancelled"
      request_status: "open" | "matched" | "closed"
      shop_category:
        | "agro_vets"
        | "feed_suppliers"
        | "fertilizer_chemicals"
        | "irrigation_equipment"
        | "farming_tools"
        | "vaccines_medicine"
        | "butcheries"
      user_role: "farmer" | "buyer" | "supplier" | "transporter"
      vehicle_availability: "available" | "busy" | "offline"
      vehicle_type:
        | "truck"
        | "tractor"
        | "pickup"
        | "refrigerated"
        | "van"
        | "lorry"
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
      booking_status: [
        "pending",
        "confirmed",
        "in_transit",
        "completed",
        "cancelled",
      ],
      equipment_availability: ["available", "unavailable", "maintenance"],
      equipment_booking_status: [
        "pending",
        "confirmed",
        "active",
        "completed",
        "cancelled",
        "rejected",
      ],
      equipment_category: [
        "tractors",
        "combine_harvesters",
        "irrigation_systems",
        "generators",
        "balers",
        "planters",
        "sprayers",
        "tillage_equipment",
        "other",
      ],
      listing_category: [
        "produce",
        "livestock",
        "poultry",
        "dairy",
        "grain",
        "other",
      ],
      listing_status: ["active", "sold", "draft", "archived"],
      message_type: ["text", "offer"],
      offer_status: ["pending", "accepted", "declined"],
      payment_method: [
        "ecocash",
        "onemoney",
        "zipit",
        "cash_on_delivery",
        "card",
      ],
      payment_status: [
        "pending",
        "awaiting_confirmation",
        "paid",
        "failed",
        "cancelled",
      ],
      request_status: ["open", "matched", "closed"],
      shop_category: [
        "agro_vets",
        "feed_suppliers",
        "fertilizer_chemicals",
        "irrigation_equipment",
        "farming_tools",
        "vaccines_medicine",
        "butcheries",
      ],
      user_role: ["farmer", "buyer", "supplier", "transporter"],
      vehicle_availability: ["available", "busy", "offline"],
      vehicle_type: [
        "truck",
        "tractor",
        "pickup",
        "refrigerated",
        "van",
        "lorry",
      ],
    },
  },
} as const
