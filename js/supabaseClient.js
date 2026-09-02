/* =============================================================
   FERA CRM — Supabase Client
   Inicializa a conexão e exporta todas as funções CRUD
   ============================================================= */

const SUPABASE_URL  = 'https://flmdvniysszbqbzsdyxp.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsbWR2bml5c3N6YnFienNkeXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNTUwNDksImV4cCI6MjEwMzkzMTA0OX0.gq2k4okF1OSiIuLAILShP9RLxYWTbytyZS6jjbgvwxU';

const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ID do projeto ativo (preenchido em loadProject)
let _projectId = null;

/* ── helpers ───────────────────────────────────────────────── */
async function _q(fn) {
  const { data, error } = await fn;
  if (error) { console.error('[Supabase]', error.message); return null; }
  return data;
}

/* ── PROJETO ─────────────────────────────────────────────────
   Retorna o primeiro projeto encontrado (mais recente)
   e preenche _projectId para uso interno das funções.      */
async function loadProject() {
  const rows = await _q(_sb.from('projects').select('*').order('created_at', { ascending: true }).limit(1));
  if (!rows || rows.length === 0) return null;
  _projectId = rows[0].id;
  return rows[0];
}

async function loadAllProjects() {
  return await _q(_sb.from('projects').select('*').order('created_at', { ascending: true }));
}

async function insertProject(name, owner = 'Você') {
  const rows = await _q(_sb.from('projects').insert({ name, owner }).select());
  return rows ? rows[0] : null;
}

/* ── SETTINGS ────────────────────────────────────────────────*/
async function loadSettings() {
  const rows = await _q(_sb.from('settings').select('*').eq('project_id', _projectId).limit(1));
  return rows ? rows[0] : { default_sdr_commission: 3, default_closer_commission: 8 };
}

async function saveSettings(defaultSdrCommission, defaultCloserCommission) {
  const existing = await _q(_sb.from('settings').select('id').eq('project_id', _projectId).limit(1));
  if (existing && existing.length > 0) {
    return await _q(_sb.from('settings').update({
      default_sdr_commission: defaultSdrCommission,
      default_closer_commission: defaultCloserCommission,
    }).eq('project_id', _projectId));
  } else {
    return await _q(_sb.from('settings').insert({
      project_id: _projectId,
      default_sdr_commission: defaultSdrCommission,
      default_closer_commission: defaultCloserCommission,
    }));
  }
}

/* ── KANBAN COLUMNS ──────────────────────────────────────────*/
async function loadColumns() {
  const rows = await _q(_sb.from('kanban_columns').select('*').eq('project_id', _projectId).order('position', { ascending: true }));
  return rows || [];
}

async function insertColumn(key, title, position) {
  const rows = await _q(_sb.from('kanban_columns').insert({ project_id: _projectId, key, title, position }).select());
  return rows ? rows[0] : null;
}

/* ── SDRs ────────────────────────────────────────────────────*/
async function loadSDRs() {
  return await _q(_sb.from('sdrs').select('*').eq('project_id', _projectId).order('created_at', { ascending: true })) || [];
}

async function insertSDR(data) {
  const rows = await _q(_sb.from('sdrs').insert({ project_id: _projectId, ...data }).select());
  return rows ? rows[0] : null;
}

async function updateSDR(id, data) {
  return await _q(_sb.from('sdrs').update(data).eq('id', id));
}

async function deleteSDR(id) {
  return await _q(_sb.from('sdrs').delete().eq('id', id));
}

/* ── Closers ─────────────────────────────────────────────────*/
async function loadClosers() {
  return await _q(_sb.from('closers').select('*').eq('project_id', _projectId).order('created_at', { ascending: true })) || [];
}

async function insertCloser(data) {
  const rows = await _q(_sb.from('closers').insert({ project_id: _projectId, ...data }).select());
  return rows ? rows[0] : null;
}

async function updateCloser(id, data) {
  return await _q(_sb.from('closers').update(data).eq('id', id));
}

async function deleteCloser(id) {
  return await _q(_sb.from('closers').delete().eq('id', id));
}

/* ── LEADS ───────────────────────────────────────────────────
   Retorna objeto { [status]: lead[] } compatível com state.leads */
async function loadLeads() {
  const rows = await _q(_sb.from('leads').select('*').eq('project_id', _projectId).order('created_at', { ascending: true }));
  if (!rows) return {};
  const grouped = {};
  rows.forEach(lead => {
    if (!grouped[lead.status]) grouped[lead.status] = [];
    grouped[lead.status].push(lead);
  });
  return grouped;
}

async function insertLead(data) {
  const rows = await _q(_sb.from('leads').insert({ project_id: _projectId, ...data }).select());
  return rows ? rows[0] : null;
}

async function updateLead(id, data) {
  return await _q(_sb.from('leads').update(data).eq('id', id));
}

async function deleteLead(id) {
  return await _q(_sb.from('leads').delete().eq('id', id));
}

async function updateLeadStatus(id, newStatus) {
  return await _q(_sb.from('leads').update({ status: newStatus }).eq('id', id));
}

/* ── TASKS ───────────────────────────────────────────────────*/
async function loadTasks() {
  return await _q(_sb.from('tasks').select('*').eq('project_id', _projectId).order('created_at', { ascending: false })) || [];
}

async function insertTask(data) {
  const rows = await _q(_sb.from('tasks').insert({ project_id: _projectId, ...data }).select());
  return rows ? rows[0] : null;
}

async function updateTask(id, data) {
  return await _q(_sb.from('tasks').update(data).eq('id', id));
}

/* ── EVENTS ──────────────────────────────────────────────────*/
async function loadEvents() {
  return await _q(_sb.from('events').select('*').eq('project_id', _projectId).order('created_at', { ascending: true })) || [];
}

async function insertEvent(data) {
  const rows = await _q(_sb.from('events').insert({ project_id: _projectId, ...data }).select());
  return rows ? rows[0] : null;
}

async function updateEvent(id, data) {
  return await _q(_sb.from('events').update(data).eq('id', id));
}

async function deleteEvent(id) {
  return await _q(_sb.from('events').delete().eq('id', id));
}

/* ── SALES ───────────────────────────────────────────────────*/
async function loadSales() {
  return await _q(_sb.from('sales').select('*').eq('project_id', _projectId).order('created_at', { ascending: true })) || [];
}

async function insertSale(data) {
  const rows = await _q(_sb.from('sales').insert({ project_id: _projectId, ...data }).select());
  return rows ? rows[0] : null;
}
