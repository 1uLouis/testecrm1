/* =============================================================
   FERA CRM — Auth & Role-Based Access Control
   Deve ser carregado ANTES de app.js no index.html

   Fluxo:
   1. checkSession() → se sem sessão, redireciona para login.html
   2. loadUserProfile() → carrega role do usuário ('admin' | 'user')
   3. applyRoleUI(role) → oculta elementos proibidos para 'user'
   4. logout() → encerra sessão e redireciona para login.html
   ============================================================= */

/* ── Controle de sessão ────────────────────────────────────── */

/**
 * Verifica se o usuário está autenticado.
 * Se não estiver, redireciona para login.html.
 * Retorna o objeto de sessão se autenticado.
 */
async function checkSession() {
  const { data: { session } } = await _sb.auth.getSession();
  if (!session) {
    window.location.replace('login.html');
    // Retorna uma Promise que nunca resolve para interromper a execução
    return new Promise(() => {});
  }
  return session;
}

/* ── Perfil de usuário ─────────────────────────────────────── */

/**
 * Carrega o perfil do usuário autenticado da tabela user_profiles.
 * Retorna { id, role, name } ou { role: 'user' } como fallback.
 */
async function loadUserProfile() {
  const { data, error } = await _sb.from('user_profiles').select('*').limit(1).maybeSingle();
  if (error) {
    console.warn('[Auth] Erro ao carregar perfil:', error.message);
    return { role: 'user', name: 'Usuário' };
  }
  return data || { role: 'user', name: 'Usuário' };
}

/* ── Aplica restrições de UI por role ─────────────────────── */

/**
 * Exibe o nome e o badge de role na topbar.
 * Oculta itens de navegação e botões restritos para 'user'.
 *
 * Elementos controlados:
 *   - #nav-time          → item da sidebar "Time"
 *   - #nav-projetos      → item da sidebar "Projetos"
 *   - #nav-administracao → item da sidebar "Administração"
 *   - #btn-nova-coluna   → botão "Nova Coluna" no quadro de leads
 */
function applyRoleUI(role, name) {
  // Atualiza o avatar / nome na topbar
  const avatarEl = document.getElementById('topbar-user-name');
  const badgeEl  = document.getElementById('topbar-user-badge');
  if (avatarEl) {
    const initials = name
      ? name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
      : '?';
    avatarEl.textContent = initials;
    avatarEl.title = name;
  }
  if (badgeEl) {
    badgeEl.textContent = role === 'admin' ? 'Admin' : 'Usuário';
    badgeEl.className = 'topbar-badge ' + (role === 'admin' ? 'badge-admin' : 'badge-user');
  }

  // Usuários comuns não vêem funcionalidades de administrador
  if (role !== 'admin') {
    const restricted = [
      '#nav-time',
      '#nav-projetos',
      '#nav-administracao',
      '#btn-nova-coluna',
    ];
    restricted.forEach(sel => {
      const el = document.querySelector(sel);
      if (el) el.style.display = 'none';
    });
  }
}

/* ── Logout ────────────────────────────────────────────────── */

async function logout() {
  await _sb.auth.signOut();
  window.location.replace('login.html');
}

/* ── Inicialização protegida ───────────────────────────────── */
// Sobrescreve a chamada direta de init() que existia no app.js.
// Agora o fluxo é: checkSession → loadUserProfile → applyRoleUI → init()
async function bootApp() {
  // 1. Garante sessão ativa (redireciona para login se não tiver)
  await checkSession();

  // 2. Carrega o perfil e aplica restrições de UI
  const profile = await loadUserProfile();
  applyRoleUI(profile.role, profile.name);

  // 3. Armazena role no state para eventuais verificações no app.js
  window._userRole = profile.role;

  // 4. Inicializa o CRM normalmente
  if (typeof init === 'function') {
    await init();
  }
}

// Aguarda o DOM estar pronto antes de iniciar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}
