/* =============================================================
   FERA CRM — Auth & Role-Based Access Control
   Deve ser carregado APÓS app.js no index.html

   Fluxo:
   1. checkSession() → se sem sessão, redireciona para login.html
   2. loadUserProfile() → carrega role do usuário ('admin' | 'user')
   3. applyRoleUI(role) → oculta elementos proibidos para 'user'
   4. logout() → encerra sessão e redireciona para login.html
   ============================================================= */

/* ── Controle de sessão ────────────────────────────────────── */

async function checkSession() {
  const { data: { session } } = await _sb.auth.getSession();
  if (!session) {
    window.location.replace('login.html');
    return new Promise(() => {}); // interrompe execução
  }
  return session;
}

/* ── Perfil de usuário ─────────────────────────────────────── */

async function loadUserProfile() {
  // Obtém o usuário atual da sessão
  const { data: { user }, error: userError } = await _sb.auth.getUser();

  if (userError || !user) {
    console.warn('[Auth] Sem usuário na sessão:', userError?.message);
    return { role: 'user', name: 'Usuário' };
  }

  // Busca o perfil filtrando explicitamente pelo ID do usuário logado
  const { data, error } = await _sb
    .from('user_profiles')
    .select('id, role, name')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.warn('[Auth] Erro ao carregar perfil:', error.message);
    // Fallback: tenta criar o perfil se não existir
    const { data: inserted } = await _sb
      .from('user_profiles')
      .insert({ id: user.id, role: 'user', name: user.email })
      .select()
      .maybeSingle();
    return inserted || { role: 'user', name: user.email };
  }

  if (!data) {
    // Perfil não existe ainda — insere como 'user'
    const { data: inserted } = await _sb
      .from('user_profiles')
      .insert({ id: user.id, role: 'user', name: user.email })
      .select()
      .maybeSingle();
    return inserted || { role: 'user', name: user.email };
  }

  console.log('[Auth] Perfil carregado:', data.email, '→ role:', data.role);
  return data;
}

/* ── Aplica restrições de UI por role ─────────────────────── */

function applyRoleUI(role, name) {
  // Atualiza avatar e badge na topbar
  const avatarEl = document.getElementById('topbar-user-name');
  const badgeEl  = document.getElementById('topbar-user-badge');

  if (avatarEl) {
    const initials = (name || '?')
      .trim()
      .split(' ')
      .map(w => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    avatarEl.textContent = initials;
    avatarEl.title = name || '';
  }

  if (badgeEl) {
    badgeEl.textContent = role === 'admin' ? 'Admin' : 'Usuário';
    badgeEl.className = 'topbar-badge ' + (role === 'admin' ? 'badge-admin' : 'badge-user');
  }

  // Guarda o role globalmente para uso em renderizações dinâmicas (ex: renderKanban)
  window._userRole = role;

  // Elementos estáticos no HTML — ocultar para 'user'
  if (role !== 'admin') {
    ['#nav-time', '#nav-projetos', '#nav-administracao'].forEach(sel => {
      const el = document.querySelector(sel);
      if (el) el.style.display = 'none';
    });

    // Bloqueia navegação via goToPage para páginas restritas
    const _originalGoToPage = window.goToPage;
    if (typeof _originalGoToPage === 'function') {
      window.goToPage = function(page) {
        const adminOnly = ['time', 'projetos', 'administracao'];
        if (adminOnly.includes(page)) return; // bloqueia silenciosamente
        _originalGoToPage(page);
      };
    }
  }
}

/* ── Logout ────────────────────────────────────────────────── */

async function logout() {
  await _sb.auth.signOut();
  window.location.replace('login.html');
}

/* ── Inicialização protegida ───────────────────────────────── */

async function bootApp() {
  // 1. Verifica sessão
  await checkSession();

  // 2. Carrega perfil com role real
  const profile = await loadUserProfile();

  // 3. Aplica restrições de UI baseadas no role
  applyRoleUI(profile.role, profile.name);

  // 4. Inicializa o CRM
  if (typeof init === 'function') {
    await init();
  }

  // 5. Após init(), se for usuário, oculta o btn-nova-coluna
  //    (esse botão é criado dinamicamente pelo renderKanban)
  if (profile.role !== 'admin') {
    const btnNovaColuna = document.getElementById('btn-nova-coluna');
    if (btnNovaColuna) btnNovaColuna.style.display = 'none';
  }

  // 6. Se admin, carrega lista de usuários na página de administração
  if (profile.role === 'admin' && typeof renderUsers === 'function') {
    renderUsers();
  }
}

// Inicia após o DOM estar pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}
