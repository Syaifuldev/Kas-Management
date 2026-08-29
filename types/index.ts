export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Organization {
  id: string
  name: string
  description: string | null
  created_by: string | null
  created_at: string
}

export interface UserRole {
  user_id: string
  organization_id: string
  role: 'owner' | 'admin'
  created_at: string
}

export interface Transaction {
  id: string
  organization_id: string
  type: 'income' | 'expense'
  amount: number
  category: string | null
  description: string | null
  date: string
  created_at: string
}

export interface Event {
  id: string
  organization_id: string
  name: string
  description: string | null
  target_amount_per_person: number
  event_date: string | null
  status: 'active' | 'completed'
  created_at: string
}

export interface EventParticipant {
  id: string
  event_id: string
  name: string
  payment_status: 'unpaid' | 'partial' | 'paid'
  target_amount?: number | null
  created_at: string
  installments?: Installment[]
}

export interface Installment {
  id: string
  participant_id: string
  amount: number
  payment_date: string
  notes: string | null
  created_at: string
}

// Extended types with computed fields
export interface ParticipantWithTotal extends EventParticipant {
  total_paid: number
  remaining: number
}
