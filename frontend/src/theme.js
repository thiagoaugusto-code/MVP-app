export function initTheme() {
  // Support both legacy `theme` key and current `darkMode` boolean key.
  const savedTheme = localStorage.getItem('theme');
  const savedDarkMode = localStorage.getItem('darkMode');

  const isDark = (savedTheme === 'dark') || (savedDarkMode === 'true');

  document.documentElement.classList.toggle('dark', isDark);
}