-- =============================================================
-- FERA CRM — Auth Setup
-- Execute no SQL Editor do Supabase Dashboard
-- ATENÇÃO: execute APÓS o schema.sql já ter sido executado
-- =============================================================

-- ── user_profiles ─────────────────────────────────────────────
-- Armazena o papel (role) de cada usuário autenticado pelo Supabase Auth.
-- O campo 'id' referencia auth.users, então é criado automaticamente
-- pelo trigger abaixo quando um novo usuário se registra.
create table if not exists public.user_profiles (
  id    uuid primary key references auth.users(id) on delete cascade,
  role  text not null default 'user' check (role in ('admin', 'user')),
  name  text not null default ''
);

alter table public.user_profiles enable row level security;

-- Usuário vê apenas seu próprio perfil
create policy "select_own_profile"
  on public.user_profiles
  for select
  using (auth.uid() = id);

-- Admin pode gerenciar todos os perfis
create policy "admin_manage_profiles"
  on public.user_profiles
  for all
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- ── trigger: cria perfil automaticamente ao criar usuário ─────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_profiles (id, role, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'user'),
    coalesce(new.raw_user_meta_data->>'name', new.email)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================
-- ATUALIZAR POLÍTICAS RLS — Exigir autenticação em todas tabelas
-- (Remove as políticas anônimas abertas e substitui por políticas
--  que exigem que o usuário esteja autenticado)
-- =============================================================

-- ── projects ──────────────────────────────────────────────────
drop policy if exists "anon_all_projects" on public.projects;
create policy "auth_all_projects"
  on public.projects for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- ── settings ──────────────────────────────────────────────────
drop policy if exists "anon_all_settings" on public.settings;
create policy "auth_all_settings"
  on public.settings for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- ── kanban_columns ────────────────────────────────────────────
drop policy if exists "anon_all_kanban_columns" on public.kanban_columns;
-- Leitura: qualquer autenticado
create policy "auth_select_columns"
  on public.kanban_columns for select
  using (auth.uid() is not null);
-- Criação/alteração: apenas admin
create policy "admin_write_columns"
  on public.kanban_columns for insert
  with check (
    exists (select 1 from public.user_profiles where id = auth.uid() and role = 'admin')
  );
create policy "admin_update_columns"
  on public.kanban_columns for update
  using (
    exists (select 1 from public.user_profiles where id = auth.uid() and role = 'admin')
  );
create policy "admin_delete_columns"
  on public.kanban_columns for delete
  using (
    exists (select 1 from public.user_profiles where id = auth.uid() and role = 'admin')
  );

-- ── sdrs ──────────────────────────────────────────────────────
drop policy if exists "anon_all_sdrs" on public.sdrs;
-- Leitura: qualquer autenticado
create policy "auth_select_sdrs"
  on public.sdrs for select
  using (auth.uid() is not null);
-- Escrita: apenas admin
create policy "admin_write_sdrs"
  on public.sdrs for insert
  with check (
    exists (select 1 from public.user_profiles where id = auth.uid() and role = 'admin')
  );
create policy "admin_update_sdrs"
  on public.sdrs for update
  using (
    exists (select 1 from public.user_profiles where id = auth.uid() and role = 'admin')
  );
create policy "admin_delete_sdrs"
  on public.sdrs for delete
  using (
    exists (select 1 from public.user_profiles where id = auth.uid() and role = 'admin')
  );

-- ── closers ───────────────────────────────────────────────────
drop policy if exists "anon_all_closers" on public.closers;
-- Leitura: qualquer autenticado
create policy "auth_select_closers"
  on public.closers for select
  using (auth.uid() is not null);
-- Escrita: apenas admin
create policy "admin_write_closers"
  on public.closers for insert
  with check (
    exists (select 1 from public.user_profiles where id = auth.uid() and role = 'admin')
  );
create policy "admin_update_closers"
  on public.closers for update
  using (
    exists (select 1 from public.user_profiles where id = auth.uid() and role = 'admin')
  );
create policy "admin_delete_closers"
  on public.closers for delete
  using (
    exists (select 1 from public.user_profiles where id = auth.uid() and role = 'admin')
  );

-- ── leads ─────────────────────────────────────────────────────
drop policy if exists "anon_all_leads" on public.leads;
create policy "auth_all_leads"
  on public.leads for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- ── tasks ─────────────────────────────────────────────────────
drop policy if exists "anon_all_tasks" on public.tasks;
create policy "auth_all_tasks"
  on public.tasks for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- ── events ────────────────────────────────────────────────────
drop policy if exists "anon_all_events" on public.events;
create policy "auth_all_events"
  on public.events for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- ── sales ─────────────────────────────────────────────────────
drop policy if exists "anon_all_sales" on public.sales;
create policy "auth_all_sales"
  on public.sales for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- =============================================================
-- COMO CRIAR O PRIMEIRO ADMIN
-- =============================================================
-- 1. Crie o usuário pelo Supabase Dashboard (Authentication → Users → Add user)
--    OU use o link de convite.
-- 2. Copie o UUID do usuário criado.
-- 3. Execute o comando abaixo substituindo pelo UUID real:
--
--    update public.user_profiles
--    set role = 'admin', name = 'Seu Nome'
--    where id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
--
-- Para criar um usuário comum: o trigger já define role = 'user' por padrão.
-- =============================================================
