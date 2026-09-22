-- =============================================================
-- FERA CRM -- Migracao: Tabela lead_sales (Vendas por Lead)
-- Execute no SQL Editor do Supabase Dashboard
-- =============================================================

-- Tabela de produtos (para preencher valor automaticamente)
create table if not exists public.products (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  name        text not null,
  price       numeric not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.products enable row level security;
create policy "anon_all_products" on public.products for all using (true) with check (true);

-- Tabela principal: vendas vinculadas a um lead especifico
create table if not exists public.lead_sales (
  id                uuid primary key default uuid_generate_v4(),
  project_id        uuid not null references public.projects(id) on delete cascade,
  lead_id           uuid not null references public.leads(id) on delete cascade,
  product_id        uuid references public.products(id) on delete set null,
  product_name      text not null default '',
  valor_contratado  numeric not null default 0,
  valor_pago        numeric,                        -- null = sem pagamento inicial
  data_venda        date not null default current_date,
  forma_pagamento   text not null default 'Pix',    -- Pix | Cartao | Boleto | Outro
  status_pagamento  text not null default 'Pago',   -- Pago | Pendente | Falhou | Reembolsado
  closer_name       text not null default '',
  sdr_name          text not null default '',
  created_at        timestamptz not null default now()
);

alter table public.lead_sales enable row level security;
create policy "anon_all_lead_sales" on public.lead_sales for all using (true) with check (true);

create index if not exists idx_lead_sales_lead_id    on public.lead_sales (lead_id);
create index if not exists idx_lead_sales_project_id on public.lead_sales (project_id);
create index if not exists idx_products_project_id   on public.products   (project_id);
