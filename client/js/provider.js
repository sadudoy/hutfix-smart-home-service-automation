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

document.addEventListener('DOMContentLoaded', async () => {
  const requestsGrid = document.getElementById('requests-grid');
  const incomingCount = document.getElementById('incoming-count');
  const navUsername = document.getElementById('nav-username');
  const logoutBtn = document.getElementById('logout-btn');
  const roleWarning = document.getElementById('role-warning');
  const providerView = document.getElementById('provider-view');
  const tabButtons = document.querySelectorAll('#provider-tabs button');

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
    if (!silent) {
      requestsGrid.innerHTML = `
        <div class="col-12 text-center py-5">
          <div class="spinner-border text-primary" role="status"></div>
          <p class="text-muted small mt-2">Loading ${bucket} assignments...</p>
        </div>
      `;
    }

    try {
      const res = await window.API.get(`/api/provider/requests?bucket=${bucket}`);
      if (!res.ok || !Array.isArray(res.requests)) {
        requestsGrid.innerHTML = `<div class="col-12 text-center text-danger py-4">Failed to fetch ${bucket} requests.</div>`;
        return;
      }

      renderGrid(res.requests, bucket);
      await updateIncomingBadge();
    } catch (err) {
      requestsGrid.innerHTML = `<div class="col-12 text-center text-danger py-4">Network error: ${err.message}</div>`;
    }
  }

  // 3. Update incoming count badge
  async function updateIncomingBadge() {
    try {
      const res = await window.API.get('/api/provider/requests?bucket=incoming');
      if (res.ok && Array.isArray(res.requests) && incomingCount) {
        incomingCount.textContent = res.requests.length;
      }
    } catch (_) {}
  }

  // 4. Render Grid of Cards
  function renderGrid(requests, bucket) {
    if (requests.length === 0) {
      const emptyMessages = {
        incoming: 'No new incoming requests right now. As customers book slots, new requests will appear here.',
        active: 'No active jobs in progress. Check incoming requests to accept new jobs.',
        history: 'No completed or archived tasks yet.'
      };
      requestsGrid.innerHTML = `
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

    requestsGrid.innerHTML = requests.map(r => {
      const slug = r.category_slug || 'appliance-repair';
      const heroUrl = window.IMAGES.category(slug);
      const heroFallback = window.IMAGES.categoryFallback(slug);
      const customerAvatar = window.IMAGES.providerAvatar(r.customer_name || 'Customer');
      const isUrgent = r.urgency === 'urgent' || r.urgency === 'high';
      const timeSlotStr = `${r.preferred_date} · ${formatMinutes(r.preferred_start_minute)}–${formatMinutes(r.preferred_end_minute)}`;

      // Card action buttons
      let footerHtml = '';
      if (bucket === 'incoming') {
        footerHtml = `
          <div class="d-flex gap-2">
            <button type="button" class="btn btn-success btn-sm flex-fill fw-semibold btn-accept" data-id="${r.id}">
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
              <img src="${heroUrl}" alt="${slug}" class="provider-header-img" onerror="this.src='${heroFallback}'">
              <div class="position-absolute top-0 end-0 p-2">
                ${isUrgent ? `
                  <span class="badge bg-danger shadow-sm text-uppercase fw-bold">
                    <i class="bi bi-fire me-1"></i>${r.urgency}
                  </span>
                ` : `
                  <span class="badge bg-light text-dark shadow-sm text-capitalize">
                    ${r.urgency || 'Normal'}
                  </span>
                `}
              </div>
              <div class="position-absolute bottom-0 start-0 p-2 text-white" style="background: linear-gradient(transparent, rgba(15,23,42,0.85)); width: 100%;">
                <span class="small fw-bold text-white"><i class="bi ${r.category_icon || 'bi-tools'} me-1"></i>${r.category_name || 'Service Task'}</span>
              </div>
            </div>

            <!-- Body Content -->
            <div class="p-3 d-flex flex-column flex-grow-1">
              <!-- Customer Profile -->
              <div class="d-flex align-items-center gap-2 mb-2 pb-2 border-bottom">
                <img src="${customerAvatar}" alt="${r.customer_name}" class="customer-avatar shadow-sm border">
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
              <p class="small text-muted text-truncate-2 mb-3 flex-grow-1">
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
    requestsGrid.querySelectorAll('.btn-accept').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        btn.disabled = true;
        btn.textContent = 'Accepting...';
        try {
          const res = await window.API.post(`/api/requests/${id}/accept`);
          if (res.ok) {
            await load(currentBucket);
          }
        } catch (err) {
          alert(err.message || 'Failed to accept request.');
          btn.disabled = false;
          btn.textContent = 'Accept Job';
        }
      });
    });

    // 2. Reject
    requestsGrid.querySelectorAll('.btn-reject').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (!confirm('Are you sure you want to decline this job request?')) return;
        btn.disabled = true;
        try {
          const res = await window.API.post(`/api/requests/${id}/reject`);
          if (res.ok) {
            await load(currentBucket);
          }
        } catch (err) {
          alert(err.message || 'Failed to reject request.');
          btn.disabled = false;
        }
      });
    });

    // 3. Next step status progression
    requestsGrid.querySelectorAll('.btn-next-step').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const nextStatus = btn.dataset.next;
        btn.disabled = true;
        btn.textContent = 'Updating...';
        try {
          const res = await window.API.patch(`/api/requests/${id}/status`, { status: nextStatus });
          if (res.ok) {
            await load(currentBucket);
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

  // 5. Silent Live Polling (every 15s)
  setInterval(async () => {
    await updateIncomingBadge();
    if (currentBucket === 'incoming' || currentBucket === 'active') {
      await load(currentBucket, true);
    }
  }, 15000);
});

