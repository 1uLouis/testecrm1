/* =============================================================
   FERA CRM — Auth & RBAC
   Carregado APÓS app.js. Usa RPC security definer para evitar
   problemas de RLS ao ler o próprio perfil.
   ============================================================= */

/* ── Sessão ────────────────────────────────────────────────── */
async function checkSession() {
  const { data: { session } } = await _sb.auth.getSession();
  if (!session) {
    window.location.replace('login.html');
    return new Promise(() => {});
  }
  return session;
}

/* ── Perfil via RPC (sem depender de RLS) ──────────────────── */
async function loadUserProfile() {
  // Usa função security definer — nunca falha por RLS
  const { data, error } = await _sb.rpc('get_my_profile');
  if (error || !data || data.length === 0) {
    console.warn('[Auth] Erro ao carregar perfil via RPC:', error?.message);
    // Tenta ler diretamente como fallback
    const { data: { user } } = await _sb.auth.getUser();
    return { role: 'user', name: user?.email || 'Usuário', id: user?.id };
  }
  const profile = data[0];
  console.log('[Auth] Perfil:', profile.name, '| Role:', profile.role);
  return profile;
}

/* ── Aplica restrições de UI ───────────────────────────────── */
function applyRoleUI(role, name) {
  // Atualiza topbar
  const avatarEl = document.getElementById('topbar-user-name');
  const badgeEl  = document.getElementById('topbar-user-badge');
  if (avatarEl) {
    avatarEl.textContent = (name || '?').trim().split(' ')
      .map(w => w[0]).join('').toUpperCase().slice(0, 2);
    avatarEl.title = name || '';
  }
  if (badgeEl) {
    badgeEl.textContent = role === 'admin' ? 'Admin' : 'Usuário';
    badgeEl.className = 'topbar-badge ' + (role === 'admin' ? 'badge-admin' : 'badge-user');
  }

  // Salva role globalmente
  window._userRole = role;

  if (role !== 'admin') {
    // Oculta itens de sidebar restritos
    ['#nav-time', '#nav-projetos', '#nav-administracao'].forEach(sel => {
      const el = document.querySelector(sel);
      if (el) el.style.display = 'none';
    });

    // Remove os event listeners dos botões admin substituindo os nós no DOM
    ['#nav-time', '#nav-projetos', '#nav-administracao'].forEach(sel => {
      const el = document.querySelector(sel);
      if (el) {
        const clone = el.cloneNode(true);
        clone.style.display = 'none';
        el.parentNode.replaceChild(clone, el);
      }
    });
  }
}

/* ── Logout ────────────────────────────────────────────────── */
async function logout() {
  await _sb.auth.signOut();
  window.location.replace('login.html');
}

/* ── Boot ──────────────────────────────────────────────────── */
async function bootApp() {
  await checkSession();

  const profile = await loadUserProfile();
  window._userRole = profile.role; // seta ANTES do init() para renderKanban usar

  applyRoleUI(profile.role, profile.name);

  if (typeof init === 'function') {
    await init();
  }

  // Após init(), oculta btn-nova-coluna se não for admin
  // (gerado dinamicamente pelo renderKanban)
  if (profile.role !== 'admin') {
    const btn = document.getElementById('btn-nova-coluna');
    if (btn) btn.style.display = 'none';

    // Remove também o btn-nova-tarefa-quadro se quiser (opcional)
    // const btn2 = document.getElementById('btn-nova-tarefa-quadro');
    // if (btn2) btn2.style.display = 'none';
  }

  // Carrega lista de usuários só para admin
  if (profile.role === 'admin' && typeof renderUsers === 'function') {
    renderUsers();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}
