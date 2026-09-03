-- =============================================================
-- FERA CRM — Criação de Admin + Gerenciamento de Usuários
-- Execute no SQL Editor do Supabase Dashboard
-- ATENÇÃO: Execute APÓS o auth_setup.sql já ter sido rodado
-- =============================================================

-- ── Extensões necessárias ──────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- =============================================================
-- PARTE 1: Funções para gerenciar usuários via RPC
-- (Permite que o frontend crie/liste/delete usuários sem
--  precisar da service_role key — seguro para frontend puro)
-- =============================================================

-- ── Criar novo usuário ─────────────────────────────────────────
create or replace function create_crm_user(
  p_email    text,
  p_password text,
  p_name     text,
  p_role     text default 'user'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid := gen_random_uuid();
  caller_role text;
begin
  -- Verifica se quem chama é admin
  select role into caller_role from public.user_profiles where id = auth.uid();
  if caller_role is distinct from 'admin' then
    return jsonb_build_object('error', 'Acesso negado: apenas administradores podem criar usuários.');
  end if;

  -- Verifica se o e-mail já existe
  if exists (select 1 from auth.users where email = lower(trim(p_email))) then
    return jsonb_build_object('error', 'Este e-mail já está cadastrado.');
  end if;

  -- Valida o role
  if p_role not in ('admin', 'user') then
    return jsonb_build_object('error', 'Role inválido. Use admin ou user.');
  end if;

  -- Cria o usuário no auth.users
  insert into auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud
  ) values (
    new_id,
    '00000000-0000-0000-0000-000000000000',
    lower(trim(p_email)),
    crypt(p_password, gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('name', p_name),
    false,
    'authenticated',
    'authenticated'
  );

  -- Cria a identidade de e-mail (necessário para login funcionar)
  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    new_id::text,
    new_id,
    jsonb_build_object('sub', new_id::text, 'email', lower(trim(p_email))),
    'email',
    now(),
    now(),
    now()
  );

  -- Cria/atualiza o perfil com role correto
  insert into public.user_profiles (id, role, name)
  values (new_id, p_role, p_name)
  on conflict (id) do update set role = p_role, name = p_name;

  return jsonb_build_object(
    'success', true,
    'id', new_id,
    'email', lower(trim(p_email)),
    'role', p_role
  );
end;
$$;

-- ── Listar todos os usuários ───────────────────────────────────
create or replace function list_crm_users()
returns table(
  id         uuid,
  email      text,
  name       text,
  role       text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  select up.role into caller_role from public.user_profiles up where up.id = auth.uid();
  if caller_role is distinct from 'admin' then
    raise exception 'Acesso negado';
  end if;

  return query
    select
      u.id,
      u.email::text,
      coalesce(p.name, u.email)::text as name,
      coalesce(p.role, 'user')::text  as role,
      u.created_at
    from auth.users u
    left join public.user_profiles p on p.id = u.id
    order by u.created_at asc;
end;
$$;

-- ── Alterar role de um usuário ─────────────────────────────────
create or replace function update_crm_user_role(
  p_user_id uuid,
  p_role    text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  select role into caller_role from public.user_profiles where id = auth.uid();
  if caller_role is distinct from 'admin' then
    return jsonb_build_object('error', 'Acesso negado.');
  end if;

  if p_role not in ('admin', 'user') then
    return jsonb_build_object('error', 'Role inválido.');
  end if;

  update public.user_profiles set role = p_role where id = p_user_id;
  return jsonb_build_object('success', true);
end;
$$;

-- ── Excluir usuário ────────────────────────────────────────────
create or replace function delete_crm_user(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  select role into caller_role from public.user_profiles where id = auth.uid();
  if caller_role is distinct from 'admin' then
    return jsonb_build_object('error', 'Acesso negado.');
  end if;

  if p_user_id = auth.uid() then
    return jsonb_build_object('error', 'Você não pode excluir sua própria conta.');
  end if;

  delete from auth.users where id = p_user_id;
  return jsonb_build_object('success', true);
end;
$$;


-- =============================================================
-- PARTE 2: Criar a conta administrador inicial
--   E-mail : erick21louis@gmail.com
--   Senha  : erick06072005
--   Role   : admin
--   Nome   : Erick
-- =============================================================

do $$
declare
  new_id uuid := gen_random_uuid();
begin

  -- Verifica se o usuário já existe para não duplicar
  if exists (select 1 from auth.users where email = 'erick21louis@gmail.com') then
    raise notice 'Usuário erick21louis@gmail.com já existe. Pulando criação.';
    return;
  end if;

  -- Cria o usuário no auth.users
  insert into auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud
  ) values (
    new_id,
    '00000000-0000-0000-0000-000000000000',
    'erick21louis@gmail.com',
    crypt('erick06072005', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Erick"}',
    false,
    'authenticated',
    'authenticated'
  );

  -- Cria a identidade de e-mail
  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    new_id::text,
    new_id,
    jsonb_build_object('sub', new_id::text, 'email', 'erick21louis@gmail.com'),
    'email',
    now(),
    now(),
    now()
  );

  -- Cria o perfil como admin (o trigger pode não ter rodado ainda)
  insert into public.user_profiles (id, role, name)
  values (new_id, 'admin', 'Erick')
  on conflict (id) do update set role = 'admin', name = 'Erick';

  raise notice 'Administrador erick21louis@gmail.com criado com sucesso! ID: %', new_id;

end;
$$;
