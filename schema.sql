-- =============================================================
-- FERA CRM — Schema Supabase
-- Execute no SQL Editor do Supabase Dashboard
-- =============================================================

-- ── extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── projects ─────────────────────────────────────────────────
create table if not exists public.projects (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  owner       text not null default 'Você',
  created_at  timestamptz not null default now()
);
alter table public.projects enable row level security;
create policy "anon_all_projects" on public.projects for all using (true) with check (true);

-- ── settings ─────────────────────────────────────────────────
create table if not exists public.settings (
  id                        uuid primary key default uuid_generate_v4(),
  project_id                uuid not null references public.projects(id) on delete cascade,
  default_sdr_commission    numeric not null default 3,
  default_closer_commission numeric not null default 8
);
alter table public.settings enable row level security;
create policy "anon_all_settings" on public.settings for all using (true) with check (true);

-- ── kanban_columns ────────────────────────────────────────────
create table if not exists public.kanban_columns (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  key         text not null,
  title       text not null,
  position    int  not null default 0
);
alter table public.kanban_columns enable row level security;
create policy "anon_all_kanban_columns" on public.kanban_columns for all using (true) with check (true);

-- ── sdrs ─────────────────────────────────────────────────────
create table if not exists public.sdrs (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  name        text not null,
  email       text not null default '',
  commission  numeric not null default 3,
  sales       numeric not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.sdrs enable row level security;
create policy "anon_all_sdrs" on public.sdrs for all using (true) with check (true);

-- ── closers ──────────────────────────────────────────────────
create table if not exists public.closers (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  name        text not null,
  email       text not null default '',
  commission  numeric not null default 8,
  sales       numeric not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.closers enable row level security;
create policy "anon_all_closers" on public.closers for all using (true) with check (true);

-- ── leads ─────────────────────────────────────────────────────
create table if not exists public.leads (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  name        text not null,
  status      text not null default 'novo',
  tag         text not null default 'Novo lead',
  meta        text not null default '',
  instagram   text not null default '',
  phone       text not null default '',
  origin      text not null default 'Instagram',
  description text not null default '',
  sdr_name    text not null default '',
  closer_name text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.leads enable row level security;
create policy "anon_all_leads" on public.leads for all using (true) with check (true);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- ── tasks ─────────────────────────────────────────────────────
create table if not exists public.tasks (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  title       text not null,
  owner       text not null default 'Você',
  due         text not null default 'Sem prazo',
  done        boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table public.tasks enable row level security;
create policy "anon_all_tasks" on public.tasks for all using (true) with check (true);

-- ── events ────────────────────────────────────────────────────
create table if not exists public.events (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  title       text not null,
  day         int  not null default 0,
  start_time  numeric not null default 9,
  end_time    numeric not null default 10,
  lead_name   text not null default '',
  notes       text not null default '',
  people      text[] not null default '{}',
  created_at  timestamptz not null default now()
);
alter table public.events enable row level security;
create policy "anon_all_events" on public.events for all using (true) with check (true);

-- ── sales ─────────────────────────────────────────────────────
create table if not exists public.sales (
  id           uuid primary key default uuid_generate_v4(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  cliente      text not null,
  valor        numeric not null default 0,
  forma        text not null default 'Pix',
  closer_name  text not null default '',
  sdr_name     text not null default '',
  data         text not null default '',
  created_at   timestamptz not null default now()
);
alter table public.sales enable row level security;
create policy "anon_all_sales" on public.sales for all using (true) with check (true);


-- =============================================================
-- SEED — dados iniciais (espelha o mock do state.js)
-- =============================================================

do $$
declare
  pid uuid;
begin

  insert into public.projects (name, owner)
  values ('Yuri Cerri – Web Start', 'Você')
  returning id into pid;

  insert into public.settings (project_id, default_sdr_commission, default_closer_commission)
  values (pid, 3, 8);

  insert into public.kanban_columns (project_id, key, title, position) values
    (pid, 'novo',      'Novo',       0),
    (pid, 'followup',  'Follow-Up',  1),
    (pid, 'remarcado', 'Remarcado',  2),
    (pid, 'noshow',    'No-Show',    3);

  insert into public.sdrs (project_id, name, email, commission, sales) values
    (pid, 'Samuel Dias Cirino', 'samueldiascirino2005@gmail.com', 3, 12400),
    (pid, 'Andrew',             'jvpasandrew@gmail.com',          4,  8600);

  insert into public.closers (project_id, name, email, commission, sales) values
    (pid, 'Lorran', 'ediymatos1@gmail.com', 8,  21500),
    (pid, 'Loran',  'ediymatos2@gmail.com', 10,  9800);

  insert into public.leads (project_id, name, status, tag, meta, instagram, phone, origin, description, sdr_name, closer_name) values
    (pid, 'João Pedro',      'novo',      'Lead Interessado',   'Instagram · há 14 min', '@joaopedro', '(11) 98888-0000', 'Instagram', 'Viu o anúncio e chamou perguntando sobre valores.',        'Samuel Dias Cirino', ''),
    (pid, 'Rafael Nunes',    'followup',  'Briefing enviado',   'Telefone · há 2h',      '',           '(21) 97777-1111', 'Telefone',  'Já recebeu o briefing, aguardando retorno para agendar.', 'Andrew',             'Lorran'),
    (pid, 'Jackson Vitória', 'followup',  'Aguardando retorno', 'Instagram · há 5h',     '@jacksonv',  '',                'Instagram', 'Pediu para retornarmos à tarde.',                          'Samuel Dias Cirino', ''),
    (pid, 'Gabriel Rocha',   'remarcado', 'Remarcado p/ sexta', 'Telefone · ontem',      '',           '(31) 96666-2222', 'Telefone',  'Não pôde na call de hoje, remarcou para sexta.',          'Andrew',             'Lorran'),
    (pid, 'Gustavo Soares',  'remarcado', 'Sem resposta',       'Instagram · há 2 dias', '@gsoares',   '',                'Instagram', 'Sem resposta desde o último contato.',                     'Samuel Dias Cirino', ''),
    (pid, 'Reginaldo Melo',  'noshow',    'No-show',            'Telefone · há 3 dias',  '',           '(41) 95555-3333', 'Telefone',  'Não compareceu na chamada agendada.',                     'Andrew',             'Loran');

  insert into public.tasks (project_id, title, owner, due, done) values
    (pid, 'Ligar para lead João Pedro',        'Samuel Dias Cirino', 'Hoje, 15:00',   false),
    (pid, 'Enviar proposta para Rafael Nunes', 'Lorran',             'Ontem',         true),
    (pid, 'Confirmar chamada de amanhã',       'Andrew',             'Amanhã, 09:00', false);

  insert into public.events (project_id, title, day, start_time, end_time, lead_name, notes, people) values
    (pid, 'Chamada — Gabriel Rocha',       5, 14,   15, 'Gabriel Rocha', 'Follow-up de remarcação.', array['Lorran']),
    (pid, 'Chamada — Novo lead Instagram', 1, 10.5, 11, '',              '',                          array['Samuel Dias Cirino']);

  insert into public.sales (project_id, cliente, valor, forma, closer_name, sdr_name, data) values
    (pid, 'Cliente Enterprise A', 4200, 'Cartão', 'Lorran', 'Samuel Dias Cirino', '25/08'),
    (pid, 'Cliente Enterprise B', 3100, 'Pix',    'Loran',  'Andrew',             '26/08'),
    (pid, 'Cliente Standard C',   1800, 'Boleto', 'Lorran', 'Samuel Dias Cirino', '27/08');

end;
$$;
