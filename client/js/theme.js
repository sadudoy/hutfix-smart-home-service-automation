(function () {
  const KEY = 'hutfix_theme';
  const stored = localStorage.getItem(KEY);
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = stored || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', initial);

  window.HutTheme = {
    toggle() {
      const cur = document.documentElement.getAttribute('data-theme') || 'light';
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(KEY, next);
      document.querySelectorAll('.theme-toggle').forEach(b => {
        b.innerHTML = next === 'dark' ? '<i class="bi bi-sun"></i>' : '<i class="bi bi-moon-stars"></i>';
      });
    },
    applyIcon(btn) {
      const cur = document.documentElement.getAttribute('data-theme') || 'light';
      btn.innerHTML = cur === 'dark' ? '<i class="bi bi-sun"></i>' : '<i class="bi bi-moon-stars"></i>';
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      window.HutTheme.applyIcon(btn);
      btn.addEventListener('click', () => window.HutTheme.toggle());
    });
  });
})();
