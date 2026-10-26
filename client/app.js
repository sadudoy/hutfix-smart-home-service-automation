/**
 * Fixora — Single Page Application Frontend
 * Connected to Real Express & PostgreSQL Backend
 */

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const state = {
  user: null,
  role: 'client', // 'client' | 'repairman' | 'admin'
  page: 'discover',
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
  notifications: [],
  activeRequestId: null
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
const clientNav = [
  ['discover', '⌕', 'Discover services'],
  ['bookings', '▤', 'My bookings'],
  ['tracking', '⌖', 'Track a service'],
  ['favorites', '♡', 'Saved services'],
  ['profile', '◎', 'My profile']
];

const repairNav = [
  ['overview', '▦', 'Overview'],
  ['my-gigs', '✳', 'My service gigs'],
  ['requests', '▤', 'Booking requests'],
  ['earnings', '৳', 'Earnings'],
  ['repair-profile', '◎', 'My profile']
];

const adminNav = [
  ['admin-overview', '▦', 'Overview'],
  ['users', '♙', 'Users & repairmen'],
  ['moderation', '◈', 'Gig moderation'],
  ['all-bookings', '▤', 'All bookings'],
  ['reports', '▥', 'Reports & analytics']
];

function navItems() {
  return state.role === 'client' ? clientNav : state.role === 'repairman' ? repairNav : adminNav;
}

function roleName() {
  return state.role === 'client' ? 'Client' : state.role === 'repairman' ? 'Repairman' : 'Admin';
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

  $('#navCaption').textContent = state.role === 'client' ? 'DISCOVER' : state.role === 'repairman' ? 'YOUR BUSINESS' : 'MANAGE PLATFORM';
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
function openModal(title, body, eyebrow = 'FIXORA BOOKING') {
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
        'appliance-repair': '❄️',
        'plumbing': '🚿',
        'electrical': '💡',
        'cleaning-pest': '🫧',
        'home-maintenance': '🛠️',
        'moving-shifting': '📦',
        'car-care': '🚗',
        'personal-care': '✂️'
      };
      state.services = data.services.map((s, idx) => ({
        id: s.slug,
        slug: s.slug,
        title: s.name,
        desc: s.description || 'Professional home service with verified background check and upfront pricing.',
        price: Number(s.base_price) || 800,
        icon: icons[s.slug] || '✦',
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
  } catch (err) {
    console.error('loadServices error:', err);
  }
}

async function loadMyBookings() {
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
          icon: '🛠️',
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
    const [statsRes, usersRes, bookingsRes] = await Promise.all([
      fetch('/api/admin/stats', { credentials: 'include' }),
      fetch('/api/admin/users', { credentials: 'include' }),
      fetch('/api/admin/bookings', { credentials: 'include' })
    ]);

    if (statsRes.ok) {
      const d = await statsRes.json();
      state.adminStats = d.stats || {};
    }
    if (usersRes.ok) {
      const d = await usersRes.json();
      state.adminUsers = d.users || [];
    }
    if (bookingsRes.ok) {
      const d = await bookingsRes.json();
      state.adminBookings = d.bookings || [];
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
    : `<div class="service-cover ${s.cover}"><span class="cover-badge">${s.tag || 'SERVICE'}</span><span class="cover-emoji">${s.icon}</span></div>`;

  return `
    <article class="service-card">
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

function renderDiscover() {
  const list = state.services.filter(s =>
    (state.category === 'All services' || s.title.includes(state.category) || s.category === state.category) &&
    (`${s.title} ${s.desc} ${s.slug}`).toLowerCase().includes(state.query.toLowerCase())
  );

  const categories = [
    ['All services', '✦', 'bg-blue', 'All'],
    ['Appliance', '❄️', 'bg-blue', 'Appliance & Gadget'],
    ['Plumbing', '🚿', 'bg-green', 'Water & Pipes'],
    ['Electrical', '💡', 'bg-orange', 'Wiring & Power'],
    ['Cleaning', '🫧', 'bg-purple', 'Cleaning & Pest'],
    ['Maintenance', '🛠️', 'bg-yellow', 'Home Maintenance']
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
          <div class="art-icon">🛠️</div>
          <strong>Trusted professionals</strong>
          <small>Vetted experts, at your door.</small>
          <div class="rating">★★★★★ <span style="color:#9aa2b0">4.9 average</span></div>
        </div>
        <div class="art-card float">
          <div class="float-line">
            <div class="tiny-avatar">✓</div>
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
        <p>${list.length} verified services ready in Dhaka</p>
      </div>
      <button class="link-btn" data-page="bookings">My bookings ↗</button>
    </div>
    ${state.query ? `<div class="search-results-label">Showing results for “${escapeHtml(state.query)}”</div>` : ''}
    <div class="service-grid">
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

    return `
      ${pageHead('LIVE SERVICE UPDATES', 'Track your service', `Real-time fulfillment tracking for request #${req.id}.`, '<button class="secondary-btn" data-page="bookings">← All bookings</button>')}
      <div class="tracking-box">
        <div class="tracking-head">
          <div>
            <span class="eyebrow">BOOKING #${req.id}</span>
            <h2>${req.category_name || 'Home Service'}</h2>
            <p>${req.preferred_date} · ${minutesToTime(req.preferred_start_minute)} · ${req.address}</p>
          </div>
          <span class="status ${statusClass(rawStatus)}">${normalizeStatus(rawStatus)}</span>
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

function renderProfile() {
  const u = state.user || {};
  return `
    ${pageHead('ACCOUNT SETTINGS', 'My profile', 'Manage your contact details and service preferences.', '<button class="primary-btn" id="saveProfileBtn">Save changes</button>')}
    <div class="profile-banner">
      <div class="avatar avatar-lilac" style="width:58px;height:58px;font-size:18px">
        ${(u.full_name || 'U').slice(0, 2).toUpperCase()}
      </div>
      <div>
        <h2>${escapeHtml(u.full_name || 'Customer')}</h2>
        <p>${u.role === 'customer' ? 'Client account' : u.role === 'provider' ? 'Provider account' : 'Administrator'} · ${u.email || ''}</p>
      </div>
      <div class="banner-actions"><span class="status completed">Verified</span></div>
    </div>
    <div class="panel">
      <div class="panel-head"><h3>Personal information</h3></div>
      <div class="form-grid">
        <div class="form-field"><label>Full name</label><input id="profFullName" value="${escapeHtml(u.full_name || '')}"></div>
        <div class="form-field"><label>Email address</label><input value="${escapeHtml(u.email || '')}" type="email" readonly style="background:#f4f6fa;"></div>
        <div class="form-field"><label>Phone number</label><input id="profPhone" value="${escapeHtml(u.phone || '+880 1712-345678')}"></div>
        <div class="form-field"><label>Preferred area</label><select><option>Dhanmondi, Dhaka</option><option>Gulshan, Dhaka</option><option>Uttara, Dhaka</option></select></div>
        <div class="form-field full"><label>Default service address</label><textarea id="profAddress">House 18, Road 7, Dhanmondi, Dhaka</textarea></div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// Booking Flow & Smart Match Wiring
// -------------------------------------------------------------
function openBooking(categorySlug) {
  const s = state.services.find(x => x.slug === categorySlug) || state.services[0] || {
    slug: 'appliance-repair',
    title: 'Appliance Repair',
    price: 1000
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  openModal(
    `Book ${s.title}`,
    `
      <div class="modal-summary">
        <div class="category-icon bg-blue">${s.icon || '🛠️'}</div>
        <div>
          <strong>${s.title}</strong>
          <small>Base rate: ${money(s.price)} · Verified matching</small>
        </div>
      </div>
      <form id="matchForm">
        <input type="hidden" name="category_slug" value="${s.slug}">
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
          <div class="form-field full"><label>Service address</label><input name="address" value="House 18, Road 7, Dhanmondi, Dhaka" required></div>
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

function renderEarnings() {
  const invs = state.providerInvoices?.invoices || [];
  const totalSum = state.providerInvoices?.totals?.sum_total || 0;
  return `
    ${pageHead('PAYOUTS & REVENUE', 'Earnings', 'Track your service income and payout history.', '<button class="secondary-btn" id="payoutBtn">Request payout ↗</button>')}
    <div class="stats-grid">
      ${stat('Available balance', money(totalSum), '৳', 'Earned from jobs')}
      ${stat('Total invoices', invs.length, '▤', 'Completed bookings')}
      ${stat('Platform fee', '5%', '✓', 'Standard 5% platform tax')}
      ${stat('Payout method', 'bKash', '৳', 'Direct settlement')}
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

// -------------------------------------------------------------
// Admin Renderers
// -------------------------------------------------------------
function renderAdminOverview() {
  const st = state.adminStats || {};
  return `
    ${pageHead('PLATFORM CONTROL CENTER', 'Marketplace overview', 'Live operational telemetry of users, bookings and revenue.')}
    <div class="stats-grid">
      ${stat('Gross volume', money(st.gross_volume || st.total_revenue || 0), '৳', 'Cumulative transactions')}
      ${stat('Platform revenue', money(st.platform_revenue || 0), '↗', 'Platform commission')}
      ${stat('Total bookings', st.total_bookings || 0, '▤', `${st.completed_bookings || 0} completed`)}
      ${stat('Registered users', st.total_users || 0, '♙', `${st.total_providers || 0} providers`)}
    </div>
    <div class="section-head">
      <div><h2>Recent marketplace bookings</h2><p>Latest customer requests across categories</p></div>
      <button class="link-btn" data-page="all-bookings">All bookings ↗</button>
    </div>
    <div class="panel">
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>ID</th><th>SERVICE</th><th>CLIENT</th><th>SPECIALIST</th><th>DATE</th><th>ESTIMATE</th><th>STATUS</th></tr>
          </thead>
          <tbody>
            ${(state.adminBookings || []).slice(0, 10).map(b => `
              <tr>
                <td><strong>#${b.id}</strong></td>
                <td>${escapeHtml(b.category_name || 'Service')}</td>
                <td>${escapeHtml(b.customer_name || 'Customer')}</td>
                <td>${escapeHtml(b.provider_name || 'Unassigned')}</td>
                <td>${b.preferred_date}</td>
                <td><strong>${money(b.estimated_price)}</strong></td>
                <td><span class="status ${statusClass(b.status)}">${normalizeStatus(b.status)}</span></td>
              </tr>
            `).join('') || '<tr><td colspan="7">No bookings logged.</td></tr>'}
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
                    <button class="small-action" data-user-action="verify" data-user="${escapeHtml(u.full_name)}">Verify</button>
                    <button class="small-action" data-user-action="suspend" data-user="${escapeHtml(u.full_name)}">Suspend</button>
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

function renderModeration() {
  return `
    ${pageHead('QUALITY & TRUST', 'Gig moderation', 'Review service listings before they are published to the marketplace.')}
    <div class="empty-state" style="padding:60px 20px;">
      <div style="font-size:32px; margin-bottom:10px;">◈</div>
      <h3 style="margin:0 0 8px;">No items pending review</h3>
      <p style="margin:0;">All service listings and specialist accounts are fully verified.</p>
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
    discover: renderDiscover,
    bookings: renderBookings,
    tracking: renderTracking,
    favorites: renderFavorites,
    profile: renderProfile,
    overview: renderRepairOverview,
    'my-gigs': renderGigs,
    requests: renderRequests,
    earnings: renderEarnings,
    'repair-profile': renderRepairProfile,
    'admin-overview': renderAdminOverview,
    users: renderUsers,
    moderation: renderModeration,
    'all-bookings': renderAllBookings,
    reports: renderReports
  };

  const renderer = pages[state.page] || renderDiscover;
  const content = $('#content');
  if (renderer === renderTracking) {
    const res = await renderTracking();
    content.innerHTML = res;
  } else {
    content.innerHTML = renderer();
  }
}

function goPage(page) {
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
    const act = userActionBtn.dataset.userAction;
    toast(`Action logged (demo): ${act} user ${uName}`);
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

  // Fallback toasts for un-implemented / demo buttons
  if (e.target.closest('#saveProfileBtn') || e.target.closest('#saveRepairProfile')) {
    toast('Profile saved locally.');
    return;
  }
  if (e.target.closest('#newGigBtn') || e.target.closest('[data-edit-gig]')) {
    toast('Gig editing arrives in a later phase.');
    return;
  }
  if (e.target.closest('#payoutBtn')) {
    toast('Payouts managed offline in this demo.');
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

      // Attach click listener for candidate booking
      container.querySelectorAll('[data-confirm-book-prov]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const provId = btn.dataset.confirmBookProv;
          btn.textContent = 'Booking...';
          btn.disabled = true;

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
            goPage('bookings');
            toast(`Booking #${bookData.request.id} created! Specialist notified.`);
          } catch (bErr) {
            toast('Booking error: ' + bErr.message);
            btn.textContent = 'Book this specialist ↗';
            btn.disabled = false;
          }
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
  }
});

// -------------------------------------------------------------
// App Boot Sequence & Auth Wiring
// -------------------------------------------------------------
async function bootRoleData() {
  if (state.role === 'client') {
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
    document.getElementById('miniName').textContent = me.user.full_name;
    document.getElementById('miniRole').textContent = ({
      customer: 'Client account',
      provider: 'Provider account',
      admin: 'Admin account'
    })[me.user.role];

    const initials = (me.user.full_name || '?').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();
    document.getElementById('user-avatar').textContent = initials;
    const topAv = document.getElementById('topAvatar');
    if (topAv) topAv.textContent = initials;

    await bootRoleData();
    render();
  } catch {
    // Keep auth modal open
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
