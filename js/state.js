/* ===========================================================
   FERA CRM — State
   O state agora é um objeto vazio preenchido pelo Supabase.
   Dados mock removidos; constantes de UI preservadas.
   =========================================================== */

// Estado da aplicação (preenchido em init() no app.js)
const state = {
  page: 'dashboard',
  teamTab: 'sdr',
  defaultSdrCommission: 3,
  defaultCloserCommission: 8,
  sdrs: [],
  closers: [],
  leads: {
    novo: [],
    followup: [],
    remarcado: [],
    noshow: [],
  },
  tasks: [],
  events: [],
  sales: [],
  projects: [],
};

const fmtBRL = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Definições iniciais das colunas do Kanban (sobrescritas pelo banco em init)
let colDefs = [
  { key: 'novo',      title: 'Novo' },
  { key: 'followup',  title: 'Follow-Up' },
  { key: 'remarcado', title: 'Remarcado' },
  { key: 'noshow',    title: 'No-Show' },
];

const pageTitles = {
  dashboard:     ['Dashboard',          'Visão geral do período'],
  quadro:        ['Quadro de Leads',    'Funil visual em kanban'],
  gestao:        ['Gestão de Leads',    'Lista completa de leads'],
  tarefas:       ['Tarefas',            'Pendências do time'],
  calendario:    ['Calendário',         'Chamadas agendadas'],
  time:          ['Gerenciar Time',     'SDRs e Closers'],
  projetos:      ['Projetos',           'Seus projetos'],
  administracao: ['Administração',      'Configurações do projeto'],
  assistencia:   ['Assistência',        'Suporte'],
};
