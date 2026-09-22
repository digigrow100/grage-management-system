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
      bookings: {
        Row: {
          address_line: string | null
          bay: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          customer_id: string
          date: string
          duration_minutes: number | null
          employee_id: string | null
          ends_at: string | null
          est_price: number | null
          estimate_id: string | null
          garage_id: string
          google_place_id: string | null
          id: string
          job_type: Database["public"]["Enums"]["job_type"]
          latitude: number | null
          location_type: string
          longitude: number | null
          notes: string | null
          post_code: string | null
          service_details: Json | null
          service_id: string | null
          source: string
          starts_at: string | null
          status: string
          technician: string | null
          time: string | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          address_line?: string | null
          bay?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          customer_id: string
          date: string
          duration_minutes?: number | null
          employee_id?: string | null
          ends_at?: string | null
          est_price?: number | null
          estimate_id?: string | null
          garage_id: string
          google_place_id?: string | null
          id?: string
          job_type: Database["public"]["Enums"]["job_type"]
          latitude?: number | null
          location_type?: string
          longitude?: number | null
          notes?: string | null
          post_code?: string | null
          service_details?: Json | null
          service_id?: string | null
          source?: string
          starts_at?: string | null
          status?: string
          technician?: string | null
          time?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          address_line?: string | null
          bay?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          customer_id?: string
          date?: string
          duration_minutes?: number | null
          employee_id?: string | null
          ends_at?: string | null
          est_price?: number | null
          estimate_id?: string | null
          garage_id?: string
          google_place_id?: string | null
          id?: string
          job_type?: Database["public"]["Enums"]["job_type"]
          latitude?: number | null
          location_type?: string
          longitude?: number | null
          notes?: string | null
          post_code?: string | null
          service_details?: Json | null
          service_id?: string | null
          source?: string
          starts_at?: string | null
          status?: string
          technician?: string | null
          time?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garage_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service_catalogue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address_line: string
          address_line_2: string | null
          alternate_contact_name: string | null
          alternate_contact_phone: string | null
          archived: boolean
          business_name: string | null
          city: string
          country_code: string
          county: string | null
          created_at: string
          customer_type: string
          email: string
          email_opt_in: boolean
          first_name: string | null
          full_name: string
          garage_id: string
          google_place_id: string | null
          id: string
          last_name: string | null
          latitude: number | null
          longitude: number | null
          marketing_opt_in: boolean
          notes: string | null
          phone: string
          post_code: string
          sms_opt_in: boolean
          updated_at: string
        }
        Insert: {
          address_line: string
          address_line_2?: string | null
          alternate_contact_name?: string | null
          alternate_contact_phone?: string | null
          archived?: boolean
          business_name?: string | null
          city: string
          country_code?: string
          county?: string | null
          created_at?: string
          customer_type?: string
          email: string
          email_opt_in?: boolean
          first_name?: string | null
          full_name: string
          garage_id: string
          google_place_id?: string | null
          id?: string
          last_name?: string | null
          latitude?: number | null
          longitude?: number | null
          marketing_opt_in?: boolean
          notes?: string | null
          phone: string
          post_code: string
          sms_opt_in?: boolean
          updated_at?: string
        }
        Update: {
          address_line?: string
          address_line_2?: string | null
          alternate_contact_name?: string | null
          alternate_contact_phone?: string | null
          archived?: boolean
          business_name?: string | null
          city?: string
          country_code?: string
          county?: string | null
          created_at?: string
          customer_type?: string
          email?: string
          email_opt_in?: boolean
          first_name?: string | null
          full_name?: string
          garage_id?: string
          google_place_id?: string | null
          id?: string
          last_name?: string | null
          latitude?: number | null
          longitude?: number | null
          marketing_opt_in?: boolean
          notes?: string | null
          phone?: string
          post_code?: string
          sms_opt_in?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garage_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_working_hours: {
        Row: {
          employee_id: string
          ends_at: string | null
          garage_id: string
          id: string
          is_working: boolean
          starts_at: string | null
          weekday: number
        }
        Insert: {
          employee_id: string
          ends_at?: string | null
          garage_id: string
          id?: string
          is_working?: boolean
          starts_at?: string | null
          weekday: number
        }
        Update: {
          employee_id?: string
          ends_at?: string | null
          garage_id?: string
          id?: string
          is_working?: boolean
          starts_at?: string | null
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "employee_working_hours_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_working_hours_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garage_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          active: boolean
          archived_at: string | null
          colour: string | null
          created_at: string
          default_working_end: string | null
          default_working_start: string | null
          email: string | null
          full_name: string
          garage_id: string
          hourly_rate: number
          id: string
          phone: string | null
          role: string
          specialties: string[]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          archived_at?: string | null
          colour?: string | null
          created_at?: string
          default_working_end?: string | null
          default_working_start?: string | null
          email?: string | null
          full_name: string
          garage_id: string
          hourly_rate?: number
          id?: string
          phone?: string | null
          role?: string
          specialties?: string[]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          archived_at?: string | null
          colour?: string | null
          created_at?: string
          default_working_end?: string | null
          default_working_start?: string | null
          email?: string | null
          full_name?: string
          garage_id?: string
          hourly_rate?: number
          id?: string
          phone?: string | null
          role?: string
          specialties?: string[]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garage_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_lines: {
        Row: {
          description: string
          duration_minutes: number | null
          estimate_id: string
          garage_id: string
          id: string
          line_total: number
          line_type: string
          quantity: number
          service_id: string | null
          sort_order: number
          unit_price: number
          vat_rate: number | null
        }
        Insert: {
          description: string
          duration_minutes?: number | null
          estimate_id: string
          garage_id: string
          id?: string
          line_total?: number
          line_type?: string
          quantity?: number
          service_id?: string | null
          sort_order?: number
          unit_price?: number
          vat_rate?: number | null
        }
        Update: {
          description?: string
          duration_minutes?: number | null
          estimate_id?: string
          garage_id?: string
          id?: string
          line_total?: number
          line_type?: string
          quantity?: number
          service_id?: string | null
          sort_order?: number
          unit_price?: number
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estimate_lines_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_lines_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garage_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_lines_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service_catalogue"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          booked_job_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          estimate_number: string | null
          garage_id: string
          id: string
          issue_date: string
          notes: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
          valid_until: string | null
          vat_total: number
          vehicle_id: string | null
        }
        Insert: {
          booked_job_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          estimate_number?: string | null
          garage_id: string
          id?: string
          issue_date?: string
          notes?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
          vat_total?: number
          vehicle_id?: string | null
        }
        Update: {
          booked_job_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          estimate_number?: string | null
          garage_id?: string
          id?: string
          issue_date?: string
          notes?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          valid_until?: string | null
          vat_total?: number
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimates_booked_job_id_fkey"
            columns: ["booked_job_id"]
            isOneToOne: false
            referencedRelation: "job_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garage_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      garage_closures: {
        Row: {
          closure_type: string
          created_at: string
          ends_at: string
          garage_id: string
          id: string
          starts_at: string
          title: string | null
          updated_at: string
        }
        Insert: {
          closure_type?: string
          created_at?: string
          ends_at: string
          garage_id: string
          id?: string
          starts_at: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          closure_type?: string
          created_at?: string
          ends_at?: string
          garage_id?: string
          id?: string
          starts_at?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "garage_closures_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garage_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      garage_members: {
        Row: {
          created_at: string
          garage_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          garage_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          garage_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "garage_members_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garage_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      garage_opening_hours: {
        Row: {
          closes_at: string | null
          created_at: string
          garage_id: string
          id: string
          is_24_hours: boolean
          is_closed: boolean
          opens_at: string | null
          updated_at: string
          weekday: number
        }
        Insert: {
          closes_at?: string | null
          created_at?: string
          garage_id: string
          id?: string
          is_24_hours?: boolean
          is_closed?: boolean
          opens_at?: string | null
          updated_at?: string
          weekday: number
        }
        Update: {
          closes_at?: string | null
          created_at?: string
          garage_id?: string
          id?: string
          is_24_hours?: boolean
          is_closed?: boolean
          opens_at?: string | null
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "garage_opening_hours_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garage_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      garage_settings: {
        Row: {
          address_line: string
          allow_overlapping_jobs: boolean
          calendar_end_hour: number
          calendar_slot_minutes: number
          calendar_start_hour: number
          city: string
          contact_email: string | null
          contact_phone: string | null
          currency: string
          default_labour_rate: number
          default_vat_rate: number
          garage_name: string
          id: string
          invoice_prefix: string
          logo_url: string | null
          post_code: string
          smart_gap_minutes: number
          timezone: string
          updated_at: string
          updated_by: string | null
          vat_mode: string
          vat_number: string
        }
        Insert: {
          address_line?: string
          allow_overlapping_jobs?: boolean
          calendar_end_hour?: number
          calendar_slot_minutes?: number
          calendar_start_hour?: number
          city?: string
          contact_email?: string | null
          contact_phone?: string | null
          currency?: string
          default_labour_rate?: number
          default_vat_rate?: number
          garage_name?: string
          id?: string
          invoice_prefix?: string
          logo_url?: string | null
          post_code?: string
          smart_gap_minutes?: number
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          vat_mode?: string
          vat_number?: string
        }
        Update: {
          address_line?: string
          allow_overlapping_jobs?: boolean
          calendar_end_hour?: number
          calendar_slot_minutes?: number
          calendar_start_hour?: number
          city?: string
          contact_email?: string | null
          contact_phone?: string | null
          currency?: string
          default_labour_rate?: number
          default_vat_rate?: number
          garage_name?: string
          id?: string
          invoice_prefix?: string
          logo_url?: string | null
          post_code?: string
          smart_gap_minutes?: number
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          vat_mode?: string
          vat_number?: string
        }
        Relationships: []
      }
      invoice_line_items: {
        Row: {
          description: string
          garage_id: string
          id: string
          invoice_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          description: string
          garage_id: string
          id?: string
          invoice_id: string
          quantity?: number
          unit_price?: number
        }
        Update: {
          description?: string
          garage_id?: string
          id?: string
          invoice_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garage_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          customer_id: string
          date: string
          due_date: string
          garage_id: string
          id: string
          job_id: string | null
          notes: string | null
          number: string
          status: Database["public"]["Enums"]["invoice_status"]
          updated_at: string
          vat_rate: number
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          date: string
          due_date: string
          garage_id: string
          id?: string
          job_id?: string | null
          notes?: string | null
          // Optional on insert: trg_set_invoice_number populates it from
          // garage_settings.invoice_prefix when omitted (see migration
          // 0004_multi_garage.sql). The generator can't see trigger-provided
          // defaults, so this is hand-corrected from the generated output.
          number?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
          vat_rate?: number
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          date?: string
          due_date?: string
          garage_id?: string
          id?: string
          job_id?: string | null
          notes?: string | null
          number?: string
          status?: Database["public"]["Enums"]["invoice_status"]
          updated_at?: string
          vat_rate?: number
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garage_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_cards: {
        Row: {
          authorization_status: string
          booking_id: string | null
          checked_in_at: string | null
          completed_at: string | null
          created_at: string
          customer_complaint: string | null
          customer_id: string
          description: string | null
          due_date: string | null
          employee_id: string | null
          estimate_id: string | null
          garage_id: string
          id: string
          internal_notes: string | null
          job_number: string | null
          mileage_in: number | null
          notes: string | null
          priority: string
          released_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          technician: string | null
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          authorization_status?: string
          booking_id?: string | null
          checked_in_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_complaint?: string | null
          customer_id: string
          description?: string | null
          due_date?: string | null
          employee_id?: string | null
          estimate_id?: string | null
          garage_id: string
          id?: string
          internal_notes?: string | null
          job_number?: string | null
          mileage_in?: number | null
          notes?: string | null
          priority?: string
          released_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          technician?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          authorization_status?: string
          booking_id?: string | null
          checked_in_at?: string | null
          completed_at?: string | null
          created_at?: string
          customer_complaint?: string | null
          customer_id?: string
          description?: string | null
          due_date?: string | null
          employee_id?: string | null
          estimate_id?: string | null
          garage_id?: string
          id?: string
          internal_notes?: string | null
          job_number?: string | null
          mileage_in?: number | null
          notes?: string | null
          priority?: string
          released_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          technician?: string | null
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_cards_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_cards_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_cards_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_cards_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garage_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_cards_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_labour_lines: {
        Row: {
          description: string
          garage_id: string
          hours: number
          id: string
          job_id: string
          rate: number
        }
        Insert: {
          description: string
          garage_id: string
          hours?: number
          id?: string
          job_id: string
          rate?: number
        }
        Update: {
          description?: string
          garage_id?: string
          hours?: number
          id?: string
          job_id?: string
          rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_labour_lines_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garage_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_labour_lines_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      job_part_lines: {
        Row: {
          description: string
          garage_id: string
          id: string
          job_id: string
          part_id: string | null
          quantity: number
          unit_price: number
        }
        Insert: {
          description: string
          garage_id: string
          id?: string
          job_id: string
          part_id?: string | null
          quantity?: number
          unit_price?: number
        }
        Update: {
          description?: string
          garage_id?: string
          id?: string
          job_id?: string
          part_id?: string | null
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_part_lines_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garage_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_part_lines_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_part_lines_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      job_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          garage_id: string
          id: string
          job_id: string
          new_status: string
          previous_status: string | null
          reason: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          garage_id: string
          id?: string
          job_id: string
          new_status: string
          previous_status?: string | null
          reason?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          garage_id?: string
          id?: string
          job_id?: string
          new_status?: string
          previous_status?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_status_history_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garage_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_status_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      parts: {
        Row: {
          category: string | null
          cost_price: number
          created_at: string
          default_warehouse_id: string | null
          garage_id: string
          id: string
          name: string
          product_type: string
          reorder_level: number
          sell_price: number
          sku: string
          stock_level: number
          supplier: string | null
          supplier_id: string | null
          tyre_load_index: string | null
          tyre_profile: number | null
          tyre_rim_size: number | null
          tyre_speed_rating: string | null
          tyre_width: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          cost_price?: number
          created_at?: string
          default_warehouse_id?: string | null
          garage_id: string
          id?: string
          name: string
          product_type?: string
          reorder_level?: number
          sell_price?: number
          sku: string
          stock_level?: number
          supplier?: string | null
          supplier_id?: string | null
          tyre_load_index?: string | null
          tyre_profile?: number | null
          tyre_rim_size?: number | null
          tyre_speed_rating?: string | null
          tyre_width?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          cost_price?: number
          created_at?: string
          default_warehouse_id?: string | null
          garage_id?: string
          id?: string
          name?: string
          product_type?: string
          reorder_level?: number
          sell_price?: number
          sku?: string
          stock_level?: number
          supplier?: string | null
          supplier_id?: string | null
          tyre_load_index?: string | null
          tyre_profile?: number | null
          tyre_rim_size?: number | null
          tyre_speed_rating?: string | null
          tyre_width?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parts_default_warehouse_id_fkey"
            columns: ["default_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parts_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garage_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_lines: {
        Row: {
          created_at: string
          description: string
          garage_id: string
          id: string
          part_id: string | null
          purchase_order_id: string
          quantity_ordered: number
          quantity_received: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          description: string
          garage_id: string
          id?: string
          part_id?: string | null
          purchase_order_id: string
          quantity_ordered?: number
          quantity_received?: number
          unit_cost?: number
        }
        Update: {
          created_at?: string
          description?: string
          garage_id?: string
          id?: string
          part_id?: string | null
          purchase_order_id?: string
          quantity_ordered?: number
          quantity_received?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garage_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          expected_date: string | null
          garage_id: string
          id: string
          notes: string | null
          order_date: string | null
          po_number: string | null
          status: string
          supplier_id: string | null
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          garage_id: string
          id?: string
          notes?: string | null
          order_date?: string | null
          po_number?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          garage_id?: string
          id?: string
          notes?: string | null
          order_date?: string | null
          po_number?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garage_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_settings: {
        Row: {
          created_at: string
          days_before: number | null
          email_enabled: boolean
          enabled: boolean
          garage_id: string
          hours_before: number | null
          id: string
          reminder_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          days_before?: number | null
          email_enabled?: boolean
          enabled?: boolean
          garage_id: string
          hours_before?: number | null
          id?: string
          reminder_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          days_before?: number | null
          email_enabled?: boolean
          enabled?: boolean
          garage_id?: string
          hours_before?: number | null
          id?: string
          reminder_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_settings_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garage_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          cancelled_at: string | null
          channel: string
          created_at: string
          created_by: string | null
          customer_id: string | null
          done: boolean
          due_date: string
          error_message: string | null
          garage_id: string
          id: string
          notes: string | null
          reminder_type: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
          title: string
          vehicle_id: string | null
        }
        Insert: {
          cancelled_at?: string | null
          channel?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          done?: boolean
          due_date: string
          error_message?: string | null
          garage_id: string
          id?: string
          notes?: string | null
          reminder_type?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          title: string
          vehicle_id?: string | null
        }
        Update: {
          cancelled_at?: string | null
          channel?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          done?: boolean
          due_date?: string
          error_message?: string | null
          garage_id?: string
          id?: string
          notes?: string | null
          reminder_type?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          title?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garage_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_catalogue: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          default_duration_minutes: number
          default_labour_price: number | null
          description: string | null
          garage_id: string
          id: string
          job_type_seed: string | null
          name: string
          updated_at: string
          vat_rate: number | null
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          default_duration_minutes?: number
          default_labour_price?: number | null
          description?: string | null
          garage_id: string
          id?: string
          job_type_seed?: string | null
          name: string
          updated_at?: string
          vat_rate?: number | null
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          default_duration_minutes?: number
          default_labour_price?: number | null
          description?: string | null
          garage_id?: string
          id?: string
          job_type_seed?: string | null
          name?: string
          updated_at?: string
          vat_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_catalogue_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garage_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          garage_id: string
          id: string
          movement_type: string
          notes: string | null
          part_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          unit_cost: number | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          garage_id: string
          id?: string
          movement_type: string
          notes?: string | null
          part_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          unit_cost?: number | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          garage_id?: string
          id?: string
          movement_type?: string
          notes?: string | null
          part_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          unit_cost?: number | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garage_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          account_number: string | null
          address_line_1: string | null
          address_line_2: string | null
          city: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          garage_id: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          postcode: string | null
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          garage_id: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          postcode?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          garage_id?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          postcode?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garage_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_mileage_history: {
        Row: {
          garage_id: string
          id: string
          job_id: string | null
          mileage: number
          recorded_at: string
          recorded_by: string | null
          vehicle_id: string
        }
        Insert: {
          garage_id: string
          id?: string
          job_id?: string | null
          mileage: number
          recorded_at?: string
          recorded_by?: string | null
          vehicle_id: string
        }
        Update: {
          garage_id?: string
          id?: string
          job_id?: string | null
          mileage?: number
          recorded_at?: string
          recorded_by?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_mileage_history_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garage_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_mileage_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "job_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_mileage_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          co2_emissions: number | null
          colour: string | null
          created_at: string
          customer_id: string
          date_of_last_v5c_issued: string | null
          dvla_last_checked_at: string | null
          dvla_response: Json | null
          engine_capacity_cc: number | null
          euro_status: string | null
          fuel_type: string | null
          garage_id: string
          id: string
          last_service_date: string | null
          make: string | null
          marked_for_export: boolean | null
          mileage: number | null
          model: string | null
          month_of_first_registration: string | null
          mot_due: string | null
          mot_status: string | null
          registration: string
          registration_normalized: string | null
          tax_due_date: string | null
          tax_status: string | null
          type_approval: string | null
          updated_at: string
          vin: string | null
          wheelplan: string | null
          year: number | null
        }
        Insert: {
          co2_emissions?: number | null
          colour?: string | null
          created_at?: string
          customer_id: string
          date_of_last_v5c_issued?: string | null
          dvla_last_checked_at?: string | null
          dvla_response?: Json | null
          engine_capacity_cc?: number | null
          euro_status?: string | null
          fuel_type?: string | null
          garage_id: string
          id?: string
          last_service_date?: string | null
          make?: string | null
          marked_for_export?: boolean | null
          mileage?: number | null
          model?: string | null
          month_of_first_registration?: string | null
          mot_due?: string | null
          mot_status?: string | null
          registration: string
          registration_normalized?: string | null
          tax_due_date?: string | null
          tax_status?: string | null
          type_approval?: string | null
          updated_at?: string
          vin?: string | null
          wheelplan?: string | null
          year?: number | null
        }
        Update: {
          co2_emissions?: number | null
          colour?: string | null
          created_at?: string
          customer_id?: string
          date_of_last_v5c_issued?: string | null
          dvla_last_checked_at?: string | null
          dvla_response?: Json | null
          engine_capacity_cc?: number | null
          euro_status?: string | null
          fuel_type?: string | null
          garage_id?: string
          id?: string
          last_service_date?: string | null
          make?: string | null
          marked_for_export?: boolean | null
          mileage?: number | null
          model?: string | null
          month_of_first_registration?: string | null
          mot_due?: string | null
          mot_status?: string | null
          registration?: string
          registration_normalized?: string | null
          tax_due_date?: string | null
          tax_status?: string | null
          type_approval?: string | null
          updated_at?: string
          vin?: string | null
          wheelplan?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garage_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          city: string | null
          created_at: string
          garage_id: string
          id: string
          is_default: boolean
          name: string
          notes: string | null
          postcode: string | null
          updated_at: string
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          created_at?: string
          garage_id: string
          id?: string
          is_default?: boolean
          name: string
          notes?: string | null
          postcode?: string | null
          updated_at?: string
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          created_at?: string
          garage_id?: string
          id?: string
          is_default?: boolean
          name?: string
          notes?: string | null
          postcode?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_garage_id_fkey"
            columns: ["garage_id"]
            isOneToOne: false
            referencedRelation: "garage_settings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_booking_conflict: {
        Args: {
          p_employee_id: string | null
          p_ends_at: string
          p_exclude_booking_id?: string
          p_garage_id: string
          p_starts_at: string
        }
        Returns: string | null
      }
      compute_booking_window: {
        Args: {
          p_date: string
          p_duration_minutes: number
          p_garage_id: string
          p_time: string
        }
        Returns: { starts_at: string; ends_at: string }
      }
      convert_estimate_to_booking: {
        Args: {
          p_date: string
          p_duration_minutes: number
          p_employee_id?: string | null
          p_estimate_id: string
          p_job_type?: Database["public"]["Enums"]["job_type"]
          p_time: string
        }
        Returns: string
      }
      create_garage_with_owner: {
        Args: { p_garage_name: string }
        Returns: string
      }
      is_garage_member: { Args: { target_garage_id: string }; Returns: boolean }
      next_invoice_number: { Args: never; Returns: string }
      receive_purchase_order_line: {
        Args: { p_line_id: string; p_quantity: number; p_unit_cost?: number }
        Returns: undefined
      }
    }
    Enums: {
      invoice_status: "draft" | "sent" | "paid" | "overdue" | "estimate"
      job_status:
        | "booked"
        | "in_progress"
        | "awaiting_parts"
        | "completed"
        | "invoiced"
        | "checked_in"
        | "vehicle_released"
        | "awaiting_authorisation"
        | "authorised"
        | "cancelled"
      job_type:
        | "vehicle_recovery"
        | "diagnostic"
        | "oil_service"
        | "full_service"
        | "mot"
        | "tyre_replacement"
        | "vehicle_storage"
        | "mobile_tyre_fitting"
        | "battery_replacement"
        | "other"
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
      invoice_status: ["draft", "sent", "paid", "overdue", "estimate"],
      job_status: [
        "booked",
        "in_progress",
        "awaiting_parts",
        "completed",
        "invoiced",
        "checked_in",
        "vehicle_released",
        "awaiting_authorisation",
        "authorised",
        "cancelled",
      ],
      job_type: [
        "vehicle_recovery",
        "diagnostic",
        "oil_service",
        "full_service",
        "mot",
        "tyre_replacement",
        "vehicle_storage",
        "mobile_tyre_fitting",
        "battery_replacement",
        "other",
      ],
    },
  },
} as const
