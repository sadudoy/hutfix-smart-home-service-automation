function formatMinutes(min) {
  if (min == null) return '--:--';
  const h = String(Math.floor(min / 60)).padStart(2, '0');
  const m = String(min % 60).padStart(2, '0');
  return `${h}:${m}`;
}

const STAGES = [
  { key: 'requested', label: 'Requested' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'on_the_way', label: 'On the Way' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' }
];

document.addEventListener('DOMContentLoaded', async () => {
  const requestList = document.getElementById('request-list');
  const requestDetail = document.getElementById('request-detail');
  const requestsCount = document.getElementById('requests-count');
  const roleWarning = document.getElementById('role-warning');
  const trackingView = document.getElementById('tracking-view');
  const navUsername = document.getElementById('nav-username');
  const logoutBtn = document.getElementById('logout-btn');

  let currentSelectedId = null;
  let requestsCache = [];

  // 1. Auth Guard
  try {
    const res = await window.API.get('/api/auth/me');
    if (!res || !res.user) {
      window.location.href = '/login.html';
      return;
    }
    if (res.user.role !== 'customer') {
      if (trackingView) trackingView.classList.add('d-none');
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

  // 2. Fetch User Requests
  async function fetchMine() {
    try {
      const res = await window.API.get('/api/requests/mine');
      if (!res.ok || !Array.isArray(res.requests)) return;

      requestsCache = res.requests;
      if (requestsCount) requestsCount.textContent = requestsCache.length;

      renderSidebarList();

      // Check query parameter for specific id on initial load
      const urlParams = new URLSearchParams(window.location.search);
      const queryId = urlParams.get('id');

      if (!currentSelectedId) {
        if (queryId && requestsCache.some(r => String(r.id) === String(queryId))) {
          selectRequest(queryId);
        } else if (requestsCache.length > 0) {
          selectRequest(requestsCache[0].id);
        }
      } else {
        // Refresh active detail if status changed
        const activeItem = requestsCache.find(r => String(r.id) === String(currentSelectedId));
        if (activeItem) {
          selectRequest(currentSelectedId, true);
        }
      }
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    }
  }

  // 3. Render Sidebar
  function renderSidebarList() {
    if (requestsCache.length === 0) {
      requestList.innerHTML = `
        <div class="empty-state py-4">
          <i class="bi bi-clipboard2-x"></i>
          <p class="small text-muted mb-2">No service requests found.</p>
          <a href="/request.html" class="btn btn-sm btn-primary">Book Now</a>
        </div>
      `;
      return;
    }

    requestList.innerHTML = requestsCache.map(r => {
      const slug = r.category_slug || 'appliance-repair';
      const imgUrl = window.IMAGES.category(slug);
      const fallbackUrl = window.IMAGES.categoryFallback(slug);
      const isActive = String(r.id) === String(currentSelectedId);
      const statusClass = `status-${r.status}`;
      const statusLabel = r.status.replace(/_/g, ' ');

      return `
        <div class="request-item ${isActive ? 'active' : ''}" data-id="${r.id}">
          <div class="d-flex align-items-center gap-2">
            <img src="${imgUrl}" alt="${slug}" style="width: 56px; height: 56px; object-fit: cover; border-radius: 8px;" onerror="this.src='${fallbackUrl}'">
            <div class="flex-grow-1 min-w-0">
              <div class="d-flex justify-content-between align-items-start">
                <h4 class="small fw-bold text-dark text-truncate mb-0">${r.category_name || 'Home Service'}</h4>
                <span class="status-badge ${statusClass} py-0 px-2" style="font-size: 0.7rem;">${statusLabel}</span>
              </div>
              <p class="text-muted small mb-1 text-truncate">${r.provider_name || 'Assigned Technician'}</p>
              <div class="text-secondary small" style="font-size: 0.75rem;">
                <i class="bi bi-calendar3 me-1"></i>${r.preferred_date}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    requestList.querySelectorAll('.request-item').forEach(item => {
      item.addEventListener('click', () => {
        selectRequest(item.dataset.id);
      });
    });
  }

  // 4. Select and Render Request Detail
  async function selectRequest(id, silent = false) {
    currentSelectedId = id;

    // Update active highlight in sidebar
    requestList.querySelectorAll('.request-item').forEach(item => {
      if (item.dataset.id === String(id)) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    if (!silent) {
      requestDetail.innerHTML = `
        <div class="text-center py-5 my-auto">
          <div class="spinner-border text-primary" role="status"></div>
          <p class="text-muted small mt-2">Loading live request details...</p>
        </div>
      `;
    }

    try {
      const res = await window.API.get(`/api/requests/${id}`);
      if (!res.ok || !res.request) return;

      const req = res.request;
      const events = res.events || [];
      const slug = req.category_slug || 'appliance-repair';
      const heroUrl = window.IMAGES.category(slug);
      const heroFallback = window.IMAGES.categoryFallback(slug);
      const avatarUrl = window.IMAGES.providerAvatar(req.provider_name || 'Technician');
      const timeSlotStr = `${req.preferred_date} · ${formatMinutes(req.preferred_start_minute)}–${formatMinutes(req.preferred_end_minute)}`;

      // Build 5-Stage Stepper HTML
      let stepperHtml = '';
      if (req.status === 'cancelled') {
        stepperHtml = `
          <div class="alert alert-danger py-2 px-3 fw-semibold small mb-4 d-flex align-items-center">
            <i class="bi bi-x-circle-fill fs-5 me-2"></i>
            <span>This request was cancelled. Associated calendar slots have been released.</span>
          </div>
        `;
      } else {
        const currentStageIndex = STAGES.findIndex(s => s.key === req.status);
        stepperHtml = `
          <div class="stepper mb-4">
            ${STAGES.map((s, idx) => {
              let stateClass = '';
              let icon = idx + 1;
              if (idx < currentStageIndex) {
                stateClass = 'done';
                icon = '<i class="bi bi-check-lg"></i>';
              } else if (idx === currentStageIndex) {
                stateClass = 'active';
              }
              return `
                <div class="stepper-step ${stateClass}">
                  <div class="stepper-circle">${icon}</div>
                  <div>${s.label}</div>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }

      // Build Timeline HTML
      const timelineHtml = `
        <div id="timeline" class="mt-4 pt-3 border-top">
          <h3 class="h6 fw-bold mb-3"><i class="bi bi-clock-history me-2 text-primary"></i>Status History</h3>
          <div class="timeline-container ps-1">
            ${events.map(ev => `
              <div class="timeline-item">
                <div class="timeline-dot"></div>
                <div class="small fw-bold text-dark text-capitalize">${ev.status.replace(/_/g, ' ')}</div>
                <div class="small text-muted">${new Date(ev.created_at).toLocaleTimeString()} — ${ev.note || 'Event recorded'}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      // Render full detail container
      requestDetail.innerHTML = `
        <div class="overflow-auto flex-grow-1">
          <!-- Hero Strip -->
          <div class="position-relative">
            <img src="${heroUrl}" alt="${slug}" class="detail-hero-img" onerror="this.src='${heroFallback}'">
            <div class="position-absolute top-0 end-0 p-3">
              <span class="status-badge status-${req.status} shadow-sm">${req.status.replace(/_/g, ' ')}</span>
            </div>
            <div class="position-absolute bottom-0 start-0 p-3 text-white" style="background: linear-gradient(transparent, rgba(15,23,42,0.85)); width: 100%;">
              <h2 class="h5 fw-bold mb-0 text-white">${req.category_name || 'Home Service'}</h2>
              <span class="small text-white-50">Request #${req.id} &bull; Booked on ${new Date(req.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          <div class="p-4">
            <!-- Header bar with live status badge -->
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 rounded-pill small">
                <i class="bi bi-broadcast me-1"></i>Live &bull; updates every 10s
              </span>
              <span class="text-secondary small fw-semibold">Estimated: ৳${parseFloat(req.estimated_price || 0).toFixed(0)}</span>
            </div>

            <!-- Stepper -->
            ${stepperHtml}

            <!-- Info Grid -->
            <div class="row g-3 mb-3">
              <div class="col-md-6">
                <div class="p-3 bg-light rounded border h-100">
                  <div class="small text-muted fw-semibold mb-1"><i class="bi bi-geo-alt me-1 text-primary"></i>Service Address</div>
                  <div class="fw-semibold small text-dark">${req.address}</div>
                </div>
              </div>
              <div class="col-md-6">
                <div class="p-3 bg-light rounded border h-100">
                  <div class="small text-muted fw-semibold mb-1"><i class="bi bi-calendar-event me-1 text-primary"></i>Scheduled Time Window</div>
                  <div class="fw-semibold small text-dark">${timeSlotStr}</div>
                </div>
              </div>
            </div>

            <!-- Provider Row -->
            <div class="p-3 bg-light rounded border mb-3">
              <div class="d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center gap-3">
                  <img src="${avatarUrl}" alt="${req.provider_name || 'Technician'}" class="provider-avatar shadow-sm border">
                  <div>
                    <h4 class="small fw-bold text-dark mb-0">${req.provider_name || 'Assigned Specialist'}</h4>
                    <p class="text-muted small mb-0">${req.provider_headline || 'Certified Technician'}</p>
                    <div class="small text-secondary mt-1">
                      <span class="badge bg-warning-subtle text-dark border"><i class="bi bi-star-fill text-warning me-1"></i>${req.provider_rating || '5.0'}</span>
                      <span class="ms-2"><i class="bi bi-telephone me-1"></i>${req.provider_phone || req.contact_phone || 'Available after confirmation'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Task Description -->
            <div class="p-3 bg-light rounded border mb-3">
              <div class="small text-muted fw-semibold mb-1"><i class="bi bi-file-text me-1 text-primary"></i>Task Description</div>
              <p class="small text-secondary mb-0">${req.description || 'No specific description provided by customer.'}</p>
            </div>

            <!-- Timeline -->
            ${timelineHtml}

            <!-- Actions -->
            <div class="mt-4 pt-3 border-top d-flex justify-content-between align-items-center">
              ${(req.status === 'requested' || req.status === 'accepted') ? `
                <button type="button" id="cancel-btn" class="btn btn-outline-danger btn-sm px-3 fw-semibold">
                  <i class="bi bi-x-circle me-1"></i> Cancel Request
                </button>
              ` : `<span></span>`}

              ${req.status === 'completed' ? `
                <span class="text-muted small fst-italic">Leave a review &rarr; (Arriving in Phase 6)</span>
              ` : ''}
            </div>
          </div>
        </div>
      `;

      // Hook Cancel Request button
      const cancelBtn = requestDetail.querySelector('#cancel-btn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', async () => {
          if (!confirm('Are you sure you want to cancel this service request? This will release the technician slot.')) return;
          try {
            cancelBtn.disabled = true;
            cancelBtn.textContent = 'Cancelling...';
            const cancelRes = await window.API.post(`/api/requests/${req.id}/cancel`);
            if (cancelRes.ok) {
              await fetchMine();
            }
          } catch (err) {
            alert(err.message || 'Failed to cancel request.');
            cancelBtn.disabled = false;
            cancelBtn.textContent = 'Cancel Request';
          }
        });
      }
    } catch (err) {
      console.error('Failed to load request detail:', err);
    }
  }

  // Initial load
  await fetchMine();

  // 5. Live Polling (every 10s)
  let pollInterval = setInterval(fetchMine, 10000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearInterval(pollInterval);
    } else {
      fetchMine();
      pollInterval = setInterval(fetchMine, 10000);
    }
  });
});

