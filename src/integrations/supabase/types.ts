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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      academic_assessments: {
        Row: {
          assessment_date: string | null
          class_section_id: string
          created_at: string | null
          created_by: string | null
          id: string
          is_published: boolean | null
          max_marks: number | null
          published_at: string | null
          school_id: string
          subject_id: string | null
          term_label: string | null
          title: string
        }
        Insert: {
          assessment_date?: string | null
          class_section_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_published?: boolean | null
          max_marks?: number | null
          published_at?: string | null
          school_id: string
          subject_id?: string | null
          term_label?: string | null
          title: string
        }
        Update: {
          assessment_date?: string | null
          class_section_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_published?: boolean | null
          max_marks?: number | null
          published_at?: string | null
          school_id?: string
          subject_id?: string | null
          term_label?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_assessments_class_section_id_fkey"
            columns: ["class_section_id"]
            isOneToOne: false
            referencedRelation: "class_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_assessments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_assessments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      academic_classes: {
        Row: {
          created_at: string | null
          grade_level: number | null
          id: string
          name: string
          school_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          grade_level?: number | null
          id?: string
          name: string
          school_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          grade_level?: number | null
          id?: string
          name?: string
          school_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "academic_classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_message_pins: {
        Row: {
          created_at: string | null
          id: string
          message_id: string
          school_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_id: string
          school_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message_id?: string
          school_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_message_pins_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "admin_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_message_pins_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_message_reactions: {
        Row: {
          created_at: string | null
          emoji: string
          id: string
          message_id: string
          school_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          emoji: string
          id?: string
          message_id: string
          school_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          emoji?: string
          id?: string
          message_id?: string
          school_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "admin_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_message_reactions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_message_recipients: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message_id: string
          read_at: string | null
          recipient_user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_id: string
          read_at?: string | null
          recipient_user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_id?: string
          read_at?: string | null
          recipient_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_message_recipients_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "admin_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_messages: {
        Row: {
          attachment_urls: string[] | null
          content: string | null
          created_at: string | null
          created_by: string | null
          id: string
          priority: string | null
          reply_to_id: string | null
          school_id: string
          sender_user_id: string
          status: string | null
          subject: string
        }
        Insert: {
          attachment_urls?: string[] | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          priority?: string | null
          reply_to_id?: string | null
          school_id: string
          sender_user_id: string
          status?: string | null
          subject: string
        }
        Update: {
          attachment_urls?: string[] | null
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          priority?: string | null
          reply_to_id?: string | null
          school_id?: string
          sender_user_id?: string
          status?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "admin_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_messages_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_academic_predictions: {
        Row: {
          confidence: number | null
          created_at: string | null
          factors: Json | null
          failure_risk: number | null
          id: string
          predicted_grade: string | null
          promotion_probability: number | null
          school_id: string
          student_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          factors?: Json | null
          failure_risk?: number | null
          id?: string
          predicted_grade?: string | null
          promotion_probability?: number | null
          school_id: string
          student_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          factors?: Json | null
          failure_risk?: number | null
          id?: string
          predicted_grade?: string | null
          promotion_probability?: number | null
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_academic_predictions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_academic_predictions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_career_suggestions: {
        Row: {
          analysis_data: Json | null
          confidence: number | null
          created_at: string | null
          id: string
          interests: string[] | null
          recommended_subjects: string[] | null
          school_id: string
          strengths: string[] | null
          student_id: string
          suggested_careers: Json | null
          updated_at: string | null
        }
        Insert: {
          analysis_data?: Json | null
          confidence?: number | null
          created_at?: string | null
          id?: string
          interests?: string[] | null
          recommended_subjects?: string[] | null
          school_id: string
          strengths?: string[] | null
          student_id: string
          suggested_careers?: Json | null
          updated_at?: string | null
        }
        Update: {
          analysis_data?: Json | null
          confidence?: number | null
          created_at?: string | null
          id?: string
          interests?: string[] | null
          recommended_subjects?: string[] | null
          school_id?: string
          strengths?: string[] | null
          student_id?: string
          suggested_careers?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_career_suggestions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_career_suggestions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_counseling_queue: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          detected_indicators: string[] | null
          id: string
          notes: string | null
          outcome: string | null
          priority: string | null
          reason: string | null
          reason_details: string | null
          reason_type: string | null
          scheduled_date: string | null
          school_id: string
          session_notes: string | null
          status: string | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          detected_indicators?: string[] | null
          id?: string
          notes?: string | null
          outcome?: string | null
          priority?: string | null
          reason?: string | null
          reason_details?: string | null
          reason_type?: string | null
          scheduled_date?: string | null
          school_id: string
          session_notes?: string | null
          status?: string | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          detected_indicators?: string[] | null
          id?: string
          notes?: string | null
          outcome?: string | null
          priority?: string | null
          reason?: string | null
          reason_details?: string | null
          reason_type?: string | null
          scheduled_date?: string | null
          school_id?: string
          session_notes?: string | null
          status?: string | null
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_counseling_queue_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_counseling_queue_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_early_warnings: {
        Row: {
          acknowledged_at: string | null
          created_at: string | null
          description: string | null
          detected_patterns: string[] | null
          id: string
          recommended_actions: string[] | null
          resolved_at: string | null
          school_id: string
          severity: string | null
          status: string | null
          student_id: string
          title: string | null
          warning_type: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string | null
          description?: string | null
          detected_patterns?: string[] | null
          id?: string
          recommended_actions?: string[] | null
          resolved_at?: string | null
          school_id: string
          severity?: string | null
          status?: string | null
          student_id: string
          title?: string | null
          warning_type: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string | null
          description?: string | null
          detected_patterns?: string[] | null
          id?: string
          recommended_actions?: string[] | null
          resolved_at?: string | null
          school_id?: string
          severity?: string | null
          status?: string | null
          student_id?: string
          title?: string | null
          warning_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_early_warnings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_early_warnings_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_parent_updates: {
        Row: {
          ai_summary: string | null
          attendance_status: string | null
          behavior_remarks: string | null
          content: string | null
          created_at: string | null
          focus_trend: string | null
          id: string
          is_sent: boolean | null
          key_insights: string[] | null
          parent_user_id: string | null
          participation_level: string | null
          performance_change_percent: number | null
          recommendations: string[] | null
          school_id: string
          sent_at: string | null
          student_id: string | null
          teacher_notes: string | null
          update_date: string | null
          update_type: string | null
        }
        Insert: {
          ai_summary?: string | null
          attendance_status?: string | null
          behavior_remarks?: string | null
          content?: string | null
          created_at?: string | null
          focus_trend?: string | null
          id?: string
          is_sent?: boolean | null
          key_insights?: string[] | null
          parent_user_id?: string | null
          participation_level?: string | null
          performance_change_percent?: number | null
          recommendations?: string[] | null
          school_id: string
          sent_at?: string | null
          student_id?: string | null
          teacher_notes?: string | null
          update_date?: string | null
          update_type?: string | null
        }
        Update: {
          ai_summary?: string | null
          attendance_status?: string | null
          behavior_remarks?: string | null
          content?: string | null
          created_at?: string | null
          focus_trend?: string | null
          id?: string
          is_sent?: boolean | null
          key_insights?: string[] | null
          parent_user_id?: string | null
          participation_level?: string | null
          performance_change_percent?: number | null
          recommendations?: string[] | null
          school_id?: string
          sent_at?: string | null
          student_id?: string | null
          teacher_notes?: string | null
          update_date?: string | null
          update_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_parent_updates_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_parent_updates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_school_reputation: {
        Row: {
          academic_score: number | null
          analysis_data: Json | null
          community_score: number | null
          created_at: string | null
          id: string
          improvements: string[] | null
          last_analyzed_at: string | null
          nps_score: number | null
          overall_score: number | null
          parent_satisfaction: number | null
          parent_satisfaction_index: number | null
          reputation_score: number | null
          school_id: string
          strengths: string[] | null
          updated_at: string | null
        }
        Insert: {
          academic_score?: number | null
          analysis_data?: Json | null
          community_score?: number | null
          created_at?: string | null
          id?: string
          improvements?: string[] | null
          last_analyzed_at?: string | null
          nps_score?: number | null
          overall_score?: number | null
          parent_satisfaction?: number | null
          parent_satisfaction_index?: number | null
          reputation_score?: number | null
          school_id: string
          strengths?: string[] | null
          updated_at?: string | null
        }
        Update: {
          academic_score?: number | null
          analysis_data?: Json | null
          community_score?: number | null
          created_at?: string | null
          id?: string
          improvements?: string[] | null
          last_analyzed_at?: string | null
          nps_score?: number | null
          overall_score?: number | null
          parent_satisfaction?: number | null
          parent_satisfaction_index?: number | null
          reputation_score?: number | null
          school_id?: string
          strengths?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_school_reputation_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_student_profiles: {
        Row: {
          analysis_data: Json | null
          created_at: string | null
          id: string
          last_analyzed_at: string | null
          learning_style: string | null
          needs_counseling: boolean | null
          needs_extra_support: boolean | null
          personality_type: string | null
          risk_level: string | null
          risk_score: number | null
          school_id: string
          strengths: string[] | null
          student_id: string
          updated_at: string | null
          weaknesses: string[] | null
        }
        Insert: {
          analysis_data?: Json | null
          created_at?: string | null
          id?: string
          last_analyzed_at?: string | null
          learning_style?: string | null
          needs_counseling?: boolean | null
          needs_extra_support?: boolean | null
          personality_type?: string | null
          risk_level?: string | null
          risk_score?: number | null
          school_id: string
          strengths?: string[] | null
          student_id: string
          updated_at?: string | null
          weaknesses?: string[] | null
        }
        Update: {
          analysis_data?: Json | null
          created_at?: string | null
          id?: string
          last_analyzed_at?: string | null
          learning_style?: string | null
          needs_counseling?: boolean | null
          needs_extra_support?: boolean | null
          personality_type?: string | null
          risk_level?: string | null
          risk_score?: number | null
          school_id?: string
          strengths?: string[] | null
          student_id?: string
          updated_at?: string | null
          weaknesses?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_student_profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_student_profiles_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_teacher_performance: {
        Row: {
          analysis_data: Json | null
          attendance_score: number | null
          created_at: string | null
          engagement_score: number | null
          feedback: string | null
          id: string
          last_analyzed_at: string | null
          needs_training: boolean | null
          overall_score: number | null
          results_score: number | null
          school_id: string
          teacher_user_id: string
          updated_at: string | null
        }
        Insert: {
          analysis_data?: Json | null
          attendance_score?: number | null
          created_at?: string | null
          engagement_score?: number | null
          feedback?: string | null
          id?: string
          last_analyzed_at?: string | null
          needs_training?: boolean | null
          overall_score?: number | null
          results_score?: number | null
          school_id: string
          teacher_user_id: string
          updated_at?: string | null
        }
        Update: {
          analysis_data?: Json | null
          attendance_score?: number | null
          created_at?: string | null
          engagement_score?: number | null
          feedback?: string | null
          id?: string
          last_analyzed_at?: string | null
          needs_training?: boolean | null
          overall_score?: number | null
          results_score?: number | null
          school_id?: string
          teacher_user_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_teacher_performance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      app_notifications: {
        Row: {
          body: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          read_at: string | null
          school_id: string
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          read_at?: string | null
          school_id: string
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          read_at?: string | null
          school_id?: string
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_notifications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          attachment_urls: string[] | null
          content: string | null
          created_at: string | null
          feedback: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          marks: number | null
          marks_before_penalty: number | null
          marks_obtained: number | null
          penalty_applied: number | null
          school_id: string
          status: string | null
          student_id: string
          submitted_at: string | null
        }
        Insert: {
          assignment_id: string
          attachment_urls?: string[] | null
          content?: string | null
          created_at?: string | null
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          marks?: number | null
          marks_before_penalty?: number | null
          marks_obtained?: number | null
          penalty_applied?: number | null
          school_id: string
          status?: string | null
          student_id: string
          submitted_at?: string | null
        }
        Update: {
          assignment_id?: string
          attachment_urls?: string[] | null
          content?: string | null
          created_at?: string | null
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          marks?: number | null
          marks_before_penalty?: number | null
          marks_obtained?: number | null
          penalty_applied?: number | null
          school_id?: string
          status?: string | null
          student_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          attachment_urls: string[] | null
          class_section_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          max_marks: number | null
          school_id: string
          status: string | null
          teacher_user_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          attachment_urls?: string[] | null
          class_section_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          max_marks?: number | null
          school_id: string
          status?: string | null
          teacher_user_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          attachment_urls?: string[] | null
          class_section_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          max_marks?: number | null
          school_id?: string
          status?: string | null
          teacher_user_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_class_section_id_fkey"
            columns: ["class_section_id"]
            isOneToOne: false
            referencedRelation: "class_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_entries: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          note: string | null
          school_id: string
          session_id: string
          status: string
          student_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          note?: string | null
          school_id: string
          session_id: string
          status?: string
          student_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          note?: string | null
          school_id?: string
          session_id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_entries_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_entries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_entries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          class_section_id: string
          created_at: string | null
          created_by: string | null
          id: string
          period_label: string | null
          school_id: string
          session_date: string
        }
        Insert: {
          class_section_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          period_label?: string | null
          school_id: string
          session_date: string
        }
        Update: {
          class_section_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          period_label?: string | null
          school_id?: string
          session_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_class_section_id_fkey"
            columns: ["class_section_id"]
            isOneToOne: false
            referencedRelation: "class_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      behavior_notes: {
        Row: {
          content: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_shared_with_parents: boolean | null
          note_type: string | null
          school_id: string
          student_id: string
          teacher_user_id: string | null
          title: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_shared_with_parents?: boolean | null
          note_type?: string | null
          school_id: string
          student_id: string
          teacher_user_id?: string | null
          title: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_shared_with_parents?: boolean | null
          note_type?: string | null
          school_id?: string
          student_id?: string
          teacher_user_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "behavior_notes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "behavior_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      campuses: {
        Row: {
          address: string | null
          code: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          principal_user_id: string | null
          school_id: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          principal_user_id?: string | null
          school_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          code?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          principal_user_id?: string | null
          school_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campuses_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      class_section_subjects: {
        Row: {
          class_section_id: string
          created_at: string | null
          id: string
          school_id: string
          subject_id: string
        }
        Insert: {
          class_section_id: string
          created_at?: string | null
          id?: string
          school_id: string
          subject_id: string
        }
        Update: {
          class_section_id?: string
          created_at?: string | null
          id?: string
          school_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_section_subjects_class_section_id_fkey"
            columns: ["class_section_id"]
            isOneToOne: false
            referencedRelation: "class_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_section_subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_section_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      class_sections: {
        Row: {
          campus_id: string | null
          class_id: string
          created_at: string | null
          id: string
          name: string
          room: string | null
          school_id: string
          updated_at: string | null
        }
        Insert: {
          campus_id?: string | null
          class_id: string
          created_at?: string | null
          id?: string
          name: string
          room?: string | null
          school_id: string
          updated_at?: string | null
        }
        Update: {
          campus_id?: string | null
          class_id?: string
          created_at?: string | null
          id?: string
          name?: string
          room?: string | null
          school_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_sections_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "academic_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_sections_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_class_sections_campus"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activities: {
        Row: {
          activity_type: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          due_at: string | null
          id: string
          lead_id: string
          school_id: string
          summary: string | null
        }
        Insert: {
          activity_type: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          due_at?: string | null
          id?: string
          lead_id: string
          school_id: string
          summary?: string | null
        }
        Update: {
          activity_type?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          due_at?: string | null
          id?: string
          lead_id?: string
          school_id?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_call_logs: {
        Row: {
          called_at: string | null
          created_at: string | null
          created_by: string | null
          duration_seconds: number | null
          id: string
          lead_id: string
          notes: string | null
          outcome: string | null
          school_id: string
        }
        Insert: {
          called_at?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_seconds?: number | null
          id?: string
          lead_id: string
          notes?: string | null
          outcome?: string | null
          school_id: string
        }
        Update: {
          called_at?: string | null
          created_at?: string | null
          created_by?: string | null
          duration_seconds?: number | null
          id?: string
          lead_id?: string
          notes?: string | null
          outcome?: string | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_call_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_call_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_campaigns: {
        Row: {
          budget: number | null
          channel: string | null
          created_at: string | null
          end_date: string | null
          id: string
          name: string
          school_id: string
          start_date: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          budget?: number | null
          channel?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          name: string
          school_id: string
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          budget?: number | null
          channel?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          name?: string
          school_id?: string
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_campaigns_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_follow_ups: {
        Row: {
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          id: string
          lead_id: string
          notes: string | null
          scheduled_at: string
          school_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          scheduled_at: string
          school_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          scheduled_at?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_follow_ups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_follow_ups_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_attributions: {
        Row: {
          campaign_id: string
          created_at: string | null
          id: string
          lead_id: string
          school_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          id?: string
          lead_id: string
          school_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          id?: string
          lead_id?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_attributions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "crm_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_attributions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_lead_attributions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_lead_sources: {
        Row: {
          created_at: string | null
          id: string
          name: string
          school_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          school_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_lead_sources_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          next_follow_up_at: string | null
          notes: string | null
          phone: string | null
          pipeline_id: string | null
          school_id: string
          score: number | null
          source: string | null
          stage_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string | null
          pipeline_id?: string | null
          school_id: string
          score?: number | null
          source?: string | null
          stage_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          next_follow_up_at?: string | null
          notes?: string | null
          phone?: string | null
          pipeline_id?: string | null
          school_id?: string
          score?: number | null
          source?: string | null
          stage_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_pipelines: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          school_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          school_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_pipelines_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_stages: {
        Row: {
          created_at: string | null
          id: string
          name: string
          pipeline_id: string
          school_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          pipeline_id: string
          school_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          pipeline_id?: string
          school_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "crm_pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_stages_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_plan_installments: {
        Row: {
          amount: number
          created_at: string | null
          due_date: string | null
          fee_plan_id: string
          id: string
          label: string
          school_id: string
          sort_order: number | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          due_date?: string | null
          fee_plan_id: string
          id?: string
          label: string
          school_id: string
          sort_order?: number | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          due_date?: string | null
          fee_plan_id?: string
          id?: string
          label?: string
          school_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_plan_installments_fee_plan_id_fkey"
            columns: ["fee_plan_id"]
            isOneToOne: false
            referencedRelation: "fee_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_plan_installments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_plans: {
        Row: {
          created_at: string | null
          currency: string | null
          id: string
          is_active: boolean | null
          name: string
          school_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          school_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          school_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_plans_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          expense_date: string | null
          id: string
          school_id: string
          vendor: string | null
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_date?: string | null
          id?: string
          school_id: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_date?: string | null
          id?: string
          school_id?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_expenses_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_invoice_items: {
        Row: {
          amount: number
          created_at: string | null
          description: string
          id: string
          invoice_id: string
          quantity: number | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          description: string
          id?: string
          invoice_id: string
          quantity?: number | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "finance_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_invoices: {
        Row: {
          created_at: string | null
          created_by: string | null
          due_date: string | null
          id: string
          invoice_no: string | null
          issue_date: string | null
          notes: string | null
          school_id: string
          status: string | null
          student_id: string
          subtotal: number | null
          total: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_no?: string | null
          issue_date?: string | null
          notes?: string | null
          school_id: string
          status?: string | null
          student_id: string
          subtotal?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_no?: string | null
          issue_date?: string | null
          notes?: string | null
          school_id?: string
          status?: string | null
          student_id?: string
          subtotal?: number | null
          total?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_invoices_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_payment_methods: {
        Row: {
          created_at: string | null
          id: string
          instructions: string | null
          is_active: boolean | null
          name: string
          school_id: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          name: string
          school_id: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          name?: string
          school_id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_payment_methods_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_payments: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          id: string
          invoice_id: string | null
          method_id: string | null
          paid_at: string | null
          reference: string | null
          school_id: string
          student_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          method_id?: string | null
          paid_at?: string | null
          reference?: string | null
          school_id: string
          student_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          method_id?: string | null
          paid_at?: string | null
          reference?: string | null
          school_id?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "finance_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_payments_method_id_fkey"
            columns: ["method_id"]
            isOneToOne: false
            referencedRelation: "finance_payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_thresholds: {
        Row: {
          created_at: string | null
          grade_label: string
          grade_points: number | null
          id: string
          max_percentage: number
          min_percentage: number
          school_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          grade_label: string
          grade_points?: number | null
          id?: string
          max_percentage: number
          min_percentage: number
          school_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          grade_label?: string
          grade_points?: number | null
          id?: string
          max_percentage?: number
          min_percentage?: number
          school_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "grade_thresholds_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      homework: {
        Row: {
          attachment_urls: string[] | null
          class_section_id: string
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          school_id: string
          status: string | null
          teacher_user_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          attachment_urls?: string[] | null
          class_section_id: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          school_id: string
          status?: string | null
          teacher_user_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          attachment_urls?: string[] | null
          class_section_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          school_id?: string
          status?: string | null
          teacher_user_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homework_class_section_id_fkey"
            columns: ["class_section_id"]
            isOneToOne: false
            referencedRelation: "class_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_contracts: {
        Row: {
          contract_type: string | null
          created_at: string | null
          department: string | null
          end_date: string | null
          id: string
          position: string | null
          school_id: string
          start_date: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contract_type?: string | null
          created_at?: string | null
          department?: string | null
          end_date?: string | null
          id?: string
          position?: string | null
          school_id: string
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contract_type?: string | null
          created_at?: string | null
          department?: string | null
          end_date?: string | null
          id?: string
          position?: string | null
          school_id?: string
          start_date?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_contracts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_documents: {
        Row: {
          created_at: string | null
          document_name: string
          document_type: string | null
          file_url: string | null
          id: string
          school_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          document_name: string
          document_type?: string | null
          file_url?: string | null
          id?: string
          school_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          document_name?: string
          document_type?: string | null
          file_url?: string | null
          id?: string
          school_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_documents_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_leave_requests: {
        Row: {
          created_at: string | null
          days_count: number | null
          end_date: string
          id: string
          leave_type_id: string | null
          reason: string | null
          reviewed_by: string | null
          school_id: string
          start_date: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          days_count?: number | null
          end_date: string
          id?: string
          leave_type_id?: string | null
          reason?: string | null
          reviewed_by?: string | null
          school_id: string
          start_date: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          days_count?: number | null
          end_date?: string
          id?: string
          leave_type_id?: string | null
          reason?: string | null
          reviewed_by?: string | null
          school_id?: string
          start_date?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "hr_leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hr_leave_requests_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_leave_types: {
        Row: {
          created_at: string | null
          id: string
          is_paid: boolean | null
          max_days: number | null
          name: string
          school_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_paid?: boolean | null
          max_days?: number | null
          name: string
          school_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_paid?: boolean | null
          max_days?: number | null
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_leave_types_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_pay_runs: {
        Row: {
          created_at: string | null
          deductions: number | null
          gross_amount: number | null
          id: string
          net_amount: number | null
          notes: string | null
          paid_at: string | null
          period_end: string
          period_start: string
          school_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          deductions?: number | null
          gross_amount?: number | null
          id?: string
          net_amount?: number | null
          notes?: string | null
          paid_at?: string | null
          period_end: string
          period_start: string
          school_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          deductions?: number | null
          gross_amount?: number | null
          id?: string
          net_amount?: number | null
          notes?: string | null
          paid_at?: string | null
          period_end?: string
          period_start?: string
          school_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_pay_runs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_reviews: {
        Row: {
          comments: string | null
          created_at: string | null
          id: string
          rating: number | null
          review_date: string | null
          reviewer_id: string | null
          school_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          comments?: string | null
          created_at?: string | null
          id?: string
          rating?: number | null
          review_date?: string | null
          reviewer_id?: string | null
          school_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          comments?: string | null
          created_at?: string | null
          id?: string
          rating?: number | null
          review_date?: string | null
          reviewer_id?: string | null
          school_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_reviews_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_salary_records: {
        Row: {
          allowances: number | null
          base_salary: number
          created_at: string | null
          currency: string | null
          deductions: number | null
          effective_from: string | null
          effective_to: string | null
          id: string
          is_active: boolean | null
          month: number | null
          notes: string | null
          pay_frequency: string | null
          school_id: string
          status: string | null
          updated_at: string | null
          user_id: string
          year: number | null
        }
        Insert: {
          allowances?: number | null
          base_salary?: number
          created_at?: string | null
          currency?: string | null
          deductions?: number | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          month?: number | null
          notes?: string | null
          pay_frequency?: string | null
          school_id: string
          status?: string | null
          updated_at?: string | null
          user_id: string
          year?: number | null
        }
        Update: {
          allowances?: number | null
          base_salary?: number
          created_at?: string | null
          currency?: string | null
          deductions?: number | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_active?: boolean | null
          month?: number | null
          notes?: string | null
          pay_frequency?: string | null
          school_id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_salary_records_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_plans: {
        Row: {
          class_section_id: string
          created_at: string | null
          id: string
          notes: string | null
          objectives: string | null
          period_label: string
          plan_date: string
          resources: string | null
          school_id: string
          status: string
          subject_id: string | null
          teacher_user_id: string
          topic: string
          updated_at: string | null
        }
        Insert: {
          class_section_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          objectives?: string | null
          period_label?: string
          plan_date: string
          resources?: string | null
          school_id: string
          status?: string
          subject_id?: string | null
          teacher_user_id: string
          topic: string
          updated_at?: string | null
        }
        Update: {
          class_section_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          objectives?: string | null
          period_label?: string
          plan_date?: string
          resources?: string | null
          school_id?: string
          status?: string
          subject_id?: string | null
          teacher_user_id?: string
          topic?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_plans_class_section_id_fkey"
            columns: ["class_section_id"]
            isOneToOne: false
            referencedRelation: "class_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_plans_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_plans_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          category: string
          channel: string
          created_at: string | null
          enabled: boolean | null
          id: string
          school_id: string
          user_id: string
        }
        Insert: {
          category: string
          channel?: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          school_id: string
          user_id: string
        }
        Update: {
          category?: string
          channel?: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          school_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_messages: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          recipient_user_id: string
          school_id: string
          sender_user_id: string
          student_id: string | null
          subject: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          recipient_user_id: string
          school_id: string
          sender_user_id: string
          student_id?: string | null
          subject?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          recipient_user_id?: string
          school_id?: string
          sender_user_id?: string
          student_id?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_messages_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_messages_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_notifications: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          notification_type: string | null
          parent_user_id: string
          read_at: string | null
          school_id: string
          student_id: string | null
          title: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          notification_type?: string | null
          parent_user_id: string
          read_at?: string | null
          school_id: string
          student_id?: string | null
          title: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          notification_type?: string | null
          parent_user_id?: string
          read_at?: string | null
          school_id?: string
          student_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_notifications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_notifications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_super_admins: {
        Row: {
          created_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      salary_budget_targets: {
        Row: {
          budget_amount: number | null
          created_at: string | null
          department: string | null
          fiscal_year: number | null
          id: string
          notes: string | null
          role: string | null
          school_id: string
        }
        Insert: {
          budget_amount?: number | null
          created_at?: string | null
          department?: string | null
          fiscal_year?: number | null
          id?: string
          notes?: string | null
          role?: string | null
          school_id: string
        }
        Update: {
          budget_amount?: number | null
          created_at?: string | null
          department?: string | null
          fiscal_year?: number | null
          id?: string
          notes?: string | null
          role?: string | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "salary_budget_targets_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          recipient_user_ids: string[]
          scheduled_for: string
          school_id: string
          sender_user_id: string
          sent_at: string | null
          status: string | null
          subject: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          recipient_user_ids: string[]
          scheduled_for: string
          school_id: string
          sender_user_id: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          recipient_user_ids?: string[]
          scheduled_for?: string
          school_id?: string
          sender_user_id?: string
          sent_at?: string | null
          status?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_messages_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_branding: {
        Row: {
          accent_hue: number | null
          accent_lightness: number | null
          accent_saturation: number | null
          created_at: string | null
          id: string
          radius_scale: number | null
          school_id: string
          updated_at: string | null
        }
        Insert: {
          accent_hue?: number | null
          accent_lightness?: number | null
          accent_saturation?: number | null
          created_at?: string | null
          id?: string
          radius_scale?: number | null
          school_id: string
          updated_at?: string | null
        }
        Update: {
          accent_hue?: number | null
          accent_lightness?: number | null
          accent_saturation?: number | null
          created_at?: string | null
          id?: string
          radius_scale?: number | null
          school_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_branding_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_memberships: {
        Row: {
          created_at: string | null
          id: string
          school_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          school_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          school_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_memberships_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      section_subjects: {
        Row: {
          class_section_id: string
          created_at: string | null
          id: string
          school_id: string
          subject_id: string
          teacher_user_id: string | null
        }
        Insert: {
          class_section_id: string
          created_at?: string | null
          id?: string
          school_id: string
          subject_id: string
          teacher_user_id?: string | null
        }
        Update: {
          class_section_id?: string
          created_at?: string | null
          id?: string
          school_id?: string
          subject_id?: string
          teacher_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "section_subjects_class_section_id_fkey"
            columns: ["class_section_id"]
            isOneToOne: false
            referencedRelation: "class_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "section_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_campus_assignments: {
        Row: {
          campus_id: string
          created_at: string | null
          id: string
          role: string | null
          user_id: string
        }
        Insert: {
          campus_id: string
          created_at?: string | null
          id?: string
          role?: string | null
          user_id: string
        }
        Update: {
          campus_id?: string
          created_at?: string | null
          id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_campus_assignments_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
        ]
      }
      student_certificates: {
        Row: {
          certificate_type: string | null
          created_at: string | null
          description: string | null
          file_url: string | null
          id: string
          issued_date: string | null
          school_id: string
          student_id: string
          title: string
        }
        Insert: {
          certificate_type?: string | null
          created_at?: string | null
          description?: string | null
          file_url?: string | null
          id?: string
          issued_date?: string | null
          school_id: string
          student_id: string
          title: string
        }
        Update: {
          certificate_type?: string | null
          created_at?: string | null
          description?: string | null
          file_url?: string | null
          id?: string
          issued_date?: string | null
          school_id?: string
          student_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_certificates_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_certificates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_enrollments: {
        Row: {
          class_section_id: string
          created_at: string | null
          end_date: string | null
          id: string
          school_id: string
          start_date: string | null
          student_id: string
        }
        Insert: {
          class_section_id: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          school_id: string
          start_date?: string | null
          student_id: string
        }
        Update: {
          class_section_id?: string
          created_at?: string | null
          end_date?: string | null
          id?: string
          school_id?: string
          start_date?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_enrollments_class_section_id_fkey"
            columns: ["class_section_id"]
            isOneToOne: false
            referencedRelation: "class_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_guardians: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_emergency_contact: boolean | null
          is_primary: boolean | null
          phone: string | null
          relationship: string | null
          school_id: string | null
          student_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_emergency_contact?: boolean | null
          is_primary?: boolean | null
          phone?: string | null
          relationship?: string | null
          school_id?: string | null
          student_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_emergency_contact?: boolean | null
          is_primary?: boolean | null
          phone?: string | null
          relationship?: string | null
          school_id?: string | null
          student_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_guardians_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_guardians_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_marks: {
        Row: {
          assessment_id: string
          computed_grade: string | null
          created_at: string | null
          created_by: string | null
          grade_points: number | null
          id: string
          marks: number | null
          school_id: string
          student_id: string
        }
        Insert: {
          assessment_id: string
          computed_grade?: string | null
          created_at?: string | null
          created_by?: string | null
          grade_points?: number | null
          id?: string
          marks?: number | null
          school_id: string
          student_id: string
        }
        Update: {
          assessment_id?: string
          computed_grade?: string | null
          created_at?: string | null
          created_by?: string | null
          grade_points?: number | null
          id?: string
          marks?: number | null
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_marks_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "academic_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_marks_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_marks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_results: {
        Row: {
          assignment_id: string
          created_at: string | null
          grade: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          marks_obtained: number | null
          remarks: string | null
          school_id: string
          student_id: string
        }
        Insert: {
          assignment_id: string
          created_at?: string | null
          grade?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          marks_obtained?: number | null
          remarks?: string | null
          school_id: string
          student_id: string
        }
        Update: {
          assignment_id?: string
          created_at?: string | null
          grade?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          marks_obtained?: number | null
          remarks?: string | null
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_results_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_results_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          admission_date: string | null
          campus_id: string | null
          created_at: string | null
          date_of_birth: string | null
          first_name: string
          gender: string | null
          id: string
          last_name: string | null
          parent_name: string | null
          profile_id: string | null
          school_id: string
          status: string | null
          student_code: string | null
          updated_at: string | null
        }
        Insert: {
          admission_date?: string | null
          campus_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          first_name: string
          gender?: string | null
          id?: string
          last_name?: string | null
          parent_name?: string | null
          profile_id?: string | null
          school_id: string
          status?: string | null
          student_code?: string | null
          updated_at?: string | null
        }
        Update: {
          admission_date?: string | null
          campus_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          last_name?: string | null
          parent_name?: string | null
          profile_id?: string | null
          school_id?: string
          status?: string | null
          student_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_students_campus"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string | null
          created_at: string | null
          id: string
          name: string
          school_id: string
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id?: string
          name: string
          school_id: string
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string
          name?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      support_conversations: {
        Row: {
          created_at: string | null
          id: string
          school_id: string
          status: string | null
          student_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          school_id: string
          status?: string | null
          student_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          school_id?: string
          status?: string | null
          student_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_conversations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_conversations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          school_id: string
          sender_user_id: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          school_id: string
          sender_user_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          school_id?: string
          sender_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "support_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_assignments: {
        Row: {
          class_section_id: string
          created_at: string | null
          id: string
          school_id: string
          subject_id: string | null
          teacher_user_id: string
        }
        Insert: {
          class_section_id: string
          created_at?: string | null
          id?: string
          school_id: string
          subject_id?: string | null
          teacher_user_id: string
        }
        Update: {
          class_section_id?: string
          created_at?: string | null
          id?: string
          school_id?: string
          subject_id?: string | null
          teacher_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_assignments_class_section_id_fkey"
            columns: ["class_section_id"]
            isOneToOne: false
            referencedRelation: "class_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_period_logs: {
        Row: {
          created_at: string | null
          id: string
          logged_at: string
          notes: string | null
          school_id: string
          status: string | null
          teacher_user_id: string | null
          timetable_entry_id: string
          topic_covered: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          logged_at: string
          notes?: string | null
          school_id: string
          status?: string | null
          teacher_user_id?: string | null
          timetable_entry_id: string
          topic_covered?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          logged_at?: string
          notes?: string | null
          school_id?: string
          status?: string | null
          teacher_user_id?: string | null
          timetable_entry_id?: string
          topic_covered?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_period_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_period_logs_timetable_entry_id_fkey"
            columns: ["timetable_entry_id"]
            isOneToOne: false
            referencedRelation: "timetable_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_subject_assignments: {
        Row: {
          class_section_id: string
          created_at: string | null
          id: string
          school_id: string
          subject_id: string
          teacher_user_id: string
        }
        Insert: {
          class_section_id: string
          created_at?: string | null
          id?: string
          school_id: string
          subject_id: string
          teacher_user_id: string
        }
        Update: {
          class_section_id?: string
          created_at?: string | null
          id?: string
          school_id?: string
          subject_id?: string
          teacher_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_subject_assignments_class_section_id_fkey"
            columns: ["class_section_id"]
            isOneToOne: false
            referencedRelation: "class_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_subject_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_subject_assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_entries: {
        Row: {
          class_section_id: string
          created_at: string | null
          day_of_week: number
          end_time: string | null
          id: string
          is_published: boolean | null
          period_id: string | null
          published_at: string | null
          room: string | null
          school_id: string
          start_time: string | null
          subject_name: string | null
          teacher_user_id: string | null
          updated_at: string | null
        }
        Insert: {
          class_section_id: string
          created_at?: string | null
          day_of_week: number
          end_time?: string | null
          id?: string
          is_published?: boolean | null
          period_id?: string | null
          published_at?: string | null
          room?: string | null
          school_id: string
          start_time?: string | null
          subject_name?: string | null
          teacher_user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          class_section_id?: string
          created_at?: string | null
          day_of_week?: number
          end_time?: string | null
          id?: string
          is_published?: boolean | null
          period_id?: string | null
          published_at?: string | null
          room?: string | null
          school_id?: string
          start_time?: string | null
          subject_name?: string | null
          teacher_user_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetable_entries_class_section_id_fkey"
            columns: ["class_section_id"]
            isOneToOne: false
            referencedRelation: "class_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "timetable_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_entries_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_periods: {
        Row: {
          created_at: string | null
          end_time: string | null
          id: string
          is_break: boolean | null
          label: string
          school_id: string
          sort_order: number | null
          start_time: string | null
        }
        Insert: {
          created_at?: string | null
          end_time?: string | null
          id?: string
          is_break?: boolean | null
          label: string
          school_id: string
          sort_order?: number | null
          start_time?: string | null
        }
        Update: {
          created_at?: string | null
          end_time?: string | null
          id?: string
          is_break?: boolean | null
          label?: string
          school_id?: string
          sort_order?: number | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetable_periods_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_settings: {
        Row: {
          created_at: string | null
          id: string
          school_id: string
          updated_at: string | null
          working_days: number[] | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          school_id: string
          updated_at?: string | null
          working_days?: number[] | null
        }
        Update: {
          created_at?: string | null
          id?: string
          school_id?: string
          updated_at?: string | null
          working_days?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "timetable_settings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          school_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          school_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          school_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_messages: {
        Row: {
          channel: string
          content: string
          created_at: string | null
          id: string
          parent_message_id: string | null
          reactions: Json | null
          school_id: string
          sender_user_id: string
        }
        Insert: {
          channel: string
          content: string
          created_at?: string | null
          id?: string
          parent_message_id?: string | null
          reactions?: Json | null
          school_id: string
          sender_user_id: string
        }
        Update: {
          channel?: string
          content?: string
          created_at?: string | null
          id?: string
          parent_message_id?: string | null
          reactions?: Json | null
          school_id?: string
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "workspace_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_messages_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      school_user_directory: {
        Row: {
          display_name: string | null
          email: string | null
          school_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_memberships_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_manage_finance: { Args: { _school_id: string }; Returns: boolean }
      can_manage_staff: { Args: { _school_id: string }; Returns: boolean }
      can_manage_students: { Args: { _school_id: string }; Returns: boolean }
      can_work_crm: { Args: { _school_id: string }; Returns: boolean }
      get_at_risk_students: {
        Args: { _class_section_id?: string; _school_id: string }
        Returns: {
          attendance_rate: number
          avg_grade_percentage: number
          class_section_id: string
          first_name: string
          last_name: string
          recent_grade_avg: number
          risk_reason: string
          student_id: string
        }[]
      }
      get_school_public_by_slug: {
        Args: { _slug: string }
        Returns: {
          id: string
          name: string
          slug: string
        }[]
      }
      get_school_user_directory: {
        Args: { _school_id: string }
        Returns: {
          display_name: string
          email: string
          school_id: string
          user_id: string
        }[]
      }
      has_role:
        | { Args: { _role: string; _school_id: string }; Returns: boolean }
        | {
            Args: { _role: string; _school_id: string; _user_id: string }
            Returns: boolean
          }
      is_my_child: {
        Args: { _school_id: string; _student_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      is_school_member: {
        Args: { _school_id: string; _user_id: string }
        Returns: boolean
      }
      list_school_user_profiles: {
        Args: { _school_id: string }
        Returns: {
          display_name: string
          email: string
          user_id: string
        }[]
      }
      my_children: { Args: { _school_id: string }; Returns: string[] }
      my_student_id: { Args: { _school_id: string }; Returns: string }
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
