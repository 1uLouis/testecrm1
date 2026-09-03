-- =============================================================
-- FERA CRM — Correção das políticas RLS de user_profiles
-- Execute no SQL Editor do Supabase Dashboard
-- =============================================================

-- Remove políticas antigas que podem estar causando conflito
drop policy if exists "select_own_profile"      on public.user_profiles;
drop policy if exists "admin_manage_profiles"   on public.user_profiles;
drop policy if exists "own_profile"             on public.user_profiles;
drop policy if exists "admin_all_profiles"      on public.user_profiles;

-- Política simples: cada usuário autenticado lê seu próprio perfil
create policy "leitura_proprio_perfil"
  on public.user_profiles
  for select
  using (auth.uid() = id);

-- Admin lê e escreve todos os perfis (para listagem de usuários)
create policy "admin_gerencia_perfis"
  on public.user_profiles
  for all
  using (
    auth.uid() = id  -- próprio perfil sempre
    OR
    auth.role() = 'service_role'  -- service role bypass
    OR
    (select role from public.user_profiles where id = auth.uid()) = 'admin'
  )
  with check (
    (select role from public.user_profiles where id = auth.uid()) = 'admin'
    OR auth.role() = 'service_role'
  );

-- Qualquer usuário autenticado pode inserir seu próprio perfil
-- (necessário para o trigger e para o fallback do auth.js)
create policy "inserir_proprio_perfil"
  on public.user_profiles
  for insert
  with check (auth.uid() = id);

-- Usuário pode atualizar seu próprio perfil (exceto o role)
create policy "atualizar_proprio_perfil"
  on public.user_profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
