-- =============================================================
-- FERA CRM — Migration: Novos campos do formulário de Lead
-- Execute no SQL Editor do Supabase Dashboard
-- =============================================================

alter table public.leads
  add column if not exists pipeline            text    not null default 'Vendas',
  add column if not exists email               text    not null default '',
  add column if not exists idade               text    not null default '',
  add column if not exists nicho               text    not null default '',
  add column if not exists investimento_mensal numeric not null default 0,
  add column if not exists faturamento_atual   numeric not null default 0,
  add column if not exists esta_no_digital     boolean not null default false,
  add column if not exists e_indicacao         boolean not null default false,
  add column if not exists tipo_lead           text    not null default '',
  add column if not exists nivel_consciencia   text    not null default '',
  add column if not exists briefing            text    not null default '';
