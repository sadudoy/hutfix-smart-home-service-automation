/**
 * HutFix — Customer Live Fulfillment Tracking (MPA)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.renderLayout('customer', 'tracking');
  if (!user) return;

  const urlParams = new URLSearchParams(window.location.search);
  let activeId = urlParams.get('id');

  const container = document.getElementById('trackingContainer');
  let activeEventSource = null;

  async function resolveRequestId() {
    if (activeId) return activeId;
    try {
      const res = await fetch('/api/requests/mine', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const reqs = data.requests || [];
        if (reqs.length > 0) {
          activeId = reqs[0].id;
          return activeId;
        }
      }
    } catch (_) {}
    return null;
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

  async function loadTrackingData() {
    const reqId = await resolveRequestId();
    if (!reqId) {
      container.innerHTML = `
        <div class="empty-state" style="padding:40px 20px;">
          <div style="font-size:32px; color:var(--text-muted); margin-bottom:12px;"><i class="bi bi-geo-alt"></i></div>
          <h3>No active bookings to track</h3>
          <p style="color:var(--muted); margin-bottom:16px;">You currently have no service requests. Discover trusted professionals to book a fix.</p>
          <a href="index.html" class="primary-btn">Discover services</a>
        </div>
      `;
      return;
    }

    try {
      const res = await fetch(`/api/requests/${reqId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Request details not found');
      const data = await res.json();

      const req = data.request;
      const events = data.events || [];
      const rating = data.rating;
      const invoice = data.invoice;

      const rawStatus = req.status;
      const isCancelled = rawStatus === 'cancelled';
      const steps = ['Requested', 'Confirmed', 'On the way', 'In progress', 'Completed'];
      const statusIdxMap = { requested: 0, accepted: 1, on_the_way: 2, in_progress: 3, completed: 4 };
      const currentStep = isCancelled ? -1 : (statusIdxMap[rawStatus] !== undefined ? statusIdxMap[rawStatus] : 0);

      const timelineHtml = isCancelled
        ? `<div class="conflict-alert" style="text-align:center; font-weight:700; margin:20px 0;">Request Cancelled</div>`
        : `<div class="timeline">
            ${steps.map((s, i) => `
              <div class="timeline-step ${i < currentStep ? 'done' : i === currentStep ? 'current' : ''}">
                <div class="step-dot">${i < currentStep ? '<i class="bi bi-check-lg"></i>' : i + 1}</div>
                ${s}
                <small>${events[i] ? new Date(events[i].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (i <= currentStep ? 'Logged' : 'Pending')}</small>
              </div>
            `).join('')}
          </div>`;

      const canCancel = rawStatus === 'requested' || rawStatus === 'accepted';
      const canRate = rawStatus === 'completed' && !rating;

      const payStatus = req.payment_status || 'pending';
      const payBadge = payStatus === 'verified'
        ? `<span class="status completed"><i class="bi bi-check-circle-fill"></i> Payment Verified</span>`
        : payStatus === 'rejected'
        ? `<span class="status cancelled"><i class="bi bi-x-circle-fill"></i> Payment Rejected</span>`
        : `<span class="status pending"><i class="bi bi-clock-history"></i> Payment Pending Verification</span>`;

      // Connect SSE EventSource
      if (activeEventSource) {
        activeEventSource.close();
      }
      try {
        activeEventSource = new EventSource(`/api/requests/${reqId}/stream`);
        activeEventSource.onmessage = (e) => {
          try {
            const streamData = JSON.parse(e.data);
            if (['status_update', 'payment_update', 'rescheduled', 'assigned'].includes(streamData.type)) {
              loadTrackingData();
            }
          } catch (_) {}
        };
      } catch (_) {}

      container.innerHTML = `
        <div class="tracking-box">
          <div class="tracking-head">
            <div>
              <span class="eyebrow">BOOKING #${req.id}</span>
              <h2>${window.escapeHtml(req.category_name || 'Home Service')}</h2>
              <p>${req.preferred_date} · ${window.minutesToTime(req.preferred_start_minute)} · Estimated 1 hr duration</p>
            </div>
            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
              <span class="status ${rawStatus === 'completed' ? 'completed' : rawStatus === 'cancelled' ? 'cancelled' : 'progress'}">
                ${normalizeStatus(rawStatus)}
              </span>
              ${payBadge}
            </div>
          </div>

          ${timelineHtml}

          <div class="provider-line" style="margin-top:20px; align-items:center;">
            <div class="avatar avatar-green" style="width:48px;height:48px;font-size:14px">
              ${(req.provider_name || 'SP').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div class="provider-name" style="font-size:14px">${window.escapeHtml(req.provider_name || 'Assigned Specialist')} <span class="verified"><i class="bi bi-check-circle-fill text-green"></i></span></div>
              <div class="provider-sub">${window.escapeHtml(req.provider_headline || 'Certified Specialist')} · <i class="bi bi-star-fill text-amber"></i> ${req.provider_rating || '4.9'}</div>
            </div>
          </div>

          <div style="border-top:1px solid var(--border-color); margin-top:18px; padding-top:16px;">
            <div class="progress-row">
              <strong>Fulfillment status</strong>
              <span>${normalizeStatus(rawStatus)}</span>
            </div>
            <div class="progress-bar">
              <span style="width:${isCancelled ? 0 : Math.min(100, (currentStep + 1) * 20)}%"></span>
            </div>
          </div>

          <div style="margin-top:18px; display:flex; gap:10px; flex-wrap:wrap;">
            ${canCancel ? `<button class="secondary-btn" id="trackRescheduleBtn"><i class="bi bi-calendar"></i> Reschedule</button>` : ''}
            ${canCancel ? `<button class="danger-btn" id="trackCancelBtn"><i class="bi bi-x-circle"></i> Cancel request</button>` : ''}
            ${canRate ? `<button class="primary-btn" id="trackRateBtn"><i class="bi bi-star"></i> Rate this service</button>` : ''}
            ${rating ? `<div style="font-size:13px; color:var(--amber); font-weight:700;"><i class="bi bi-star-fill text-amber"></i> You rated: ${rating.rating_stars} Stars ${rating.review_comment ? `— "${window.escapeHtml(rating.review_comment)}"` : ''}</div>` : ''}
            ${invoice ? `<a href="invoice.html?request_id=${req.id}" class="secondary-btn"><i class="bi bi-receipt"></i> View invoice</a>` : ''}
          </div>
        </div>

        <div class="panel" style="margin-top:24px;">
          <div class="panel-head"><h3>Audit trail & activity</h3><span class="eyebrow">ACTIVITY</span></div>
          <div class="list-stack">
            ${events.map(ev => `
              <div class="activity-item">
                <span class="activity-dot"><i class="bi bi-check"></i></span>
                <div class="activity-copy">
                  <strong>Status: ${normalizeStatus(ev.status)}</strong>
                  <p>${ev.status === 'requested' ? 'Service request dispatched to provider.' : ev.status === 'accepted' ? 'Provider confirmed appointment.' : ev.status === 'on_the_way' ? 'Provider en route to address.' : ev.status === 'in_progress' ? 'Service execution started.' : ev.status === 'completed' ? 'Job completed and invoice generated.' : 'Request cancelled.'}</p>
                  <time>${new Date(ev.created_at).toLocaleString()}</time>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      // Wiring action buttons
      document.getElementById('trackCancelBtn')?.addEventListener('click', async () => {
        if (!confirm('Cancel this request?')) return;
        try {
          const cRes = await fetch(`/api/requests/${reqId}/cancel`, { method: 'POST', credentials: 'include' });
          if (!cRes.ok) throw new Error('Cancellation failed');
          window.toast('Request cancelled successfully.');
          loadTrackingData();
        } catch (err) {
          window.toast('Error: ' + err.message);
        }
      });

      document.getElementById('trackRescheduleBtn')?.addEventListener('click', () => {
        const minDate = new Date().toISOString().split('T')[0];
        const bodyHtml = `
          <form id="rescheduleForm">
            <div class="form-grid">
              <div class="form-field full">
                <label>New Service Date</label>
                <input type="date" name="new_date" min="${minDate}" value="${req.preferred_date || minDate}" required />
              </div>
              <div class="form-field full">
                <label>New Time Window</label>
                <select name="time_window" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-surface); color:var(--text-main);">
                  <option value="09:00-11:00">09:00 AM - 11:00 AM</option>
                  <option value="11:00-13:00">11:00 AM - 01:00 PM</option>
                  <option value="14:00-16:00" selected>02:00 PM - 04:00 PM</option>
                  <option value="16:00-18:00">04:00 PM - 06:00 PM</option>
                </select>
              </div>
            </div>
            <div class="modal-actions" style="margin-top:20px;">
              <button type="button" class="secondary-btn" onclick="window.closeModal()">Cancel</button>
              <button type="submit" class="primary-btn" id="confirmRescheduleBtn">Confirm Reschedule</button>
            </div>
          </form>
        `;

        window.openModal('Reschedule Appointment', bodyHtml, 'APPOINTMENT SCHEDULE');

        document.getElementById('rescheduleForm')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = document.getElementById('confirmRescheduleBtn');
          if (btn) btn.disabled = true;

          const fd = new FormData(e.target);
          const newDate = fd.get('new_date');
          const timeWindow = fd.get('time_window') || '14:00-16:00';
          const [startStr, endStr] = timeWindow.split('-');
          const [sH, sM] = startStr.split(':').map(Number);
          const [eH, eM] = endStr.split(':').map(Number);

          try {
            const rRes = await fetch(`/api/requests/${reqId}/reschedule`, {
              method: 'PATCH',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                new_date: newDate,
                new_start_minute: sH * 60 + (sM || 0),
                new_end_minute: eH * 60 + (eM || 0)
              })
            });
            const rData = await rRes.json();
            if (rRes.status === 409) {
              window.toast('Slot unavailable. Please choose another date or time.');
              if (btn) btn.disabled = false;
              return;
            }
            if (!rRes.ok || !rData.ok) throw new Error(rData.error || 'Reschedule failed');

            window.closeModal();
            window.toast('Service rescheduled successfully!');
            loadTrackingData();
          } catch (err) {
            window.toast('Error: ' + err.message);
            if (btn) btn.disabled = false;
          }
        });
      });

      document.getElementById('trackRateBtn')?.addEventListener('click', () => {
        const bodyHtml = `
          <form id="ratingForm">
            <div class="form-grid">
              <div class="form-field full">
                <label>Rating (1 to 5 Stars)</label>
                <select name="rating_stars" style="font-size:15px; padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-surface); color:var(--text-main);">
                  <option value="5">5 Stars — Exceptional Service</option>
                  <option value="4">4 Stars — Very Good</option>
                  <option value="3">3 Stars — Satisfactory</option>
                  <option value="2">2 Stars — Needs Improvement</option>
                  <option value="1">1 Star — Poor Experience</option>
                </select>
              </div>
              <div class="form-field full">
                <label>Review comment</label>
                <textarea name="review_comment" placeholder="Describe the quality of service, punctuality, and workmanship..." rows="3"></textarea>
              </div>
            </div>
            <div class="modal-actions" style="margin-top:20px;">
              <button type="button" class="secondary-btn" onclick="window.closeModal()">Cancel</button>
              <button class="primary-btn" type="submit" id="submitRatingBtn">Submit Rating</button>
            </div>
          </form>
        `;

        window.openModal('Rate your service', bodyHtml, 'SERVICE RATING');

        document.getElementById('ratingForm')?.addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = document.getElementById('submitRatingBtn');
          if (btn) btn.disabled = true;

          const fd = new FormData(e.target);
          const rating_stars = Number(fd.get('rating_stars')) || 5;
          const review_comment = fd.get('review_comment') || '';

          try {
            const rtRes = await fetch(`/api/ratings/by-request/${reqId}`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ rating_stars, review_comment })
            });
            const rtData = await rtRes.json();
            if (!rtRes.ok || !rtData.ok) throw new Error(rtData.error || 'Rating failed');

            window.closeModal();
            window.toast('Thank you for rating your specialist!');
            loadTrackingData();
          } catch (err) {
            window.toast('Rating error: ' + err.message);
            if (btn) btn.disabled = false;
          }
        });
      });

    } catch (err) {
      container.innerHTML = `<div class="empty-state">${window.escapeHtml(err.message)}</div>`;
    }
  }

  await loadTrackingData();
});
