export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  assessment: {
    Tables: {
      assessment_definitions: {
        Row: {
          construct: string;
          created_at: string;
          id: string;
          instrument_code: string;
          name: string;
          status: string;
        };
        Insert: {
          construct: string;
          created_at: string;
          id: string;
          instrument_code: string;
          name: string;
          status: string;
        };
        Update: {
          construct?: string;
          created_at?: string;
          id?: string;
          instrument_code?: string;
          name?: string;
          status?: string;
        };
        Relationships: [];
      };
      assessment_item_options: {
        Row: {
          asset_ref: string | null;
          display_order: number;
          id: string;
          is_correct: boolean | null;
          item_id: string;
          label_text: string | null;
          option_key: string;
          score_delta: number | null;
          score_scale_code: string | null;
          scoring_metadata_json: Json | null;
        };
        Insert: {
          asset_ref?: string | null;
          display_order: number;
          id: string;
          is_correct?: boolean | null;
          item_id: string;
          label_text?: string | null;
          option_key: string;
          score_delta?: number | null;
          score_scale_code?: string | null;
          scoring_metadata_json?: Json | null;
        };
        Update: {
          asset_ref?: string | null;
          display_order?: number;
          id?: string;
          is_correct?: boolean | null;
          item_id?: string;
          label_text?: string | null;
          option_key?: string;
          score_delta?: number | null;
          score_scale_code?: string | null;
          scoring_metadata_json?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "assessment_item_options_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "assessment_items";
            referencedColumns: ["id"];
          },
        ];
      };
      assessment_items: {
        Row: {
          assessment_version_id: string;
          created_at: string;
          display_order: number;
          id: string;
          is_qc: boolean | null;
          is_reverse_scored: boolean | null;
          is_tie_break: boolean | null;
          item_key: string;
          item_type: string;
          prompt_asset_ref: string | null;
          prompt_text: string | null;
          qc_rule_json: Json | null;
          review_status: string | null;
          scale_code: string | null;
        };
        Insert: {
          assessment_version_id: string;
          created_at: string;
          display_order: number;
          id: string;
          is_qc?: boolean | null;
          is_reverse_scored?: boolean | null;
          is_tie_break?: boolean | null;
          item_key: string;
          item_type: string;
          prompt_asset_ref?: string | null;
          prompt_text?: string | null;
          qc_rule_json?: Json | null;
          review_status?: string | null;
          scale_code?: string | null;
        };
        Update: {
          assessment_version_id?: string;
          created_at?: string;
          display_order?: number;
          id?: string;
          is_qc?: boolean | null;
          is_reverse_scored?: boolean | null;
          is_tie_break?: boolean | null;
          item_key?: string;
          item_type?: string;
          prompt_asset_ref?: string | null;
          prompt_text?: string | null;
          qc_rule_json?: Json | null;
          review_status?: string | null;
          scale_code?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "assessment_items_assessment_version_id_fkey";
            columns: ["assessment_version_id"];
            isOneToOne: false;
            referencedRelation: "assessment_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      assessment_responses: {
        Row: {
          answered_at: string;
          assessment_run_id: string;
          client_answer_id: string;
          id: string;
          item_id: string;
          latency_ms: number | null;
          received_at: string;
          response_json: Json | null;
          response_value: number | null;
          selected_option_id: string | null;
        };
        Insert: {
          answered_at: string;
          assessment_run_id: string;
          client_answer_id: string;
          id: string;
          item_id: string;
          latency_ms?: number | null;
          received_at: string;
          response_json?: Json | null;
          response_value?: number | null;
          selected_option_id?: string | null;
        };
        Update: {
          answered_at?: string;
          assessment_run_id?: string;
          client_answer_id?: string;
          id?: string;
          item_id?: string;
          latency_ms?: number | null;
          received_at?: string;
          response_json?: Json | null;
          response_value?: number | null;
          selected_option_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "assessment_responses_assessment_run_id_fkey";
            columns: ["assessment_run_id"];
            isOneToOne: false;
            referencedRelation: "assessment_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessment_responses_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "assessment_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessment_responses_selected_option_id_fkey";
            columns: ["selected_option_id"];
            isOneToOne: false;
            referencedRelation: "assessment_item_options";
            referencedColumns: ["id"];
          },
        ];
      };
      assessment_results: {
        Row: {
          algorithm_version: string;
          assessment_run_id: string;
          close_scores: boolean | null;
          confidence: string | null;
          created_at: string;
          id: string;
          input_hash: string;
          instrument_code: string;
          instrument_version: string;
          normalized_scores_json: Json | null;
          output_hash: string;
          qc_summary_json: Json | null;
          raw_scores_json: Json | null;
          result_code: string;
          user_id: string;
        };
        Insert: {
          algorithm_version: string;
          assessment_run_id: string;
          close_scores?: boolean | null;
          confidence?: string | null;
          created_at: string;
          id: string;
          input_hash: string;
          instrument_code: string;
          instrument_version: string;
          normalized_scores_json?: Json | null;
          output_hash: string;
          qc_summary_json?: Json | null;
          raw_scores_json?: Json | null;
          result_code: string;
          user_id: string;
        };
        Update: {
          algorithm_version?: string;
          assessment_run_id?: string;
          close_scores?: boolean | null;
          confidence?: string | null;
          created_at?: string;
          id?: string;
          input_hash?: string;
          instrument_code?: string;
          instrument_version?: string;
          normalized_scores_json?: Json | null;
          output_hash?: string;
          qc_summary_json?: Json | null;
          raw_scores_json?: Json | null;
          result_code?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assessment_results_assessment_run_id_fkey";
            columns: ["assessment_run_id"];
            isOneToOne: true;
            referencedRelation: "assessment_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      assessment_runs: {
        Row: {
          assessment_version_id: string;
          attempt_number: number;
          completed_at: string | null;
          created_at: string;
          current_position: number | null;
          id: string;
          journey_session_id: string;
          last_answered_at: string | null;
          resume_expires_at: string | null;
          scored_at: string | null;
          segment: string | null;
          started_at: string;
          status: string;
          user_id: string;
        };
        Insert: {
          assessment_version_id: string;
          attempt_number: number;
          completed_at?: string | null;
          created_at: string;
          current_position?: number | null;
          id: string;
          journey_session_id: string;
          last_answered_at?: string | null;
          resume_expires_at?: string | null;
          scored_at?: string | null;
          segment?: string | null;
          started_at: string;
          status: string;
          user_id: string;
        };
        Update: {
          assessment_version_id?: string;
          attempt_number?: number;
          completed_at?: string | null;
          created_at?: string;
          current_position?: number | null;
          id?: string;
          journey_session_id?: string;
          last_answered_at?: string | null;
          resume_expires_at?: string | null;
          scored_at?: string | null;
          segment?: string | null;
          started_at?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assessment_runs_assessment_version_id_fkey";
            columns: ["assessment_version_id"];
            isOneToOne: false;
            referencedRelation: "assessment_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assessment_runs_journey_session_id_fkey";
            columns: ["journey_session_id"];
            isOneToOne: false;
            referencedRelation: "journey_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      assessment_versions: {
        Row: {
          age_max: number | null;
          age_min: number | null;
          batch_size: number | null;
          content_license_ref: string;
          created_at: string;
          definition_id: string;
          effective_from: string | null;
          id: string;
          item_count: number;
          language: string | null;
          retired_at: string | null;
          review_status: string;
          scoring_algorithm_version: string;
          version: string;
        };
        Insert: {
          age_max?: number | null;
          age_min?: number | null;
          batch_size?: number | null;
          content_license_ref: string;
          created_at: string;
          definition_id: string;
          effective_from?: string | null;
          id: string;
          item_count: number;
          language?: string | null;
          retired_at?: string | null;
          review_status: string;
          scoring_algorithm_version: string;
          version: string;
        };
        Update: {
          age_max?: number | null;
          age_min?: number | null;
          batch_size?: number | null;
          content_license_ref?: string;
          created_at?: string;
          definition_id?: string;
          effective_from?: string | null;
          id?: string;
          item_count?: number;
          language?: string | null;
          retired_at?: string | null;
          review_status?: string;
          scoring_algorithm_version?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "assessment_versions_definition_id_fkey";
            columns: ["definition_id"];
            isOneToOne: false;
            referencedRelation: "assessment_definitions";
            referencedColumns: ["id"];
          },
        ];
      };
      guardian_consents: {
        Row: {
          consent_type: string;
          created_at: string;
          declined_at: string | null;
          expired_at: string | null;
          guardian_phone_hash: string;
          guardian_phone_last4: string | null;
          id: string;
          provider_reference_hash: string | null;
          requested_at: string;
          revoked_at: string | null;
          status: string;
          text_version: string;
          user_id: string;
          verified_at: string | null;
        };
        Insert: {
          consent_type: string;
          created_at: string;
          declined_at?: string | null;
          expired_at?: string | null;
          guardian_phone_hash: string;
          guardian_phone_last4?: string | null;
          id: string;
          provider_reference_hash?: string | null;
          requested_at: string;
          revoked_at?: string | null;
          status: string;
          text_version: string;
          user_id: string;
          verified_at?: string | null;
        };
        Update: {
          consent_type?: string;
          created_at?: string;
          declined_at?: string | null;
          expired_at?: string | null;
          guardian_phone_hash?: string;
          guardian_phone_last4?: string | null;
          id?: string;
          provider_reference_hash?: string | null;
          requested_at?: string;
          revoked_at?: string | null;
          status?: string;
          text_version?: string;
          user_id?: string;
          verified_at?: string | null;
        };
        Relationships: [];
      };
      intake_answers: {
        Row: {
          answer_json: Json;
          answered_at: string;
          id: string;
          question_id: string;
          question_set_version: string;
          session_id: string;
          user_id: string;
        };
        Insert: {
          answer_json: Json;
          answered_at: string;
          id: string;
          question_id: string;
          question_set_version: string;
          session_id: string;
          user_id: string;
        };
        Update: {
          answer_json?: Json;
          answered_at?: string;
          id?: string;
          question_id?: string;
          question_set_version?: string;
          session_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "intake_answers_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "intake_questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "intake_answers_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "journey_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      intake_question_sets: {
        Row: {
          created_at: string;
          effective_from: string;
          id: string;
          language: string;
          retired_at: string | null;
          segment: string;
          status: string;
          version: string;
        };
        Insert: {
          created_at: string;
          effective_from: string;
          id: string;
          language: string;
          retired_at?: string | null;
          segment: string;
          status: string;
          version: string;
        };
        Update: {
          created_at?: string;
          effective_from?: string;
          id?: string;
          language?: string;
          retired_at?: string | null;
          segment?: string;
          status?: string;
          version?: string;
        };
        Relationships: [];
      };
      intake_questions: {
        Row: {
          display_order: number;
          id: string;
          is_required: boolean;
          is_sensitive: boolean | null;
          options_json: Json | null;
          prompt_text: string | null;
          question_key: string;
          question_set_id: string;
          response_type: string;
        };
        Insert: {
          display_order: number;
          id: string;
          is_required: boolean;
          is_sensitive?: boolean | null;
          options_json?: Json | null;
          prompt_text?: string | null;
          question_key: string;
          question_set_id: string;
          response_type: string;
        };
        Update: {
          display_order?: number;
          id?: string;
          is_required?: boolean;
          is_sensitive?: boolean | null;
          options_json?: Json | null;
          prompt_text?: string | null;
          question_key?: string;
          question_set_id?: string;
          response_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "intake_questions_question_set_id_fkey";
            columns: ["question_set_id"];
            isOneToOne: false;
            referencedRelation: "intake_question_sets";
            referencedColumns: ["id"];
          },
        ];
      };
      journey_sessions: {
        Row: {
          anonymous_session_id: string | null;
          channel: string;
          completed_at: string | null;
          expires_at: string;
          id: string;
          last_seen_at: string;
          started_at: string;
          status: string;
          user_id: string;
        };
        Insert: {
          anonymous_session_id?: string | null;
          channel: string;
          completed_at?: string | null;
          expires_at: string;
          id: string;
          last_seen_at: string;
          started_at: string;
          status: string;
          user_id: string;
        };
        Update: {
          anonymous_session_id?: string | null;
          channel?: string;
          completed_at?: string | null;
          expires_at?: string;
          id?: string;
          last_seen_at?: string;
          started_at?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profile_snapshot_results: {
        Row: {
          assessment_result_id: string;
          display_order: number;
          profile_snapshot_id: string;
          result_role: string;
        };
        Insert: {
          assessment_result_id: string;
          display_order: number;
          profile_snapshot_id: string;
          result_role: string;
        };
        Update: {
          assessment_result_id?: string;
          display_order?: number;
          profile_snapshot_id?: string;
          result_role?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profile_snapshot_results_assessment_result_id_fkey";
            columns: ["assessment_result_id"];
            isOneToOne: false;
            referencedRelation: "assessment_results";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profile_snapshot_results_profile_snapshot_id_fkey";
            columns: ["profile_snapshot_id"];
            isOneToOne: false;
            referencedRelation: "profile_snapshots";
            referencedColumns: ["id"];
          },
        ];
      };
      profile_snapshots: {
        Row: {
          age_band: string;
          algorithm_version: string;
          city: string;
          created_at: string;
          id: string;
          intake_summary_json: Json;
          payload_hash: string;
          profile_version: number;
          result_summary_json: Json;
          segment: string;
          self_stage: string;
          snapshot_schema_version: number;
          state: string;
          user_id: string;
          wants_aid: boolean;
        };
        Insert: {
          age_band: string;
          algorithm_version: string;
          city: string;
          created_at: string;
          id: string;
          intake_summary_json: Json;
          payload_hash: string;
          profile_version: number;
          result_summary_json: Json;
          segment: string;
          self_stage: string;
          snapshot_schema_version: number;
          state: string;
          user_id: string;
          wants_aid: boolean;
        };
        Update: {
          age_band?: string;
          algorithm_version?: string;
          city?: string;
          created_at?: string;
          id?: string;
          intake_summary_json?: Json;
          payload_hash?: string;
          profile_version?: number;
          result_summary_json?: Json;
          segment?: string;
          self_stage?: string;
          snapshot_schema_version?: number;
          state?: string;
          user_id?: string;
          wants_aid?: boolean;
        };
        Relationships: [];
      };
      user_profiles: {
        Row: {
          age_at_onboarding: number | null;
          age_band: string;
          city: string;
          country_code: string | null;
          created_at: string;
          deleted_at: string | null;
          first_name: string;
          profile_status: string;
          segment: string;
          self_stage: string | null;
          state: string;
          updated_at: string;
          user_id: string;
          wants_aid: boolean | null;
        };
        Insert: {
          age_at_onboarding?: number | null;
          age_band: string;
          city: string;
          country_code?: string | null;
          created_at: string;
          deleted_at?: string | null;
          first_name: string;
          profile_status: string;
          segment: string;
          self_stage?: string | null;
          state: string;
          updated_at: string;
          user_id: string;
          wants_aid?: boolean | null;
        };
        Update: {
          age_at_onboarding?: number | null;
          age_band?: string;
          city?: string;
          country_code?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          first_name?: string;
          profile_status?: string;
          segment?: string;
          self_stage?: string | null;
          state?: string;
          updated_at?: string;
          user_id?: string;
          wants_aid?: boolean | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  counselor: {
    Tables: {
      conversation_messages: {
        Row: {
          client_message_id: string | null;
          content: string;
          content_language: string;
          conversation_id: string;
          created_at: string;
          flags: string[] | null;
          id: string;
          idempotency_key: string;
          message_status: string;
          model_name: string | null;
          prompt_version: string | null;
          provider_message_id_hash: string | null;
          role: string;
          turn_number: number;
        };
        Insert: {
          client_message_id?: string | null;
          content: string;
          content_language: string;
          conversation_id: string;
          created_at: string;
          flags?: string[] | null;
          id: string;
          idempotency_key: string;
          message_status: string;
          model_name?: string | null;
          prompt_version?: string | null;
          provider_message_id_hash?: string | null;
          role: string;
          turn_number: number;
        };
        Update: {
          client_message_id?: string | null;
          content?: string;
          content_language?: string;
          conversation_id?: string;
          created_at?: string;
          flags?: string[] | null;
          id?: string;
          idempotency_key?: string;
          message_status?: string;
          model_name?: string | null;
          prompt_version?: string | null;
          provider_message_id_hash?: string | null;
          role?: string;
          turn_number?: number;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      conversation_summaries: {
        Row: {
          conversation_id: string;
          created_at: string;
          from_turn: number;
          id: string;
          source_hash: string;
          summary_json: Json;
          summary_version: string;
          to_turn: number;
        };
        Insert: {
          conversation_id: string;
          created_at: string;
          from_turn: number;
          id: string;
          source_hash: string;
          summary_json: Json;
          summary_version: string;
          to_turn: number;
        };
        Update: {
          conversation_id?: string;
          created_at?: string;
          from_turn?: number;
          id?: string;
          source_hash?: string;
          summary_json?: Json;
          summary_version?: string;
          to_turn?: number;
        };
        Relationships: [
          {
            foreignKeyName: "conversation_summaries_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: {
          ai_mode: string;
          channel: string | null;
          completed_at: string | null;
          created_at: string;
          id: string;
          language: string;
          last_turn_at: string | null;
          profile_snapshot_id: string | null;
          segment: string;
          start_idempotency_key: string;
          started_at: string;
          status: string;
          user_id: string;
        };
        Insert: {
          ai_mode: string;
          channel?: string | null;
          completed_at?: string | null;
          created_at: string;
          id: string;
          language: string;
          last_turn_at?: string | null;
          profile_snapshot_id?: string | null;
          segment: string;
          start_idempotency_key: string;
          started_at: string;
          status: string;
          user_id: string;
        };
        Update: {
          ai_mode?: string;
          channel?: string | null;
          completed_at?: string | null;
          created_at?: string;
          id?: string;
          language?: string;
          last_turn_at?: string | null;
          profile_snapshot_id?: string | null;
          segment?: string;
          start_idempotency_key?: string;
          started_at?: string;
          status?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      exploration_events: {
        Row: {
          action: string;
          client_event_id: string;
          conversation_id: string | null;
          id: string;
          occurred_at: string;
          recommendation_id: string;
          recommendation_item_id: string | null;
          user_id: string;
        };
        Insert: {
          action: string;
          client_event_id: string;
          conversation_id?: string | null;
          id: string;
          occurred_at: string;
          recommendation_id: string;
          recommendation_item_id?: string | null;
          user_id: string;
        };
        Update: {
          action?: string;
          client_event_id?: string;
          conversation_id?: string | null;
          id?: string;
          occurred_at?: string;
          recommendation_id?: string;
          recommendation_item_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exploration_events_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      generated_assets: {
        Row: {
          asset_type: string;
          content_hash: string;
          created_at: string;
          deleted_at: string | null;
          expires_at: string;
          generation_status: string;
          id: string;
          idempotency_key: string;
          privacy_class: string | null;
          report_snapshot_id: string | null;
          storage_bucket: string;
          storage_path: string;
          user_id: string;
        };
        Insert: {
          asset_type: string;
          content_hash: string;
          created_at: string;
          deleted_at?: string | null;
          expires_at: string;
          generation_status: string;
          id: string;
          idempotency_key: string;
          privacy_class?: string | null;
          report_snapshot_id?: string | null;
          storage_bucket: string;
          storage_path: string;
          user_id: string;
        };
        Update: {
          asset_type?: string;
          content_hash?: string;
          created_at?: string;
          deleted_at?: string | null;
          expires_at?: string;
          generation_status?: string;
          id?: string;
          idempotency_key?: string;
          privacy_class?: string | null;
          report_snapshot_id?: string | null;
          storage_bucket?: string;
          storage_path?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "generated_assets_report_snapshot_id_fkey";
            columns: ["report_snapshot_id"];
            isOneToOne: false;
            referencedRelation: "report_snapshots";
            referencedColumns: ["id"];
          },
        ];
      };
      journey_events: {
        Row: {
          conversation_id: string | null;
          event_schema_version: number;
          event_type: string;
          id: string;
          metadata_json: Json | null;
          occurred_at: string;
          producer_event_id: string;
          related_entity_id: string | null;
          related_entity_type: string | null;
          user_id: string;
        };
        Insert: {
          conversation_id?: string | null;
          event_schema_version: number;
          event_type: string;
          id: string;
          metadata_json?: Json | null;
          occurred_at: string;
          producer_event_id: string;
          related_entity_id?: string | null;
          related_entity_type?: string | null;
          user_id: string;
        };
        Update: {
          conversation_id?: string | null;
          event_schema_version?: number;
          event_type?: string;
          id?: string;
          metadata_json?: Json | null;
          occurred_at?: string;
          producer_event_id?: string;
          related_entity_id?: string | null;
          related_entity_type?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "journey_events_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      journey_states: {
        Row: {
          conversation_id: string | null;
          current_assessment_run_id: string | null;
          current_recommendation_id: string | null;
          current_state_key: string;
          current_step: number;
          is_safety_paused: boolean | null;
          last_idempotency_key: string | null;
          lock_version: number | null;
          profile_snapshot_id: string | null;
          state_json: Json | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          conversation_id?: string | null;
          current_assessment_run_id?: string | null;
          current_recommendation_id?: string | null;
          current_state_key: string;
          current_step: number;
          is_safety_paused?: boolean | null;
          last_idempotency_key?: string | null;
          lock_version?: number | null;
          profile_snapshot_id?: string | null;
          state_json?: Json | null;
          updated_at: string;
          user_id: string;
        };
        Update: {
          conversation_id?: string | null;
          current_assessment_run_id?: string | null;
          current_recommendation_id?: string | null;
          current_state_key?: string;
          current_step?: number;
          is_safety_paused?: boolean | null;
          last_idempotency_key?: string | null;
          lock_version?: number | null;
          profile_snapshot_id?: string | null;
          state_json?: Json | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "journey_states_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      message_grounding: {
        Row: {
          allowed_numbers_json: Json | null;
          allowed_urls: string[] | null;
          assistant_message_id: string;
          display_name: string;
          entity_id: string;
          entity_type: string;
          id: string;
          source_version: string;
          tool_call_id: string;
        };
        Insert: {
          allowed_numbers_json?: Json | null;
          allowed_urls?: string[] | null;
          assistant_message_id: string;
          display_name: string;
          entity_id: string;
          entity_type: string;
          id: string;
          source_version: string;
          tool_call_id: string;
        };
        Update: {
          allowed_numbers_json?: Json | null;
          allowed_urls?: string[] | null;
          assistant_message_id?: string;
          display_name?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          source_version?: string;
          tool_call_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "message_grounding_assistant_message_id_fkey";
            columns: ["assistant_message_id"];
            isOneToOne: false;
            referencedRelation: "conversation_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "message_grounding_tool_call_id_fkey";
            columns: ["tool_call_id"];
            isOneToOne: false;
            referencedRelation: "tool_calls";
            referencedColumns: ["id"];
          },
        ];
      };
      report_snapshots: {
        Row: {
          created_at: string;
          explored_entity_ids: string[];
          exploration_event_ids: string[] | null;
          id: string;
          idempotency_key: string;
          language: string;
          payload_hash: string;
          payload_json: Json;
          profile_snapshot_id: string;
          prompt_version: string | null;
          recommendation_ids: string[];
          report_schema_version: number;
          summary_mode: string | null;
          user_id: string;
        };
        Insert: {
          created_at: string;
          explored_entity_ids: string[];
          exploration_event_ids?: string[] | null;
          id: string;
          idempotency_key: string;
          language: string;
          payload_hash: string;
          payload_json: Json;
          profile_snapshot_id: string;
          prompt_version?: string | null;
          recommendation_ids: string[];
          report_schema_version: number;
          summary_mode?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          explored_entity_ids?: string[];
          exploration_event_ids?: string[] | null;
          id?: string;
          idempotency_key?: string;
          language?: string;
          payload_hash?: string;
          payload_json?: Json;
          profile_snapshot_id?: string;
          prompt_version?: string | null;
          recommendation_ids?: string[];
          report_schema_version?: number;
          summary_mode?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      tool_calls: {
        Row: {
          completed_at: string | null;
          conversation_id: string;
          error_code: string | null;
          id: string;
          input_hash: string;
          input_json: Json;
          latency_ms: number | null;
          output_hash: string | null;
          output_snapshot_json: Json | null;
          request_message_id: string;
          source_versions_json: Json;
          started_at: string;
          status: string;
          tool_name: string;
          tool_schema_version: string;
        };
        Insert: {
          completed_at?: string | null;
          conversation_id: string;
          error_code?: string | null;
          id: string;
          input_hash: string;
          input_json: Json;
          latency_ms?: number | null;
          output_hash?: string | null;
          output_snapshot_json?: Json | null;
          request_message_id: string;
          source_versions_json: Json;
          started_at: string;
          status: string;
          tool_name: string;
          tool_schema_version: string;
        };
        Update: {
          completed_at?: string | null;
          conversation_id?: string;
          error_code?: string | null;
          id?: string;
          input_hash?: string;
          input_json?: Json;
          latency_ms?: number | null;
          output_hash?: string | null;
          output_snapshot_json?: Json | null;
          request_message_id?: string;
          source_versions_json?: Json;
          started_at?: string;
          status?: string;
          tool_name?: string;
          tool_schema_version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tool_calls_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tool_calls_request_message_id_fkey";
            columns: ["request_message_id"];
            isOneToOne: false;
            referencedRelation: "conversation_messages";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  knowledge: {
    Tables: {
      aid_criteria: {
        Row: {
          aid_scheme_id: string;
          criterion_type: string;
          criterion_version: string;
          id: string;
          is_required: boolean;
          operator: string;
          source_text: string | null;
          value_json: Json;
        };
        Insert: {
          aid_scheme_id: string;
          criterion_type: string;
          criterion_version: string;
          id: string;
          is_required: boolean;
          operator: string;
          source_text?: string | null;
          value_json: Json;
        };
        Update: {
          aid_scheme_id?: string;
          criterion_type?: string;
          criterion_version?: string;
          id?: string;
          is_required?: boolean;
          operator?: string;
          source_text?: string | null;
          value_json?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "aid_criteria_aid_scheme_id_fkey";
            columns: ["aid_scheme_id"];
            isOneToOne: false;
            referencedRelation: "aid_schemes";
            referencedColumns: ["id"];
          },
        ];
      };
      aid_schemes: {
        Row: {
          aid_code: string;
          amount_text: string | null;
          application_url: string;
          apply_window_end: string | null;
          apply_window_start: string | null;
          benefit_summary: string | null;
          dataset_version_id: string;
          eligibility_summary: string | null;
          id: string;
          last_verified_at: string;
          level: string;
          name: string;
          portal_name: string | null;
          provider: string;
          provider_type: string | null;
          states: string[] | null;
          verification_status: string;
        };
        Insert: {
          aid_code: string;
          amount_text?: string | null;
          application_url: string;
          apply_window_end?: string | null;
          apply_window_start?: string | null;
          benefit_summary?: string | null;
          dataset_version_id: string;
          eligibility_summary?: string | null;
          id: string;
          last_verified_at: string;
          level: string;
          name: string;
          portal_name?: string | null;
          provider: string;
          provider_type?: string | null;
          states?: string[] | null;
          verification_status: string;
        };
        Update: {
          aid_code?: string;
          amount_text?: string | null;
          application_url?: string;
          apply_window_end?: string | null;
          apply_window_start?: string | null;
          benefit_summary?: string | null;
          dataset_version_id?: string;
          eligibility_summary?: string | null;
          id?: string;
          last_verified_at?: string;
          level?: string;
          name?: string;
          portal_name?: string | null;
          provider?: string;
          provider_type?: string | null;
          states?: string[] | null;
          verification_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "aid_schemes_dataset_version_id_fkey";
            columns: ["dataset_version_id"];
            isOneToOne: false;
            referencedRelation: "dataset_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      career_interest_profiles: {
        Row: {
          artistic: number;
          career_id: string;
          conventional: number;
          dataset_version_id: string;
          enterprising: number;
          high_point_code: string | null;
          investigative: number;
          profile_version: string;
          realistic: number;
          social: number;
        };
        Insert: {
          artistic: number;
          career_id: string;
          conventional: number;
          dataset_version_id: string;
          enterprising: number;
          high_point_code?: string | null;
          investigative: number;
          profile_version: string;
          realistic: number;
          social: number;
        };
        Update: {
          artistic?: number;
          career_id?: string;
          conventional?: number;
          dataset_version_id?: string;
          enterprising?: number;
          high_point_code?: string | null;
          investigative?: number;
          profile_version?: string;
          realistic?: number;
          social?: number;
        };
        Relationships: [
          {
            foreignKeyName: "career_interest_profiles_career_id_fkey";
            columns: ["career_id"];
            isOneToOne: true;
            referencedRelation: "careers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "career_interest_profiles_dataset_version_id_fkey";
            columns: ["dataset_version_id"];
            isOneToOne: false;
            referencedRelation: "dataset_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      career_pathways: {
        Row: {
          career_id: string;
          display_order: number;
          pathway_id: string;
          relationship_type: string;
        };
        Insert: {
          career_id: string;
          display_order: number;
          pathway_id: string;
          relationship_type: string;
        };
        Update: {
          career_id?: string;
          display_order?: number;
          pathway_id?: string;
          relationship_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "career_pathways_career_id_fkey";
            columns: ["career_id"];
            isOneToOne: false;
            referencedRelation: "careers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "career_pathways_pathway_id_fkey";
            columns: ["pathway_id"];
            isOneToOne: false;
            referencedRelation: "pathways";
            referencedColumns: ["id"];
          },
        ];
      };
      career_profiles: {
        Row: {
          career_id: string;
          image_ref: string | null;
          last_reviewed_at: string | null;
          next_role_3yr: string | null;
          progression_note: string | null;
          review_status: string;
          reviewed_by: string | null;
          salary_entry_band: string | null;
          salary_note: string | null;
          skills: string[] | null;
        };
        Insert: {
          career_id: string;
          image_ref?: string | null;
          last_reviewed_at?: string | null;
          next_role_3yr?: string | null;
          progression_note?: string | null;
          review_status: string;
          reviewed_by?: string | null;
          salary_entry_band?: string | null;
          salary_note?: string | null;
          skills?: string[] | null;
        };
        Update: {
          career_id?: string;
          image_ref?: string | null;
          last_reviewed_at?: string | null;
          next_role_3yr?: string | null;
          progression_note?: string | null;
          review_status?: string;
          reviewed_by?: string | null;
          salary_entry_band?: string | null;
          salary_note?: string | null;
          skills?: string[] | null;
        };
        Relationships: [
          {
            foreignKeyName: "career_profiles_career_id_fkey";
            columns: ["career_id"];
            isOneToOne: true;
            referencedRelation: "careers";
            referencedColumns: ["id"];
          },
        ];
      };
      career_value_profiles: {
        Row: {
          achievement: number;
          career_id: string;
          dataset_version_id: string;
          independence: number;
          profile_version: string;
          recognition: number;
          relationships: number;
          support: number;
          working_conditions: number;
        };
        Insert: {
          achievement: number;
          career_id: string;
          dataset_version_id: string;
          independence: number;
          profile_version: string;
          recognition: number;
          relationships: number;
          support: number;
          working_conditions: number;
        };
        Update: {
          achievement?: number;
          career_id?: string;
          dataset_version_id?: string;
          independence?: number;
          profile_version?: string;
          recognition?: number;
          relationships?: number;
          support?: number;
          working_conditions?: number;
        };
        Relationships: [
          {
            foreignKeyName: "career_value_profiles_career_id_fkey";
            columns: ["career_id"];
            isOneToOne: true;
            referencedRelation: "careers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "career_value_profiles_dataset_version_id_fkey";
            columns: ["dataset_version_id"];
            isOneToOne: false;
            referencedRelation: "dataset_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      careers: {
        Row: {
          created_at: string;
          dataset_version_id: string;
          domain_code: string;
          id: string;
          is_curated: boolean;
          nco_code: string | null;
          onet_code: string | null;
          primary_education_route_id: string | null;
          publication_status: string;
          published_at: string | null;
          retired_at: string | null;
          short_description: string | null;
          slug: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at: string;
          dataset_version_id: string;
          domain_code: string;
          id: string;
          is_curated: boolean;
          nco_code?: string | null;
          onet_code?: string | null;
          primary_education_route_id?: string | null;
          publication_status: string;
          published_at?: string | null;
          retired_at?: string | null;
          short_description?: string | null;
          slug: string;
          title: string;
          updated_at: string;
        };
        Update: {
          created_at?: string;
          dataset_version_id?: string;
          domain_code?: string;
          id?: string;
          is_curated?: boolean;
          nco_code?: string | null;
          onet_code?: string | null;
          primary_education_route_id?: string | null;
          publication_status?: string;
          published_at?: string | null;
          retired_at?: string | null;
          short_description?: string | null;
          slug?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "careers_dataset_version_id_fkey";
            columns: ["dataset_version_id"];
            isOneToOne: false;
            referencedRelation: "dataset_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "careers_primary_education_route_id_fkey";
            columns: ["primary_education_route_id"];
            isOneToOne: false;
            referencedRelation: "education_routes";
            referencedColumns: ["id"];
          },
        ];
      };
      college_programs: {
        Row: {
          admission_route: string | null;
          college_id: string;
          dataset_version_id: string;
          discipline_id: string;
          duration_band: string | null;
          fees_band: string | null;
          id: string;
          last_verified_at: string | null;
          program_name: string;
          qualification_level: string;
          verification_status: string;
        };
        Insert: {
          admission_route?: string | null;
          college_id: string;
          dataset_version_id: string;
          discipline_id: string;
          duration_band?: string | null;
          fees_band?: string | null;
          id: string;
          last_verified_at?: string | null;
          program_name: string;
          qualification_level: string;
          verification_status: string;
        };
        Update: {
          admission_route?: string | null;
          college_id?: string;
          dataset_version_id?: string;
          discipline_id?: string;
          duration_band?: string | null;
          fees_band?: string | null;
          id?: string;
          last_verified_at?: string | null;
          program_name?: string;
          qualification_level?: string;
          verification_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "college_programs_college_id_fkey";
            columns: ["college_id"];
            isOneToOne: false;
            referencedRelation: "colleges";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "college_programs_dataset_version_id_fkey";
            columns: ["dataset_version_id"];
            isOneToOne: false;
            referencedRelation: "dataset_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "college_programs_discipline_id_fkey";
            columns: ["discipline_id"];
            isOneToOne: false;
            referencedRelation: "disciplines";
            referencedColumns: ["id"];
          },
        ];
      };
      colleges: {
        Row: {
          admission_route: string | null;
          city: string;
          created_at: string;
          dataset_version_id: string;
          external_code: string | null;
          fees_band: string | null;
          id: string;
          institution_type: string;
          last_verified_at: string | null;
          name: string;
          state: string;
          tier: number | null;
          updated_at: string;
          verification_status: string;
          website_url: string | null;
        };
        Insert: {
          admission_route?: string | null;
          city: string;
          created_at: string;
          dataset_version_id: string;
          external_code?: string | null;
          fees_band?: string | null;
          id: string;
          institution_type: string;
          last_verified_at?: string | null;
          name: string;
          state: string;
          tier?: number | null;
          updated_at: string;
          verification_status: string;
          website_url?: string | null;
        };
        Update: {
          admission_route?: string | null;
          city?: string;
          created_at?: string;
          dataset_version_id?: string;
          external_code?: string | null;
          fees_band?: string | null;
          id?: string;
          institution_type?: string;
          last_verified_at?: string | null;
          name?: string;
          state?: string;
          tier?: number | null;
          updated_at?: string;
          verification_status?: string;
          website_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "colleges_dataset_version_id_fkey";
            columns: ["dataset_version_id"];
            isOneToOne: false;
            referencedRelation: "dataset_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      dataset_versions: {
        Row: {
          checksum: string;
          created_by: string | null;
          dataset_key: string;
          id: string;
          import_status: string;
          imported_at: string;
          published_at: string | null;
          record_count: number | null;
          source_id: string;
          validation_report_json: Json | null;
          version: string;
        };
        Insert: {
          checksum: string;
          created_by?: string | null;
          dataset_key: string;
          id: string;
          import_status: string;
          imported_at: string;
          published_at?: string | null;
          record_count?: number | null;
          source_id: string;
          validation_report_json?: Json | null;
          version: string;
        };
        Update: {
          checksum?: string;
          created_by?: string | null;
          dataset_key?: string;
          id?: string;
          import_status?: string;
          imported_at?: string;
          published_at?: string | null;
          record_count?: number | null;
          source_id?: string;
          validation_report_json?: Json | null;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dataset_versions_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "knowledge_sources";
            referencedColumns: ["id"];
          },
        ];
      };
      disciplines: {
        Row: {
          discipline_code: string;
          domain_code: string;
          id: string;
          status: string;
          title: string;
        };
        Insert: {
          discipline_code: string;
          domain_code: string;
          id: string;
          status: string;
          title: string;
        };
        Update: {
          discipline_code?: string;
          domain_code?: string;
          id?: string;
          status?: string;
          title?: string;
        };
        Relationships: [];
      };
      education_routes: {
        Row: {
          description: string | null;
          id: string;
          publication_status: string;
          route_code: string;
          route_level: string;
          title: string;
        };
        Insert: {
          description?: string | null;
          id: string;
          publication_status: string;
          route_code: string;
          route_level: string;
          title: string;
        };
        Update: {
          description?: string | null;
          id?: string;
          publication_status?: string;
          route_code?: string;
          route_level?: string;
          title?: string;
        };
        Relationships: [];
      };
      knowledge_sources: {
        Row: {
          base_url: string | null;
          created_at: string;
          id: string;
          license_ref: string | null;
          name: string;
          publisher: string;
          source_key: string;
          source_type: string;
          status: string;
          trust_level: string;
          updated_at: string;
        };
        Insert: {
          base_url?: string | null;
          created_at: string;
          id: string;
          license_ref?: string | null;
          name: string;
          publisher: string;
          source_key: string;
          source_type: string;
          status: string;
          trust_level: string;
          updated_at: string;
        };
        Update: {
          base_url?: string | null;
          created_at?: string;
          id?: string;
          license_ref?: string | null;
          name?: string;
          publisher?: string;
          source_key?: string;
          source_type?: string;
          status?: string;
          trust_level?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pathway_disciplines: {
        Row: {
          discipline_id: string;
          mapping_version: string;
          pathway_id: string;
          relevance_weight: number;
        };
        Insert: {
          discipline_id: string;
          mapping_version: string;
          pathway_id: string;
          relevance_weight: number;
        };
        Update: {
          discipline_id?: string;
          mapping_version?: string;
          pathway_id?: string;
          relevance_weight?: number;
        };
        Relationships: [
          {
            foreignKeyName: "pathway_disciplines_discipline_id_fkey";
            columns: ["discipline_id"];
            isOneToOne: false;
            referencedRelation: "disciplines";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pathway_disciplines_pathway_id_fkey";
            columns: ["pathway_id"];
            isOneToOne: false;
            referencedRelation: "pathways";
            referencedColumns: ["id"];
          },
        ];
      };
      pathways: {
        Row: {
          backup_route_note: string | null;
          dataset_version_id: string;
          description: string | null;
          duration_band: string | null;
          education_route_id: string;
          id: string;
          pathway_code: string;
          publication_status: string;
          title: string;
        };
        Insert: {
          backup_route_note?: string | null;
          dataset_version_id: string;
          description?: string | null;
          duration_band?: string | null;
          education_route_id: string;
          id: string;
          pathway_code: string;
          publication_status: string;
          title: string;
        };
        Update: {
          backup_route_note?: string | null;
          dataset_version_id?: string;
          description?: string | null;
          duration_band?: string | null;
          education_route_id?: string;
          id?: string;
          pathway_code?: string;
          publication_status?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pathways_dataset_version_id_fkey";
            columns: ["dataset_version_id"];
            isOneToOne: false;
            referencedRelation: "dataset_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pathways_education_route_id_fkey";
            columns: ["education_route_id"];
            isOneToOne: false;
            referencedRelation: "education_routes";
            referencedColumns: ["id"];
          },
        ];
      };
      stream_map_items: {
        Row: {
          map_id: string;
          rank: number;
          reason_key: string;
          stream_option_id: string;
        };
        Insert: {
          map_id: string;
          rank: number;
          reason_key: string;
          stream_option_id: string;
        };
        Update: {
          map_id?: string;
          rank?: number;
          reason_key?: string;
          stream_option_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stream_map_items_map_id_fkey";
            columns: ["map_id"];
            isOneToOne: false;
            referencedRelation: "stream_maps";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "stream_map_items_stream_option_id_fkey";
            columns: ["stream_option_id"];
            isOneToOne: false;
            referencedRelation: "stream_options";
            referencedColumns: ["id"];
          },
        ];
      };
      stream_maps: {
        Row: {
          dataset_version_id: string;
          id: string;
          status: string;
          top_two_code: string;
          version: string;
        };
        Insert: {
          dataset_version_id: string;
          id: string;
          status: string;
          top_two_code: string;
          version: string;
        };
        Update: {
          dataset_version_id?: string;
          id?: string;
          status?: string;
          top_two_code?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stream_maps_dataset_version_id_fkey";
            columns: ["dataset_version_id"];
            isOneToOne: false;
            referencedRelation: "dataset_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      stream_options: {
        Row: {
          description: string;
          id: string;
          status: string;
          stream_code: string;
          title: string;
        };
        Insert: {
          description: string;
          id: string;
          status: string;
          stream_code: string;
          title: string;
        };
        Update: {
          description?: string;
          id?: string;
          status?: string;
          stream_code?: string;
          title?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  operations: {
    Tables: {
      analytics_events: {
        Row: {
          anonymous_analytics_id: string;
          count_value: number | null;
          duration_ms: number | null;
          event_name: string;
          id: string;
          instrument_code: string | null;
          journey_step: number | null;
          occurred_at: string;
          properties_json: Json;
          safety_tier: string | null;
          segment: string | null;
          state: string | null;
        };
        Insert: {
          anonymous_analytics_id: string;
          count_value?: number | null;
          duration_ms?: number | null;
          event_name: string;
          id: string;
          instrument_code?: string | null;
          journey_step?: number | null;
          occurred_at: string;
          properties_json: Json;
          safety_tier?: string | null;
          segment?: string | null;
          state?: string | null;
        };
        Update: {
          anonymous_analytics_id?: string;
          count_value?: number | null;
          duration_ms?: number | null;
          event_name?: string;
          id?: string;
          instrument_code?: string | null;
          journey_step?: number | null;
          occurred_at?: string;
          properties_json?: Json;
          safety_tier?: string | null;
          segment?: string | null;
          state?: string | null;
        };
        Relationships: [];
      };
      audit_events: {
        Row: {
          action: string;
          actor_id: string | null;
          actor_type: string;
          id: string;
          ip_hash: string | null;
          occurred_at: string;
          request_correlation_id: string;
          safe_metadata_json: Json | null;
          target_id: string | null;
          target_type: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          actor_type: string;
          id: string;
          ip_hash?: string | null;
          occurred_at: string;
          request_correlation_id: string;
          safe_metadata_json?: Json | null;
          target_id?: string | null;
          target_type: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          actor_type?: string;
          id?: string;
          ip_hash?: string | null;
          occurred_at?: string;
          request_correlation_id?: string;
          safe_metadata_json?: Json | null;
          target_id?: string | null;
          target_type?: string;
        };
        Relationships: [];
      };
      evaluation_cases: {
        Row: {
          assertions_json: Json | null;
          case_key: string;
          category: string;
          created_at: string;
          expected_json: Json;
          fixture_refs_json: Json | null;
          id: string;
          input_json: Json | null;
          module_code: string;
          severity: string | null;
          status: string;
          version: string;
        };
        Insert: {
          assertions_json?: Json | null;
          case_key: string;
          category: string;
          created_at: string;
          expected_json: Json;
          fixture_refs_json?: Json | null;
          id: string;
          input_json?: Json | null;
          module_code: string;
          severity?: string | null;
          status: string;
          version: string;
        };
        Update: {
          assertions_json?: Json | null;
          case_key?: string;
          category?: string;
          created_at?: string;
          expected_json?: Json;
          fixture_refs_json?: Json | null;
          id?: string;
          input_json?: Json | null;
          module_code?: string;
          severity?: string | null;
          status?: string;
          version?: string;
        };
        Relationships: [];
      };
      evaluation_results: {
        Row: {
          actual_json: Json | null;
          created_at: string;
          duration_ms: number;
          evaluation_case_id: string;
          evaluation_run_id: string;
          failure_codes: string[] | null;
          id: string;
          metrics_json: Json | null;
          status: string;
        };
        Insert: {
          actual_json?: Json | null;
          created_at: string;
          duration_ms: number;
          evaluation_case_id: string;
          evaluation_run_id: string;
          failure_codes?: string[] | null;
          id: string;
          metrics_json?: Json | null;
          status: string;
        };
        Update: {
          actual_json?: Json | null;
          created_at?: string;
          duration_ms?: number;
          evaluation_case_id?: string;
          evaluation_run_id?: string;
          failure_codes?: string[] | null;
          id?: string;
          metrics_json?: Json | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "evaluation_results_evaluation_case_id_fkey";
            columns: ["evaluation_case_id"];
            isOneToOne: false;
            referencedRelation: "evaluation_cases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evaluation_results_evaluation_run_id_fkey";
            columns: ["evaluation_run_id"];
            isOneToOne: false;
            referencedRelation: "evaluation_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      evaluation_runs: {
        Row: {
          completed_at: string | null;
          environment: string;
          fixture_versions_json: Json;
          git_revision: string;
          id: string;
          run_type: string;
          started_at: string;
          status: string;
          summary_json: Json | null;
        };
        Insert: {
          completed_at?: string | null;
          environment: string;
          fixture_versions_json: Json;
          git_revision: string;
          id: string;
          run_type: string;
          started_at: string;
          status: string;
          summary_json?: Json | null;
        };
        Update: {
          completed_at?: string | null;
          environment?: string;
          fixture_versions_json?: Json;
          git_revision?: string;
          id?: string;
          run_type?: string;
          started_at?: string;
          status?: string;
          summary_json?: Json | null;
        };
        Relationships: [];
      };
      privacy_job_steps: {
        Row: {
          attempt_count: number;
          completed_at: string | null;
          error_code: string | null;
          id: string;
          module_code: string;
          privacy_job_id: string;
          started_at: string | null;
          status: string;
        };
        Insert: {
          attempt_count: number;
          completed_at?: string | null;
          error_code?: string | null;
          id: string;
          module_code: string;
          privacy_job_id: string;
          started_at?: string | null;
          status: string;
        };
        Update: {
          attempt_count?: number;
          completed_at?: string | null;
          error_code?: string | null;
          id?: string;
          module_code?: string;
          privacy_job_id?: string;
          started_at?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "privacy_job_steps_privacy_job_id_fkey";
            columns: ["privacy_job_id"];
            isOneToOne: false;
            referencedRelation: "privacy_jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      privacy_jobs: {
        Row: {
          attempt_count: number | null;
          authorization_method: string | null;
          completed_at: string | null;
          deadline_at: string;
          error_code: string | null;
          id: string;
          job_type: string;
          requested_at: string;
          requested_by: string;
          result_asset_ref: string | null;
          result_expires_at: string | null;
          status: string;
          user_id: string;
        };
        Insert: {
          attempt_count?: number | null;
          authorization_method?: string | null;
          completed_at?: string | null;
          deadline_at: string;
          error_code?: string | null;
          id: string;
          job_type: string;
          requested_at: string;
          requested_by: string;
          result_asset_ref?: string | null;
          result_expires_at?: string | null;
          status: string;
          user_id: string;
        };
        Update: {
          attempt_count?: number | null;
          authorization_method?: string | null;
          completed_at?: string | null;
          deadline_at?: string;
          error_code?: string | null;
          id?: string;
          job_type?: string;
          requested_at?: string;
          requested_by?: string;
          result_asset_ref?: string | null;
          result_expires_at?: string | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      staff_profiles: {
        Row: {
          created_at: string;
          display_name: string;
          mfa_required: boolean;
          staff_status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at: string;
          display_name: string;
          mfa_required: boolean;
          staff_status: string;
          updated_at: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          mfa_required?: boolean;
          staff_status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      staff_role_assignments: {
        Row: {
          expires_at: string | null;
          granted_at: string;
          granted_by: string;
          id: string;
          revoked_at: string | null;
          role: string;
          scope_json: Json | null;
          staff_user_id: string;
        };
        Insert: {
          expires_at?: string | null;
          granted_at: string;
          granted_by: string;
          id: string;
          revoked_at?: string | null;
          role: string;
          scope_json?: Json | null;
          staff_user_id: string;
        };
        Update: {
          expires_at?: string | null;
          granted_at?: string;
          granted_by?: string;
          id?: string;
          revoked_at?: string | null;
          role?: string;
          scope_json?: Json | null;
          staff_user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_role_assignments_staff_user_id_fkey";
            columns: ["staff_user_id"];
            isOneToOne: false;
            referencedRelation: "staff_profiles";
            referencedColumns: ["user_id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  recommendation: {
    Tables: {
      feasibility_rules: {
        Row: {
          configuration_id: string;
          education_route_id: string;
          id: string;
          marks_band: string;
          priority: number;
          reachability: number;
          reason_key: string | null;
          segment: string;
        };
        Insert: {
          configuration_id: string;
          education_route_id: string;
          id: string;
          marks_band: string;
          priority: number;
          reachability: number;
          reason_key?: string | null;
          segment: string;
        };
        Update: {
          configuration_id?: string;
          education_route_id?: string;
          id?: string;
          marks_band?: string;
          priority?: number;
          reachability?: number;
          reason_key?: string | null;
          segment?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feasibility_rules_configuration_id_fkey";
            columns: ["configuration_id"];
            isOneToOne: false;
            referencedRelation: "matching_configurations";
            referencedColumns: ["id"];
          },
        ];
      };
      generated_plan_steps: {
        Row: {
          action_metadata_json: Json | null;
          action_text: string;
          generated_plan_id: string;
          id: string;
          source_template_step_id: string;
          step_order: number;
          time_window: string;
        };
        Insert: {
          action_metadata_json?: Json | null;
          action_text: string;
          generated_plan_id: string;
          id: string;
          source_template_step_id: string;
          step_order: number;
          time_window: string;
        };
        Update: {
          action_metadata_json?: Json | null;
          action_text?: string;
          generated_plan_id?: string;
          id?: string;
          source_template_step_id?: string;
          step_order?: number;
          time_window?: string;
        };
        Relationships: [
          {
            foreignKeyName: "generated_plan_steps_generated_plan_id_fkey";
            columns: ["generated_plan_id"];
            isOneToOne: false;
            referencedRelation: "generated_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "generated_plan_steps_source_template_step_id_fkey";
            columns: ["source_template_step_id"];
            isOneToOne: false;
            referencedRelation: "plan_template_steps";
            referencedColumns: ["id"];
          },
        ];
      };
      generated_plans: {
        Row: {
          created_at: string;
          id: string;
          input_hash: string;
          output_hash: string;
          plan_template_id: string;
          plan_version: number;
          profile_snapshot_id: string;
          recommendation_run_id: string | null;
          target_entity_id: string | null;
          target_entity_type: string | null;
          user_id: string;
        };
        Insert: {
          created_at: string;
          id: string;
          input_hash: string;
          output_hash: string;
          plan_template_id: string;
          plan_version: number;
          profile_snapshot_id: string;
          recommendation_run_id?: string | null;
          target_entity_id?: string | null;
          target_entity_type?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          input_hash?: string;
          output_hash?: string;
          plan_template_id?: string;
          plan_version?: number;
          profile_snapshot_id?: string;
          recommendation_run_id?: string | null;
          target_entity_id?: string | null;
          target_entity_type?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "generated_plans_plan_template_id_fkey";
            columns: ["plan_template_id"];
            isOneToOne: false;
            referencedRelation: "plan_templates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "generated_plans_recommendation_run_id_fkey";
            columns: ["recommendation_run_id"];
            isOneToOne: false;
            referencedRelation: "recommendation_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      matching_configurations: {
        Row: {
          algorithm_version: string;
          approved_at: string | null;
          approved_by: string | null;
          configuration_key: string;
          context_weight: number | null;
          created_at: string;
          feasibility_weight: number | null;
          id: string;
          interest_weight: number | null;
          riasec_tie_order: string[] | null;
          rounding_scale: number;
          rules_json: Json;
          status: string;
          values_weight: number | null;
          version: string;
        };
        Insert: {
          algorithm_version: string;
          approved_at?: string | null;
          approved_by?: string | null;
          configuration_key: string;
          context_weight?: number | null;
          created_at: string;
          feasibility_weight?: number | null;
          id: string;
          interest_weight?: number | null;
          riasec_tie_order?: string[] | null;
          rounding_scale: number;
          rules_json: Json;
          status: string;
          values_weight?: number | null;
          version: string;
        };
        Update: {
          algorithm_version?: string;
          approved_at?: string | null;
          approved_by?: string | null;
          configuration_key?: string;
          context_weight?: number | null;
          created_at?: string;
          feasibility_weight?: number | null;
          id?: string;
          interest_weight?: number | null;
          riasec_tie_order?: string[] | null;
          rounding_scale?: number;
          rules_json?: Json;
          status?: string;
          values_weight?: number | null;
          version?: string;
        };
        Relationships: [];
      };
      missions: {
        Row: {
          created_at: string;
          generated_plan_id: string;
          id: string;
          mission_order: number;
          mission_text: string;
          mission_type: string;
        };
        Insert: {
          created_at: string;
          generated_plan_id: string;
          id: string;
          mission_order: number;
          mission_text: string;
          mission_type: string;
        };
        Update: {
          created_at?: string;
          generated_plan_id?: string;
          id?: string;
          mission_order?: number;
          mission_text?: string;
          mission_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "missions_generated_plan_id_fkey";
            columns: ["generated_plan_id"];
            isOneToOne: false;
            referencedRelation: "generated_plans";
            referencedColumns: ["id"];
          },
        ];
      };
      plan_template_steps: {
        Row: {
          action_key: string;
          completion_evidence_type: string | null;
          id: string;
          is_optional: boolean;
          plan_template_id: string;
          step_order: number;
          time_window: string;
        };
        Insert: {
          action_key: string;
          completion_evidence_type?: string | null;
          id: string;
          is_optional: boolean;
          plan_template_id: string;
          step_order: number;
          time_window: string;
        };
        Update: {
          action_key?: string;
          completion_evidence_type?: string | null;
          id?: string;
          is_optional?: boolean;
          plan_template_id?: string;
          step_order?: number;
          time_window?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plan_template_steps_plan_template_id_fkey";
            columns: ["plan_template_id"];
            isOneToOne: false;
            referencedRelation: "plan_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      plan_templates: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          id: string;
          plan_type: string;
          segment: string;
          selection_rules_json: Json | null;
          status: string;
          template_key: string;
          version: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          id: string;
          plan_type: string;
          segment: string;
          selection_rules_json?: Json | null;
          status: string;
          template_key: string;
          version: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          id?: string;
          plan_type?: string;
          segment?: string;
          selection_rules_json?: Json | null;
          status?: string;
          template_key?: string;
          version?: string;
        };
        Relationships: [];
      };
      recommendation_items: {
        Row: {
          aid_scheme_id: string | null;
          career_id: string | null;
          college_id: string | null;
          context_boost: number | null;
          created_at: string;
          entity_dataset_version: string;
          entity_snapshot_json: Json | null;
          feasibility_score: number | null;
          fit_explanation_json: Json;
          fit_score: number | null;
          id: string;
          interest_fit: number | null;
          likelihood_label: string | null;
          pathway_id: string | null;
          rank: number;
          recommendation_run_id: string;
          ring_id: string | null;
          ring_reason_key: string | null;
          stream_option_id: string | null;
          values_fit: number | null;
        };
        Insert: {
          aid_scheme_id?: string | null;
          career_id?: string | null;
          college_id?: string | null;
          context_boost?: number | null;
          created_at: string;
          entity_dataset_version: string;
          entity_snapshot_json?: Json | null;
          feasibility_score?: number | null;
          fit_explanation_json: Json;
          fit_score?: number | null;
          id: string;
          interest_fit?: number | null;
          likelihood_label?: string | null;
          pathway_id?: string | null;
          rank: number;
          recommendation_run_id: string;
          ring_id?: string | null;
          ring_reason_key?: string | null;
          stream_option_id?: string | null;
          values_fit?: number | null;
        };
        Update: {
          aid_scheme_id?: string | null;
          career_id?: string | null;
          college_id?: string | null;
          context_boost?: number | null;
          created_at?: string;
          entity_dataset_version?: string;
          entity_snapshot_json?: Json | null;
          feasibility_score?: number | null;
          fit_explanation_json?: Json;
          fit_score?: number | null;
          id?: string;
          interest_fit?: number | null;
          likelihood_label?: string | null;
          pathway_id?: string | null;
          rank?: number;
          recommendation_run_id?: string;
          ring_id?: string | null;
          ring_reason_key?: string | null;
          stream_option_id?: string | null;
          values_fit?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "recommendation_items_recommendation_run_id_fkey";
            columns: ["recommendation_run_id"];
            isOneToOne: false;
            referencedRelation: "recommendation_runs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "recommendation_items_ring_id_fkey";
            columns: ["ring_id"];
            isOneToOne: false;
            referencedRelation: "recommendation_rings";
            referencedColumns: ["id"];
          },
        ];
      };
      recommendation_rings: {
        Row: {
          display_order: number;
          id: string;
          reason_template_key: string | null;
          recommendation_run_id: string;
          ring_code: string;
          rule_version: string;
        };
        Insert: {
          display_order: number;
          id: string;
          reason_template_key?: string | null;
          recommendation_run_id: string;
          ring_code: string;
          rule_version: string;
        };
        Update: {
          display_order?: number;
          id?: string;
          reason_template_key?: string | null;
          recommendation_run_id?: string;
          ring_code?: string;
          rule_version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recommendation_rings_recommendation_run_id_fkey";
            columns: ["recommendation_run_id"];
            isOneToOne: false;
            referencedRelation: "recommendation_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      recommendation_runs: {
        Row: {
          algorithm_version: string;
          completed_at: string | null;
          configuration_id: string;
          created_at: string;
          error_code: string | null;
          id: string;
          input_hash: string;
          kind: string;
          output_hash: string;
          profile_snapshot_id: string;
          request_context_json: Json | null;
          source_data_versions_json: Json;
          status: string;
          user_id: string;
          weights_version: string;
        };
        Insert: {
          algorithm_version: string;
          completed_at?: string | null;
          configuration_id: string;
          created_at: string;
          error_code?: string | null;
          id: string;
          input_hash: string;
          kind: string;
          output_hash: string;
          profile_snapshot_id: string;
          request_context_json?: Json | null;
          source_data_versions_json: Json;
          status: string;
          user_id: string;
          weights_version: string;
        };
        Update: {
          algorithm_version?: string;
          completed_at?: string | null;
          configuration_id?: string;
          created_at?: string;
          error_code?: string | null;
          id?: string;
          input_hash?: string;
          kind?: string;
          output_hash?: string;
          profile_snapshot_id?: string;
          request_context_json?: Json | null;
          source_data_versions_json?: Json;
          status?: string;
          user_id?: string;
          weights_version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recommendation_runs_configuration_id_fkey";
            columns: ["configuration_id"];
            isOneToOne: false;
            referencedRelation: "matching_configurations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  safety_private: {
    Tables: {
      alert_deliveries: {
        Row: {
          attempt_number: number;
          channel: string;
          completed_at: string | null;
          destination_ref_hash: string | null;
          error_code: string | null;
          handoff_id: string;
          id: string;
          provider_reference_hash: string | null;
          queued_at: string;
          status: string;
        };
        Insert: {
          attempt_number: number;
          channel: string;
          completed_at?: string | null;
          destination_ref_hash?: string | null;
          error_code?: string | null;
          handoff_id: string;
          id: string;
          provider_reference_hash?: string | null;
          queued_at: string;
          status: string;
        };
        Update: {
          attempt_number?: number;
          channel?: string;
          completed_at?: string | null;
          destination_ref_hash?: string | null;
          error_code?: string | null;
          handoff_id?: string;
          id?: string;
          provider_reference_hash?: string | null;
          queued_at?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alert_deliveries_handoff_id_fkey";
            columns: ["handoff_id"];
            isOneToOne: false;
            referencedRelation: "handoffs";
            referencedColumns: ["id"];
          },
        ];
      };
      approved_safety_messages: {
        Row: {
          content: string | null;
          content_hash: string;
          helpline_refs_json: Json | null;
          id: string;
          language: string;
          message_key: string;
          policy_version_id: string;
          status: string;
          tier: string;
        };
        Insert: {
          content?: string | null;
          content_hash: string;
          helpline_refs_json?: Json | null;
          id: string;
          language: string;
          message_key: string;
          policy_version_id: string;
          status: string;
          tier: string;
        };
        Update: {
          content?: string | null;
          content_hash?: string;
          helpline_refs_json?: Json | null;
          id?: string;
          language?: string;
          message_key?: string;
          policy_version_id?: string;
          status?: string;
          tier?: string;
        };
        Relationships: [
          {
            foreignKeyName: "approved_safety_messages_policy_version_id_fkey";
            columns: ["policy_version_id"];
            isOneToOne: false;
            referencedRelation: "safety_policy_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      handoff_actions: {
        Row: {
          action_category: string | null;
          action_type: string;
          actor_staff_id: string;
          encryption_key_version: string;
          handoff_id: string;
          id: string;
          note_ciphertext: string | null;
          occurred_at: string;
        };
        Insert: {
          action_category?: string | null;
          action_type: string;
          actor_staff_id: string;
          encryption_key_version: string;
          handoff_id: string;
          id: string;
          note_ciphertext?: string | null;
          occurred_at: string;
        };
        Update: {
          action_category?: string | null;
          action_type?: string;
          actor_staff_id?: string;
          encryption_key_version?: string;
          handoff_id?: string;
          id?: string;
          note_ciphertext?: string | null;
          occurred_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "handoff_actions_handoff_id_fkey";
            columns: ["handoff_id"];
            isOneToOne: false;
            referencedRelation: "handoffs";
            referencedColumns: ["id"];
          },
        ];
      };
      handoffs: {
        Row: {
          actioned_at: string | null;
          alerted_at: string | null;
          closed_at: string | null;
          contact_available: boolean | null;
          conversation_id: string | null;
          id: string;
          packet_hash: string;
          packet_snapshot_json: Json | null;
          priority: number;
          profile_snapshot_id: string | null;
          queued_at: string;
          reason: string;
          recommendation_ids: string[] | null;
          safety_event_id: string | null;
          status: string;
          user_id: string;
        };
        Insert: {
          actioned_at?: string | null;
          alerted_at?: string | null;
          closed_at?: string | null;
          contact_available?: boolean | null;
          conversation_id?: string | null;
          id: string;
          packet_hash: string;
          packet_snapshot_json?: Json | null;
          priority: number;
          profile_snapshot_id?: string | null;
          queued_at: string;
          reason: string;
          recommendation_ids?: string[] | null;
          safety_event_id?: string | null;
          status: string;
          user_id: string;
        };
        Update: {
          actioned_at?: string | null;
          alerted_at?: string | null;
          closed_at?: string | null;
          contact_available?: boolean | null;
          conversation_id?: string | null;
          id?: string;
          packet_hash?: string;
          packet_snapshot_json?: Json | null;
          priority?: number;
          profile_snapshot_id?: string | null;
          queued_at?: string;
          reason?: string;
          recommendation_ids?: string[] | null;
          safety_event_id?: string | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "handoffs_safety_event_id_fkey";
            columns: ["safety_event_id"];
            isOneToOne: false;
            referencedRelation: "safety_events";
            referencedColumns: ["id"];
          },
        ];
      };
      safety_events: {
        Row: {
          approved_message_id: string | null;
          assessment_run_id: string | null;
          conversation_id: string | null;
          create_handoff: boolean;
          created_at: string;
          decision: string;
          encryption_key_version: string;
          id: string;
          occurred_at: string;
          pause_journey: boolean;
          rule_set_id: string;
          session_id: string | null;
          source_event_id: string;
          tier: string | null;
          trigger_excerpt_ciphertext: string | null;
          trigger_hash: string;
          trigger_type: string | null;
          user_id: string;
        };
        Insert: {
          approved_message_id?: string | null;
          assessment_run_id?: string | null;
          conversation_id?: string | null;
          create_handoff: boolean;
          created_at: string;
          decision: string;
          encryption_key_version: string;
          id: string;
          occurred_at: string;
          pause_journey: boolean;
          rule_set_id: string;
          session_id?: string | null;
          source_event_id: string;
          tier?: string | null;
          trigger_excerpt_ciphertext?: string | null;
          trigger_hash: string;
          trigger_type?: string | null;
          user_id: string;
        };
        Update: {
          approved_message_id?: string | null;
          assessment_run_id?: string | null;
          conversation_id?: string | null;
          create_handoff?: boolean;
          created_at?: string;
          decision?: string;
          encryption_key_version?: string;
          id?: string;
          occurred_at?: string;
          pause_journey?: boolean;
          rule_set_id?: string;
          session_id?: string | null;
          source_event_id?: string;
          tier?: string | null;
          trigger_excerpt_ciphertext?: string | null;
          trigger_hash?: string;
          trigger_type?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "safety_events_approved_message_id_fkey";
            columns: ["approved_message_id"];
            isOneToOne: false;
            referencedRelation: "approved_safety_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "safety_events_rule_set_id_fkey";
            columns: ["rule_set_id"];
            isOneToOne: false;
            referencedRelation: "safety_rule_sets";
            referencedColumns: ["id"];
          },
        ];
      };
      safety_policy_versions: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
          effective_from: string | null;
          id: string;
          policy_hash: string;
          source_document_ref: string;
          status: string;
          version: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at: string;
          effective_from?: string | null;
          id: string;
          policy_hash: string;
          source_document_ref: string;
          status: string;
          version: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          effective_from?: string | null;
          id?: string;
          policy_hash?: string;
          source_document_ref?: string;
          status?: string;
          version?: string;
        };
        Relationships: [];
      };
      safety_rule_sets: {
        Row: {
          approved_at: string | null;
          classifier_name: string | null;
          classifier_version: string | null;
          id: string;
          policy_version_id: string;
          rule_type: string;
          rules_json: Json;
          status: string;
          version: string;
        };
        Insert: {
          approved_at?: string | null;
          classifier_name?: string | null;
          classifier_version?: string | null;
          id: string;
          policy_version_id: string;
          rule_type: string;
          rules_json: Json;
          status: string;
          version: string;
        };
        Update: {
          approved_at?: string | null;
          classifier_name?: string | null;
          classifier_version?: string | null;
          id?: string;
          policy_version_id?: string;
          rule_type?: string;
          rules_json?: Json;
          status?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "safety_rule_sets_policy_version_id_fkey";
            columns: ["policy_version_id"];
            isOneToOne: false;
            referencedRelation: "safety_policy_versions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  assessment: {
    Enums: {},
  },
  counselor: {
    Enums: {},
  },
  knowledge: {
    Enums: {},
  },
  operations: {
    Enums: {},
  },
  recommendation: {
    Enums: {},
  },
  safety_private: {
    Enums: {},
  },
} as const;
