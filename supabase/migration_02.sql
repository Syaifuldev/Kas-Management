-- ============================================
-- SQL Migration 02: Add target_amount to event_participants
-- Run this in Supabase SQL Editor
-- ============================================

-- Add target_amount column to allow custom cost per participant
alter table public.event_participants 
add column if not exists target_amount numeric(15, 2) check (target_amount > 0);

-- Refresh the view or simply it's just an alter table
