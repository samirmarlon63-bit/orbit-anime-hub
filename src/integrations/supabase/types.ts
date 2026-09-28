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
      anime_changes: {
        Row: {
          anime_id: string
          conflict: boolean
          created_at: string
          field: string
          id: string
          new_value: Json | null
          old_value: Json | null
          source_name: string
        }
        Insert: {
          anime_id: string
          conflict?: boolean
          created_at?: string
          field: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          source_name: string
        }
        Update: {
          anime_id?: string
          conflict?: boolean
          created_at?: string
          field?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          source_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "anime_changes_anime_id_fkey"
            columns: ["anime_id"]
            isOneToOne: false
            referencedRelation: "animes"
            referencedColumns: ["id"]
          },
        ]
      }
      animes: {
        Row: {
          airing_at: string | null
          anilist_id: number | null
          cover_url: string | null
          data_sources: Json
          date_confirmed: boolean
          first_detected_at: string
          genres: string[]
          id: string
          last_checked_at: string
          mal_id: number | null
          platforms: string[]
          popularity: number | null
          release_at: string | null
          search_keys: string[]
          season: string | null
          source_name: string
          source_url: string | null
          status: string | null
          studio: string | null
          synonyms: string[]
          synopsis: string | null
          title_english: string | null
          title_native: string | null
          title_romaji: string
          updated_at: string
        }
        Insert: {
          airing_at?: string | null
          anilist_id?: number | null
          cover_url?: string | null
          data_sources?: Json
          date_confirmed?: boolean
          first_detected_at?: string
          genres?: string[]
          id?: string
          last_checked_at?: string
          mal_id?: number | null
          platforms?: string[]
          popularity?: number | null
          release_at?: string | null
          search_keys?: string[]
          season?: string | null
          source_name?: string
          source_url?: string | null
          status?: string | null
          studio?: string | null
          synonyms?: string[]
          synopsis?: string | null
          title_english?: string | null
          title_native?: string | null
          title_romaji: string
          updated_at?: string
        }
        Update: {
          airing_at?: string | null
          anilist_id?: number | null
          cover_url?: string | null
          data_sources?: Json
          date_confirmed?: boolean
          first_detected_at?: string
          genres?: string[]
          id?: string
          last_checked_at?: string
          mal_id?: number | null
          platforms?: string[]
          popularity?: number | null
          release_at?: string | null
          search_keys?: string[]
          season?: string | null
          source_name?: string
          source_url?: string | null
          status?: string | null
          studio?: string | null
          synonyms?: string[]
          synopsis?: string | null
          title_english?: string | null
          title_native?: string | null
          title_romaji?: string
          updated_at?: string
        }
        Relationships: []
      }
      discoveries: {
        Row: {
          anime_id: string | null
          details: Json
          detected_at: string
          id: string
          last_checked_at: string
          source_name: string
          source_url: string | null
          title: string
        }
        Insert: {
          anime_id?: string | null
          details?: Json
          detected_at?: string
          id?: string
          last_checked_at?: string
          source_name: string
          source_url?: string | null
          title: string
        }
        Update: {
          anime_id?: string | null
          details?: Json
          detected_at?: string
          id?: string
          last_checked_at?: string
          source_name?: string
          source_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "discoveries_anime_id_fkey"
            columns: ["anime_id"]
            isOneToOne: false
            referencedRelation: "animes"
            referencedColumns: ["id"]
          },
        ]
      }
      news_sources: {
        Row: {
          base_url: string
          created_at: string
          enabled: boolean
          id: string
          last_checked_at: string | null
          last_error: string | null
          name: string
          updated_at: string
        }
        Insert: {
          base_url: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          base_url?: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          notifications: Json
          theme: string
          timezone: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          notifications?: Json
          theme?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          notifications?: Json
          theme?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_animes: {
        Row: {
          anime_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          anime_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          anime_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_animes_anime_id_fkey"
            columns: ["anime_id"]
            isOneToOne: false
            referencedRelation: "animes"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_runs: {
        Row: {
          errors: Json
          finished_at: string | null
          id: string
          started_at: string
          stats: Json
          status: string
          trigger: string
        }
        Insert: {
          errors?: Json
          finished_at?: string | null
          id?: string
          started_at?: string
          stats?: Json
          status?: string
          trigger: string
        }
        Update: {
          errors?: Json
          finished_at?: string | null
          id?: string
          started_at?: string
          stats?: Json
          status?: string
          trigger?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      video_animes: {
        Row: {
          anime_id: string | null
          cover_url: string | null
          created_at: string
          episodes_total: number | null
          external_slug: string | null
          id: string
          last_sync_error: string | null
          last_synced_at: string | null
          source_name: string | null
          status: string
          synopsis: string | null
          title: string
          updated_at: string
          youtube_playlist_id: string | null
        }
        Insert: {
          anime_id?: string | null
          cover_url?: string | null
          created_at?: string
          episodes_total?: number | null
          external_slug?: string | null
          id?: string
          last_sync_error?: string | null
          last_synced_at?: string | null
          source_name?: string | null
          status?: string
          synopsis?: string | null
          title: string
          updated_at?: string
          youtube_playlist_id?: string | null
        }
        Update: {
          anime_id?: string | null
          cover_url?: string | null
          created_at?: string
          episodes_total?: number | null
          external_slug?: string | null
          id?: string
          last_sync_error?: string | null
          last_synced_at?: string | null
          source_name?: string | null
          status?: string
          synopsis?: string | null
          title?: string
          updated_at?: string
          youtube_playlist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_animes_anime_id_fkey"
            columns: ["anime_id"]
            isOneToOne: false
            referencedRelation: "animes"
            referencedColumns: ["id"]
          },
        ]
      }
      video_changes: {
        Row: {
          created_at: string
          id: string
          kind: string
          new_value: Json | null
          old_value: Json | null
          source_name: string | null
          video_anime_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          new_value?: Json | null
          old_value?: Json | null
          source_name?: string | null
          video_anime_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          new_value?: Json | null
          old_value?: Json | null
          source_name?: string | null
          video_anime_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_changes_video_anime_id_fkey"
            columns: ["video_anime_id"]
            isOneToOne: false
            referencedRelation: "video_animes"
            referencedColumns: ["id"]
          },
        ]
      }
      video_episodes: {
        Row: {
          created_at: string
          id: string
          number: number
          title: string | null
          updated_at: string
          video_anime_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          number: number
          title?: string | null
          updated_at?: string
          video_anime_id: string
        }
        Update: {
          created_at?: string
          id?: string
          number?: number
          title?: string | null
          updated_at?: string
          video_anime_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_episodes_video_anime_id_fkey"
            columns: ["video_anime_id"]
            isOneToOne: false
            referencedRelation: "video_animes"
            referencedColumns: ["id"]
          },
        ]
      }
      video_sources: {
        Row: {
          created_at: string
          episode_id: string
          id: string
          kind: string
          label: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          episode_id: string
          id?: string
          kind: string
          label: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          episode_id?: string
          id?: string
          kind?: string
          label?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_sources_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "video_episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      video_sources_catalog: {
        Row: {
          base_url: string
          created_at: string
          enabled: boolean
          id: string
          kind: string
          last_checked_at: string | null
          last_error: string | null
          name: string
          updated_at: string
        }
        Insert: {
          base_url: string
          created_at?: string
          enabled?: boolean
          id?: string
          kind: string
          last_checked_at?: string | null
          last_error?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          base_url?: string
          created_at?: string
          enabled?: boolean
          id?: string
          kind?: string
          last_checked_at?: string | null
          last_error?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    },
  },
} as const
