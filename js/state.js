/* ===========================================================
   FERA CRM — protótipo funcional em memória
   =========================================================== */

// Estado da aplicação
const state = {
  page: 'dashboard',
  teamTab: 'sdr',
  defaultSdrCommission: 3,
  defaultCloserCommission: 8,
  sdrs: [
    { id: 1, name: 'Samuel Dias Cirino', email: 'samueldiascirino2005@gmail.com', commission: 3, sales: 12400 },
    { id: 2, name: 'Andrew', email: 'jvpasandrew@gmail.com', commission: 4, sales: 8600 },
  ],
  closers: [
    { id: 1, name: 'Lorran', email: 'ediymatos1@gmail.com', commission: 8, sales: 21500 },
    { id: 2, name: 'Loran', email: 'ediymatos2@gmail.com', commission: 10, sales: 9800 },
  ],
  leads: {
    novo: [
      { name: 'João Pedro', tag: 'Lead Interessado', meta: 'Instagram · há 14 min', instagram: '@joaopedro', phone: '(11) 98888-0000', origin: 'Instagram', description: 'Viu o anúncio e chamou perguntando sobre valores.', sdr: 'Samuel Dias Cirino', closer: '' },
    ],
    followup: [
      { name: 'Rafael Nunes', tag: 'Briefing enviado', meta: 'Telefone · há 2h', instagram: '', phone: '(21) 97777-1111', origin: 'Telefone', description: 'Já recebeu o briefing, aguardando retorno para agendar.', sdr: 'Andrew', closer: 'Lorran' },
      { name: 'Jackson Vitória', tag: 'Aguardando retorno', meta: 'Instagram · há 5h', instagram: '@jacksonv', phone: '', origin: 'Instagram', description: 'Pediu para retornarmos à tarde.', sdr: 'Samuel Dias Cirino', closer: '' },
    ],
    remarcado: [
      { name: 'Gabriel Rocha', tag: 'Remarcado p/ sexta', meta: 'Telefone · ontem', instagram: '', phone: '(31) 96666-2222', origin: 'Telefone', description: 'Não pôde na call de hoje, remarcou para sexta.', sdr: 'Andrew', closer: 'Lorran' },
      { name: 'Gustavo Soares', tag: 'Sem resposta', meta: 'Instagram · há 2 dias', instagram: '@gsoares', phone: '', origin: 'Instagram', description: 'Sem resposta desde o último contato.', sdr: 'Samuel Dias Cirino', closer: '' },
    ],
    noshow: [
      { name: 'Reginaldo Melo', tag: 'No-show', meta: 'Telefone · há 3 dias', instagram: '', phone: '(41) 95555-3333', origin: 'Telefone', description: 'Não compareceu na chamada agendada.', sdr: 'Andrew', closer: 'Loran' },
    ],
  },
  tasks: [
    { done: false, title: 'Ligar para lead João Pedro', owner: 'Samuel Dias Cirino', due: 'Hoje, 15:00' },
    { done: true, title: 'Enviar proposta para Rafael Nunes', owner: 'Lorran', due: 'Ontem' },
    { done: false, title: 'Confirmar chamada de amanhã', owner: 'Andrew', due: 'Amanhã, 09:00' },
  ],
  events: [
    { id: 1, title: 'Chamada — Gabriel Rocha', day: 5, start: 14, end: 15, people: ['Lorran'], lead: 'Gabriel Rocha', notes: 'Follow-up de remarcação.' },
    { id: 2, title: 'Chamada — Novo lead Instagram', day: 1, start: 10.5, end: 11, people: ['Samuel Dias Cirino'], lead: '', notes: '' },
  ],
  sales: [
    { cliente: 'Cliente Enterprise A', valor: 4200, forma: 'Cartão', closer: 'Lorran', sdr: 'Samuel Dias Cirino', data: '25/08' },
    { cliente: 'Cliente Enterprise B', valor: 3100, forma: 'Pix', closer: 'Loran', sdr: 'Andrew', data: '26/08' },
    { cliente: 'Cliente Standard C', valor: 1800, forma: 'Boleto', closer: 'Lorran', sdr: 'Samuel Dias Cirino', data: '27/08' },
  ],
  projects: [
    { name: 'Yuri Cerri – Web Start', owner: 'samueldiascirino2005@gmail.com' },
    { name: 'JLD', owner: 'caiosales.pr13@gmail.com' },
    { name: 'Rodrigo Lledson', owner: 'Você' },
  ],
};

const fmtBRL = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Definições iniciais das colunas do Kanban
const colDefs = [
  { key: 'novo', title: 'Novo' },
  { key: 'followup', title: 'Follow-Up' },
  { key: 'remarcado', title: 'Remarcado' },
  { key: 'noshow', title: 'No-Show' },
];

const pageTitles = {
  dashboard: ['Dashboard', 'Visão geral do período'],
  quadro: ['Quadro de Leads', 'Funil visual em kanban'],
  gestao: ['Gestão de Leads', 'Lista completa de leads'],
  tarefas: ['Tarefas', 'Pendências do time'],
  calendario: ['Calendário', 'Chamadas agendadas'],
  time: ['Gerenciar Time', 'SDRs e Closers'],
  projetos: ['Projetos', 'Seus projetos'],
  administracao: ['Administração', 'Configurações do projeto'],
  assistencia: ['Assistência', 'Suporte'],
};
