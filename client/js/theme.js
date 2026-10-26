(function () {
  const KEY = 'hutfix_theme';
  const urlParams = typeof window !== 'undefined' && window.location ? new URLSearchParams(window.location.search) : null;
  const urlTheme = urlParams ? urlParams.get('theme') : null;
  const stored = localStorage.getItem(KEY);
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = (urlTheme === 'dark' || urlTheme === 'light') ? urlTheme : (stored || (prefersDark ? 'dark' : 'light'));
  
  document.documentElement.setAttribute('data-theme', initial);

  function syncThemeColor(theme) {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', theme === 'dark' ? '#121416' : '#fbfbfa');
  }

  syncThemeColor(initial);

  window.HutTheme = {
    toggle() {
      const cur = document.documentElement.getAttribute('data-theme') || 'light';
      const next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(KEY, next);
      syncThemeColor(next);
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
    syncThemeColor(document.documentElement.getAttribute('data-theme') || 'light');
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      window.HutTheme.applyIcon(btn);
      btn.addEventListener('click', () => window.HutTheme.toggle());
    });
  });
})();
