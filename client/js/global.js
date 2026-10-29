/**
 * HutFix — Global Shared Architecture (MPA)
 * Handles Layout Injection, Auth, Dark Mode, API Requests, Modals & Toast
 */

// Immediate Theme Initialization (runs synchronously to prevent flash of wrong theme)
(function() {
  const savedTheme = localStorage.getItem('hutfix_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
})();

// Global Utilities
window.money = function(n) {
  return '৳' + Number(n || 0).toLocaleString('en-BD');
};

window.escapeHtml = function(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
};

window.minutesToTime = function(mins) {
  const m = Number(mins);
  if (isNaN(m)) return '--';
  const hours = Math.floor(m / 60);
  const minutes = m % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  const mStr = minutes < 10 ? '0' + minutes : minutes;
  return `${h12}:${mStr} ${ampm}`;
};

window.api = async function(url, options = {}) {
  const fullUrl = url.startsWith('/api') ? url : ('/api' + (url.startsWith('/') ? url : '/' + url));
  const fetchOpts = {
    method: options.method || 'GET',
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  };
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    fetchOpts.body = JSON.stringify(options.body);
  } else if (options.body) {
    fetchOpts.body = options.body;
  }
  const res = await fetch(fullUrl, fetchOpts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
};

window.toast = function(message) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
};

window.openModal = function(title, bodyHtml, eyebrow = 'HUTFIX') {
  let backdrop = document.getElementById('modalBackdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'modalBackdrop';
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <div class="modal-head">
          <div><span class="eyebrow" id="modalEyebrow">HUTFIX</span><h2 id="modalTitle">Modal</h2></div>
          <button class="icon-btn close-modal" id="closeModal" aria-label="Close"><i class="bi bi-x-lg"></i></button>
        </div>
        <div id="modalBody" class="modal-body"></div>
      </div>
    `;
    document.body.appendChild(backdrop);
    backdrop.querySelector('#closeModal')?.addEventListener('click', window.closeModal);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) window.closeModal();
    });
  }

  const titleEl = document.getElementById('modalTitle');
  const eyeEl = document.getElementById('modalEyebrow');
  const bodyEl = document.getElementById('modalBody');

  if (titleEl) titleEl.textContent = title;
  if (eyeEl) eyeEl.textContent = eyebrow;
  if (bodyEl) bodyEl.innerHTML = bodyHtml;

  backdrop.classList.add('open');
};

window.closeModal = function() {
  const backdrop = document.getElementById('modalBackdrop');
  if (backdrop) backdrop.classList.remove('open');
};

// Toggle Dark / Light Theme
window.toggleTheme = function() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('hutfix_theme', next);
  updateThemeIcon();
};

function updateThemeIcon() {
  const icon = document.getElementById('themeIcon');
  if (!icon) return;
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  icon.className = current === 'dark' ? 'bi bi-sun' : 'bi bi-moon-stars';
}

// Current User State
window.currentUser = null;
window.favoriteProviderIds = new Set();

// Layout Injection & Auth Guard
window.renderLayout = async function(expectedRole = null, activePage = '', passedUser = null) {
  let user = passedUser || null;
  if (!user) {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.user) {
          user = data.user;
          window.currentUser = user;
        }
      }
    } catch (err) {
      console.warn('Auth check failed:', err);
    }
  } else {
    window.currentUser = user;
  }

  // Normalize expectedRole
  let normalizedRole = expectedRole;
  if (normalizedRole === 'client') normalizedRole = 'customer';
  if (normalizedRole === 'repairman') normalizedRole = 'provider';

  // Guard for protected pages
  if (normalizedRole && normalizedRole !== 'public') {
    if (!user) {
      const redirect = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `login.html?redirect=${redirect}`;
      return null;
    }
    // Check specific role authorization
    const uRole = user.role;
    if (normalizedRole === 'customer' && uRole !== 'customer') {
      window.location.href = uRole === 'admin' ? 'admin-overview.html' : 'provider-overview.html';
      return null;
    }
    if (normalizedRole === 'provider' && uRole !== 'provider') {
      window.location.href = uRole === 'admin' ? 'admin-overview.html' : 'index.html';
      return null;
    }
    if (normalizedRole === 'admin' && uRole !== 'admin') {
      window.location.href = uRole === 'provider' ? 'provider-overview.html' : 'index.html';
      return null;
    }
  }

  const role = user ? user.role : (normalizedRole || 'guest');

  // Load favorites if customer
  if (user && user.role === 'customer') {
    try {
      const favRes = await fetch('/api/favorites/mine', { credentials: 'include' });
      if (favRes.ok) {
        const favData = await favRes.json();
        if (favData.ok && favData.favorite_provider_ids) {
          window.favoriteProviderIds = new Set(favData.favorite_provider_ids.map(Number));
        }
      }
    } catch (_) {}
  }

  // Common initials and avatar
  const userInitials = (user && user.full_name)
    ? user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';
  const avatarSrc = (user && (user.logo_url || user.avatar_url || user.avatar))
    ? (user.logo_url || user.avatar_url || user.avatar)
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(userInitials)}&background=e8e7ff&color=6059b8&bold=true`;
  const isDefaultAvatar = !(user && (user.logo_url || user.avatar_url || user.avatar));
  const roleLabel = user ? ({ customer: 'Client account', provider: 'Provider account', admin: 'Admin account' })[user.role] || 'User' : 'Guest';
  let profileUrl = (role === 'repairman' || role === 'provider') ? 'provider-profile.html' : (role === 'admin' ? 'admin-profile.html' : 'customer-profile.html');

  // 1. Inject Sidebar
  const sidebarEl = document.getElementById('sidebar');
  if (sidebarEl) {
    let navItems = [];
    let navCaption = 'DISCOVER';

    if (role === 'guest') {
      navCaption = 'DISCOVER';
      navItems = [
        ['index.html', '<i class="bi bi-search"></i>', 'Discover services', activePage === 'discover']
      ];
    } else if (role === 'customer') {
      navCaption = 'DISCOVER';
      navItems = [
        ['index.html', '<i class="bi bi-search"></i>', 'Discover services', activePage === 'discover'],
        ['customer-bookings.html', '<i class="bi bi-calendar-check"></i>', 'My bookings', activePage === 'bookings'],
        ['customer-track.html', '<i class="bi bi-geo-alt"></i>', 'Track a service', activePage === 'tracking'],
        ['customer-favorites.html', '<i class="bi bi-heart"></i>', 'Saved services', activePage === 'favorites'],
        ['customer-profile.html', '<i class="bi bi-person"></i>', 'My profile', activePage === 'profile']
      ];
    } else if (role === 'provider') {
      navCaption = 'YOUR BUSINESS';
      navItems = [
        ['provider-overview.html', '<i class="bi bi-speedometer2"></i>', 'Overview', activePage === 'overview'],
        ['provider-gigs.html', '<i class="bi bi-briefcase"></i>', 'My service gigs', activePage === 'my-gigs'],
        ['provider-requests.html', '<i class="bi bi-calendar-check"></i>', 'Booking requests', activePage === 'requests'],
        ['provider-availability.html', '<i class="bi bi-clock-history"></i>', 'Availability & slots', activePage === 'availability'],
        ['provider-earnings.html', '<i class="bi bi-cash-coin"></i>', 'Earnings & payouts', activePage === 'earnings'],
        ['provider-profile.html', '<i class="bi bi-person"></i>', 'My profile', activePage === 'repair-profile']
      ];
    } else if (role === 'admin') {
      navCaption = 'MANAGE PLATFORM';
      navItems = [
        ['admin-overview.html', '<i class="bi bi-speedometer2"></i>', 'Overview', activePage === 'admin-overview'],
        ['admin-users.html', '<i class="bi bi-people"></i>', 'Users & repairmen', activePage === 'users'],
        ['admin-bookings.html', '<i class="bi bi-calendar-check"></i>', 'All bookings', activePage === 'all-bookings'],
        ['admin-reports.html', '<i class="bi bi-bar-chart"></i>', 'Reports & analytics', activePage === 'reports'],
        ['admin-payouts.html', '<i class="bi bi-cash-stack"></i>', 'Payouts', activePage === 'payouts'],
        ['admin-payments.html', '<i class="bi bi-credit-card"></i>', 'Payments', activePage === 'payments'],
        ['admin-support.html', '<i class="bi bi-chat-left-dots"></i>', 'Support Tickets', activePage === 'support'],
        ['admin-settings.html', '<i class="bi bi-gear"></i>', 'Platform Settings', activePage === 'settings'],
        ['admin-profile.html', '<i class="bi bi-person"></i>', 'My profile', activePage === 'profile']
      ];
    }

    const initials = user ? (user.full_name || 'U').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase() : '--';
    const roleLabel = user ? ({ customer: 'Client account', provider: 'Provider account', admin: 'Admin account' })[user.role] : 'Guest';
    const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'User')}&background=6366f1&color=fff`;
    const avatarSrc = (user && (user.avatar || user.logo_url)) ? (user.avatar || user.logo_url) : fallbackAvatar;
    const isDefaultAvatar = !(user && (user.avatar || user.logo_url));

    sidebarEl.innerHTML = `
      <a class="brand" href="index.html" aria-label="HutFix home">
        <img src="assets/images/logo.jpg" alt="HutFix" style="width: 32px; height: 32px; border-radius: 8px; object-fit: cover;" />
        <span style="font-family: Manrope, sans-serif; font-weight: 800; font-size: 22px; letter-spacing: -0.5px;">HutFix</span>
      </a>
      <div class="nav-caption">${navCaption}</div>
      <nav class="nav-list">
        ${navItems.map(([url, icon, label, isActive]) => `
          <a href="${url}" class="nav-item ${isActive ? 'active' : ''}">
            <span class="nav-symbol">${icon}</span>
            <span>${label}</span>
          </a>
        `).join('')}
      </nav>
      <div class="sidebar-bottom">
        ${(user && role !== 'admin') ? `
          <div class="help-card">
            <div class="help-icon"><i class="bi bi-question-circle"></i></div>
            <strong>Need a hand?</strong>
            <p>Our support team is here to help.</p>
            <button class="text-button" id="supportBtn">Contact support <i class="bi bi-arrow-up-right"></i></button>
          </div>
        ` : ''}
        ${user ? `
          <div class="user-mini" id="userMiniInfo" style="cursor: pointer;" title="View Profile">
            <img src="${avatarSrc}" class="avatar ${isDefaultAvatar ? 'default-avatar' : ''}" id="user-avatar" alt="Avatar" style="width:36px; height:36px; border-radius:50%; object-fit:cover;" />
            <div class="user-mini-info">
              <strong>${escapeHtml(user.full_name || 'User')}</strong>
              <span>${roleLabel}</span>
            </div>
            <button class="logout-mini-btn" id="logoutBtn" title="Sign out" aria-label="Sign out">
              <i class="bi bi-box-arrow-right"></i>
            </button>
          </div>
        ` : `
          <div style="padding:12px;">
            <a href="login.html" class="primary-btn" style="width:100%; justify-content:center;">Sign in</a>
          </div>
        `}
      </div>
    `;

    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      } catch (_) {}
      localStorage.removeItem('hutfix_token');
      localStorage.removeItem('hutfix_user');
      window.location.href = 'login.html';
    });

    document.getElementById('supportBtn')?.addEventListener('click', () => {
      window.openSupportModal();
    });
  }

  // 2. Inject Topbar
  let topbarEl = document.getElementById('topbar') || document.querySelector('header.topbar');
  const mainArea = document.querySelector('.main-area') || document.querySelector('main');
  if (!topbarEl && mainArea) {
    topbarEl = document.createElement('header');
    topbarEl.className = 'topbar';
    topbarEl.id = 'topbar';
    mainArea.prepend(topbarEl);
  }

  if (topbarEl) {
    const locText = sessionStorage.getItem('hutfix_location') || 'Dhaka, Bangladesh';
    const pageTitle = activePage ? activePage.replace(/-/g, ' ') : (document.title.split('—')[1]?.trim() || 'Dashboard');

    topbarEl.innerHTML = `
      <button id="mobileMenuBtn" class="mobile-menu-btn" aria-label="Toggle navigation menu" style="margin-right:8px;">
        <i class="bi bi-list"></i>
      </button>
      <div class="breadcrumb">
        <span>Workspace</span><b>/</b><strong>${escapeHtml(pageTitle)}</strong>
      </div>
      <div class="topbar-actions" style="position:relative;">
        <div class="location-pill" id="location-pill" style="cursor: pointer;">
          <span class="pin"><i class="bi bi-geo-alt"></i></span>
          <span><small>Service location</small><strong id="currentLocationText">${escapeHtml(locText)}</strong></span>
          <span class="chevron"><i class="bi bi-chevron-down"></i></span>
        </div>
        <button class="icon-btn theme-toggle-btn" id="themeToggle" aria-label="Toggle dark/light theme" title="Toggle theme">
          <i class="bi bi-moon-stars" id="themeIcon"></i>
        </button>
        ${user ? `
          <button class="icon-btn notification-btn" id="notificationBtn" aria-label="Notifications" style="position:relative;">
            <i class="bi bi-bell"></i>
            <span class="notification-dot badge" id="notifDot" style="display:none; position:absolute; top:5px; right:5px; width:8px; height:8px; background:#ef4444; border-radius:50%;"></span>
          </button>
          <div id="notificationsDropdown" style="display:none; position:absolute; top:52px; right:45px; width:320px; background:var(--bg-surface); border:1px solid var(--border-color); border-radius:14px; box-shadow:var(--shadow); padding:16px; z-index:100; color:var(--text-main);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
              <strong style="font-size:14px;">Notifications</strong>
              <small id="markAllReadBtn" style="color:var(--primary); cursor:pointer; font-weight:600;">Mark all read</small>
            </div>
            <div id="notificationsList" style="max-height:280px; overflow-y:auto; display:grid; gap:10px;"></div>
          </div>
          <a href="${profileUrl}" id="topAvatarLink" title="View Profile" style="display:inline-flex; align-items:center; text-decoration:none;">
            <img src="${avatarSrc}" alt="Profile" class="top-avatar avatar ${isDefaultAvatar ? 'default-avatar' : ''}" id="topAvatar" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; cursor: pointer;">
          </a>
        ` : `
          <a href="login.html" class="primary-btn" style="padding: 8px 16px; min-height: 36px;">Sign in</a>
        `}
      </div>
    `;

    document.getElementById('themeToggle')?.addEventListener('click', window.toggleTheme);
    updateThemeIcon();

    // Location selector modal wiring
    document.getElementById('location-pill')?.addEventListener('click', () => {
      const areas = ['Dhanmondi', 'Gulshan', 'Banani', 'Mirpur', 'Uttara', 'Mohammadpur', 'Badda', 'Bashundhara'];
      const modalBody = `
        <div style="padding:10px 0;">
          <p style="font-size:13px; color:var(--muted); margin-bottom:16px;">Choose your neighborhood for verified local specialist dispatch:</p>
          <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:10px;">
            ${areas.map(a => `
              <button type="button" class="secondary-btn area-select-btn" data-area="${a}, Dhaka" style="justify-content:flex-start; padding:12px; font-weight:600;">
                <i class="bi bi-geo-alt" style="margin-right:8px; color:var(--blue);"></i> ${a}
              </button>
            `).join('')}
          </div>
        </div>
      `;
      window.openModal('Select Service Area', modalBody, 'LOCATION');
      document.querySelectorAll('.area-select-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const area = btn.dataset.area;
          sessionStorage.setItem('hutfix_location', area);
          const el = document.getElementById('currentLocationText');
          if (el) el.textContent = area;
          window.toast(`Service location updated to ${area}`);
          window.closeModal();
          if (typeof window.onLocationChange === 'function') {
            window.onLocationChange(area);
          }
        });
      });
    });

    // Notifications wiring
    const notifBtn = document.getElementById('notificationBtn');
    const notifDropdown = document.getElementById('notificationsDropdown');
    if (notifBtn && notifDropdown) {
      notifBtn.addEventListener('click', async () => {
        const isOpen = notifDropdown.style.display === 'block';
        notifDropdown.style.display = isOpen ? 'none' : 'block';
        if (!isOpen) {
          try {
            const res = await fetch('/api/notifications', { credentials: 'include' });
            if (res.ok) {
              const data = await res.json();
              const listEl = document.getElementById('notificationsList');
              if (listEl) {
                const notifs = data.notifications || [];
                listEl.innerHTML = notifs.map(n => {
                  const targetUrl = n.link || (user.role === 'customer' ? 'customer-bookings.html' : (user.role === 'provider' ? 'provider-requests.html' : 'admin-bookings.html'));
                  return `
                    <a href="${targetUrl}" style="text-decoration:none; color:inherit; display:block; padding:8px 10px; border-radius:8px; background:${n.is_read ? 'transparent' : 'var(--bg-body)'}; border:1px solid ${n.is_read ? 'transparent' : 'var(--border-color)'}; margin-bottom:6px;">
                      <strong style="font-size:13px; display:block; color:var(--text-main);">${escapeHtml(n.title)}</strong>
                      <p style="font-size:12px; color:var(--muted); margin:3px 0 0;">${escapeHtml(n.body)}</p>
                      <small style="font-size:10px; color:var(--muted);">${new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                    </a>
                  `;
                }).join('') || '<div style="font-size:13px; color:var(--muted); text-align:center; padding:16px;">No notifications.</div>';
              }
            }
          } catch (_) {}
        }
      });

      document.getElementById('markAllReadBtn')?.addEventListener('click', async () => {
        await fetch('/api/notifications/read-all', { method: 'POST', credentials: 'include' });
        window.toast('All notifications marked as read.');
        const dot = document.getElementById('notifDot'); if (dot) dot.style.display = 'none';
        notifDropdown.style.display = 'none';
      });
    }

    // Role-based profile redirects
    document.getElementById('user-avatar')?.addEventListener('click', () => { window.location.href = profileUrl; });
    document.getElementById('userMiniInfo')?.addEventListener('click', (e) => {
      if (!e.target.closest('#logoutBtn')) window.location.href = profileUrl;
    });

    // Check for unread notifications to display badge
    if (user) {
      fetch('/api/notifications', { credentials: 'include' })
        .then(r => r.json())
        .then(d => {
          const dot = document.getElementById('notifDot');
          if (dot && d.unread_count > 0) dot.style.display = 'block';
        }).catch(() => {});
    }

    // Mobile Menu Toggle & Overlay
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'sidebar-overlay';
      document.body.appendChild(overlay);
    }

    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');

    if (mobileMenuBtn && sidebar) {
      mobileMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
      });

      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      });

      sidebar.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          if (window.innerWidth <= 768) {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
          }
        });
      });
    }

    // Auto-wrap data-table in table-responsive-wrap
    document.querySelectorAll('table.data-table').forEach(tbl => {
      if (!tbl.parentElement.classList.contains('table-responsive-wrap')) {
        tbl.parentElement.classList.add('table-responsive-wrap');
      }
    });
  }

  // 3. Inject Rich Footer across all pages that have <footer class="footer">
  const footerEl = document.querySelector('footer.footer');
  if (footerEl && (!footerEl.querySelector('.footer-inner') || footerEl.textContent.includes('© 2026 HutFix Marketplace') && !footerEl.querySelector('.footer-socials'))) {
    footerEl.innerHTML = `
      <div class="footer-inner">
        <div class="footer-brand-col">
          <div class="footer-logo">
            <img src="assets/images/logo.jpg" alt="HutFix" style="width: 28px; height: 28px; border-radius: 6px; object-fit: cover;" />
            <span style="font-family: Manrope, sans-serif; font-weight: 800; font-size: 18px; color: var(--text-main);">HutFix</span>
          </div>
          <p class="footer-tagline">On-demand trusted home repairs & maintenance across Dhaka.</p>
          <div class="footer-socials">
            <a href="#" target="_blank" aria-label="LinkedIn"><i class="bi bi-linkedin"></i></a>
            <a href="#" target="_blank" aria-label="GitHub"><i class="bi bi-github"></i></a>
            <a href="mailto:hello@example.com" aria-label="Email"><i class="bi bi-envelope-fill"></i></a>
            <a href="https://wa.me/8801700000000" target="_blank" aria-label="WhatsApp"><i class="bi bi-whatsapp"></i></a>
          </div>
        </div>
        <div class="footer-nav-col">
          <strong>Company</strong>
          <a href="about.html">About Us</a>
          <a href="about.html#how-it-works">How It Works</a>
          <a href="about.html#careers">Careers</a>
          <a href="about.html#press">Press</a>
        </div>
        <div class="footer-nav-col">
          <strong>Legal & Policies</strong>
          <a href="terms.html#terms">Terms & Conditions</a>
          <a href="terms.html#privacy">Privacy Policy</a>
          <a href="terms.html#refunds">Refund Policy</a>
          <a href="terms.html#trust">Trust & Safety</a>
        </div>
        <div class="footer-nav-col">
          <strong>Platform</strong>
          <a href="index.html">Explore Services</a>
          <a href="login.html">Sign In</a>
          <a href="signup.html">Create Account</a>
          <span style="font-size: 12px; color: var(--text-muted); margin-top: 4px;"><i class="bi bi-headset"></i> 24/7 Support</span>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 HutFix Marketplace. Made for a home that works. Developed by <strong>Sad Ibna Forid</strong></span>
        <span>Dhaka, Bangladesh</span>
      </div>
    `;
  }

  return user;
};

// Global Favorite Toggle
window.toggleFavorite = async function(providerId, ev) {
  if (ev) {
    ev.stopPropagation();
    ev.preventDefault();
  }
  if (!window.currentUser) {
    window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
    return;
  }
  const provId = parseInt(providerId, 10);
  if (isNaN(provId)) return;

  try {
    const res = await fetch('/api/favorites/toggle', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider_id: provId })
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to toggle favorite');

    if (data.favorited) {
      window.favoriteProviderIds.add(provId);
      window.toast('Specialist added to saved services!');
    } else {
      window.favoriteProviderIds.delete(provId);
      window.toast('Specialist removed from saved services.');
    }

    // Update heart icons across the page
    document.querySelectorAll(`[data-fav-provider="${provId}"]`).forEach(btn => {
      const icon = btn.querySelector('i');
      if (data.favorited) {
        btn.classList.add('active');
        if (icon) {
          icon.className = 'bi bi-heart-fill';
          icon.style.color = 'var(--red)';
        }
      } else {
        btn.classList.remove('active');
        if (icon) {
          icon.className = 'bi bi-heart';
          icon.style.color = '';
        }
      }
    });

    if (typeof window.onFavoriteChange === 'function') {
      window.onFavoriteChange(provId, data.favorited);
    }
  } catch (err) {
    window.toast('Favorite error: ' + err.message);
  }
};

// Support Modal for Customer & Provider
window.openSupportModal = async function() {
  let tickets = [];
  try {
    const res = await fetch('/api/support/mine', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      tickets = data.tickets || [];
    }
  } catch (_) {}

  const bodyHtml = `
    <div style="padding:4px 0;">
      <p style="font-size:13px; color:var(--muted); margin-bottom:16px;">
        Have a question or operational inquiry? Submit a ticket below and our support team will respond promptly.
      </p>
      <form id="globalSupportForm" style="margin-bottom:24px;">
        <div class="form-grid">
          <div class="form-field full">
            <label>Subject</label>
            <input name="subject" placeholder="e.g., Query regarding service timing" required />
          </div>
          <div class="form-field full">
            <label>Message</label>
            <textarea name="message" rows="3" placeholder="Describe your issue or question in detail..." required></textarea>
          </div>
        </div>
        <div style="display:flex; justify-content:flex-end; margin-top:10px;">
          <button class="primary-btn" type="submit" id="submitTicketBtn"><i class="bi bi-send"></i> Submit Ticket</button>
        </div>
      </form>

      <h4 style="font-size:14px; font-weight:700; margin-bottom:10px; border-top:1px solid var(--border-color); padding-top:16px;">Your Support Tickets</h4>
      <div style="max-height:260px; overflow-y:auto; overflow-x:hidden;">
        ${tickets.length > 0 ? `
          <div style="display:flex; flex-direction:column; gap:10px;">
            ${tickets.map(t => `
              <div class="ticket-item" style="display:flex; flex-direction:column; gap:8px; padding:12px; border:1px solid var(--border-color); border-radius:10px; background:var(--bg-sunken);">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; width:100%; gap:8px;">
                  <strong style="word-break:break-word; max-width:70%; font-size:13px; color:var(--text-main);">${escapeHtml(t.subject)}</strong>
                  <span class="status ${t.status === 'resolved' ? 'completed' : 'progress'}" style="font-size:10px; padding:2px 8px;">${t.status.toUpperCase()}</span>
                </div>
                <div style="font-size:12px; color:var(--text-muted); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; line-height:1.4;">
                  ${escapeHtml(t.message)}
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; width:100%; margin-top:4px;">
                  <span style="font-size:11px; color:var(--text-muted);">${new Date(t.created_at).toLocaleDateString()}</span>
                  <button class="secondary-btn" onclick="window.openChat(${t.id})" style="padding:4px 12px; font-size:12px; min-height:30px;">
                    <i class="bi bi-chat-dots"></i> Chat
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        ` : '<div style="font-size:13px; color:var(--muted); text-align:center; padding:16px;">No support tickets submitted yet.</div>'}
      </div>
    </div>
  `;

  window.openModal('HutFix Support', bodyHtml, 'HELP & ASSISTANCE');

  document.getElementById('globalSupportForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('submitTicketBtn');
    if (btn) btn.disabled = true;

    const fd = new FormData(e.target);
    const subject = fd.get('subject');
    const message = fd.get('message');

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to submit ticket');
      window.toast('Support ticket submitted successfully!');
      if (data.ticket?.id) {
        window.openTicketChat(data.ticket.id);
      } else {
        window.openSupportModal();
      }
    } catch (err) {
      window.toast('Error: ' + err.message);
      if (btn) btn.disabled = false;
    }
  });
};

// Threaded Ticket Chat Modal (Customer & Provider)
window.openTicketChat = async function(ticketId) {
  try {
    const res = await fetch(`/api/support/${ticketId}/messages`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to load ticket thread');
    const data = await res.json();
    const ticket = data.ticket;
    const messages = data.messages || [];

    const renderChatMessages = (msgs) => {
      if (msgs.length === 0) {
        return '<div style="text-align:center; color:var(--text-muted); font-size:13px; padding:20px;">No messages in this ticket thread yet.</div>';
      }
      return msgs.map(m => {
        const isMine = Number(m.sender_id) === Number(window.currentUser?.id);
        const timeStr = m.created_at ? new Date(m.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
        const roleLabel = m.sender_role === 'admin' ? 'HutFix Support (Admin)' : (isMine ? 'You' : window.escapeHtml(m.sender_name || 'User'));

        return `
          <div class="chat-msg ${isMine ? 'mine' : 'theirs'}">
            <div class="chat-msg-meta">
              <strong>${roleLabel}</strong>
              <span class="chat-msg-time">${timeStr}</span>
            </div>
            <div>${window.escapeHtml(m.message)}</div>
          </div>
        `;
      }).join('');
    };

    const chatHtml = `
      <div class="chat-container">
        <div class="chat-header">
          <div style="display:flex; align-items:center; gap:10px;">
            <button class="btn btn-sm btn-ghost" onclick="window.openSupportModal()" title="Back to all tickets">
              <i class="bi bi-arrow-left"></i> All Tickets
            </button>
            <div>
              <strong style="color:var(--text-main); font-size:14px;">${window.escapeHtml(ticket.subject)}</strong>
              <div style="font-size:11px; color:var(--text-muted);">Ticket #${ticket.id} · ${new Date(ticket.created_at).toLocaleDateString()}</div>
            </div>
          </div>
          <span class="status ${ticket.status === 'resolved' ? 'completed' : 'progress'}">${ticket.status.toUpperCase()}</span>
        </div>

        <div class="chat-messages" id="chatMessagesBox">
          ${renderChatMessages(messages)}
        </div>

        <form id="ticketReplyForm" class="chat-input-bar">
          <input type="text" name="message" id="chatReplyInput" placeholder="Type your reply to support..." autocomplete="off" required />
          <button type="submit" class="primary-btn" id="sendReplyBtn" style="padding:10px 18px; min-height:42px;">
            <i class="bi bi-send-fill"></i> Send
          </button>
        </form>
      </div>
    `;

    window.openModal(`Ticket #${ticket.id}: Support Thread`, chatHtml, 'HELP DESK CHAT');

    const box = document.getElementById('chatMessagesBox');
    if (box) box.scrollTop = box.scrollHeight;

    document.getElementById('ticketReplyForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('chatReplyInput');
      const sendBtn = document.getElementById('sendReplyBtn');
      const text = input ? input.value.trim() : '';
      if (!text) return;

      if (sendBtn) sendBtn.disabled = true;

      try {
        const postRes = await fetch(`/api/support/${ticketId}/messages`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text })
        });
        const postData = await postRes.json();
        if (!postRes.ok || !postData.ok) throw new Error(postData.error || 'Failed to send reply');

        if (input) input.value = '';
        window.openTicketChat(ticketId);
      } catch (err) {
        window.toast('Error sending message: ' + err.message);
        if (sendBtn) sendBtn.disabled = false;
      }
    });

  } catch (err) {
    console.error('openTicketChat error:', err);
    window.toast('Could not open ticket thread: ' + err.message);
  }
};
window.openChat = window.openTicketChat;

// Global Direct Booking Modal (callable from Discover, Gig Details, Favorites)
window.openBooking = async function(providerId = null, categorySlug = null, gigInfo = null) {
  let platformSettings = { bkash_number: '01700000000', nagad_number: '01700000000' };
  try {
    const sRes = await fetch('/api/settings');
    if (sRes.ok) {
      const sData = await sRes.json();
      if (sData.settings) platformSettings = { ...platformSettings, ...sData.settings };
    }
  } catch (_) {}
  if (!window.currentUser) {
    window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
    return;
  }
  const provId = providerId ? parseInt(providerId, 10) : 1;
  const catSlug = categorySlug || 'appliance-repair';

  // Load customer addresses
  let addresses = [];
  try {
    const aRes = await fetch('/api/addresses', { credentials: 'include' });
    if (aRes.ok) {
      const aData = await aRes.json();
      addresses = aData.addresses || [];
    }
  } catch (_) {}

  const defaultAddr = addresses.find(a => a.is_default)?.address_line || (sessionStorage.getItem('hutfix_location') || 'Dhanmondi, Dhaka');
  const todayStr = new Date().toISOString().split('T')[0];

  // Fetch initial available slots for chosen provider & date
  async function loadSlots(dateStr) {
    try {
      const sRes = await fetch(`/api/providers/${provId}/slots?date=${dateStr}&category_slug=${catSlug}`);
      if (sRes.ok) {
        const sData = await sRes.json();
        return (sData.slots || []).filter(s => s.available);
      }
    } catch (_) {}
    return [];
  }

  const initialSlots = await loadSlots(todayStr);

  const gigTitle = gigInfo?.title || 'Selected Service Appointment';
  const gigDuration = gigInfo?.duration || 60;
  const gigPrice = gigInfo?.price;

  const modalBody = `
    <div class="gig-summary-box" style="background:var(--bg-body); border:1px solid var(--border-color); border-radius:10px; padding:12px 14px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <strong style="font-size:14px; color:var(--text-main); display:block;">${escapeHtml(gigTitle)}</strong>
        <span style="font-size:12px; color:var(--text-muted);"><i class="bi bi-clock"></i> Est. ${gigDuration} mins · Guaranteed Pro dispatch</span>
      </div>
      ${gigPrice ? (`<div style="font-size:16px; font-weight:700; color:var(--primary);">${window.money(gigPrice)}</div>`) : ""}
    </div>
    <form id="globalBookingForm">
      <div class="form-grid">
        <div class="form-field full">
          <label>Service Date</label>
          <input type="date" name="preferred_date" id="bookDateInput" min="${todayStr}" value="${todayStr}" required />
        </div>
        <div class="form-field full">
          <label>Time Slot</label>
          <select name="slot_start" id="bookSlotSelect" style="padding:10px; font-size:14px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-surface); color:var(--text-main);" required>
            ${initialSlots.length > 0 ? initialSlots.map(s => `
              <option value="${s.start_minute}">${minutesToTime(s.start_minute)} - ${minutesToTime(s.end_minute)}</option>
            `).join('') : '<option value="600">10:00 AM - 11:00 AM (Standard Slot)</option>'}
          </select>
        </div>
        <div class="form-field full">
          <label>Service Address</label>
          <input name="address" value="${escapeHtml(defaultAddr)}" placeholder="House, Road, Area, Dhaka" required />
        </div>
        <div class="form-field full">
          <label>Job Description / Notes</label>
          <textarea name="description" placeholder="Briefly describe what needs inspection or repair..." rows="2"></textarea>
        </div>
        <div class="form-field full">
          <label>Payment Method</label>
          <select name="payment_method" id="bookPaymentMethod" style="padding:10px; font-size:14px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-surface); color:var(--text-main);">
            <option value="bkash">bKash (Send Money / Merchant Pay)</option>
            <option value="nagad">Nagad (Direct Settlement)</option>
            <option value="cash">Cash On Service Completion</option>
          </select>
        </div>
        <div class="form-field full" id="manualPaymentFields">
          <div style="background:var(--bg-body); padding:12px; border-radius:8px; border:1px solid var(--border-color); margin-bottom:10px; font-size:12px; color:var(--muted);">
            Merchant <span id="manualWalletType">bKash</span> Wallet: <strong style="color:var(--text-main);" id="manualWalletNumber">${escapeHtml(platformSettings.bkash_number || '01700000000')}</strong><br>
            Please send fee and enter transaction proof below:
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            <div>
              <label style="font-size:12px;">TrxID</label>
              <input name="trx_id" placeholder="e.g., TRX984728" />
            </div>
            <div>
              <label style="font-size:12px;">Sender Phone Number</label>
              <input name="sender_number" placeholder="e.g., 01712345678" />
            </div>
          </div>
        </div>
      </div>
      <div class="modal-actions" style="margin-top:20px;">
        <button type="button" class="secondary-btn" onclick="window.closeModal()">Cancel</button>
        <button type="submit" class="primary-btn" id="confirmBookingBtn"><i class="bi bi-calendar-check"></i> Confirm Booking</button>
      </div>
    </form>
  `;

  window.openModal('Book Service Appointment', modalBody, 'DIRECT BOOKING');

  // Update slots when date changes
  document.getElementById('bookDateInput')?.addEventListener('change', async (e) => {
    const slots = await loadSlots(e.target.value);
    const sel = document.getElementById('bookSlotSelect');
    if (sel) {
      if (slots.length > 0) {
        sel.innerHTML = slots.map(s => `
          <option value="${s.start_minute}">${minutesToTime(s.start_minute)} - ${minutesToTime(s.end_minute)}</option>
        `).join('');
      } else {
        sel.innerHTML = '<option value="600">10:00 AM - 11:00 AM (Standard Slot)</option>';
      }
    }
  });

  // Toggle manual payment fields on cash selection
  document.getElementById('bookPaymentMethod')?.addEventListener('change', (e) => {
    const pFields = document.getElementById('manualPaymentFields');
    const val = e.target.value;
    if (pFields) pFields.style.display = val === 'cash' ? 'none' : 'block';
    const typeEl = document.getElementById('manualWalletType');
    const numEl = document.getElementById('manualWalletNumber');
    if (typeEl && numEl) {
      if (val === 'nagad') {
        typeEl.textContent = 'Nagad';
        numEl.textContent = platformSettings.nagad_number || '01700000000';
      } else {
        typeEl.textContent = 'bKash';
        numEl.textContent = platformSettings.bkash_number || '01700000000';
      }
    }
  });

  document.getElementById('globalBookingForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('confirmBookingBtn');
    if (btn) btn.disabled = true;

    const fd = new FormData(e.target);
    const startMin = parseInt(fd.get('slot_start'), 10) || 600;
    const endMin = startMin + 60;
    const paymentMethod = fd.get('payment_method') || 'bkash';

    const payload = {
      category_slug: catSlug,
      provider_id: provId,
      preferred_date: fd.get('preferred_date'),
      preferred_start_minute: startMin,
      preferred_end_minute: endMin,
      address: fd.get('address'),
      description: fd.get('description'),
      payment_method: paymentMethod,
      trx_id: paymentMethod !== 'cash' ? (fd.get('trx_id') || `TRX${Date.now().toString().slice(-6)}`) : null,
      sender_number: paymentMethod !== 'cash' ? (fd.get('sender_number') || '01700000000') : null
    };

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to create booking');

      window.closeModal();
      window.toast('Appointment confirmed! Dispatch created.');
      setTimeout(() => {
        window.location.href = `customer-track.html?id=${data.request.id}`;
      }, 700);
    } catch (err) {
      window.toast('Booking error: ' + err.message);
      if (btn) btn.disabled = false;
    }
  });
};
