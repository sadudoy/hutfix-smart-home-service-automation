function formatMinutes(min) {
  if (min == null) return '--:--';
  const h = String(Math.floor(min / 60)).padStart(2, '0');
  const m = String(min % 60).padStart(2, '0');
  return `${h}:${m}`;
}

const NEXT_STATUS = {
  'accepted': { next: 'on_the_way', label: 'Mark On The Way', icon: 'bi-truck' },
  'on_the_way': { next: 'in_progress', label: 'Start Job', icon: 'bi-tools' },
  'in_progress': { next: 'completed', label: 'Complete Service', icon: 'bi-check2-circle' }
};

const URGENCY_RANK = {
  'urgent': 4,
  'high': 3,
  'normal': 2,
  'low': 1
};

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('bucket-container') || document.getElementById('requests-grid');
  const badgeIncoming = document.getElementById('badge-incoming') || document.getElementById('incoming-count');
  const badgeActive = document.getElementById('badge-active');
  const badgeHistory = document.getElementById('badge-history');
  const navUsername = document.getElementById('nav-username');
  const logoutBtn = document.getElementById('logout-btn');
  const roleWarning = document.getElementById('role-warning');
  const providerView = document.getElementById('provider-view');
  const tabButtons = document.querySelectorAll('#provider-tabs button');

  const notifBell = document.getElementById('notif-bell');
  const notifCount = document.getElementById('notif-count');
  const notifPanel = document.getElementById('notif-panel');
  const notifList = document.getElementById('notif-list');
  const notifMarkAll = document.getElementById('notif-mark-all');

  let currentBucket = 'incoming';

  // 1. Auth Guard
  try {
    const res = await window.API.get('/api/auth/me');
    if (!res || !res.user) {
      window.location.href = '/login.html';
      return;
    }
    if (res.user.role !== 'provider') {
      if (providerView) providerView.classList.add('d-none');
      if (roleWarning) roleWarning.classList.remove('d-none');
      return;
    }
    if (navUsername) {
      navUsername.textContent = res.user.full_name || res.user.email;
    }
  } catch (err) {
    window.location.href = '/login.html';
    return;
  }

  // Logout listener
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try { await window.API.post('/api/auth/logout'); } catch (_) {}
      window.location.href = '/login.html';
    });
  }

  // --- Notifications Handling ---
  async function fetchNotifications() {
    try {
      const res = await window.API.get('/api/notifications');
      if (!res || !res.ok) return;

      const unread = res.unread_count || 0;
      if (notifCount) {
        notifCount.textContent = unread;
        notifCount.style.display = unread > 0 ? 'inline-block' : 'none';
      }

      if (notifList) {
        const notifs = res.notifications || [];
        if (notifs.length === 0) {
          notifList.innerHTML = '<div class="text-center py-3 text-muted small">No notifications yet</div>';
        } else {
          notifList.innerHTML = notifs.slice(0, 10).map(n => `
            <div class="p-2 border-bottom notif-item rounded ${n.is_read ? 'text-muted' : 'bg-light fw-semibold text-dark'}" data-id="${n.id}" style="cursor: pointer; font-size: 0.8rem;">
              <div class="d-flex justify-content-between align-items-center">
                <span>${n.title}</span>
                ${!n.is_read ? '<span class="badge bg-primary p-1 rounded-circle"></span>' : ''}
              </div>
              <div class="small text-secondary text-truncate">${n.body || ''}</div>
              <div class="text-muted" style="font-size: 0.7rem;">${new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          `).join('');

          notifList.querySelectorAll('.notif-item').forEach(item => {
            item.addEventListener('click', async () => {
              const id = item.dataset.id;
              try {
                await window.API.post('/api/notifications/read', { id });
                fetchNotifications();
              } catch (_) {}
            });
          });
        }
      }
    } catch (err) {
      console.warn('Failed to fetch provider notifications:', err);
    }
  }

  if (notifBell) {
    notifBell.addEventListener('click', (e) => {
      e.stopPropagation();
      notifPanel.classList.toggle('d-none');
    });
  }

  document.addEventListener('click', (e) => {
    if (notifPanel && !notifPanel.contains(e.target) && e.target !== notifBell) {
      notifPanel.classList.add('d-none');
    }
  });

  if (notifMarkAll) {
    notifMarkAll.addEventListener('click', async () => {
      try {
        await window.API.post('/api/notifications/read-all');
        fetchNotifications();
      } catch (_) {}
    });
  }

  // Tab switching
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentBucket = btn.dataset.bucket;
      load(currentBucket);
    });
  });

  // 2. Load requests for bucket
  async function load(bucket, silent = false) {
    if (!silent && container) {
      container.innerHTML = `
        <div class="col-12 text-center py-5">
          <div class="spinner-border text-primary" role="status"></div>
          <p class="text-muted small mt-2">Loading ${bucket} assignments...</p>
        </div>
      `;
    }

    try {
      const res = await window.API.get(`/api/provider/requests?bucket=${bucket}`);
      if (!res.ok || !Array.isArray(res.requests)) {
        if (container) container.innerHTML = `<div class="col-12 text-center text-danger py-4">Failed to fetch ${bucket} requests.</div>`;
        return;
      }

      let requests = res.requests;

      // Sort incoming cards client-side: urgent-first (urgent > high > normal > low), then date asc
      if (bucket === 'incoming') {
        requests.sort((a, b) => {
          const uA = URGENCY_RANK[a.urgency] || 2;
          const uB = URGENCY_RANK[b.urgency] || 2;
          if (uA !== uB) return uB - uA;
          const dateA = a.preferred_date || '';
          const dateB = b.preferred_date || '';
          if (dateA !== dateB) return dateA.localeCompare(dateB);
          return (a.preferred_start_minute || 0) - (b.preferred_start_minute || 0);
        });
      }

      renderGrid(requests, bucket);
      await updateTabBadges();
    } catch (err) {
      if (container) container.innerHTML = `<div class="col-12 text-center text-danger py-4">Network error: ${err.message}</div>`;
    }
  }

  // 3. Update tab badges
  async function updateTabBadges() {
    try {
      const [incRes, actRes, hisRes] = await Promise.all([
        window.API.get('/api/provider/requests?bucket=incoming'),
        window.API.get('/api/provider/requests?bucket=active'),
        window.API.get('/api/provider/requests?bucket=history')
      ]);

      if (incRes.ok && badgeIncoming) badgeIncoming.textContent = incRes.requests.length;
      if (actRes.ok && badgeActive) badgeActive.textContent = actRes.requests.length;
      if (hisRes.ok && badgeHistory) badgeHistory.textContent = hisRes.requests.length;
    } catch (_) {}
  }

  // 4. Render Grid of Cards
  function renderGrid(requests, bucket) {
    if (!container) return;

    if (requests.length === 0) {
      const emptyMessages = {
        incoming: 'No new incoming requests right now. As customers book slots, new requests will appear here.',
        active: 'No active jobs in progress. Check incoming requests to accept new jobs.',
        history: 'No completed or archived tasks yet.'
      };
      container.innerHTML = `
        <div class="col-12">
          <div class="empty-state surface">
            <i class="bi bi-inbox"></i>
            <h3 class="h6 fw-semibold text-dark">No ${bucket} requests</h3>
            <p class="small text-muted mb-0">${emptyMessages[bucket] || ''}</p>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = requests.map(r => {
      const slug = r.category_slug || 'appliance-repair';
      const heroUrl = window.IMAGES.category(slug);
      const heroFallback = window.IMAGES.categoryFallback(slug);
      const customerAvatar = window.IMAGES.providerAvatar(r.customer_name || 'Customer');
      const isUrgent = r.urgency === 'urgent';
      const timeSlotStr = `${r.preferred_date} · ${formatMinutes(r.preferred_start_minute)}–${formatMinutes(r.preferred_end_minute)}`;

      // Card action buttons
      let footerHtml = '';
      if (bucket === 'incoming') {
        footerHtml = `
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-primary btn-sm flex-fill fw-semibold btn-accept" data-id="${r.id}">
              <i class="bi bi-check-lg me-1"></i> Accept Job
            </button>
            <button type="button" class="btn btn-outline-danger btn-sm px-3 fw-semibold btn-reject" data-id="${r.id}">
              <i class="bi bi-x-lg me-1"></i> Reject
            </button>
          </div>
        `;
      } else if (bucket === 'active') {
        const nextConfig = NEXT_STATUS[r.status];
        footerHtml = `
          <div class="d-flex justify-content-between align-items-center">
            <span class="status-badge status-${r.status}">${r.status.replace(/_/g, ' ')}</span>
            ${nextConfig ? `
              <button type="button" class="btn btn-primary btn-sm px-3 fw-semibold btn-next-step" data-id="${r.id}" data-next="${nextConfig.next}">
                <i class="bi ${nextConfig.icon} me-1"></i> ${nextConfig.label} &rarr;
              </button>
            ` : ''}
          </div>
        `;
      } else {
        // history
        footerHtml = `
          <div class="d-flex justify-content-between align-items-center">
            <span class="status-badge status-${r.status}">${r.status.replace(/_/g, ' ')}</span>
            <span class="small fw-semibold text-secondary">Final: ৳${parseFloat(r.estimated_price || 0).toFixed(0)}</span>
          </div>
        `;
      }

      return `
        <div class="col">
          <div class="surface p-0 overflow-hidden h-100 d-flex flex-column" id="provider-card-${r.id}">
            <!-- Top Strip with Hero Image -->
            <div class="position-relative">
              <img src="${heroUrl}" alt="${slug}" class="task-hero-img" onerror="this.src='${heroFallback}'">
              <div class="position-absolute top-0 end-0 p-2">
                <span class="badge ${isUrgent ? 'bg-danger' : 'bg-light text-dark'} shadow-sm text-capitalize">
                  ${r.urgency || 'Normal'}
                </span>
              </div>
              <div class="hero-img-overlay py-2 px-3">
                <span class="small fw-bold text-body"><i class="bi ${r.category_icon || 'bi-tools'} me-1"></i>${r.category_name || 'Service Task'}</span>
              </div>
            </div>

            <!-- Body Content -->
            <div class="p-3 d-flex flex-column flex-grow-1">
              ${isUrgent ? `
                <div class="mb-2">
                  <span class="badge bg-danger pulse-urgent text-white px-2 py-1 small rounded-pill">
                    <i class="bi bi-exclamation-octagon-fill me-1"></i>URGENT — respond within 15 min
                  </span>
                </div>
              ` : ''}

              <!-- Customer Profile -->
              <div class="d-flex align-items-center gap-2 mb-2 pb-2 border-bottom">
                <img src="${customerAvatar}" alt="${r.customer_name}" class="customer-avatar shadow-sm border" style="width: 38px; height: 38px; border-radius: 50%;">
                <div class="min-w-0 flex-grow-1">
                  <h4 class="small fw-bold text-dark mb-0 text-truncate">${r.customer_name}</h4>
                  <a href="tel:${r.customer_phone}" class="text-decoration-none small text-primary"><i class="bi bi-telephone me-1"></i>${r.customer_phone || 'No phone'}</a>
                </div>
                <div class="text-end">
                  <span class="badge bg-light text-secondary border fw-bold">৳${parseFloat(r.estimated_price || 0).toFixed(0)}</span>
                </div>
              </div>

              <!-- Address & Time Slot -->
              <div class="small text-secondary mb-2">
                <div class="d-flex align-items-start gap-1 mb-1">
                  <i class="bi bi-geo-alt text-danger mt-1"></i>
                  <span class="text-dark fw-semibold">${r.address}</span>
                </div>
                <div class="d-flex align-items-center gap-1">
                  <i class="bi bi-calendar-event text-primary"></i>
                  <span>${timeSlotStr}</span>
                </div>
              </div>

              <!-- Task Description -->
              <p class="small text-muted mb-3 flex-grow-1" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                ${r.description || 'No additional instructions provided by customer.'}
              </p>

              <!-- Footer Actions -->
              <div class="pt-2 border-top mt-auto">
                ${footerHtml}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach Action Listeners
    // 1. Accept
    container.querySelectorAll('.btn-accept').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        btn.disabled = true;
        btn.textContent = 'Accepting...';
        try {
          const res = await window.API.post(`/api/requests/${id}/accept`);
          if (res.ok) {
            await load(currentBucket);
            await fetchNotifications();
          }
        } catch (err) {
          alert(err.message || 'Failed to accept request.');
          btn.disabled = false;
          btn.textContent = 'Accept Job';
        }
      });
    });

    // 2. Reject
    container.querySelectorAll('.btn-reject').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (!confirm('Are you sure you want to decline this job request?')) return;
        btn.disabled = true;
        try {
          const res = await window.API.post(`/api/requests/${id}/reject`);
          if (res.ok) {
            await load(currentBucket);
            await fetchNotifications();
          }
        } catch (err) {
          alert(err.message || 'Failed to reject request.');
          btn.disabled = false;
        }
      });
    });

    // 3. Next step status progression
    container.querySelectorAll('.btn-next-step').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const nextStatus = btn.dataset.next;
        btn.disabled = true;
        btn.textContent = 'Updating...';
        try {
          const res = await window.API.patch(`/api/requests/${id}/status`, { status: nextStatus });
          if (res.ok) {
            await load(currentBucket);
            await fetchNotifications();
          }
        } catch (err) {
          alert(err.message || 'Failed to advance status.');
          btn.disabled = false;
        }
      });
    });
  }

  // Initial Load
  await load('incoming');
  await fetchNotifications();

  // 5. Silent Live Polling (every 15s) + Notifications (every 20s)
  setInterval(async () => {
    await updateTabBadges();
    if (currentBucket === 'incoming' || currentBucket === 'active') {
      await load(currentBucket, true);
    }
    await fetchNotifications();
  }, 15000);
});
