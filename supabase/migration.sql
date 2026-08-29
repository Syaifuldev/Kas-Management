-- ============================================
-- SQL Migration: Kas Management App
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Organizations (Kas / Lembaga)
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now() not null
);

-- 2. User Roles (akses user ke kas tertentu)
create table if not exists public.user_roles (
  user_id uuid references auth.users(id) on delete cascade not null,
  organization_id uuid references public.organizations(id) on delete cascade not null,
  role text default 'admin' check (role in ('owner', 'admin')),
  created_at timestamptz default now() not null,
  primary key (user_id, organization_id)
);

-- 3. Transactions (Buku Kas Umum)
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade not null,
  type text check (type in ('income', 'expense')) not null,
  amount numeric(15, 2) not null check (amount > 0),
  category text,
  description text,
  date date not null,
  created_at timestamptz default now() not null
);

-- 4. Events
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade not null,
  name text not null,
  description text,
  target_amount_per_person numeric(15, 2) not null check (target_amount_per_person > 0),
  event_date date,
  status text default 'active' check (status in ('active', 'completed')),
  created_at timestamptz default now() not null
);

-- 5. Event Participants (Peserta Event)
create table if not exists public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade not null,
  name text not null,
  payment_status text default 'unpaid' check (payment_status in ('unpaid', 'partial', 'paid')),
  created_at timestamptz default now() not null
);

-- 6. Installments (Riwayat Cicilan Pembayaran)
create table if not exists public.installments (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references public.event_participants(id) on delete cascade not null,
  amount numeric(15, 2) not null check (amount > 0),
  payment_date date not null,
  notes text,
  created_at timestamptz default now() not null
);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

alter table public.organizations enable row level security;
alter table public.user_roles enable row level security;
alter table public.transactions enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.installments enable row level security;

-- Organizations: user hanya bisa lihat kas yang ia punya akses
create policy "users can view their organizations"
  on public.organizations for select
  using (
    id in (
      select organization_id from public.user_roles
      where user_id = auth.uid()
    )
  );

create policy "users can insert organizations"
  on public.organizations for insert
  with check (auth.uid() is not null);

create policy "owners can update organizations"
  on public.organizations for update
  using (
    id in (
      select organization_id from public.user_roles
      where user_id = auth.uid() and role = 'owner'
    )
  );

create policy "owners can delete organizations"
  on public.organizations for delete
  using (
    id in (
      select organization_id from public.user_roles
      where user_id = auth.uid() and role = 'owner'
    )
  );

-- User Roles
create policy "users can view their own roles"
  on public.user_roles for select
  using (user_id = auth.uid());

create policy "users can insert their own role"
  on public.user_roles for insert
  with check (user_id = auth.uid());

-- Transactions
create policy "members can view transactions"
  on public.transactions for select
  using (
    organization_id in (
      select organization_id from public.user_roles where user_id = auth.uid()
    )
  );

create policy "members can insert transactions"
  on public.transactions for insert
  with check (
    organization_id in (
      select organization_id from public.user_roles where user_id = auth.uid()
    )
  );

create policy "members can update transactions"
  on public.transactions for update
  using (
    organization_id in (
      select organization_id from public.user_roles where user_id = auth.uid()
    )
  );

create policy "members can delete transactions"
  on public.transactions for delete
  using (
    organization_id in (
      select organization_id from public.user_roles where user_id = auth.uid()
    )
  );

-- Events
create policy "members can view events"
  on public.events for select
  using (
    organization_id in (
      select organization_id from public.user_roles where user_id = auth.uid()
    )
  );

create policy "members can insert events"
  on public.events for insert
  with check (
    organization_id in (
      select organization_id from public.user_roles where user_id = auth.uid()
    )
  );

create policy "members can update events"
  on public.events for update
  using (
    organization_id in (
      select organization_id from public.user_roles where user_id = auth.uid()
    )
  );

create policy "members can delete events"
  on public.events for delete
  using (
    organization_id in (
      select organization_id from public.user_roles where user_id = auth.uid()
    )
  );

-- Event Participants
create policy "members can view participants"
  on public.event_participants for select
  using (
    event_id in (
      select e.id from public.events e
      join public.user_roles ur on ur.organization_id = e.organization_id
      where ur.user_id = auth.uid()
    )
  );

create policy "members can insert participants"
  on public.event_participants for insert
  with check (
    event_id in (
      select e.id from public.events e
      join public.user_roles ur on ur.organization_id = e.organization_id
      where ur.user_id = auth.uid()
    )
  );

create policy "members can update participants"
  on public.event_participants for update
  using (
    event_id in (
      select e.id from public.events e
      join public.user_roles ur on ur.organization_id = e.organization_id
      where ur.user_id = auth.uid()
    )
  );

create policy "members can delete participants"
  on public.event_participants for delete
  using (
    event_id in (
      select e.id from public.events e
      join public.user_roles ur on ur.organization_id = e.organization_id
      where ur.user_id = auth.uid()
    )
  );

-- Installments
create policy "members can view installments"
  on public.installments for select
  using (
    participant_id in (
      select ep.id from public.event_participants ep
      join public.events e on e.id = ep.event_id
      join public.user_roles ur on ur.organization_id = e.organization_id
      where ur.user_id = auth.uid()
    )
  );

create policy "members can insert installments"
  on public.installments for insert
  with check (
    participant_id in (
      select ep.id from public.event_participants ep
      join public.events e on e.id = ep.event_id
      join public.user_roles ur on ur.organization_id = e.organization_id
      where ur.user_id = auth.uid()
    )
  );

create policy "members can update installments"
  on public.installments for update
  using (
    participant_id in (
      select ep.id from public.event_participants ep
      join public.events e on e.id = ep.event_id
      join public.user_roles ur on ur.organization_id = e.organization_id
      where ur.user_id = auth.uid()
    )
  );

create policy "members can delete installments"
  on public.installments for delete
  using (
    participant_id in (
      select ep.id from public.event_participants ep
      join public.events e on e.id = ep.event_id
      join public.user_roles ur on ur.organization_id = e.organization_id
      where ur.user_id = auth.uid()
    )
  );
