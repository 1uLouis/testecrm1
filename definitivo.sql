-- =============================================================
-- FERA CRM — SQL DEFINITIVO de autenticação e controle de acesso
-- Execute COMPLETO no SQL Editor do Supabase
-- Pode rodar quantas vezes quiser — é seguro (usa IF EXISTS)
-- =============================================================

-- ── 1. Tabela user_profiles ────────────────────────────────────
create table if not exists public.user_profiles (
  id    uuid primary key references auth.users(id) on delete cascade,
  role  text not null default 'user' check (role in ('admin', 'user')),
  name  text not null default ''
);

-- ── 2. Habilita RLS ───────────────────────────────────────────
alter table public.user_profiles enable row level security;

-- ── 3. Remove TODAS as políticas antigas (evita conflito) ─────
do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'user_profiles'
  loop
    execute format('drop policy if exists %I on public.user_profiles', pol.policyname);
  end loop;
end;
$$;

-- ── 4. UMA única política: autenticado lê/escreve seu próprio perfil ──
--    Simples, sem recursão, sem conflito.
create policy "usuario_proprio_perfil"
  on public.user_profiles
  for all
  using  (auth.uid() = id)
  with check (auth.uid() = id);

-- ── 5. Trigger: cria perfil automaticamente ao criar usuário ──
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_profiles (id, role, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'user'),
    coalesce(new.raw_user_meta_data->>'name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 6. Funções RPC para gerenciamento de usuários (security definer) ─
--    Essas funções rodam com privilégio elevado no servidor,
--    não dependem de RLS e verificam o role internamente.

create or replace function public.get_my_profile()
returns table(id uuid, role text, name text)
language sql
security definer
stable
as $$
  select p.id, p.role, p.name
  from public.user_profiles p
  where p.id = auth.uid()
  limit 1;
$$;

create or replace function public.list_crm_users()
returns table(id uuid, email text, name text, role text, created_at timestamptz)
language plpgsql
security definer
as $$
begin
  -- Verifica se quem chama é admin
  if not exists (
    select 1 from public.user_profiles where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Acesso negado';
  end if;

  return query
    select u.id, u.email::text,
           coalesce(p.name, u.email)::text as name,
           coalesce(p.role, 'user')::text  as role,
           u.created_at
    from auth.users u
    left join public.user_profiles p on p.id = u.id
    order by u.created_at asc;
end;
$$;

create or replace function public.update_crm_user_role(p_user_id uuid, p_role text)
returns jsonb
language plpgsql
security definer
as $$
begin
  if not exists (
    select 1 from public.user_profiles where id = auth.uid() and role = 'admin'
  ) then return jsonb_build_object('error', 'Acesso negado'); end if;

  if p_role not in ('admin','user') then
    return jsonb_build_object('error', 'Role inválido'); end if;

  update public.user_profiles set role = p_role where id = p_user_id;
  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.delete_crm_user(p_user_id uuid)
returns jsonb
language plpgsql
security definer
as $$
begin
  if not exists (
    select 1 from public.user_profiles where id = auth.uid() and role = 'admin'
  ) then return jsonb_build_object('error', 'Acesso negado'); end if;

  if p_user_id = auth.uid() then
    return jsonb_build_object('error', 'Não é possível excluir sua própria conta'); end if;

  delete from auth.users where id = p_user_id;
  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.create_crm_user(
  p_email text, p_password text, p_name text, p_role text default 'user'
)
returns jsonb
language plpgsql
security definer
as $$
declare
  new_id uuid := gen_random_uuid();
begin
  if not exists (
    select 1 from public.user_profiles where id = auth.uid() and role = 'admin'
  ) then return jsonb_build_object('error', 'Acesso negado'); end if;

  if exists (select 1 from auth.users where email = lower(trim(p_email))) then
    return jsonb_build_object('error', 'E-mail já cadastrado'); end if;

  if p_role not in ('admin','user') then
    return jsonb_build_object('error', 'Role inválido'); end if;

  insert into auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, role, aud
  ) values (
    new_id, '00000000-0000-0000-0000-000000000000',
    lower(trim(p_email)),
    crypt(p_password, gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('name', p_name),
    false, 'authenticated', 'authenticated'
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    new_id, new_id,
    jsonb_build_object('sub', new_id::text, 'email', lower(trim(p_email))),
    'email', now(), now(), now()
  );

  insert into public.user_profiles (id, role, name)
  values (new_id, p_role, p_name)
  on conflict (id) do update set role = p_role, name = p_name;

  return jsonb_build_object('success', true, 'id', new_id);
end;
$$;

-- ── 7. Garante que o admin Erick existe como admin ─────────────
update public.user_profiles
set role = 'admin', name = 'Erick'
where id = (select id from auth.users where email = 'erick21louis@gmail.com');

-- ── PRONTO ─────────────────────────────────────────────────────
select
  u.email,
  p.role,
  p.name
from auth.users u
join public.user_profiles p on p.id = u.id
order by u.created_at;
