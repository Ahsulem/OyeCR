export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          roll_number: string | null
          role: 'cr' | 'student'
          phone: string | null
          created_at: string | null
        }
        Insert: {
          id: string
          email: string
          full_name: string
          roll_number?: string | null
          role: 'cr' | 'student'
          phone?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          roll_number?: string | null
          role?: 'cr' | 'student'
          phone?: string | null
          created_at?: string | null
        }
      }
      classes: {
        Row: {
          id: string
          name: string
          batch: string | null
          department: string | null
          university: string | null
          cr_id: string | null
          invite_code: string
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          batch?: string | null
          department?: string | null
          university?: string | null
          cr_id?: string | null
          invite_code?: string
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          batch?: string | null
          department?: string | null
          university?: string | null
          cr_id?: string | null
          invite_code?: string
          created_at?: string | null
        }
      }
      class_members: {
        Row: {
          id: string
          class_id: string | null
          student_id: string | null
          joined_at: string | null
        }
        Insert: {
          id?: string
          class_id?: string | null
          student_id?: string | null
          joined_at?: string | null
        }
        Update: {
          id?: string
          class_id?: string | null
          student_id?: string | null
          joined_at?: string | null
        }
      }
      teachers: {
        Row: {
          id: string
          full_name: string
          email: string
          phone: string | null
          class_id: string | null
          consent_status: 'pending' | 'verified' | 'declined' | null
          consent_token: string | null
          consented_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          full_name: string
          email: string
          phone?: string | null
          class_id?: string | null
          consent_status?: 'pending' | 'verified' | 'declined' | null
          consent_token?: string | null
          consented_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          phone?: string | null
          class_id?: string | null
          consent_status?: 'pending' | 'verified' | 'declined' | null
          consent_token?: string | null
          consented_at?: string | null
          created_at?: string | null
        }
      }
      courses: {
        Row: {
          id: string
          class_id: string | null
          teacher_id: string | null
          course_name: string
          course_code: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          class_id?: string | null
          teacher_id?: string | null
          course_name: string
          course_code?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          class_id?: string | null
          teacher_id?: string | null
          course_name?: string
          course_code?: string | null
          created_at?: string | null
        }
      }
      requests: {
        Row: {
          id: string
          class_id: string | null
          student_id: string | null
          course_id: string | null
          type: 'attendance_discrepancy' | 'course_material' | 'complaint_feedback' | 'exam_quiz_conflict'
          status: 'pending' | 'reviewed' | 'forwarded' | 'resolved' | 'rejected' | null
          is_anonymous: boolean | null
          priority: 'normal' | 'high' | null
          payload: Json
          cr_note: string | null
          forwarded_at: string | null
          resolved_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          class_id?: string | null
          student_id?: string | null
          course_id?: string | null
          type: 'attendance_discrepancy' | 'course_material' | 'complaint_feedback' | 'exam_quiz_conflict'
          status?: 'pending' | 'reviewed' | 'forwarded' | 'resolved' | 'rejected' | null
          is_anonymous?: boolean | null
          priority?: 'normal' | 'high' | null
          payload: Json
          cr_note?: string | null
          forwarded_at?: string | null
          resolved_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          class_id?: string | null
          student_id?: string | null
          course_id?: string | null
          type?: 'attendance_discrepancy' | 'course_material' | 'complaint_feedback' | 'exam_quiz_conflict'
          status?: 'pending' | 'reviewed' | 'forwarded' | 'resolved' | 'rejected' | null
          is_anonymous?: boolean | null
          priority?: 'normal' | 'high' | null
          payload?: Json
          cr_note?: string | null
          forwarded_at?: string | null
          resolved_at?: string | null
          created_at?: string | null
        }
      }
      request_attachments: {
        Row: {
          id: string
          request_id: string | null
          file_name: string
          storage_path: string
          public_url: string
          uploaded_at: string | null
        }
        Insert: {
          id?: string
          request_id?: string | null
          file_name: string
          storage_path: string
          public_url: string
          uploaded_at?: string | null
        }
        Update: {
          id?: string
          request_id?: string | null
          file_name?: string
          storage_path?: string
          public_url?: string
          uploaded_at?: string | null
        }
      }
      forwarding_log: {
        Row: {
          id: string
          request_id: string | null
          forwarded_by: string | null
          channel: 'email' | 'whatsapp' | null
          recipient_email: string | null
          email_subject: string | null
          email_body: string | null
          forwarded_at: string | null
        }
        Insert: {
          id?: string
          request_id?: string | null
          forwarded_by?: string | null
          channel?: 'email' | 'whatsapp' | null
          recipient_email?: string | null
          email_subject?: string | null
          email_body?: string | null
          forwarded_at?: string | null
        }
        Update: {
          id?: string
          request_id?: string | null
          forwarded_by?: string | null
          channel?: 'email' | 'whatsapp' | null
          recipient_email?: string | null
          email_subject?: string | null
          email_body?: string | null
          forwarded_at?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string | null
          request_id: string | null
          type: 'submission_confirmed' | 'request_forwarded' | 'request_resolved' | 'request_rejected' | null
          channel: string | null
          sent_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          request_id?: string | null
          type?: 'submission_confirmed' | 'request_forwarded' | 'request_resolved' | 'request_rejected' | null
          channel?: string | null
          sent_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          request_id?: string | null
          type?: 'submission_confirmed' | 'request_forwarded' | 'request_resolved' | 'request_rejected' | null
          channel?: string | null
          sent_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_invite_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      user_role: 'cr' | 'student'
      consent_status: 'pending' | 'verified' | 'declined'
      request_type: 'attendance_discrepancy' | 'course_material' | 'complaint_feedback' | 'exam_quiz_conflict'
      request_status: 'pending' | 'reviewed' | 'forwarded' | 'resolved' | 'rejected'
      request_priority: 'normal' | 'high'
      notification_type: 'submission_confirmed' | 'request_forwarded' | 'request_resolved' | 'request_rejected'
      forward_channel: 'email' | 'whatsapp'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
