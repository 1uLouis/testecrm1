const themeToggle = document.getElementById('theme-toggle');
const rootElement = document.documentElement;

function updateThemeToggle(isDark){
  const label = isDark ? 'Modo claro' : 'Modo escuro';
  const action = isDark ? 'Ativar modo claro' : 'Ativar modo escuro';
  themeToggle.setAttribute('aria-label', action);
  themeToggle.setAttribute('title', action);
  themeToggle.setAttribute('aria-pressed', String(isDark));
  themeToggle.querySelector('.theme-toggle-icon').textContent = isDark ? '☀' : '☾';
  themeToggle.querySelector('.theme-toggle-label').textContent = label;
}

const isDarkTheme = rootElement.dataset.theme === 'dark';
updateThemeToggle(isDarkTheme);

themeToggle.addEventListener('click', () => {
  const enableDarkTheme = rootElement.dataset.theme !== 'dark';
  rootElement.dataset.theme = enableDarkTheme ? 'dark' : 'light';
  localStorage.setItem('fera-crm-theme', enableDarkTheme ? 'dark' : 'light');
  updateThemeToggle(enableDarkTheme);
});
