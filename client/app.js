/**
 * HutFix — Single Page Application Frontend
 * Connected to Real Express & PostgreSQL Backend
 */

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const state = {
  user: null,
  role: 'guest', // 'guest' | 'client' | 'repairman' | 'admin'
  page: 'discover',
  userLocation: 'Dhaka, Bangladesh',
  query: '',
  category: 'All services',
  bookingFilter: 'All',
  adminFilter: 'All',
  userFilter: 'All users',
  userSearch: '',
  bookingSearch: '',
  allBookingFilter: 'All statuses',
  services: [],
  bookings: [],
  incoming: [],
  active: [],
  history: [],
  providerProfile: null,
  providerInvoices: { invoices: [], totals: { count: 0, sum_total: 0 } },
  adminStats: {},
  adminUsers: [],
  adminBookings: [],
  adminPayments: [],
  adminPayouts: [],
  disputes: [],
  notifications: [],
  activeRequestId: null,
  viewingGigId: 2,
  addresses: [],
  filterRating: '',
  filterPrice: '',
  filterSort: ''
};

// UI Helpers
function toast(message) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 3000);
}

function money(n) {
  return '৳' + Number(n || 0).toLocaleString('en-BD');
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function minutesToTime(mins) {
  const m = Number(mins);
  if (isNaN(m)) return '--';
  const hours = Math.floor(m / 60);
  const minutes = m % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  const mStr = minutes < 10 ? '0' + minutes : minutes;
  return `${h12}:${mStr} ${ampm}`;
}

function statusClass(s) {
  return ({
    'Completed': 'completed',
    'completed': 'completed',
    'In progress': 'progress',
    'in_progress': 'progress',
    'on_the_way': 'progress',
    'Pending': 'pending',
    'requested': 'pending',
    'accepted': 'progress',
    'Confirmed': 'pending',
    'Cancelled': 'cancelled',
    'cancelled': 'cancelled',
    'Verified': 'completed',
    'Active': 'completed',
    'Published': 'completed',
    'Draft': 'review',
    'Pending review': 'pending'
  })[s] || 'pending';
}

function normalizeStatus(raw) {
  switch (raw) {
    case 'requested': return 'Pending';
    case 'accepted':
    case 'on_the_way':
    case 'in_progress': return 'In progress';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    default: return raw || 'Pending';
  }
}

// Navigation Definitions
const guestNav = [
  ['discover', '<i class="bi bi-search"></i>', 'Discover services']
];

const clientNav = [
  ['discover', '<i class="bi bi-search"></i>', 'Discover services'],
  ['bookings', '<i class="bi bi-calendar-check"></i>', 'My bookings'],
  ['tracking', '<i class="bi bi-geo-alt"></i>', 'Track a service'],
  ['favorites', '<i class="bi bi-heart"></i>', 'Saved services'],
  ['profile', '<i class="bi bi-person"></i>', 'My profile']
];

const repairNav = [
  ['overview', '<i class="bi bi-speedometer2"></i>', 'Overview'],
  ['my-gigs', '<i class="bi bi-briefcase"></i>', 'My service gigs'],
  ['requests', '<i class="bi bi-calendar-check"></i>', 'Booking requests'],
  ['availability', '<i class="bi bi-clock-history"></i>', 'Availability & slots'],
  ['earnings', '<i class="bi bi-cash-coin"></i>', 'Earnings & payouts'],
  ['repair-profile', '<i class="bi bi-person"></i>', 'My profile']
];

const adminNav = [
  ['admin-overview', '<i class="bi bi-speedometer2"></i>', 'Overview'],
  ['payments', '<i class="bi bi-credit-card"></i>', 'Payments'],
  ['payouts', '<i class="bi bi-cash-stack"></i>', 'Payouts'],
  ['users', '<i class="bi bi-people"></i>', 'Users & repairmen'],
  ['moderation', '<i class="bi bi-shield-check"></i>', 'Disputes & moderation'],
  ['all-bookings', '<i class="bi bi-calendar-check"></i>', 'All bookings'],
  ['reports', '<i class="bi bi-graph-up"></i>', 'Reports & analytics']
];

function navItems() {
  if (state.role === 'guest') return guestNav;
  return state.role === 'client' ? clientNav : state.role === 'repairman' ? repairNav : adminNav;
}

function roleName() {
  return state.role === 'client' ? 'Client' : state.role === 'repairman' ? 'Repairman' : state.role === 'admin' ? 'Admin' : 'Guest';
}

function renderNav() {
  const nav = navItems();
  const navList = $('#navList');
  if (!navList) return;

  // Counts for badges
  const counts = {
    bookings: state.bookings.filter(b => b.status === 'In progress').length || '',
    requests: state.incoming.length || '',
    users: (state.adminUsers && state.adminUsers.filter(u => u.role === 'provider').length) || ''
  };

  navList.innerHTML = nav.map(([id, ic, label]) => `
    <button class="nav-item ${state.page === id ? 'active' : ''}" data-page="${id}">
      <span class="nav-symbol">${ic}</span>
      <span>${label}</span>
      ${counts[id] ? `<span class="nav-count">${counts[id]}</span>` : ''}
    </button>
  `).join('');

  $('#navCaption').textContent = (state.role === 'client' || state.role === 'guest') ? 'DISCOVER' : state.role === 'repairman' ? 'YOUR BUSINESS' : 'MANAGE PLATFORM';

  const userMini = $('.user-mini');
  if (userMini) userMini.style.display = state.user ? 'flex' : 'none';
  const helpCard = $('.help-card');
  if (helpCard) helpCard.style.display = state.user ? 'block' : 'none';
  const topAv = $('#topAvatar');
  if (topAv) topAv.style.display = state.user ? 'grid' : 'none';
  const loginBtn = $('#login-btn');
  if (loginBtn) loginBtn.style.display = state.user ? 'none' : 'inline-flex';
  if (state.user) {
    $('#miniName').textContent = state.user.full_name || 'User';
    $('#miniRole').textContent = ({ customer: 'Client account', provider: 'Provider account', admin: 'Admin account' })[state.user.role] || 'Account';
    const initials = (state.user.full_name || '?').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();
    $('#user-avatar').textContent = initials;
    const topAv = $('#topAvatar');
    if (topAv) topAv.textContent = initials;
  }
  const curr = nav.find(n => n[0] === state.page);
  $('#pageCrumb').textContent = curr ? curr[2] : state.page.replaceAll('-', ' ');
}

function pageHead(eyebrow, title, desc, action = '') {
  return `<div class="page-head"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${desc}</p></div>${action}</div>`;
}

function stat(label, value, icon, foot) {
  return `<div class="stat-card"><div class="stat-head">${label}<span class="stat-icon">${icon}</span></div><div class="stat-value">${value}</div><div class="stat-foot">${foot}</div></div>`;
}

// Modal handling
function openModal(title, body, eyebrow = 'HUTFIX BOOKING') {
  $('#modalEyebrow').textContent = eyebrow;
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = body;
  $('#modalBackdrop').classList.add('open');
}

function closeModal() {
  $('#modalBackdrop').classList.remove('open');
}

// -------------------------------------------------------------
// Data Loaders
// -------------------------------------------------------------
async function loadServices() {
  try {
    const res = await fetch('/api/services', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    if (data.ok && Array.isArray(data.services)) {
      const covers = ['cover-wash', 'cover-cool', 'cover-warm', 'cover-lavender', 'cover-rose', 'cover-sky'];
      const icons = {
        'appliance-repair': '<i class="bi bi-tools"></i>',
        'plumbing': '<i class="bi bi-droplet"></i>',
        'electrical': '<i class="bi bi-lightning-charge"></i>',
        'cleaning-pest': '<i class="bi bi-brush"></i>',
        'home-maintenance': '<i class="bi bi-house-gear"></i>',
        'moving-shifting': '<i class="bi bi-truck"></i>',
        'car-care': '<i class="bi bi-car-front"></i>',
        'personal-care': '<i class="bi bi-person-heart"></i>'
      };
      state.services = data.services.map((s, idx) => ({
        id: s.slug,
        slug: s.slug,
        providerId: idx + 2,
        title: s.name,
        desc: s.description || 'Professional home service with verified background check and upfront pricing.',
        price: Number(s.base_price) || 800,
        icon: icons[s.slug] || '<i class="bi bi-tools"></i>',
        cover: covers[idx % covers.length],
        category: s.name.split(' ')[0] || 'General',
        rating: '4.9',
        reviews: 120 + idx * 8,
        provider: 'Verified Specialist',
        initials: s.name.slice(0, 2).toUpperCase(),
        avatar: 'avatar-blue',
        subtitle: 'HutFix Certified Pro',
        verified: true,
        tag: idx === 0 ? 'POPULAR' : idx === 1 ? 'TOP RATED' : 'CERTIFIED'
      }));
    }
    try {
      await fetch(`/api/providers/search?category_slug=all&location=${state.userLocation}`);
    } catch (_) {}
  } catch (err) {
    console.error('loadServices error:', err);
  }
}

async function loadAddresses() {
  if (!state.user || state.role === 'guest') return [];
  try {
    const res = await fetch('/api/addresses', { credentials: 'include' });
    if (!res.ok) return [];
    const data = await res.json();
    if (data.ok && Array.isArray(data.addresses)) {
      state.addresses = data.addresses;
      return state.addresses;
    }
  } catch (err) {
    console.error('loadAddresses error:', err);
  }
  return [];
}

async function loadMyBookings() {
  if (!state.user) return;
  try {
    const res = await fetch('/api/requests/mine', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    if (data.ok && Array.isArray(data.requests)) {
      state.bookings = data.requests.map(r => {
        const timeStr = r.preferred_start_minute ? minutesToTime(r.preferred_start_minute) : '10:00 AM';
        return {
          id: r.id,
          rawId: r.id,
          displayId: 'FX-' + (1000 + Number(r.id)),
          service: r.category_name || 'Home Service',
          icon: '<i class="bi bi-tools"></i>',
          provider: r.provider_name || 'Assigned Specialist',
          date: `${r.preferred_date || 'Upcoming'} · ${timeStr}`,
          price: Number(r.estimated_price || 800),
          status: normalizeStatus(r.status),
          rawStatus: r.status,
          address: r.address || 'Dhaka, Bangladesh',
          cover: 'cover-wash'
        };
      });
      if (state.bookings.length > 0 && !state.activeRequestId) {
        state.activeRequestId = state.bookings[0].rawId;
      }
    }
  } catch (err) {
    console.error('loadMyBookings error:', err);
  }
}

async function loadNotifications() {
  try {
    const res = await fetch('/api/notifications', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();
    if (data.ok && Array.isArray(data.notifications)) {
      state.notifications = data.notifications;
      const unreadCount = state.notifications.filter(n => !n.is_read).length;
      const badge = $('#notificationBtn i');
      if (badge) {
        badge.style.display = unreadCount > 0 ? 'block' : 'none';
      }
    }
  } catch (err) {
    console.error('loadNotifications error:', err);
  }
}

async function loadProviderData() {
  try {
    const [incRes, actRes, histRes, profRes, invRes] = await Promise.all([
      fetch('/api/provider/requests?bucket=incoming', { credentials: 'include' }),
      fetch('/api/provider/requests?bucket=active', { credentials: 'include' }),
      fetch('/api/provider/requests?bucket=history', { credentials: 'include' }),
      fetch(`/api/providers/${state.user.id}/profile`, { credentials: 'include' }),
      fetch('/api/invoices/mine', { credentials: 'include' })
    ]);

    if (incRes.ok) {
      const d = await incRes.json();
      state.incoming = d.requests || [];
    }
    if (actRes.ok) {
      const d = await actRes.json();
      state.active = d.requests || [];
    }
    if (histRes.ok) {
      const d = await histRes.json();
      state.history = d.requests || [];
    }
    if (profRes.ok) {
      const d = await profRes.json();
      state.providerProfile = d.provider || null;
    }
    if (invRes.ok) {
      const d = await invRes.json();
      state.providerInvoices = d || { invoices: [], totals: { count: 0, sum_total: 0 } };
    }
  } catch (err) {
    console.error('loadProviderData error:', err);
  }
}

async function loadAdminData() {
  try {
    const [statsRes, usersRes, bookingsRes, paymentsRes, payoutsRes, disputesRes] = await Promise.all([
      fetch('/api/admin/stats', { credentials: 'include' }).catch(() => null),
      fetch('/api/admin/users', { credentials: 'include' }).catch(() => null),
      fetch('/api/admin/bookings', { credentials: 'include' }).catch(() => null),
      fetch('/api/admin/payments', { credentials: 'include' }).catch(() => null),
      fetch('/api/admin/payouts', { credentials: 'include' }).catch(() => null),
      fetch('/api/admin/disputes', { credentials: 'include' }).catch(() => null)
    ]);

    if (statsRes && statsRes.ok) {
      const d = await statsRes.json();
      state.adminStats = d.stats || {};
    }
    if (usersRes && usersRes.ok) {
      const d = await usersRes.json();
      state.adminUsers = d.users || [];
    }
    if (bookingsRes && bookingsRes.ok) {
      const d = await bookingsRes.json();
      state.adminBookings = d.bookings || [];
    }
    if (paymentsRes && paymentsRes.ok) {
      const d = await paymentsRes.json();
      state.adminPayments = d.payments || [];
    }
    if (payoutsRes && payoutsRes.ok) {
      const d = await payoutsRes.json();
      state.adminPayouts = d.payouts || [];
    }
    if (disputesRes && disputesRes.ok) {
      const d = await disputesRes.json();
      state.disputes = d.disputes || [];
    }
  } catch (err) {
    console.error('loadAdminData error:', err);
  }
}

// -------------------------------------------------------------
// Customer / Client Renderers
// -------------------------------------------------------------
function serviceCard(s) {
  const imageUrl = window.IMAGES?.category ? window.IMAGES.category(s.slug) : '';
  const coverHtml = imageUrl
    ? `<div class="service-cover ${s.cover}" style="background-image:url('${imageUrl}'); background-size:cover; background-position:center;"><span class="cover-badge">${s.tag || 'SERVICE'}</span></div>`
    : `<div class="service-cover ${s.cover}"><span class="cover-badge">${s.tag || 'SERVICE'}</span><span class="cover-emoji" style="font-size:2.5rem; color:var(--blue);">${s.icon}</span></div>`;

  return `
    <article class="service-card" data-provider-id="${s.providerId || s.id || 2}" style="cursor: pointer;">
      ${coverHtml}
      <div class="service-body">
        <div class="service-topline">
          <h3>${s.title}</h3>
          <div class="rating">★ ${s.rating} <span>(${s.reviews})</span></div>
        </div>
        <div class="provider-line">
          <div class="avatar ${s.avatar}">${s.initials}</div>
          <div>
            <div class="provider-name">${s.provider} ${s.verified ? '<span class="verified">✓</span>' : ''}</div>
            <div class="provider-sub">${s.subtitle}</div>
          </div>
        </div>
        <p class="service-desc">${s.desc}</p>
        <div class="service-foot">
          <div class="price"><strong>${money(s.price)}</strong> <small>/ base</small></div>
          <button class="mini-link" data-book="${s.slug}">Book now ↗</button>
        </div>
      </div>
    </article>
  `;
}

async function filterServicesGrid() {
  const grid = $('#services-grid');
  if (!grid) return;
  grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1">Filtering specialists...</div>';

  const params = new URLSearchParams();
  if (state.filterRating) params.append('min_rating', state.filterRating);
  if (state.filterPrice) params.append('max_price', state.filterPrice);
  if (state.filterSort) params.append('sort', state.filterSort);
  if (state.category && state.category !== 'All services') {
    const matchedCat = state.services.find(s => s.title.includes(state.category) || s.category === state.category);
    if (matchedCat) params.append('category_slug', matchedCat.slug);
  }
  if (state.query) params.append('search', state.query);

  try {
    const res = await fetch(`/api/providers/search?${params.toString()}&location=${state.userLocation}`);
    const data = await res.json();
    if (data.ok && Array.isArray(data.providers)) {
      if (data.providers.length === 0) {
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1">No specialists match your criteria. Try adjusting your filters.</div>';
        return;
      }

      grid.innerHTML = data.providers.map(p => {
        const item = {
          id: p.category_slug,
          slug: p.category_slug,
          providerId: p.id,
          title: p.category || p.headline,
          desc: p.headline || `Expert services by ${p.name}.`,
          price: Number(p.price_per_hour) || 900,
          rating: p.rating || '4.8',
          reviews: p.rating_count || 120,
          provider: p.name,
          initials: (p.name || 'SP').slice(0, 2).toUpperCase(),
          avatar: 'avatar-blue',
          subtitle: `${p.years_experience || 5}+ yrs exp · ${p.address || 'Dhaka'}`,
          verified: true,
          cover: 'cover-wash',
          tag: Number(p.rating) >= 4.8 ? 'TOP RATED' : 'VERIFIED'
        };
        return serviceCard(item);
      }).join('');
    }
  } catch (err) {
    console.error('filterServicesGrid error:', err);
  }
}

function renderDiscover() {
  const list = state.services.filter(s =>
    (state.category === 'All services' || s.title.includes(state.category) || s.category === state.category) &&
    (`${s.title} ${s.desc} ${s.slug}`).toLowerCase().includes(state.query.toLowerCase())
  );

  const categories = [
    ['All services', '<i class="bi bi-grid"></i>', 'bg-blue', 'All'],
    ['Appliance', '<i class="bi bi-tools"></i>', 'bg-blue', 'Appliance & Gadget'],
    ['Plumbing', '<i class="bi bi-droplet"></i>', 'bg-green', 'Water & Pipes'],
    ['Electrical', '<i class="bi bi-lightning-charge"></i>', 'bg-orange', 'Wiring & Power'],
    ['Cleaning', '<i class="bi bi-brush"></i>', 'bg-purple', 'Cleaning & Pest'],
    ['Maintenance', '<i class="bi bi-house-gear"></i>', 'bg-yellow', 'Home Maintenance']
  ];

  return `
    <section class="hero">
      <div class="hero-copy">
        <div class="eyebrow">YOUR HOME, IN GOOD HANDS</div>
        <h1>Expert care for every corner of your home.</h1>
        <p>Find trusted local professionals for appliance repairs, maintenance and everyday home fixes.</p>
        <div class="searchbar">
          <span class="search-symbol">⌕</span>
          <input id="serviceSearch" value="${escapeHtml(state.query)}" placeholder="Try “AC servicing” or “electrical”..." />
          <button class="primary-btn" id="searchBtn">Search</button>
        </div>
      </div>
      <div class="hero-art">
        <div class="art-card main">
          <div class="art-icon"><i class="bi bi-tools" style="color:var(--blue); font-size:24px;"></i></div>
          <strong>Trusted professionals</strong>
          <small>Vetted experts, at your door.</small>
          <div class="rating">★★★★★ <span style="color:#9aa2b0">4.9 average</span></div>
        </div>
        <div class="art-card float">
          <div class="float-line">
            <div class="tiny-avatar"><i class="bi bi-check-lg"></i></div>
            <div><strong>Instant dispatch</strong><small>Advisory lock verified</small></div>
          </div>
        </div>
      </div>
    </section>

    <div class="section-head">
      <div><h2>Browse by category</h2><p>What can we help you fix today?</p></div>
      <button class="link-btn" data-category="All services">View all categories ↗</button>
    </div>
    <div class="category-grid">
      ${categories.map(([cat, ic, bg, sub]) => `
        <button class="category-card ${state.category === cat ? 'selected' : ''}" data-category="${cat}">
          <span class="category-icon ${bg}">${ic}</span>
          <strong>${cat}</strong>
          <small>${sub}</small>
        </button>
      `).join('')}
    </div>

    <div class="section-head">
      <div>
        <h2>${state.query ? 'Search results' : state.category === 'All services' ? 'Available services' : state.category + ' services'}</h2>
        <p>${list.length} verified services ready in ${escapeHtml(state.userLocation || 'Dhaka')}</p>
      </div>
      <button class="link-btn" data-page="bookings">My bookings ↗</button>
    </div>

    <!-- Filter dropdowns above #services-grid -->
    <div class="filter-controls-bar" style="display:flex; gap:16px; flex-wrap:wrap; align-items:center; margin: 16px 0 20px; padding: 12px 16px; background:#fff; border:1px solid var(--line); border-radius:12px;">
      <div style="display:flex; align-items:center; gap:8px;">
        <label for="filterRating" style="font-size:13px; font-weight:700; color:var(--muted);"><i class="bi bi-star-fill" style="color:var(--amber);"></i> Rating:</label>
        <select id="filterRating" style="padding:6px 12px; border-radius:8px; border:1px solid #d1d5db; font-size:13px; background:#fff; cursor:pointer;">
          <option value="">All</option>
          <option value="4.0" ${state.filterRating === '4.0' ? 'selected' : ''}>4.0+</option>
          <option value="4.5" ${state.filterRating === '4.5' ? 'selected' : ''}>4.5+</option>
          <option value="4.8" ${state.filterRating === '4.8' ? 'selected' : ''}>4.8+</option>
        </select>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <label for="filterPrice" style="font-size:13px; font-weight:700; color:var(--muted);"><i class="bi bi-tag-fill" style="color:var(--blue);"></i> Price:</label>
        <select id="filterPrice" style="padding:6px 12px; border-radius:8px; border:1px solid #d1d5db; font-size:13px; background:#fff; cursor:pointer;">
          <option value="">All</option>
          <option value="500" ${state.filterPrice === '500' ? 'selected' : ''}>&lt; 500</option>
          <option value="1000" ${state.filterPrice === '1000' ? 'selected' : ''}>&lt; 1000</option>
          <option value="1500" ${state.filterPrice === '1500' ? 'selected' : ''}>&lt; 1500</option>
        </select>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <label for="filterSort" style="font-size:13px; font-weight:700; color:var(--muted);"><i class="bi bi-arrow-down-up" style="color:var(--green);"></i> Sort:</label>
        <select id="filterSort" style="padding:6px 12px; border-radius:8px; border:1px solid #d1d5db; font-size:13px; background:#fff; cursor:pointer;">
          <option value="" ${!state.filterSort ? 'selected' : ''}>Recommended</option>
          <option value="rating_desc" ${state.filterSort === 'rating_desc' ? 'selected' : ''}>Rating</option>
          <option value="price_asc" ${state.filterSort === 'price_asc' ? 'selected' : ''}>Price: Low-High</option>
          <option value="price_desc" ${state.filterSort === 'price_desc' ? 'selected' : ''}>Price: High-Low</option>
        </select>
      </div>
    </div>

    ${state.query ? `<div class="search-results-label">Showing results for “${escapeHtml(state.query)}”</div>` : ''}
    <div class="service-grid" id="services-grid">
      ${list.map(serviceCard).join('') || '<div class="empty-state" style="grid-column:1/-1">No services match your search.</div>'}
    </div>

    <div class="trust-strip">
      <div class="trust-item"><span class="trust-icon">✓</span><div><strong>Verified professionals</strong><small>Identity and background checked</small></div></div>
      <div class="trust-item"><span class="trust-icon">♧</span><div><strong>Clear, upfront pricing</strong><small>Transparent hourly and visit rates</small></div></div>
      <div class="trust-item"><span class="trust-icon">◷</span><div><strong>Automated dispatch</strong><small>No double-booking concurrency lock</small></div></div>
    </div>
  `;
}

function renderBookings() {
  const list = state.bookings.filter(b => state.bookingFilter === 'All' || b.status === state.bookingFilter);
  return `
    ${pageHead('YOUR SERVICE HISTORY', 'My bookings', 'Keep every appointment and repair update in one place.', '<button class="primary-btn" data-page="discover">＋ Book a service</button>')}
    <div class="filter-row">
      ${['All', 'In progress', 'Completed', 'Pending', 'Cancelled'].map(f => `
        <button class="pill-filter ${state.bookingFilter === f ? 'active' : ''}" data-booking-filter="${f}">${f}</button>
      `).join('')}
    </div>
    ${list.map(b => `
      <article class="booking-card">
        <div class="booking-symbol ${b.cover}">${b.icon}</div>
        <div class="booking-main">
          <h3>${b.service}</h3>
          <p>Booking ID: ${b.displayId} · ${b.date}<br>Specialist: <strong>${b.provider}</strong><br>Address: ${b.address}</p>
        </div>
        <div class="booking-side">
          <strong>${money(b.price)}</strong>
          <span class="status ${statusClass(b.status)}">${b.status}</span>
          <button class="mini-link" data-track="${b.rawId}">Track service ↗</button>
        </div>
      </article>
    `).join('') || '<div class="empty-state">No bookings found in this category.</div>'}
  `;
}

async function renderTracking() {
  const container = $('#content');
  container.innerHTML = `<div class="empty-state">Loading tracking telemetry...</div>`;

  const activeId = state.activeRequestId || (state.bookings[0] && state.bookings[0].rawId);
  if (!activeId) {
    return pageHead('LIVE TELEMETRY', 'Track your service', 'No active bookings to track.') + `<div class="empty-state">You have no service requests booked yet. <button class="primary-btn" data-page="discover" style="margin-top:10px;">Book a service</button></div>`;
  }

  try {
    const res = await fetch(`/api/requests/${activeId}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Request not found');
    const data = await res.json();
    const req = data.request;
    const events = data.events || [];
    const rating = data.rating || null;
    const invoice = data.invoice || null;

    const rawStatus = req.status;
    const stepMap = { requested: 0, accepted: 1, on_the_way: 2, in_progress: 3, completed: 4 };
    const currentStep = stepMap[rawStatus] !== undefined ? stepMap[rawStatus] : -1;
    const isCancelled = rawStatus === 'cancelled';

    const steps = [
      'Requested',
      'Accepted',
      'On the way',
      'In progress',
      'Completed'
    ];

    const timelineHtml = isCancelled
      ? `<div style="padding:20px; text-align:center; background:#fff0f0; border-radius:12px; color:var(--red); font-weight:700; margin:20px 0;">Request Cancelled</div>`
      : `<div class="timeline">
          ${steps.map((s, i) => `
            <div class="timeline-step ${i < currentStep ? 'done' : i === currentStep ? 'current' : ''}">
              <div class="step-dot">${i < currentStep ? '✓' : i + 1}</div>
              ${s}
              <small>${events[i] ? new Date(events[i].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (i <= currentStep ? 'Logged' : 'Pending')}</small>
            </div>
          `).join('')}
        </div>`;

    const canCancel = rawStatus === 'requested' || rawStatus === 'accepted';
    const canRate = rawStatus === 'completed' && !rating;

    const payStatus = req.payment_status || 'pending';
    const payBadge = payStatus === 'verified'
      ? `<span class="status completed" style="background:#e6f8ef; color:#0e8345; font-weight:700;">✓ Payment Verified</span>`
      : payStatus === 'rejected'
      ? `<span class="status" style="background:#fee2e2; color:#b91c1c; font-weight:700;">✕ Payment Rejected</span>`
      : `<span class="status pending" style="background:#fef3c7; color:#b45309; font-weight:700;">⏳ Payment Pending Verification</span>`;

    // Connect SSE EventSource for real-time live telemetry
    if (window.activeTrackingSource) {
      window.activeTrackingSource.close();
      window.activeTrackingSource = null;
    }
    try {
      const es = new EventSource(`/api/requests/${activeId}/stream`);
      window.activeTrackingSource = es;
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (['status_update', 'payment_update', 'rescheduled', 'assigned'].includes(data.type)) {
            if (state.page === 'tracking') {
              render();
            }
          }
        } catch (_) {}
      };
    } catch (_) {}

    return `
      ${pageHead('LIVE SERVICE UPDATES', 'Track your service', `Real-time fulfillment tracking for request #${req.id}.`, '<button class="secondary-btn" data-page="bookings">← All bookings</button>')}
      <div class="tracking-box">
        <div class="tracking-head">
          <div>
            <span class="eyebrow">BOOKING #${req.id}</span>
            <h2>${req.category_name || 'Home Service'}</h2>
            <p>${req.preferred_date} · ${minutesToTime(req.preferred_start_minute)} · ${req.address}</p>
            <div style="font-size:12px; color:var(--muted); margin-top:6px;">Payment: <strong>${(req.payment_method || 'bKash').toUpperCase()}</strong> · TrxID: <code>${escapeHtml(req.trx_id || 'N/A')}</code> ${req.sender_number ? `· Sender: ${escapeHtml(req.sender_number)}` : ''}</div>
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
            <span class="status ${statusClass(rawStatus)}">${normalizeStatus(rawStatus)}</span>
            ${payBadge}
          </div>
        </div>
        ${timelineHtml}
      </div>

      <div class="dashboard-grid">
        <div class="panel">
          <div class="panel-head">
            <div>
              <h3>Specialist details</h3>
              <p>Assigned expert for this appointment</p>
            </div>
            <span class="status completed">Verified</span>
          </div>
          <div class="provider-line">
            <div class="avatar avatar-green" style="width:48px;height:48px;font-size:14px">
              ${(req.provider_name || 'SP').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div class="provider-name" style="font-size:14px">${req.provider_name || 'Assigned Specialist'} <span class="verified">✓</span></div>
              <div class="provider-sub">${req.provider_headline || 'Certified Specialist'} · ★ ${req.provider_rating || '4.9'}</div>
            </div>
          </div>
          <div style="border-top:1px solid #f0f2f6; margin-top:18px; padding-top:16px;">
            <div class="progress-row">
              <strong>Fulfillment status</strong>
              <span>${normalizeStatus(rawStatus)}</span>
            </div>
            <div class="progress-bar">
              <span style="width:${isCancelled ? 0 : Math.min(100, (currentStep + 1) * 20)}%"></span>
            </div>
          </div>
          <div style="margin-top:18px; display:flex; gap:10px; flex-wrap:wrap;">
            ${canCancel ? `<button class="secondary-btn" id="rescheduleRequestBtn" data-id="${req.id}" data-date="${req.preferred_date}">Reschedule ◷</button>` : ''}
            ${canCancel ? `<button class="danger-btn" id="cancelRequestBtn" data-id="${req.id}">Cancel request</button>` : ''}
            ${canRate ? `<button class="primary-btn" id="rateServiceBtn" data-id="${req.id}">Rate this service ★</button>` : ''}
            ${rating ? `<div style="font-size:13px; color:var(--amber); font-weight:700;">You rated: ★ ${rating.rating_stars} ${rating.review_comment ? `— “${escapeHtml(rating.review_comment)}”` : ''}</div>` : ''}
            ${invoice ? `<button class="secondary-btn" id="viewInvoiceBtn" data-id="${req.id}">View invoice 📄</button>` : ''}
          </div>
        </div>

        <div class="panel">
          <div class="panel-head"><h3>Audit trail & activity</h3><span class="eyebrow">ACTIVITY</span></div>
          <div class="list-stack">
            ${events.map(ev => `
              <div class="activity-item">
                <span class="activity-dot">✓</span>
                <div class="activity-copy">
                  <strong>Status: ${normalizeStatus(ev.status)}</strong>
                  <p>${ev.status === 'requested' ? 'Service request dispatched to provider.' : ev.status === 'accepted' ? 'Provider confirmed appointment.' : ev.status === 'on_the_way' ? 'Provider en route to address.' : ev.status === 'in_progress' ? 'Service execution started.' : ev.status === 'completed' ? 'Job completed and invoice generated.' : 'Request cancelled.'}</p>
                  <time>${new Date(ev.created_at).toLocaleString()}</time>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    return `<div class="empty-state">Failed to load tracking details: ${err.message}</div>`;
  }
}

function renderFavorites() {
  return `
    ${pageHead('YOUR SHORTLIST', 'Saved services', 'Keep trusted professionals and useful services close at hand.')}
    <div class="empty-state" style="padding:60px 20px;">
      <div style="font-size:32px; margin-bottom:10px;">♡</div>
      <h3 style="margin:0 0 8px;">Coming Soon</h3>
      <p style="margin:0;">Favorites and provider bookmarking will arrive in the next release.</p>
    </div>
  `;
}

async function renderProfile() {
  const u = state.user || {};
  await loadAddresses();
  const addresses = state.addresses || [];

  return `
    ${pageHead('ACCOUNT SETTINGS', 'My profile', 'Manage your contact details and service preferences.', '<button class="primary-btn" id="saveProfileTopBtn">Save changes</button>')}
    <div class="profile-banner">
      <div class="avatar avatar-lilac" style="width:58px;height:58px;font-size:18px">
        ${(u.full_name || 'U').slice(0, 2).toUpperCase()}
      </div>
      <div>
        <h2>${escapeHtml(u.full_name || 'Customer')}</h2>
        <p>${u.role === 'customer' ? 'Client account' : u.role === 'provider' ? 'Provider account' : 'Administrator'} · ${escapeHtml(u.email || '')}</p>
      </div>
      <div class="banner-actions"><span class="status completed">Verified</span></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Personal information</h3></div>
      <form id="profileForm">
        <div class="form-grid">
          <div class="form-field"><label>Full name</label><input id="profFullName" name="full_name" value="${escapeHtml(u.full_name || '')}" required></div>
          <div class="form-field"><label>Email address</label><input id="profEmail" name="email" value="${escapeHtml(u.email || '')}" type="email" required></div>
          <div class="form-field"><label>Phone number</label><input id="profPhone" name="phone" value="${escapeHtml(u.phone || '')}" placeholder="+8801700000000"></div>
          <div class="form-field"><label>Old password (required to change password)</label><input id="profOldPassword" name="old_password" type="password" placeholder="Enter current password"></div>
          <div class="form-field"><label>New password</label><input id="profPassword" name="password" type="password" placeholder="Leave blank to keep current"></div>
          <div class="form-field full" style="margin-top:15px;">
            <button class="primary-btn" type="submit" id="saveProfileBtn">Save changes</button>
          </div>
        </div>
      </form>
    </div>

    <!-- Saved Addresses Section -->
    <div class="panel" style="margin-top:24px;">
      <div class="panel-head">
        <div>
          <h3>Saved Addresses</h3>
          <p>Manage your delivery and service addresses</p>
        </div>
        <button class="primary-btn" id="openAddAddressModalBtn" style="padding:6px 14px; font-size:13px; min-height:36px;">
          ＋ Add Address
        </button>
      </div>
      <div id="savedAddressesList" class="list-stack" style="margin-top:14px;">
        ${addresses.length > 0 ? addresses.map(a => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 0; border-bottom:1px solid var(--line);">
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <strong style="font-size:14px; color:var(--text);">${escapeHtml(a.label)}</strong>
                ${a.is_default ? '<span class="status completed" style="font-size:11px; padding:2px 8px;">Default</span>' : ''}
              </div>
              <p style="margin:4px 0 0; font-size:13px; color:var(--muted);">${escapeHtml(a.address_line)}</p>
            </div>
            <div style="display:flex; gap:8px;">
              <button class="secondary-btn" data-edit-address-id="${a.id}" data-label="${escapeHtml(a.label)}" data-line="${escapeHtml(a.address_line)}" data-default="${a.is_default}" style="padding:5px 12px; font-size:12px; min-height:32px;">Edit</button>
              <button class="danger-btn" data-delete-address-id="${a.id}" style="padding:5px 12px; font-size:12px; min-height:32px;">Delete</button>
            </div>
          </div>
        `).join('') : '<div class="empty-state" style="padding:20px 0;">No saved addresses yet. Click "Add Address" to save your home or work address.</div>'}
      </div>
    </div>
  `;
}

async function renderGigDetails() {
  const gigId = state.viewingGigId || 2;
  const content = $('#content');
  content.innerHTML = '<div class="empty-state">Loading specialist details...</div>';

  try {
    const res = await fetch(`/api/gigs/${gigId}`);
    if (!res.ok) throw new Error('Provider gig not found');
    const data = await res.json();
    const provider = data.provider;
    const services = provider.services || [];
    const firstService = services[0] || { category_slug: 'appliance-repair', price: 900, category_name: 'Appliance Repair' };
    const reviews = data.reviews || [];
    const breakdown = data.ratingBreakdown || [];

    const heroImage = window.IMAGES?.category ? window.IMAGES.category(firstService.category_slug) : '';
    const avatarUrl = window.IMAGES?.providerAvatar ? window.IMAGES.providerAvatar(provider.full_name) : '';
    const basePrice = Number(firstService.price || 900);

    const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    if (breakdown.length > 0) {
      breakdown.forEach(b => { starCounts[b.stars] = Number(b.count); });
    } else if (Number(provider.rating_count) > 0) {
      const tot = Number(provider.rating_count);
      starCounts[5] = Math.round(tot * 0.75);
      starCounts[4] = Math.round(tot * 0.20);
      starCounts[3] = Math.round(tot * 0.05);
    }
    const totalCount = Object.values(starCounts).reduce((a, b) => a + b, 0) || Number(provider.rating_count) || 1;

    return `
      <div style="margin-bottom:16px;">
        <button class="secondary-btn" id="backToDiscoverBtn" style="padding:6px 14px; font-size:13px; min-height:36px;">
          ← Back to all services
        </button>
      </div>

      <!-- Top Section -->
      <div class="panel" style="overflow:hidden; padding:0; margin-bottom:24px; position:relative;">
        <div style="height:220px; background-image:url('${heroImage}'); background-size:cover; background-position:center; position:relative;">
          <div style="position:absolute; inset:0; background:linear-gradient(180deg, rgba(11,18,32,0.2) 0%, rgba(11,18,32,0.85) 100%);"></div>
          <div style="position:absolute; bottom:20px; left:24px; right:24px; display:flex; align-items:flex-end; gap:20px;">
            <img src="${avatarUrl}" alt="${escapeHtml(provider.full_name)}" style="width:84px; height:84px; border-radius:18px; border:3px solid #fff; box-shadow:0 8px 24px rgba(0,0,0,0.2); object-fit:cover; background:#1e293b;" />
            <div style="color:#fff;">
              <span class="eyebrow" style="color:var(--blue-light, #93c5fd);">VERIFIED SPECIALIST</span>
              <h1 style="color:#fff; margin:4px 0 6px; font-size:28px;">${escapeHtml(provider.full_name)}</h1>
              <div style="display:flex; align-items:center; gap:16px; font-size:14px; color:#e2e8f0; flex-wrap:wrap;">
                <span style="color:var(--amber, #f59e0b); font-weight:700;">★ ${provider.rating || '4.8'} (${provider.rating_count || 120})</span>
                <span><i class="bi bi-geo-alt"></i> ${escapeHtml(provider.address || 'Dhaka, Bangladesh')}</span>
                <span><i class="bi bi-briefcase"></i> ${provider.years_experience || 5} Years Experience</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Columns -->
      <div style="display:grid; grid-template-columns: 2fr 1fr; gap:24px; align-items:start;">
        <!-- Left Column: About the Pro & Services Offered -->
        <div>
          <div class="panel" style="margin-bottom:20px;">
            <div class="panel-head">
              <h3>About the Pro</h3>
            </div>
            <p style="color:var(--text); line-height:1.65; margin:0 0 16px;">
              ${escapeHtml(provider.bio || provider.headline || 'Experienced home service specialist offering guaranteed repairs and fast response times across Dhaka.')}
            </p>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px; padding-top:16px; border-top:1px solid var(--line);">
              <div style="display:flex; align-items:center; gap:8px; font-size:13px; color:var(--muted);">
                <i class="bi bi-shield-check" style="color:var(--green); font-size:18px;"></i>
                <span>Background Verified</span>
              </div>
              <div style="display:flex; align-items:center; gap:8px; font-size:13px; color:var(--muted);">
                <i class="bi bi-award" style="color:var(--blue); font-size:18px;"></i>
                <span>Certified Specialist</span>
              </div>
              <div style="display:flex; align-items:center; gap:8px; font-size:13px; color:var(--muted);">
                <i class="bi bi-lock" style="color:var(--orange, #f97316); font-size:18px;"></i>
                <span>Advisory Locked Dispatch</span>
              </div>
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">
              <div>
                <h3>Services Offered</h3>
                <p>Transparent upfront pricing per service category</p>
              </div>
            </div>
            <div class="list-stack">
              ${services.map(s => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 0; border-bottom:1px solid var(--line);">
                  <div>
                    <strong style="font-size:15px; color:var(--text);">${escapeHtml(s.category_name)}</strong>
                    <div style="font-size:12px; color:var(--muted); margin-top:2px;">Category: ${escapeHtml(s.category_slug)}</div>
                  </div>
                  <div style="text-align:right;">
                    <span style="font-size:17px; font-weight:800; color:var(--blue);">${money(s.price)}</span>
                    <small style="color:var(--muted); display:block; font-size:11px;">/ base rate</small>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Right Column (Sticky): Book this Pro card -->
        <div style="position:sticky; top:24px;">
          <div class="panel" style="border: 2px solid var(--blue); box-shadow: 0 10px 30px rgba(37,99,235,0.08);">
            <div class="panel-head">
              <h3>Book this Pro</h3>
              <span class="status completed">Available</span>
            </div>
            <div style="margin: 16px 0 20px;">
              <div style="font-size:12px; color:var(--muted); text-transform:uppercase; font-weight:700;">Starting from</div>
              <div style="font-size:32px; font-weight:800; color:var(--text); margin-top:4px;">${money(basePrice)}</div>
              <p style="font-size:13px; color:var(--muted); margin:8px 0 0; line-height:1.5;">
                Includes initial diagnosis, standard visit dispatch, and HutFix service guarantee.
              </p>
            </div>
            <button class="primary-btn" id="bookGigNowBtn" data-provider-id="${provider.id}" data-category-slug="${firstService.category_slug}" data-price="${basePrice}" style="width:100%; justify-content:center; padding:14px; font-size:14px; font-weight:700;">
              Check Availability & Book ↗
            </button>
            <div style="font-size:12px; color:var(--muted); text-align:center; margin-top:12px;">
              ⚡ Concurrency protected · No double booking
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Section: Reviews -->
      <div class="panel" style="margin-top:24px;">
        <div class="panel-head">
          <div>
            <h3>Client Reviews</h3>
            <p>Feedback from verified clients across Dhaka</p>
          </div>
          <div style="font-size:16px; font-weight:700; color:var(--amber);">★ ${provider.rating || '4.8'} (${provider.rating_count || 120} reviews)</div>
        </div>
        <div style="display:grid; grid-template-columns: 280px 1fr; gap:32px; margin-top:16px;">
          <!-- Left: Rating breakdown bars -->
          <div style="padding-right:24px; border-right:1px solid var(--line);">
            <h4 style="margin:0 0 16px; font-size:14px; color:var(--text);">Rating Breakdown</h4>
            ${[5, 4, 3, 2, 1].map(star => {
              const count = starCounts[star] || 0;
              const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
              return `
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px; font-size:13px;">
                  <span style="width:36px; font-weight:600; color:var(--text);">${star} ★</span>
                  <div style="flex:1; height:8px; background:#e2e8f0; border-radius:4px; overflow:hidden;">
                    <div style="width:${pct}%; height:100%; background:var(--blue); border-radius:4px;"></div>
                  </div>
                  <span style="width:32px; text-align:right; color:var(--muted); font-size:12px;">${count}</span>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Right: List of 20 reviews -->
          <div>
            <h4 style="margin:0 0 16px; font-size:14px; color:var(--text);">Recent Reviews (${reviews.length})</h4>
            <div class="list-stack">
              ${reviews.length > 0 ? reviews.map(r => `
                <div style="padding:14px 0; border-bottom:1px solid var(--line);">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <strong style="font-size:14px;">${escapeHtml(r.customer_name || 'Verified Customer')}</strong>
                    <span style="font-size:12px; color:var(--muted);">${new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  <div style="color:var(--amber); font-size:13px; margin-bottom:6px;">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</div>
                  <p style="margin:0; font-size:13px; color:var(--text); line-height:1.5;">${escapeHtml(r.comment || 'Great service and very professional.')}</p>
                </div>
              `).join('') : `
                <div style="padding:20px 0; color:var(--muted); font-size:13px;">
                  <p style="margin:0 0 6px;">★ Verified Client Feedback</p>
                  <small>No written reviews submitted yet. Average rating: ★ ${provider.rating || '4.8'} based on ${provider.rating_count || 120} completed appointments.</small>
                </div>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    return `<div class="empty-state">Failed to load gig details: ${escapeHtml(err.message)}</div>`;
  }
}

// -------------------------------------------------------------
// Booking Flow & Smart Match Wiring
// -------------------------------------------------------------
async function openBooking(categorySlug, preselectedProviderId) {
  if (!state.user || state.role === 'guest') {
    const authScreen = document.getElementById('auth-screen');
    if (authScreen) authScreen.classList.add('open');
    const errEl = document.getElementById('auth-error');
    if (errEl) {
      errEl.textContent = 'Please sign in to book this service.';
      errEl.style.display = 'block';
    }
    return;
  }

  await loadAddresses();
  const addresses = state.addresses || [];
  const defaultAddrObj = addresses.find(a => a.is_default) || addresses[0];
  const initialAddr = defaultAddrObj ? defaultAddrObj.address_line : 'House 18, Road 7, Dhanmondi, Dhaka';

  const s = state.services.find(x => x.slug === categorySlug) || state.services[0] || {
    slug: 'appliance-repair',
    title: 'Appliance Repair',
    price: 1000
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const savedAddrSelectHtml = addresses.length > 0 ? `
    <div class="form-field full">
      <label><i class="bi bi-geo-alt"></i> Choose from Saved Addresses</label>
      <select id="savedAddressSelect">
        <option value="">-- Select a saved address --</option>
        ${addresses.map(a => `
          <option value="${escapeHtml(a.address_line)}" ${a.is_default ? 'selected' : ''}>
            ${escapeHtml(a.label)}: ${escapeHtml(a.address_line)} ${a.is_default ? '(Default)' : ''}
          </option>
        `).join('')}
      </select>
    </div>
  ` : '';

  openModal(
    `Book ${s.title}`,
    `
      <div class="modal-summary">
        <div class="category-icon bg-blue" style="font-size:22px; color:var(--blue);">${s.icon || '<i class="bi bi-tools"></i>'}</div>
        <div>
          <strong>${s.title}</strong>
          <small>Base rate: ${money(s.price)} · Verified matching</small>
        </div>
      </div>
      <form id="matchForm">
        <input type="hidden" name="category_slug" value="${s.slug}">
        ${preselectedProviderId ? `<input type="hidden" name="preselected_provider_id" value="${preselectedProviderId}">` : ''}
        <div class="form-grid">
          <div class="form-field"><label>Preferred date</label><input type="date" name="preferred_date" value="${tomorrowStr}" min="${new Date().toISOString().split('T')[0]}" required></div>
          <div class="form-field"><label>Time window</label>
            <select name="time_window">
              <option value="09:00-11:00">09:00 AM – 11:00 AM</option>
              <option value="11:00-13:00">11:00 AM – 01:00 PM</option>
              <option value="14:00-16:00" selected>02:00 PM – 04:00 PM</option>
              <option value="16:00-18:00">04:00 PM – 06:00 PM</option>
            </select>
          </div>
          <div class="form-field"><label>Urgency</label>
            <select name="urgency">
              <option value="normal">Standard (Normal)</option>
              <option value="urgent">Urgent priority (+20%)</option>
            </select>
          </div>
          <div class="form-field"><label>Contact phone</label><input name="phone" value="${state.user?.phone || '+880 1712-345678'}" required></div>
          ${savedAddrSelectHtml}
          <div class="form-field full"><label>Service address</label><input name="address" value="${state.userLocation}" required></div>
          <div class="form-field full"><label>Describe issue (optional)</label><textarea name="description" placeholder="Briefly describe what needs attention..."></textarea></div>
          <div class="form-field full"><label>Attach photo (optional)</label><input type="file" name="image" accept="image/*"></div>
        </div>
        <div id="matchCandidatesContainer" style="margin-top:16px;"></div>
        <div class="modal-actions" id="bookingModalActions">
          <button type="button" class="secondary-btn" id="cancelModal">Cancel</button>
          <button class="primary-btn" type="submit" id="findSpecialistsBtn">Find Specialists ↗</button>
        </div>
      </form>
    `
  );

  const sel = $('#savedAddressSelect');
  if (sel) {
    sel.addEventListener('change', (e) => {
      const addrInput = $('#matchForm input[name="address"]');
      if (addrInput && e.target.value) {
        addrInput.value = e.target.value;
      }
    });
  }
}

// -------------------------------------------------------------
// Provider / Repairman Renderers
// -------------------------------------------------------------
function renderRepairOverview() {
  const p = state.providerProfile || {};
  const earnings = state.providerInvoices?.totals?.sum_total || 0;
  return `
    ${pageHead('REPAIRMAN WORKSPACE', `Good morning, ${p.full_name || state.user?.full_name || 'Specialist'} 👋`, 'Here’s what’s happening with your service business today.')}
    <div class="stats-grid">
      ${stat('Total earnings', money(earnings), '৳', '<span class="up">↑ Real-time</span> verified')}
      ${stat('Active jobs', state.active.length, '▤', 'Currently in progress')}
      ${stat('New requests', state.incoming.length, '✳', 'Awaiting your acceptance')}
      ${stat('Average rating', p.rating || '4.9', '★', `From ${p.rating_count || 120} client reviews`)}
    </div>
    <div class="dashboard-grid">
      <div class="panel">
        <div class="panel-head">
          <div><h3>Active service jobs</h3><p>Your current client appointments</p></div>
          <button class="link-btn" data-page="requests">View all requests ↗</button>
        </div>
        ${state.active.map(r => `
          <div class="gig-row">
            <div class="gig-thumb cover-wash">🛠️</div>
            <div class="gig-info">
              <strong>${r.category_name || 'Repair Service'} · Request #${r.id}</strong>
              <small>${r.preferred_date} · ${minutesToTime(r.preferred_start_minute)} · ${r.address}</small>
            </div>
            <div class="gig-meta">
              <strong>${money(r.estimated_price)}</strong>
              <small><span class="status progress">${normalizeStatus(r.status)}</span></small>
            </div>
          </div>
        `).join('') || '<div class="empty-state">No active jobs right now. Check incoming requests!</div>'}
      </div>
      <div class="panel">
        <div class="panel-head">
          <div><h3>Provider performance</h3><p>Reliability & rating telemetry</p></div>
          <span class="status completed">Verified pro</span>
        </div>
        <div class="progress-row" style="margin-top:16px;">
          <strong>Profile rating score</strong>
          <span>${p.rating || '4.9'} / 5.0</span>
        </div>
        <div class="progress-bar">
          <span style="width:${((Number(p.rating) || 4.9) / 5) * 100}%"></span>
        </div>
        <div style="margin-top:20px; font-size:13px; color:var(--muted); line-height:1.6;">
          Your profile is published and active in Dhanmondi, Dhaka. Incoming service requests appear in real time.
        </div>
      </div>
    </div>
  `;
}

function renderGigs() {
  const p = state.providerProfile || {};
  const servicesList = p.services || [];
  return `
    ${pageHead('YOUR SERVICES', 'My service gigs', 'Your active service catalog and pricing.', '<button class="primary-btn" id="newGigBtn">＋ Create a gig</button>')}
    <div class="stats-grid">
      ${stat('Active gigs', servicesList.length, '✳', 'Visible to clients')}
      ${stat('Active jobs', state.active.length, '▤', 'In progress')}
      ${stat('Completed jobs', state.history.length, '✓', 'Delivered')}
      ${stat('Avg. rating', p.rating || '4.9', '★', 'Client satisfaction')}
    </div>
    <div class="panel">
      <div class="panel-head">
        <div><h3>Your service listings</h3><p>Services clients can book with you</p></div>
      </div>
      ${servicesList.map(s => `
        <div class="gig-row">
          <div class="gig-thumb cover-wash">🛠️</div>
          <div class="gig-info">
            <strong>${s.category_name}</strong>
            <small>Category slug: ${s.category_slug} · <span class="status completed">Published</span></small>
          </div>
          <div class="gig-meta">
            <strong>${money(s.price)}</strong>
            <small>Hourly / base price</small>
          </div>
          <div class="admin-actions">
            <button class="small-action" data-edit-gig="true">Edit</button>
          </div>
        </div>
      `).join('') || '<div class="empty-state">No services registered yet.</div>'}
    </div>
  `;
}

function renderRequests() {
  return `
    ${pageHead('CLIENT REQUESTS', 'Booking requests', 'Review incoming requests, accept jobs, and advance workflow.')}
    <div class="section-head">
      <div><h2>Incoming requests (${state.incoming.length})</h2><p>New appointments awaiting your response</p></div>
    </div>
    ${state.incoming.map(r => `
      <div class="booking-card">
        <div class="booking-symbol cover-wash">❄️</div>
        <div class="booking-main">
          <h3>${r.category_name || 'Home Service'} · Request #${r.id}</h3>
          <p>Client: <strong>${r.customer_name || 'Customer'}</strong> (${r.phone || 'N/A'})<br>Date: ${r.preferred_date} · ${minutesToTime(r.preferred_start_minute)}<br>Address: ${r.address}<br>${r.description ? `Notes: “${escapeHtml(r.description)}”` : ''}</p>
        </div>
        <div class="booking-side">
          <strong>${money(r.estimated_price)}</strong>
          <span class="status pending">New Request</span>
          <div class="admin-actions" style="margin-top:6px;">
            <button class="mini-link" data-accept-req="${r.id}">Accept</button>
            <button class="small-action" data-reject-req="${r.id}">Decline</button>
          </div>
        </div>
      </div>
    `).join('') || '<div class="empty-state">No incoming requests waiting for acceptance.</div>'}

    <div class="section-head" style="margin-top:30px;">
      <div><h2>Active jobs (${state.active.length})</h2><p>Advance job stage as you deliver the service</p></div>
    </div>
    ${state.active.map(r => {
      const nextMap = { accepted: 'on_the_way', on_the_way: 'in_progress', in_progress: 'completed' };
      const nextLabel = { accepted: 'Mark: On the way', on_the_way: 'Mark: In progress', in_progress: 'Mark: Completed' };
      const nextStatus = nextMap[r.status];
      return `
        <div class="booking-card">
          <div class="booking-symbol cover-cool">🛠️</div>
          <div class="booking-main">
            <h3>${r.category_name || 'Home Service'} · Request #${r.id}</h3>
            <p>Client: <strong>${r.customer_name || 'Customer'}</strong> (${r.phone || 'N/A'})<br>Date: ${r.preferred_date} · ${minutesToTime(r.preferred_start_minute)}<br>Address: ${r.address}</p>
          </div>
          <div class="booking-side">
            <strong>${money(r.estimated_price)}</strong>
            <span class="status progress">${normalizeStatus(r.status)}</span>
            ${nextStatus ? `<button class="primary-btn" style="padding:6px 12px; font-size:12px; min-height:34px; margin-top:6px;" data-advance-req="${r.id}" data-next="${nextStatus}">${nextLabel[r.status]} ↗</button>` : ''}
          </div>
        </div>
      `;
    }).join('') || '<div class="empty-state">No active jobs in progress.</div>'}

    <div class="section-head" style="margin-top:30px;">
      <div><h2>Completed & history (${state.history.length})</h2><p>Past fulfilled appointments</p></div>
    </div>
    ${state.history.map(r => `
      <div class="booking-card">
        <div class="booking-symbol cover-lavender">✓</div>
        <div class="booking-main">
          <h3>${r.category_name} · Request #${r.id}</h3>
          <p>Client: ${r.customer_name} · ${r.preferred_date}</p>
        </div>
        <div class="booking-side">
          <strong>${money(r.estimated_price)}</strong>
          <span class="status ${statusClass(r.status)}">${normalizeStatus(r.status)}</span>
        </div>
      </div>
    `).join('') || '<div class="empty-state">No past history yet.</div>'}
  `;
}

async function renderEarnings() {
  const invs = state.providerInvoices?.invoices || [];
  let payouts = [];
  let availableBalance = state.providerInvoices?.totals?.sum_total || 0;
  let totalEarned = availableBalance;

  try {
    const pRes = await fetch('/api/provider/payouts', { credentials: 'include' });
    const pData = await pRes.json();
    if (pData.ok) {
      payouts = pData.payouts || [];
      if (pData.available_balance != null) availableBalance = pData.available_balance;
      if (pData.total_earned != null) totalEarned = pData.total_earned;
    }
  } catch (_) {}

  return `
    ${pageHead('PAYOUTS & REVENUE', 'Earnings', 'Track your service income and payout history.', '<button class="primary-btn" id="payoutBtn">Request payout ↗</button>')}
    <div class="stats-grid">
      ${stat('Available balance', money(availableBalance), '৳', 'Eligible for withdrawal')}
      ${stat('Total earned', money(totalEarned), '↗', 'Gross job revenue')}
      ${stat('Total invoices', invs.length, '▤', 'Completed bookings')}
      ${stat('Payout method', 'bKash / Nagad', '৳', 'Direct settlement')}
    </div>

    <!-- Payout Requests History -->
    <div class="panel" style="margin-bottom:24px;">
      <div class="panel-head">
        <div>
          <h3>Disbursement & Payout History</h3>
          <p>Status of requested funds and transfers</p>
        </div>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>PAYOUT ID</th><th>AMOUNT</th><th>DATE</th><th>STATUS</th></tr>
          </thead>
          <tbody>
            ${payouts.map(po => `
              <tr>
                <td><strong>#${po.id}</strong></td>
                <td><strong>${money(po.amount)}</strong></td>
                <td>${new Date(po.created_at).toLocaleDateString()}</td>
                <td><span class="status ${po.status === 'completed' ? 'completed' : po.status === 'rejected' ? 'danger' : 'progress'}">${po.status}</span></td>
              </tr>
            `).join('') || '<tr><td colspan="4">No payout requests submitted yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head"><h3>Recent transactions & invoices</h3></div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>INVOICE #</th><th>CUSTOMER</th><th>CATEGORY</th><th>DATE</th><th>AMOUNT</th><th>STATUS</th></tr>
          </thead>
          <tbody>
            ${invs.map(i => `
              <tr>
                <td><strong>${i.invoice_number}</strong></td>
                <td>${escapeHtml(i.customer_name || 'Client')}</td>
                <td>${escapeHtml(i.category_name || 'Service')}</td>
                <td>${new Date(i.issued_at).toLocaleDateString()}</td>
                <td><strong>${money(i.total)}</strong></td>
                <td><span class="status completed">${i.status || 'paid'}</span></td>
              </tr>
            `).join('') || '<tr><td colspan="6">No invoices issued yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function renderProviderAvailability() {
  let availability = [];
  let blackouts = [];
  try {
    const [availRes, blackRes] = await Promise.all([
      fetch('/api/provider/availability', { credentials: 'include' }),
      fetch('/api/provider/blackouts', { credentials: 'include' })
    ]);
    const aData = await availRes.json();
    const bData = await blackRes.json();
    if (aData.ok) availability = aData.availability || [];
    if (bData.ok) blackouts = bData.blackouts || [];
  } catch (err) {
    console.error(err);
  }

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return `
    ${pageHead('WORKING HOURS & SCHEDULE', 'Availability & slots', 'Configure your weekly working hours and scheduled blackout dates.', '<button class="primary-btn" id="saveAvailabilityTopBtn">Save schedule</button>')}

    <div class="panel">
      <div class="panel-head">
        <div>
          <h3>Weekly Operating Hours</h3>
          <p>Define which days and hours you accept customer appointments</p>
        </div>
      </div>
      <form id="availabilityForm" style="margin-top:14px;">
        <div style="display:grid; gap:12px;">
          ${days.map((dayName, idx) => {
            const row = availability.find(a => a.weekday === idx);
            const isChecked = !!row;

            const startH = row ? String(Math.floor(row.start_minute / 60)).padStart(2, '0') : '09';
            const startM = row ? String(row.start_minute % 60).padStart(2, '0') : '00';
            const endH = row ? String(Math.floor(row.end_minute / 60)).padStart(2, '0') : '17';
            const endM = row ? String(row.end_minute % 60).padStart(2, '0') : '00';

            return `
              <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:#f8fafc; border:1px solid var(--line); border-radius:10px; gap:16px;">
                <label style="display:flex; align-items:center; gap:10px; min-width:140px; cursor:pointer; font-weight:600; color:var(--text); margin:0;">
                  <input type="checkbox" name="day_active_${idx}" value="${idx}" ${isChecked ? 'checked' : ''} style="width:18px; height:18px;">
                  ${dayName}
                </label>
                <div style="display:flex; align-items:center; gap:8px;">
                  <label style="font-size:12px; color:var(--muted); margin:0;">From</label>
                  <input type="time" name="start_time_${idx}" value="${startH}:${startM}" style="padding:6px 10px; font-size:13px; border:1px solid var(--line); border-radius:6px; background:#fff;">
                  <label style="font-size:12px; color:var(--muted); margin:0;">To</label>
                  <input type="time" name="end_time_${idx}" value="${endH}:${endM}" style="padding:6px 10px; font-size:13px; border:1px solid var(--line); border-radius:6px; background:#fff;">
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <div style="margin-top:16px; text-align:right;">
          <button class="primary-btn" type="submit" id="saveAvailBtn">Save Weekly Schedule ↗</button>
        </div>
      </form>
    </div>

    <!-- Blackouts Section -->
    <div class="panel" style="margin-top:24px;">
      <div class="panel-head">
        <div>
          <h3>Blackout Dates & Time Off</h3>
          <p>Dates when you are unavailable for matching and automated bookings</p>
        </div>
      </div>
      <form id="blackoutForm" style="margin-top:14px; display:flex; gap:12px; align-items:flex-end; flex-wrap:wrap;">
        <div class="form-field" style="margin:0; flex:1; min-width:180px;">
          <label>Blackout Date</label>
          <input type="date" id="blackoutDateInput" min="${new Date().toISOString().split('T')[0]}" required>
        </div>
        <div class="form-field" style="margin:0; flex:2; min-width:220px;">
          <label>Reason (optional)</label>
          <input type="text" id="blackoutReasonInput" placeholder="e.g. Holiday, Training, Personal">
        </div>
        <button class="primary-btn" type="submit" style="min-height:42px;">＋ Add Blackout Date</button>
      </form>

      <div class="table-wrap" style="margin-top:16px;">
        <table class="data-table">
          <thead>
            <tr><th>DATE</th><th>REASON</th><th>SCHEDULED AT</th><th>ACTION</th></tr>
          </thead>
          <tbody>
            ${blackouts.map(b => `
              <tr>
                <td><strong>${b.blackout_date ? new Date(b.blackout_date).toLocaleDateString() : b.blackout_date}</strong></td>
                <td>${escapeHtml(b.reason || 'Unavailable')}</td>
                <td>${new Date(b.created_at).toLocaleDateString()}</td>
                <td>
                  <button class="danger-btn" data-delete-blackout-id="${b.id}" style="padding:4px 10px; font-size:12px; min-height:30px;">Remove</button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="4">No blackout dates scheduled. You are open according to weekly availability.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderRepairProfile() {
  const p = state.providerProfile || {};
  return `
    ${pageHead('PROFESSIONAL PROFILE', 'Your public profile', 'Help clients get to know your experience, skills and service area.', '<button class="primary-btn" id="saveRepairProfile">Save profile</button>')}
    <div class="profile-banner">
      <div class="avatar avatar-green" style="width:58px;height:58px;font-size:18px">
        ${(p.full_name || 'PR').slice(0, 2).toUpperCase()}
      </div>
      <div>
        <h2>${escapeHtml(p.full_name || ' Rahim Electronics')} <span style="color:#b9c7ff;font-size:13px">✓</span></h2>
        <p>${escapeHtml(p.headline || 'Master Technician')} · ${escapeHtml(p.address || 'Dhaka, Bangladesh')}</p>
        <p style="margin-top:6px">★ ${p.rating || '4.9'} rating · ${p.rating_count || 120} reviews · ${p.years_experience || 6} years experience</p>
      </div>
      <div class="banner-actions"><span class="status completed">Verified professional</span></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Professional details</h3></div>
      <div class="form-grid">
        <div class="form-field"><label>Display name</label><input value="${escapeHtml(p.full_name || '')}"></div>
        <div class="form-field"><label>Professional headline</label><input value="${escapeHtml(p.headline || 'Certified Specialist')}"></div>
        <div class="form-field"><label>Years of experience</label><input value="${p.years_experience || 6} years"></div>
        <div class="form-field"><label>Service area</label><input value="${escapeHtml(p.address || 'Dhanmondi, Dhaka')}"></div>
        <div class="form-field full"><label>About your work & bio</label><textarea>${escapeHtml(p.bio || 'Reliable home service with clear communication and guaranteed workmanship.')}</textarea></div>
      </div>
    </div>
  `;
}

function renderAdminOverview() {
  const st = state.adminStats || {};
  const totalBookings = st.total_bookings ?? 0;
  const grossVolume = money(st.gross_volume ?? st.total_revenue ?? 0);
  const totalUsers = st.total_users ?? 0;
  const totalProviders = st.total_providers ?? 0;

  const recentBookings = (state.adminBookings || []).slice(0, 5);
  const recentPayments = (state.adminPayments || []).slice(0, 5);

  return `
    ${pageHead('PLATFORM CONTROL CENTER', 'Marketplace overview', 'A live snapshot of platform activity.')}
    <div class="stats-grid">
      ${stat('Total Bookings', totalBookings, '▤', 'All time bookings')}
      ${stat('Gross Volume', grossVolume, '৳', 'Platform transaction total')}
      ${stat('Total Users', totalUsers, '♙', 'Registered accounts')}
      ${stat('Total Providers', totalProviders, '✓', 'Active specialists')}
    </div>
    <div class="dashboard-grid">
      <div class="panel">
        <div class="panel-head">
          <div>
            <h3>Recent Bookings</h3>
            <p>Latest requests across all categories</p>
          </div>
          <button class="link-btn" data-page="all-bookings">View all ↗</button>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr><th>BOOKING</th><th>CLIENT</th><th>SERVICE</th><th>AMOUNT</th><th>STATUS</th></tr>
            </thead>
            <tbody>
              ${recentBookings.map(b => `
                <tr>
                  <td><strong>#${b.id}</strong></td>
                  <td>${escapeHtml(b.customer_name || 'Customer')}</td>
                  <td>${escapeHtml(b.category_name || 'Service')}</td>
                  <td><strong>${money(b.estimated_price)}</strong></td>
                  <td><span class="status ${statusClass(b.status)}">${normalizeStatus(b.status)}</span></td>
                </tr>
              `).join('') || '<tr><td colspan="5">No recent bookings.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head">
          <div>
            <h3>Pending Payments</h3>
            <p>Recent manual payment proofs requiring review</p>
          </div>
          <button class="link-btn" data-page="payments">View all ↗</button>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr><th>TRX ID</th><th>CUSTOMER</th><th>AMOUNT</th><th>ACTION</th></tr>
            </thead>
            <tbody>
              ${recentPayments.map(p => `
                <tr>
                  <td><code>${escapeHtml(p.trx_id || 'N/A')}</code><br><small style="text-transform:uppercase; color:var(--muted); font-weight:700;">${escapeHtml(p.payment_method || 'bkash')}</small></td>
                  <td><strong>${escapeHtml(p.customer_name || 'Customer')}</strong></td>
                  <td><strong>${money(p.estimated_price)}</strong></td>
                  <td>
                    ${p.payment_status === 'pending' ? `
                      <div class="admin-actions">
                        <button class="small-action" data-payment-action="verify" data-req-id="${p.id}" style="color:var(--green); border-color:var(--green);">Verify</button>
                        <button class="small-action" data-payment-action="reject" data-req-id="${p.id}" style="color:var(--red); border-color:var(--red);">Reject</button>
                      </div>
                    ` : `<small style="color:var(--muted);">${p.payment_status || 'cleared'}</small>`}
                  </td>
                </tr>
              `).join('') || '<tr><td colspan="4">No pending payment proofs.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

async function renderAdminPayments() {
  try {
    const res = await fetch('/api/admin/payments', { credentials: 'include' });
    const data = await res.json();
    if (data.ok) state.adminPayments = data.payments || [];
  } catch (err) {
    console.error(err);
  }

  const payments = state.adminPayments || [];

  return `
    ${pageHead('FINANCE', 'Payment Verifications', 'Verify manual bKash/Nagad transactions.')}
    <div class="panel">
      <div class="panel-head"><h3>Transaction proofs ledger (${payments.length})</h3></div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>TRX ID</th><th>CUSTOMER</th><th>AMOUNT</th><th>ACTION</th></tr>
          </thead>
          <tbody>
            ${payments.map(p => `
              <tr>
                <td>
                  <code>${escapeHtml(p.trx_id || 'N/A')}</code>
                  <br><small style="font-weight:700; text-transform:uppercase; color:var(--muted);">${escapeHtml(p.payment_method || 'bkash')}</small>
                  <small style="color:var(--muted);"> · #${p.id}</small>
                </td>
                <td>
                  <strong>${escapeHtml(p.customer_name || 'Customer')}</strong>
                  <br><small style="color:var(--muted);">${escapeHtml(p.sender_number || p.customer_phone || p.customer_email || '')}</small>
                </td>
                <td><strong>${money(p.estimated_price)}</strong></td>
                <td>
                  ${p.payment_status === 'pending' ? `
                    <div class="admin-actions">
                      <button class="small-action" data-payment-action="verify" data-req-id="${p.id}" style="color:var(--green); border-color:var(--green);">Verify</button>
                      <button class="small-action" data-payment-action="reject" data-req-id="${p.id}" style="color:var(--red); border-color:var(--red);">Reject</button>
                    </div>
                  ` : `
                    <span class="status ${p.payment_status === 'verified' ? 'completed' : 'danger'}">${p.payment_status === 'verified' ? 'Verified' : 'Rejected'}</span>
                  `}
                </td>
              </tr>
            `).join('') || '<tr><td colspan="4">No payment proofs logged.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function renderAdminPayouts() {
  try {
    const res = await fetch('/api/admin/payouts', { credentials: 'include' });
    const data = await res.json();
    if (data.ok) state.adminPayouts = data.payouts || [];
  } catch (err) {
    console.error(err);
  }

  const payouts = state.adminPayouts || [];

  return `
    ${pageHead('FINANCE', 'Payout Requests', 'Approve specialist withdrawals.')}
    <div class="panel">
      <div class="panel-head"><h3>Disbursement requests (${payouts.length})</h3></div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>PROVIDER</th><th>AMOUNT</th><th>DATE</th><th>ACTION</th></tr>
          </thead>
          <tbody>
            ${payouts.map(po => `
              <tr>
                <td>
                  <strong>${escapeHtml(po.provider_name || 'Specialist')}</strong>
                  <br><small style="color:var(--muted);">Payout #${po.id} · ${escapeHtml(po.provider_phone || po.provider_email || '')}</small>
                </td>
                <td><strong>${money(po.amount)}</strong></td>
                <td>${new Date(po.created_at).toLocaleString()}</td>
                <td>
                  ${po.status === 'pending' ? `
                    <div class="admin-actions">
                      <button class="small-action" data-payout-action="approve" data-payout-id="${po.id}" style="color:var(--green); border-color:var(--green);">Approve</button>
                    </div>
                  ` : `
                    <span class="status ${po.status === 'completed' ? 'completed' : 'danger'}">${po.status === 'completed' ? 'Approved' : po.status}</span>
                  `}
                </td>
              </tr>
            `).join('') || '<tr><td colspan="4">No payout requests logged.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderUsers() {
  const q = (state.userSearch || '').toLowerCase();
  const f = state.userFilter || 'All users';

  const list = (state.adminUsers || []).filter(u => {
    const matchesQuery = (u.full_name + ' ' + u.email + ' ' + u.role).toLowerCase().includes(q);
    const matchesFilter = f === 'All users' ||
      (f === 'Repairman' && u.role === 'provider') ||
      (f === 'Client' && u.role === 'customer');
    return matchesQuery && matchesFilter;
  });

  return `
    ${pageHead('PEOPLE & ACCESS', 'Users and repairmen', 'Manage platform users, roles and verification.')}
    <div class="filter-row">
      <div class="filter-input">
        <span>⌕</span>
        <input id="adminUserSearch" value="${escapeHtml(state.userSearch)}" placeholder="Search by name, email or role..." />
      </div>
      <select class="filter-select" id="adminUserFilter">
        <option ${f === 'All users' ? 'selected' : ''}>All users</option>
        <option ${f === 'Repairman' ? 'selected' : ''}>Repairman</option>
        <option ${f === 'Client' ? 'selected' : ''}>Client</option>
      </select>
    </div>
    <div class="panel">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>USER</th><th>ROLE</th><th>EMAIL / CONTACT</th><th>REGISTERED</th><th>ACTIONS</th></tr>
          </thead>
          <tbody>
            ${list.map(u => `
              <tr>
                <td>
                  <div class="admin-user">
                    <div class="avatar ${u.role === 'provider' ? 'avatar-green' : 'avatar-lilac'}">
                      ${(u.full_name || 'U').slice(0, 2).toUpperCase()}
                    </div>
                    <strong>${escapeHtml(u.full_name)}</strong>
                  </div>
                </td>
                <td><span class="status ${u.role === 'admin' ? 'review' : u.role === 'provider' ? 'progress' : 'completed'}">${u.role}</span></td>
                <td>${escapeHtml(u.email)}<br><small style="color:var(--muted)">${u.phone || 'N/A'}</small></td>
                <td>${new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                  <div class="admin-actions">
                    <button class="small-action" data-user-action="verify" data-user-id="${u.id}" data-user="${escapeHtml(u.full_name)}">
                      ${u.provider_active === false ? 'Activate' : 'Toggle Active'}
                    </button>
                  </div>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="5">No users found.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function renderModeration() {
  let disputes = [];
  try {
    const res = await fetch('/api/admin/disputes', { credentials: 'include' });
    const data = await res.json();
    if (data.ok) disputes = data.disputes || [];
  } catch (err) {
    console.error(err);
  }

  return `
    ${pageHead('QUALITY & TRUST', 'Disputes & moderation', 'Review customer disputes, complaints and service issues.')}
    <div class="panel">
      <div class="panel-head"><h3>Disputes & grievances ledger (${disputes.length})</h3></div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>DISPUTE ID</th><th>BOOKING #</th><th>RAISED BY</th><th>REASON</th><th>STATUS</th><th>DATE</th><th>ACTIONS</th></tr>
          </thead>
          <tbody>
            ${disputes.map(d => `
              <tr>
                <td><strong>#${d.id}</strong></td>
                <td><strong>#${d.request_id}</strong></td>
                <td>${escapeHtml(d.raised_by_name || 'User')}<br><small style="color:var(--muted);">${escapeHtml(d.raised_by_email || '')}</small></td>
                <td>${escapeHtml(d.reason)}</td>
                <td><span class="status ${d.status === 'resolved' ? 'completed' : d.status === 'rejected' ? 'danger' : 'review'}">${d.status}</span></td>
                <td>${new Date(d.created_at).toLocaleDateString()}</td>
                <td>
                  ${d.status === 'open' ? `
                    <div class="admin-actions">
                      <button class="small-action" data-dispute-action="resolve" data-dispute-id="${d.id}" style="color:var(--green); border-color:var(--green);">Resolve</button>
                    </div>
                  ` : `
                    <small style="color:var(--muted);">${d.status}</small>
                  `}
                </td>
              </tr>
            `).join('') || '<tr><td colspan="7">No open disputes filed. All service requests operating normally.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderAllBookings() {
  const q = (state.bookingSearch || '').toLowerCase();
  const f = state.allBookingFilter || 'All statuses';

  const list = (state.adminBookings || []).filter(b => {
    const matchesQ = (String(b.id) + ' ' + (b.category_name || '') + ' ' + (b.customer_name || '') + ' ' + (b.provider_name || '')).toLowerCase().includes(q);
    const norm = normalizeStatus(b.status);
    const matchesF = f === 'All statuses' || norm === f;
    return matchesQ && matchesF;
  });

  return `
    ${pageHead('BOOKING OPERATIONS', 'All bookings', 'Inspect marketplace activity, assignment and status.')}
    <div class="filter-row">
      <div class="filter-input">
        <span>⌕</span>
        <input id="adminBookingSearch" value="${escapeHtml(state.bookingSearch)}" placeholder="Search booking ID, service or specialist..." />
      </div>
      <select class="filter-select" id="adminBookingStatusFilter">
        <option ${f === 'All statuses' ? 'selected' : ''}>All statuses</option>
        <option ${f === 'Pending' ? 'selected' : ''}>Pending</option>
        <option ${f === 'In progress' ? 'selected' : ''}>In progress</option>
        <option ${f === 'Completed' ? 'selected' : ''}>Completed</option>
        <option ${f === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
      </select>
    </div>
    <div class="panel">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>BOOKING ID</th><th>SERVICE</th><th>CLIENT</th><th>SPECIALIST</th><th>DATE</th><th>ESTIMATE</th><th>STATUS</th></tr>
          </thead>
          <tbody>
            ${list.map(b => `
              <tr>
                <td><strong>#${b.id}</strong></td>
                <td>${escapeHtml(b.category_name || 'Service')}</td>
                <td>${escapeHtml(b.customer_name || 'Customer')}</td>
                <td>${escapeHtml(b.provider_name || 'Unassigned')}</td>
                <td>${b.preferred_date}</td>
                <td><strong>${money(b.estimated_price)}</strong></td>
                <td><span class="status ${statusClass(b.status)}">${normalizeStatus(b.status)}</span></td>
              </tr>
            `).join('') || '<tr><td colspan="7">No bookings match the filter.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderReports() {
  const st = state.adminStats || {};
  return `
    ${pageHead('BUSINESS INTELLIGENCE', 'Reports & analytics', 'Understand marketplace growth, service volume and operational health.')}
    <div class="stats-grid">
      ${stat('Gross volume', money(st.gross_volume || st.total_revenue || 0), '৳', 'Total value')}
      ${stat('Platform revenue', money(st.platform_revenue || 0), '↗', '5% platform fee')}
      ${stat('Total bookings', st.total_bookings || 0, '▤', 'All time bookings')}
      ${stat('Registered users', st.total_users || 0, '♙', 'Total user accounts')}
    </div>
    <div class="dashboard-grid">
      <div class="panel">
        <div class="panel-head"><h3>Booking volume overview</h3><span class="eyebrow">ACTIVITY</span></div>
        <div class="chart-bars">
          ${[42, 58, 50, 75, 63, 90, 73].map((v, i) => `
            <div class="bar-col">
              <div class="bar ${i === 5 ? 'active' : ''}" style="height:${v}%"></div>
              <small>${['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</small>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Top categories</h3></div>
        ${[['Appliance Repair', 80], ['Plumbing', 65], ['Electrical', 55], ['Cleaning', 40]].map(([n, v]) => `
          <div style="margin:16px 0">
            <div class="progress-row"><strong>${n}</strong><span>${v}%</span></div>
            <div class="progress-bar"><span style="width:${v}%"></span></div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// Core View Router
// -------------------------------------------------------------
async function render() {
  renderNav();
  const pages = {
    discover: typeof renderDiscover === 'function' ? renderDiscover : null,
    bookings: typeof renderBookings === 'function' ? renderBookings : null,
    tracking: typeof renderTracking === 'function' ? renderTracking : null,
    favorites: typeof renderFavorites === 'function' ? renderFavorites : null,
    profile: typeof renderProfile === 'function' ? renderProfile : null,
    'gig-details': typeof renderGigDetails === 'function' ? renderGigDetails : null,
    overview: typeof renderRepairOverview === 'function' ? renderRepairOverview : null,
    'my-gigs': typeof renderGigs === 'function' ? renderGigs : null,
    requests: typeof renderRequests === 'function' ? renderRequests : null,
    availability: typeof renderProviderAvailability === 'function' ? renderProviderAvailability : null,
    earnings: typeof renderEarnings === 'function' ? renderEarnings : null,
    'repair-profile': typeof renderRepairProfile === 'function' ? renderRepairProfile : null,
    'admin-overview': typeof renderAdminOverview === 'function' ? renderAdminOverview : null,
    payments: typeof renderAdminPayments === 'function' ? renderAdminPayments : null,
    payouts: typeof renderAdminPayouts === 'function' ? renderAdminPayouts : null,
    users: typeof renderUsers === 'function' ? renderUsers : null,
    moderation: typeof renderModeration === 'function' ? renderModeration : null,
    'all-bookings': typeof renderAllBookings === 'function' ? renderAllBookings : null,
    reports: typeof renderReports === 'function' ? renderReports : null
  };

  const contentArea = document.getElementById('content');
  if (!contentArea) return;

  const currentPage = pages[state.page];
  if (typeof currentPage === 'function') {
    try {
      const res = await currentPage();
      if (res != null) {
        contentArea.innerHTML = res;
      }
    } catch (e) {
      console.error('Render error on page:', state.page, e);
      contentArea.innerHTML = `<div class="empty-state" style="color:red; padding: 20px;">Error rendering ${state.page}: ${e.message}</div>`;
    }
  } else {
    contentArea.innerHTML = `<div class="empty-state" style="padding: 20px;">Page "${state.page}" is not implemented yet.</div>`;
  }
}

function goPage(page) {
  if (state.role === 'guest' && page !== 'discover' && page !== 'gig-details') {
    const authScreen = document.getElementById('auth-screen');
    if (authScreen) authScreen.classList.add('open');
    const errEl = document.getElementById('auth-error');
    if (errEl) {
      errEl.textContent = 'Please sign in to access this page.';
      errEl.style.display = 'block';
    }
    return;
  }
  state.page = page;
  $('#sidebar').classList.remove('open');
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// -------------------------------------------------------------
// Global Event Handlers
// -------------------------------------------------------------
document.addEventListener('click', async (e) => {
  // Navigation
  const pageBtn = e.target.closest('[data-page]');
  if (pageBtn) {
    goPage(pageBtn.dataset.page);
    return;
  }

  // Sign in button in topbar
  const loginBtn = e.target.closest('#login-btn');
  if (loginBtn) {
    const authScreen = document.getElementById('auth-screen');
    if (authScreen) authScreen.classList.add('open');
    const errEl = document.getElementById('auth-error');
    if (errEl) errEl.style.display = 'none';
    return;
  }

  // Close auth screen modal
  const closeAuth = e.target.closest('#closeAuthScreen');
  if (closeAuth) {
    document.getElementById('auth-screen')?.classList.remove('open');
    return;
  }

  // Location pill click -> Open area modal
  const locPill = e.target.closest('#location-pill') || e.target.closest('.location-pill');
  if (locPill) {
    const areas = ['Dhanmondi', 'Mirpur', 'Gulshan', 'Uttara', 'Banani', 'Mohammadpur'];
    openModal(
      'Select your area',
      `
        <div style="font-size:14px; margin-bottom:16px; color:var(--muted);">Select your neighborhood in Dhaka to find verified local specialists nearby:</div>
        <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:12px;">
          ${areas.map(a => `
            <button type="button" class="secondary-btn" data-select-area="${a}" style="padding:14px; font-weight:600; font-size:14px; text-align:center; justify-content:center; cursor:pointer; display:flex; align-items:center; gap:8px; border-radius:10px; ${state.userLocation && state.userLocation.includes(a) ? 'border-color:var(--blue); color:var(--blue); background:rgba(37,99,235,0.08); font-weight:700;' : ''}">
              <i class="bi bi-geo-alt"></i> ${a}
            </button>
          `).join('')}
        </div>
      `,
      'SERVICE LOCATION'
    );
    return;
  }

  // Area Selection in Location Modal
  const selectAreaBtn = e.target.closest('[data-select-area]');
  if (selectAreaBtn) {
    const area = selectAreaBtn.dataset.selectArea;
    state.userLocation = area;
    closeModal();
    const locText = document.getElementById('currentLocationText');
    if (locText) {
      locText.textContent = `${area}, Dhaka`;
    }
    const locPillStrong = document.querySelector('.location-pill strong');
    if (locPillStrong) {
      locPillStrong.textContent = `${area}, Dhaka`;
    }
    render();
    toast(`Location updated to ${area}`);
    return;
  }

  // Save profile top button
  const saveProfileTopBtn = e.target.closest('#saveProfileTopBtn');
  if (saveProfileTopBtn) {
    const pf = document.getElementById('profileForm');
    if (pf) pf.requestSubmit();
    return;
  }

  // Service card click -> Gig Details
  const serviceCardEl = e.target.closest('.service-card');
  if (serviceCardEl && !e.target.closest('button')) {
    const provId = serviceCardEl.dataset.providerId || 2;
    state.viewingGigId = Number(provId);
    goPage('gig-details');
    return;
  }

  // Back to discover button from gig details
  const backToDiscoverBtn = e.target.closest('#backToDiscoverBtn');
  if (backToDiscoverBtn) {
    goPage('discover');
    return;
  }

  // Book gig button from gig details
  const bookGigNowBtn = e.target.closest('#bookGigNowBtn');
  if (bookGigNowBtn) {
    const catSlug = bookGigNowBtn.dataset.categorySlug || 'appliance-repair';
    const provId = bookGigNowBtn.dataset.providerId;
    openBooking(catSlug, provId);
    return;
  }

  // Open Add Address Modal
  const openAddAddrBtn = e.target.closest('#openAddAddressModalBtn');
  if (openAddAddrBtn) {
    openModal('Add Address', `
      <form id="addAddressForm">
        <div class="form-grid">
          <div class="form-field full"><label>Address Label</label><input name="label" placeholder="e.g. Home, Office" value="Home" required></div>
          <div class="form-field full"><label>Street Address</label><textarea name="address_line" placeholder="House 12, Road 4, Dhanmondi, Dhaka" required></textarea></div>
          <div class="form-field full" style="display:flex; align-items:center; gap:8px;">
            <input type="checkbox" id="isDefaultCheck" name="is_default" value="true" style="width:auto; cursor:pointer;">
            <label for="isDefaultCheck" style="margin:0; cursor:pointer;">Set as default address</label>
          </div>
        </div>
        <div class="modal-actions" style="margin-top:20px;">
          <button type="button" class="secondary-btn" id="cancelModal">Cancel</button>
          <button type="submit" class="primary-btn">Save Address</button>
        </div>
      </form>
    `);
    return;
  }

  // Edit Address Modal
  const editAddrBtn = e.target.closest('[data-edit-address-id]');
  if (editAddrBtn) {
    const addrId = editAddrBtn.dataset.editAddressId;
    const label = editAddrBtn.dataset.label || 'Home';
    const line = editAddrBtn.dataset.line || '';
    const isDef = editAddrBtn.dataset.default === 'true';
    openModal('Edit Address', `
      <form id="editAddressForm" data-id="${addrId}">
        <div class="form-grid">
          <div class="form-field full"><label>Address Label</label><input name="label" value="${escapeHtml(label)}" required></div>
          <div class="form-field full"><label>Street Address</label><textarea name="address_line" required>${escapeHtml(line)}</textarea></div>
          <div class="form-field full" style="display:flex; align-items:center; gap:8px;">
            <input type="checkbox" id="isDefaultEditCheck" name="is_default" value="true" ${isDef ? 'checked' : ''} style="width:auto; cursor:pointer;">
            <label for="isDefaultEditCheck" style="margin:0; cursor:pointer;">Set as default address</label>
          </div>
        </div>
        <div class="modal-actions" style="margin-top:20px;">
          <button type="button" class="secondary-btn" id="cancelModal">Cancel</button>
          <button type="submit" class="primary-btn">Update Address</button>
        </div>
      </form>
    `);
    return;
  }

  // Delete Address
  const delAddrBtn = e.target.closest('[data-delete-address-id]');
  if (delAddrBtn) {
    const addrId = delAddrBtn.dataset.deleteAddressId;
    try {
      const res = await fetch(`/api/addresses/${addrId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to delete address');
      toast('Address removed.');
      await loadAddresses();
      await render();
    } catch (err) {
      toast('Error: ' + err.message);
    }
    return;
  }

  // Reschedule Request Modal
  const rescheduleBtn = e.target.closest('#rescheduleRequestBtn');
  if (rescheduleBtn) {
    const reqId = rescheduleBtn.dataset.id;
    const currentDate = rescheduleBtn.dataset.date || new Date().toISOString().split('T')[0];
    openModal('Reschedule Appointment', `
      <form id="rescheduleForm" data-id="${reqId}">
        <div class="form-grid">
          <div class="form-field full">
            <label>New Service Date</label>
            <input type="date" name="new_date" min="${new Date().toISOString().split('T')[0]}" value="${currentDate}" required />
          </div>
          <div class="form-field full">
            <label>New Time Window</label>
            <select name="time_window">
              <option value="09:00-11:00">09:00 AM – 11:00 AM</option>
              <option value="11:00-13:00">11:00 AM – 01:00 PM</option>
              <option value="14:00-16:00" selected>02:00 PM – 04:00 PM</option>
              <option value="16:00-18:00">04:00 PM – 06:00 PM</option>
            </select>
          </div>
        </div>
        <div class="modal-actions" style="margin-top:20px;">
          <button type="button" class="secondary-btn" id="cancelModal">Cancel</button>
          <button type="submit" class="primary-btn">Confirm Reschedule</button>
        </div>
      </form>
    `);
    return;
  }

  // Category filter in Discover
  const catBtn = e.target.closest('[data-category]');
  if (catBtn) {
    state.category = catBtn.dataset.category;
    state.query = '';
    render();
    return;
  }

  // Book service
  const bookBtn = e.target.closest('[data-book]');
  if (bookBtn) {
    openBooking(bookBtn.dataset.book);
    return;
  }

  // Track service
  const trackBtn = e.target.closest('[data-track]');
  if (trackBtn) {
    state.activeRequestId = trackBtn.dataset.track;
    goPage('tracking');
    return;
  }

  // Booking filters
  const bfBtn = e.target.closest('[data-booking-filter]');
  if (bfBtn) {
    state.bookingFilter = bfBtn.dataset.bookingFilter;
    render();
    return;
  }

  // Provider Accept
  const acceptBtn = e.target.closest('[data-accept-req]');
  if (acceptBtn) {
    const reqId = acceptBtn.dataset.acceptReq;
    try {
      const res = await fetch(`/api/requests/${reqId}/accept`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Accept failed');
      toast('Request accepted successfully!');
      await loadProviderData();
      render();
    } catch (err) {
      toast('Error: ' + err.message);
    }
    return;
  }

  // Provider Decline / Reject
  const rejectBtn = e.target.closest('[data-reject-req]');
  if (rejectBtn) {
    const reqId = rejectBtn.dataset.rejectReq;
    try {
      const res = await fetch(`/api/requests/${reqId}/reject`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Decline failed');
      toast('Request declined.');
      await loadProviderData();
      render();
    } catch (err) {
      toast('Error: ' + err.message);
    }
    return;
  }

  // Provider Advance Status
  const advBtn = e.target.closest('[data-advance-req]');
  if (advBtn) {
    const reqId = advBtn.dataset.advanceReq;
    const nextStatus = advBtn.dataset.next;
    try {
      const res = await fetch(`/api/requests/${reqId}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (!res.ok) throw new Error('Status transition failed');
      toast(`Status updated to ${normalizeStatus(nextStatus)}!`);
      await loadProviderData();
      render();
    } catch (err) {
      toast('Error: ' + err.message);
    }
    return;
  }

  // Customer Cancel Request
  const cancelReqBtn = e.target.closest('#cancelRequestBtn');
  if (cancelReqBtn) {
    const reqId = cancelReqBtn.dataset.id;
    try {
      const res = await fetch(`/api/requests/${reqId}/cancel`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Cancel failed');
      toast('Request cancelled successfully.');
      await loadMyBookings();
      render();
    } catch (err) {
      toast('Error: ' + err.message);
    }
    return;
  }

  // Customer Rate Service
  const rateBtn = e.target.closest('#rateServiceBtn');
  if (rateBtn) {
    const reqId = rateBtn.dataset.id;
    openModal(
      'Rate your service',
      `
        <form id="ratingForm" data-id="${reqId}">
          <div class="form-grid">
            <div class="form-field full">
              <label>Rating (1 to 5 Stars)</label>
              <select name="rating_stars" style="font-size:16px;">
                <option value="5">★★★★★ (5 Stars - Exceptional)</option>
                <option value="4">★★★★☆ (4 Stars - Very Good)</option>
                <option value="3">★★★☆☆ (3 Stars - Satisfactory)</option>
                <option value="2">★★☆☆☆ (2 Stars - Needs Improvement)</option>
                <option value="1">★☆☆☆☆ (1 Star - Poor)</option>
              </select>
            </div>
            <div class="form-field full">
              <label>Review comment</label>
              <textarea name="review_comment" placeholder="Describe the quality of service, punctuality, and workmanship..."></textarea>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="secondary-btn" id="cancelModal">Cancel</button>
            <button class="primary-btn" type="submit">Submit Rating</button>
          </div>
        </form>
      `
    );
    return;
  }

  // View Invoice
  const viewInvBtn = e.target.closest('#viewInvoiceBtn');
  if (viewInvBtn) {
    const reqId = viewInvBtn.dataset.id;
    try {
      const res = await fetch(`/api/invoices/by-request/${reqId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Invoice not found');
      const data = await res.json();
      const inv = data.invoice;
      openModal(
        `Invoice ${inv.invoice_number}`,
        `
          <div style="padding:10px 0;">
            <div style="display:flex; justify-content:space-between; margin-bottom:14px; border-bottom:1px solid #edf0f5; padding-bottom:12px;">
              <div>
                <strong>Customer: ${escapeHtml(inv.customer_name || 'Client')}</strong>
                <div style="font-size:12px; color:var(--muted);">${inv.customer_phone || ''}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:12px; color:var(--muted);">Date: ${new Date(inv.issued_at).toLocaleDateString()}</div>
                <span class="status completed">Paid</span>
              </div>
            </div>
            <table style="width:100%; border-collapse:collapse; font-size:13px; margin:16px 0;">
              <tr style="border-bottom:1px solid #edf0f5;"><th style="text-align:left; padding:8px 0;">Description</th><th style="text-align:right; padding:8px 0;">Amount</th></tr>
              <tr style="border-bottom:1px solid #edf0f5;"><td style="padding:8px 0;">${escapeHtml(inv.category_name || 'Home Service Execution')}</td><td style="text-align:right; padding:8px 0;">${money(inv.subtotal)}</td></tr>
              <tr style="border-bottom:1px solid #edf0f5;"><td style="padding:8px 0;">Platform Tax / Fee (5%)</td><td style="text-align:right; padding:8px 0;">${money(inv.tax_amount)}</td></tr>
              <tr style="font-weight:700; font-size:15px;"><td style="padding:10px 0;">Total Paid</td><td style="text-align:right; padding:10px 0; color:var(--blue);">${money(inv.total)}</td></tr>
            </table>
          </div>
          <div class="modal-actions">
            <button type="button" class="secondary-btn" id="cancelModal">Close</button>
            <button type="button" class="primary-btn" onclick="window.print()">Print invoice 🖨️</button>
          </div>
        `,
        'INVOICE RECEIPT'
      );
    } catch (err) {
      toast('Error loading invoice: ' + err.message);
    }
    return;
  }

  // Notifications Bell toggle
  const notifBtn = e.target.closest('#notificationBtn');
  if (notifBtn) {
    const dropdown = $('#notificationsDropdown');
    if (!dropdown) return;
    const isVisible = dropdown.style.display === 'block';
    dropdown.style.display = isVisible ? 'none' : 'block';

    if (!isVisible) {
      // Mark read-all
      fetch('/api/notifications/read-all', { method: 'POST', credentials: 'include' }).catch(() => {});
      const badge = $('#notificationBtn i');
      if (badge) badge.style.display = 'none';

      const listEl = $('#notificationsList');
      if (listEl) {
        listEl.innerHTML = (state.notifications || []).map(n => `
          <div style="padding:8px; border-radius:8px; background:#f7f8fc; font-size:12px;">
            <strong style="display:block; color:#172238;">${escapeHtml(n.title)}</strong>
            <p style="margin:3px 0 4px; color:#596477;">${escapeHtml(n.body)}</p>
            <small style="color:#9aa2b0;">${new Date(n.created_at).toLocaleString()}</small>
          </div>
        `).join('') || '<div style="color:var(--muted); font-size:13px; text-align:center; padding:10px;">You’re all caught up.</div>';
      }
    }
    return;
  }

  // Close notifications dropdown on outside click
  if (!e.target.closest('#notificationsDropdown') && !e.target.closest('#notificationBtn')) {
    const dropdown = $('#notificationsDropdown');
    if (dropdown) dropdown.style.display = 'none';
  }

  // Admin User Actions
  const userActionBtn = e.target.closest('[data-user-action]');
  if (userActionBtn) {
    const uName = userActionBtn.dataset.user;
    const uId = userActionBtn.dataset.userId;
    const act = userActionBtn.dataset.userAction;
    if (act === 'verify' && uId) {
      try {
        const res = await fetch(`/api/admin/users/${uId}/verify`, { method: 'PATCH', credentials: 'include' });
        const d = await res.json();
        if (d.ok) {
          toast(d.is_active ? 'Specialist verified and active' : 'Specialist deactivated');
          await loadAdminData();
          render();
        } else {
          toast(d.error || 'Failed to update user status');
        }
      } catch (err) {
        toast('Error: ' + err.message);
      }
      return;
    }
    toast(`Action logged (demo): ${act} user ${uName}`);
    return;
  }

  // Payment Verification Actions
  const payActBtn = e.target.closest('[data-payment-action]');
  if (payActBtn) {
    const act = payActBtn.dataset.paymentAction;
    const reqId = payActBtn.dataset.reqId;
    try {
      const res = await fetch(`/api/admin/payments/${reqId}/verify`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: act })
      });
      const d = await res.json();
      if (d.ok) {
        toast(`Payment #${reqId} ${act === 'verify' ? 'verified' : 'rejected'}`);
        render();
      } else {
        toast(d.error || 'Failed to update payment');
      }
    } catch (err) {
      toast('Error: ' + err.message);
    }
    return;
  }

  // Payout Approval Actions
  const poActBtn = e.target.closest('[data-payout-action]');
  if (poActBtn) {
    const poId = poActBtn.dataset.payoutId;
    try {
      const res = await fetch(`/api/admin/payouts/${poId}/approve`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      });
      const d = await res.json();
      if (d.ok) {
        toast(`Payout #${poId} approved!`);
        render();
      } else {
        toast(d.error || 'Failed to approve payout');
      }
    } catch (err) {
      toast('Error: ' + err.message);
    }
    return;
  }

  // Dispute Resolution Actions
  const dispActBtn = e.target.closest('[data-dispute-action]');
  if (dispActBtn) {
    const dispId = dispActBtn.dataset.disputeId;
    try {
      const res = await fetch(`/api/admin/disputes/${dispId}/resolve`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' })
      });
      const d = await res.json();
      if (d.ok) {
        toast(`Dispute #${dispId} marked as resolved.`);
        render();
      } else {
        toast(d.error || 'Failed to resolve dispute');
      }
    } catch (err) {
      toast('Error: ' + err.message);
    }
    return;
  }

  // Delete Blackout Button
  const delBlackoutBtn = e.target.closest('[data-delete-blackout-id]');
  if (delBlackoutBtn) {
    const bId = delBlackoutBtn.dataset.deleteBlackoutId;
    try {
      const res = await fetch(`/api/provider/blackouts/${bId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const d = await res.json();
      if (d.ok) {
        toast('Blackout date removed.');
        render();
      } else {
        toast(d.error || 'Failed to remove blackout');
      }
    } catch (err) {
      toast('Error: ' + err.message);
    }
    return;
  }

  // Top Save Availability Button
  if (e.target.closest('#saveAvailabilityTopBtn')) {
    const af = document.getElementById('availabilityForm');
    if (af) af.dispatchEvent(new Event('submit'));
    return;
  }

  // Search button
  if (e.target.closest('#searchBtn')) {
    state.query = $('#serviceSearch')?.value || '';
    render();
    return;
  }

  // Mobile menu toggle
  if (e.target.closest('#mobileMenu')) {
    $('#sidebar').classList.toggle('open');
    return;
  }

  // Modal close buttons
  if (e.target.closest('#closeModal') || e.target.closest('#cancelModal')) {
    closeModal();
    return;
  }
  if (e.target.id === 'modalBackdrop') {
    closeModal();
    return;
  }

  // Payout Request Modal
  if (e.target.closest('#payoutBtn')) {
    openModal(
      'Request Payout',
      `
        <div style="font-size:14px; margin-bottom:12px; color:var(--text);">Enter payout amount to withdraw from your available balance:</div>
        <form id="payoutRequestForm">
          <div class="form-grid">
            <div class="form-field full">
              <label>Payout Amount (৳)</label>
              <input type="number" id="payoutAmountInput" min="50" step="50" placeholder="e.g. 500" required />
            </div>
          </div>
          <div class="modal-actions" style="margin-top:20px; display:flex; justify-content:flex-end; gap:10px;">
            <button type="button" class="secondary-btn" id="cancelModal">Cancel</button>
            <button class="primary-btn" type="submit">Submit Request ↗</button>
          </div>
        </form>
      `
    );
    const pForm = $('#payoutRequestForm');
    pForm?.addEventListener('submit', async (pev) => {
      pev.preventDefault();
      const amt = Number($('#payoutAmountInput')?.value);
      if (!amt || amt <= 0) return toast('Please enter a valid amount');
      try {
        const res = await fetch('/api/provider/payouts', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: amt })
        });
        const d = await res.json();
        if (res.ok && d.ok) {
          closeModal();
          toast('Payout request submitted successfully!');
          render();
        } else {
          toast(d.error || 'Failed to request payout');
        }
      } catch (err) {
        toast('Error requesting payout: ' + err.message);
      }
    });
    return;
  }

  // Fallback toasts for un-implemented / demo buttons
  if (e.target.closest('#saveProfileBtn') || e.target.closest('#saveRepairProfile')) {
    toast('Profile saved locally.');
    return;
  }
  if (e.target.closest('#newGigBtn') || e.target.closest('[data-edit-gig]')) {
    toast('Gig editing arrives in a later phase.');
    return;
  }
  if (e.target.closest('#supportBtn')) {
    toast('Support team notified (demo action).');
    return;
  }
  if (e.target.closest('#markAllReadBtn')) {
    await fetch('/api/notifications/read-all', { method: 'POST', credentials: 'include' });
    toast('All notifications marked as read.');
    await loadNotifications();
    return;
  }
});

// Dynamic Inputs
document.addEventListener('input', (e) => {
  if (e.target.id === 'serviceSearch') {
    state.query = e.target.value;
    if (e.target.value.length === 0) render();
  }
  if (e.target.id === 'adminUserSearch') {
    state.userSearch = e.target.value;
    render();
  }
  if (e.target.id === 'adminBookingSearch') {
    state.bookingSearch = e.target.value;
    render();
  }
});

document.addEventListener('change', (e) => {
  if (e.target.id === 'adminUserFilter') {
    state.userFilter = e.target.value;
    render();
  }
  if (e.target.id === 'adminBookingStatusFilter') {
    state.allBookingFilter = e.target.value;
    render();
  }
});

// -------------------------------------------------------------
// Form Submissions
// -------------------------------------------------------------
document.addEventListener('submit', async (e) => {
  // Profile update form submission
  if (e.target.id === 'profileForm') {
    e.preventDefault();
    const form = e.target;
    const full_name = form.querySelector('#profFullName')?.value?.trim();
    const email = form.querySelector('#profEmail')?.value?.trim();
    const phone = form.querySelector('#profPhone')?.value?.trim();
    const old_password = form.querySelector('#profOldPassword')?.value;
    const password = form.querySelector('#profPassword')?.value;

    const payload = { full_name, email, phone };
    if (password) {
      if (!old_password) {
        toast('Old password required to change password');
        return;
      }
      payload.old_password = old_password;
      payload.password = password;
    }

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        toast(data.error || 'Failed to update profile');
        return;
      }
      state.user = data.user;
      toast('Profile updated successfully');
      render();
    } catch (err) {
      toast('Error updating profile: ' + err.message);
    }
    return;
  }

  // Provider Availability Form Submission
  if (e.target.id === 'availabilityForm') {
    e.preventDefault();
    const form = e.target;
    const availabilityItems = [];
    for (let day = 0; day <= 6; day++) {
      const cb = form.querySelector(`input[name="day_active_${day}"]`);
      if (cb && cb.checked) {
        const startVal = form.querySelector(`input[name="start_time_${day}"]`)?.value || '09:00';
        const endVal = form.querySelector(`input[name="end_time_${day}"]`)?.value || '17:00';
        const [sH, sM] = startVal.split(':').map(Number);
        const [eH, eM] = endVal.split(':').map(Number);
        availabilityItems.push({
          weekday: day,
          start_minute: sH * 60 + (sM || 0),
          end_minute: eH * 60 + (eM || 0)
        });
      }
    }
    try {
      const res = await fetch('/api/provider/availability', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: availabilityItems })
      });
      const d = await res.json();
      if (d.ok) {
        toast('Weekly schedule saved successfully!');
        render();
      } else {
        toast(d.error || 'Failed to save schedule');
      }
    } catch (err) {
      toast('Error saving schedule: ' + err.message);
    }
    return;
  }

  // Blackout Date Form Submission
  if (e.target.id === 'blackoutForm') {
    e.preventDefault();
    const blackoutDate = $('#blackoutDateInput')?.value;
    const reason = $('#blackoutReasonInput')?.value?.trim();
    if (!blackoutDate) {
      toast('Please select a blackout date');
      return;
    }
    try {
      const res = await fetch('/api/provider/blackouts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blackout_date: blackoutDate, reason })
      });
      const d = await res.json();
      if (d.ok) {
        toast('Blackout date added successfully!');
        render();
      } else {
        toast(d.error || 'Failed to add blackout');
      }
    } catch (err) {
      toast('Error: ' + err.message);
    }
    return;
  }

  // 1. Smart Matching Form Submission (Step 1)
  if (e.target.id === 'matchForm') {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);

    const timeWindow = fd.get('time_window') || '14:00-16:00';
    const [startStr, endStr] = timeWindow.split('-');
    const [sH, sM] = startStr.split(':').map(Number);
    const [eH, eM] = endStr.split(':').map(Number);
    const preferred_start_minute = sH * 60 + (sM || 0);
    const preferred_end_minute = eH * 60 + (eM || 0);

    const matchPayload = {
      category_slug: fd.get('category_slug'),
      preferred_date: fd.get('preferred_date'),
      preferred_start_minute,
      preferred_end_minute,
      urgency: fd.get('urgency') || 'normal',
      address: fd.get('address')
    };

    const container = $('#matchCandidatesContainer');
    const actions = $('#bookingModalActions');
    container.innerHTML = `<div style="text-align:center; padding:15px; color:var(--muted);"><small>Scoring specialists using multi-factor matching...</small></div>`;

    try {
      const res = await fetch('/api/requests/match', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matchPayload)
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to match providers');
      }

      const candidates = data.candidates || [];
      if (candidates.length === 0) {
        container.innerHTML = `<div style="padding:15px; background:#fff8e9; border-radius:10px; color:#856404; font-size:13px;">No available specialists found for this slot. Please try another date or time.</div>`;
        return;
      }

      // Hide find button
      if (actions) actions.style.display = 'none';

      container.innerHTML = `
        <div style="font-size:13px; font-weight:700; margin:15px 0 10px; color:#172238;">Ranked Specialist Matches (${candidates.length})</div>
        <div style="display:grid; gap:10px;">
          ${candidates.map(c => `
            <div style="border:1px solid #edf0f5; border-radius:12px; padding:12px; display:flex; justify-content:space-between; align-items:center; background:#fafbfe;">
              <div>
                <strong style="font-size:14px; color:#172238;">${escapeHtml(c.provider.name)}</strong>
                <div style="font-size:12px; color:var(--muted); margin-top:2px;">
                  ★ ${c.provider.rating} (${c.provider.rating_count} reviews) · ${c.provider.address}
                </div>
                <div style="font-size:12px; color:var(--green); font-weight:600; margin-top:2px;">
                  Match score: ${(c.score * 100).toFixed(0)}% · Rate: ${money(c.provider.price)}/hr
                </div>
              </div>
              <button type="button" class="primary-btn" data-confirm-book-prov="${c.provider.id}" style="padding:8px 14px; font-size:12px; min-height:36px;">
                Book this specialist ↗
              </button>
            </div>
          `).join('')}
        </div>
      `;

      // Attach click listener for candidate booking -> leads to mock payment checkout step
      container.querySelectorAll('[data-confirm-book-prov]').forEach(btn => {
        btn.addEventListener('click', () => {
          const provId = btn.dataset.confirmBookProv;
          const matchedCand = candidates.find(c => String(c.provider.id) === String(provId));
          const baseRate = matchedCand ? Number(matchedCand.provider.price || 1000) : 1000;
          const tax = Math.round(baseRate * 0.05);
          const totalPrice = baseRate + tax;

          const bookFd = new FormData();
          bookFd.append('category_slug', matchPayload.category_slug);
          bookFd.append('provider_id', provId);
          bookFd.append('preferred_date', matchPayload.preferred_date);
          bookFd.append('preferred_start_minute', String(matchPayload.preferred_start_minute));
          bookFd.append('preferred_end_minute', String(matchPayload.preferred_end_minute));
          bookFd.append('urgency', matchPayload.urgency);
          bookFd.append('address', matchPayload.address);
          bookFd.append('description', fd.get('description') || '');
          bookFd.append('phone', fd.get('phone') || '');

          const imgFile = form.querySelector('input[name="image"]')?.files[0];
          if (imgFile) {
            bookFd.append('image', imgFile);
          }

          // Render Manual Mobile Banking Payment Step
          container.innerHTML = `
            <div id="mockPaymentStep" style="margin-top:10px;">
              <div style="background:#f8fafc; border:1px solid var(--line); border-radius:12px; padding:16px; margin-bottom:16px;">
                <div style="font-size:14px; font-weight:700; color:var(--text); margin-bottom:12px;">Booking & Payment Summary</div>
                <div style="display:flex; justify-content:space-between; font-size:13px; color:var(--text); margin-bottom:6px;">
                  <span>Specialist Base Rate</span>
                  <strong>${money(baseRate)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:13px; color:var(--muted); margin-bottom:8px;">
                  <span>Service Tax & Platform Fee (5%)</span>
                  <span>${money(tax)}</span>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:16px; font-weight:800; color:var(--blue); border-top:1px solid var(--line); padding-top:10px;">
                  <span>Total Amount</span>
                  <span>${money(totalPrice)}</span>
                </div>
              </div>

              <div style="background:#fff9eb; border:1px solid #f6d289; border-radius:10px; padding:12px; margin-bottom:16px; font-size:13px; color:#854d0e;">
                <strong>Payment Instructions:</strong><br>
                Please send <strong>${money(totalPrice)}</strong> to bKash/Nagad: <strong>01712345678</strong> (Merchant) and enter your transaction details below.
              </div>

              <!-- Manual payment form -->
              <form id="mockPaymentForm">
                <div class="form-grid">
                  <div class="form-field">
                    <label>Payment Method</label>
                    <select id="payMethodInput" name="payment_method">
                      <option value="bkash">bKash (Merchant: 01712345678)</option>
                      <option value="nagad">Nagad (Merchant: 01712345678)</option>
                    </select>
                  </div>
                  <div class="form-field">
                    <label>Sender Mobile Number</label>
                    <input type="text" id="senderNumberInput" name="sender_number" placeholder="e.g. 01712345678" value="${escapeHtml(state.user?.phone || '')}" required />
                  </div>
                  <div class="form-field full">
                    <label>bKash / Nagad Transaction ID (TrxID)</label>
                    <input type="text" id="trxIdInput" name="trx_id" placeholder="e.g. 9B8A7C6D5E" required />
                  </div>
                </div>
                <div class="modal-actions" style="margin-top:20px; display:flex; justify-content:flex-end; gap:10px;">
                  <button type="button" class="secondary-btn" id="cancelPaymentBtn">Back</button>
                  <button type="submit" class="primary-btn" id="paySubmitBtn">Submit Payment Proof ↗</button>
                </div>
              </form>
            </div>
          `;

          // Handle Back button
          container.querySelector('#cancelPaymentBtn')?.addEventListener('click', () => {
            form.dispatchEvent(new Event('submit'));
          });

          // Handle Payment Form submission
          const payForm = container.querySelector('#mockPaymentForm');
          payForm.addEventListener('submit', async (pEv) => {
            pEv.preventDefault();
            const payMethod = payForm.querySelector('#payMethodInput')?.value || 'bkash';
            const senderNum = payForm.querySelector('#senderNumberInput')?.value?.trim();
            const trxVal = payForm.querySelector('#trxIdInput')?.value?.trim();

            if (!senderNum || !trxVal) {
              toast('Please enter both sender mobile number and Transaction ID (TrxID)');
              return;
            }

            bookFd.set('payment_method', payMethod);
            bookFd.set('sender_number', senderNum);
            bookFd.set('trx_id', trxVal);

            const payBtn = payForm.querySelector('#paySubmitBtn');
            payBtn.disabled = true;
            payBtn.innerHTML = '<span style="display:inline-block; animation:spin 1s linear infinite;">⏳</span> Submitting proof...';

            try {
              const bookRes = await fetch('/api/requests', {
                method: 'POST',
                credentials: 'include',
                body: bookFd
              });
              const bookData = await bookRes.json();

              if (bookRes.status === 409) {
                // Concurrency slot conflict with suggestions
                const suggestions = bookData.suggestions || [];
                container.innerHTML = `
                  <div style="padding:15px; background:#fff0f0; border-radius:10px; color:var(--red); font-size:13px; margin-bottom:12px;">
                    ${bookData.error || 'This slot was just booked by another client.'}
                  </div>
                  ${suggestions.length > 0 ? `
                    <div style="font-size:13px; font-weight:700; margin-bottom:8px;">Suggested alternative slots:</div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                      ${suggestions.map(sg => `
                        <button type="button" class="pill-filter active" data-pick-suggested="${sg.start_minute}-${sg.end_minute}">
                          ${minutesToTime(sg.start_minute)} – ${minutesToTime(sg.end_minute)}
                        </button>
                      `).join('')}
                    </div>
                  ` : ''}
                `;

                container.querySelectorAll('[data-pick-suggested]').forEach(sBtn => {
                  sBtn.addEventListener('click', () => {
                    const [sMin, eMin] = sBtn.dataset.pickSuggested.split('-').map(Number);
                    matchPayload.preferred_start_minute = sMin;
                    matchPayload.preferred_end_minute = eMin;
                    form.dispatchEvent(new Event('submit'));
                  });
                });
                return;
              }

              if (!bookRes.ok || !bookData.ok) {
                throw new Error(bookData.error || 'Failed to create booking');
              }

              closeModal();
              await loadMyBookings();
              state.bookingFilter = 'All';
              state.activeRequestId = bookData.request.id;
              toast('Booking submitted! We are verifying your payment.');
              goPage('tracking');
            } catch (bErr) {
              toast('Booking error: ' + bErr.message);
              payBtn.disabled = false;
              payBtn.textContent = 'Submit Payment Proof ↗';
            }
          });
        });
      });

    } catch (err) {
      container.innerHTML = `<div style="padding:15px; color:var(--red); font-size:13px;">Error: ${err.message}</div>`;
      if (actions) actions.style.display = 'flex';
    }
  }

  // 2. Rating Submission Form
  if (e.target.id === 'ratingForm') {
    e.preventDefault();
    const reqId = e.target.dataset.id;
    const fd = new FormData(e.target);
    const rating_stars = Number(fd.get('rating_stars')) || 5;
    const review_comment = fd.get('review_comment') || '';

    try {
      const res = await fetch(`/api/ratings/by-request/${reqId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating_stars, review_comment })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Rating failed');
      closeModal();
      toast('Thank you for rating your specialist!');
      render();
    } catch (err) {
      toast('Rating error: ' + err.message);
    }
    return;
  }

  // 3. Add Address Form
  if (e.target.id === 'addAddressForm') {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = {
      label: fd.get('label') || 'Home',
      address_line: fd.get('address_line'),
      is_default: fd.get('is_default') === 'true' || e.target.querySelector('input[name="is_default"]')?.checked
    };
    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to save address');
      closeModal();
      toast('Address saved successfully');
      await loadAddresses();
      await render();
    } catch (err) {
      toast('Error: ' + err.message);
    }
    return;
  }

  // 4. Edit Address Form
  if (e.target.id === 'editAddressForm') {
    e.preventDefault();
    const id = e.target.dataset.id;
    const fd = new FormData(e.target);
    const body = {
      label: fd.get('label'),
      address_line: fd.get('address_line'),
      is_default: fd.get('is_default') === 'true' || e.target.querySelector('input[name="is_default"]')?.checked
    };
    try {
      const res = await fetch(`/api/addresses/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to update address');
      closeModal();
      toast('Address updated successfully');
      await loadAddresses();
      await render();
    } catch (err) {
      toast('Error: ' + err.message);
    }
    return;
  }

  // 5. Reschedule Form
  if (e.target.id === 'rescheduleForm') {
    e.preventDefault();
    const id = e.target.dataset.id;
    const fd = new FormData(e.target);
    const newDate = fd.get('new_date');
    const timeWindow = fd.get('time_window') || '14:00-16:00';
    const [startStr, endStr] = timeWindow.split('-');
    const [sH, sM] = startStr.split(':').map(Number);
    const [eH, eM] = endStr.split(':').map(Number);
    const new_start_minute = sH * 60 + (sM || 0);
    const new_end_minute = eH * 60 + (eM || 0);

    try {
      const res = await fetch(`/api/requests/${id}/reschedule`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_date: newDate,
          new_start_minute,
          new_end_minute
        })
      });
      const data = await res.json();
      if (res.status === 409) {
        toast('Slot unavailable, please pick another time.');
        return;
      }
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Reschedule failed');
      }
      closeModal();
      toast('Service rescheduled successfully!');
      await loadMyBookings();
      await render();
    } catch (err) {
      toast('Error: ' + err.message);
    }
    return;
  }
});

// Search filters change listener
document.addEventListener('change', async (e) => {
  if (e.target.id === 'filterRating' || e.target.id === 'filterPrice' || e.target.id === 'filterSort') {
    state.filterRating = $('#filterRating')?.value || '';
    state.filterPrice = $('#filterPrice')?.value || '';
    state.filterSort = $('#filterSort')?.value || '';
    await filterServicesGrid();
  }
});

// -------------------------------------------------------------
// App Boot Sequence & Auth Wiring
// -------------------------------------------------------------
async function bootRoleData() {
  if (state.role === 'guest') {
    await loadServices();
  } else if (state.role === 'client') {
    await Promise.all([loadServices(), loadMyBookings(), loadNotifications()]);
  } else if (state.role === 'repairman') {
    await Promise.all([loadProviderData(), loadNotifications()]);
  } else if (state.role === 'admin') {
    await Promise.all([loadAdminData(), loadNotifications()]);
  }
}

async function boot() {
  try {
    const r = await fetch('/api/auth/me', { credentials: 'include' });
    if (!r.ok) throw 0;
    const me = await r.json();
    state.user = me.user;
    state.role = me.user.role === 'customer' ? 'client'
      : me.user.role === 'provider' ? 'repairman'
      : 'admin';

    state.page = state.role === 'client' ? 'discover' : state.role === 'repairman' ? 'overview' : 'admin-overview';

    document.getElementById('auth-screen')?.classList.remove('open');
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.style.display = 'none';

    const helpCard = document.querySelector('.help-card');
    if (helpCard) helpCard.style.display = 'block';

    const userMini = document.querySelector('.user-mini');
    if (userMini) userMini.style.display = 'flex';

    const topAv = document.getElementById('topAvatar');
    if (topAv) topAv.style.display = 'grid';

    document.getElementById('miniName').textContent = me.user.full_name;
    document.getElementById('miniRole').textContent = ({
      customer: 'Client account',
      provider: 'Provider account',
      admin: 'Admin account'
    })[me.user.role];

    const initials = (me.user.full_name || '?').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();
    document.getElementById('user-avatar').textContent = initials;
    if (topAv) topAv.textContent = initials;

    await bootRoleData();
    render();
  } catch {
    state.user = null;
    state.role = 'guest';
    state.page = 'discover';

    document.getElementById('auth-screen')?.classList.remove('open');

    const helpCard = document.querySelector('.help-card');
    if (helpCard) helpCard.style.display = 'none';

    const userMini = document.querySelector('.user-mini');
    if (userMini) userMini.style.display = 'none';

    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.style.display = 'inline-flex';

    const topAv = document.getElementById('topAvatar');
    if (topAv) topAv.style.display = 'none';

    await bootRoleData();
    render();
  }
}

document.getElementById('auth-form')?.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const fd = new FormData(ev.target);
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: fd.get('email'), password: fd.get('password') })
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    const el = document.getElementById('auth-error');
    el.textContent = j.error || 'Login failed';
    el.style.display = 'block';
    return;
  }
  location.reload();
});

document.querySelectorAll('[data-demo]').forEach(a => a.addEventListener('click', (e) => {
  e.preventDefault();
  const map = { customer: 'customer@demo.test', provider: 'provider@demo.test', admin: 'admin@demo.test' };
  document.querySelector('#auth-form input[name="email"]').value = map[a.dataset.demo];
  document.querySelector('#auth-form input[name="password"]').value = 'demo1234';
}));

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  location.reload();
});

boot();
