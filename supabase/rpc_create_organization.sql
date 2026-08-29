-- ============================================================
-- RPC Function: create_organization
-- Jalankan di Supabase SQL Editor
-- ============================================================

create or replace function create_organization(
  org_name text,
  org_description text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org organizations;
  current_user_id uuid;
begin
  -- Pastikan user sudah login
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Buat organization baru
  insert into organizations (name, description, created_by)
  values (org_name, org_description, current_user_id)
  returning * into new_org;

  -- Daftarkan user sebagai owner
  insert into user_roles (user_id, organization_id, role)
  values (current_user_id, new_org.id, 'owner');

  return row_to_json(new_org);
end;
$$;

-- Berikan akses ke authenticated users
grant execute on function create_organization(text, text) to authenticated;
