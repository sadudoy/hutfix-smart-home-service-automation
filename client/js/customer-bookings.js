/**
 * HutFix — Customer Bookings Management (MPA)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.renderLayout('customer', 'bookings');
  if (!user) return;

  let allBookings = [];
  let currentFilter = 'All';

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

  function statusClass(s) {
    switch (s) {
      case 'Completed': return 'completed';
      case 'In progress': return 'progress';
      case 'Pending': return 'pending';
      case 'Cancelled': return 'cancelled';
      default: return 'pending';
    }
  }

  async function loadBookings() {
    try {
      const res = await fetch('/api/requests/mine', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load bookings');
      const data = await res.json();
      allBookings = (data.requests || []).map(r => {
        const timeStr = r.preferred_start_minute ? window.minutesToTime(r.preferred_start_minute) : '10:00 AM';
        return {
          id: r.id,
          displayId: 'HF-' + (1000 + Number(r.id)),
          service: r.category_name || 'Home Service',
          provider: r.provider_name || 'Assigned Specialist',
          date: `${r.preferred_date || 'Upcoming'} · ${timeStr}`,
          rawDate: r.preferred_date,
          price: Number(r.estimated_price || 800),
          status: normalizeStatus(r.status),
          rawStatus: r.status,
          ratingStars: r.rating_stars,
          ratingComment: r.rating_comment,
          address: r.address || 'Dhaka, Bangladesh'
        };
      });

      renderBookingsTable();
    } catch (err) {
      const tbody = document.getElementById('bookingsTableBody');
      if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="empty-state">${window.escapeHtml(err.message)}</td></tr>`;
    }
  }

  function renderBookingsTable() {
    const tbody = document.getElementById('bookingsTableBody');
    if (!tbody) return;

    const filtered = allBookings.filter(b => currentFilter === 'All' || b.status === currentFilter);

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:32px 16px; color:var(--muted);">No bookings found in this category.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(b => {
      const isCompleted = b.status === 'Completed';
      const isPendingOrActive = b.status === 'Pending' || b.status === 'In progress';
      const canCancel = b.rawStatus === 'requested' || b.rawStatus === 'accepted';
      const isRated = b.ratingStars != null;

      return `
        <tr>
          <td><strong>${b.displayId}</strong></td>
          <td>${window.escapeHtml(b.service)}</td>
          <td><strong>${window.escapeHtml(b.provider)}</strong></td>
          <td>${b.date}</td>
          <td><span class="status ${statusClass(b.status)}">${b.status}</span></td>
          <td><strong>${window.money(b.price)}</strong></td>
          <td>
            <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
              ${isPendingOrActive ? `
                <a href="customer-track.html?id=${b.id}" class="secondary-btn" style="padding:4px 10px; font-size:12px; min-height:30px;"><i class="bi bi-geo-alt"></i> Track</a>
                <button class="secondary-btn" style="padding:4px 10px; font-size:12px; min-height:30px;" onclick="openRescheduleModal(${b.id}, '${b.rawDate}')"><i class="bi bi-calendar"></i> Reschedule</button>
              ` : ''}
              ${canCancel ? `
                <button class="danger-btn" style="padding:4px 10px; font-size:12px; min-height:30px;" onclick="cancelBooking(${b.id})"><i class="bi bi-x-circle"></i> Cancel</button>
              ` : ''}
              ${isCompleted ? `
                <a href="invoice.html?request_id=${b.id}" class="secondary-btn" style="padding:4px 10px; font-size:12px; min-height:30px;"><i class="bi bi-receipt"></i> Invoice</a>
                ${!isRated ? `
                  <button class="primary-btn" style="padding:4px 10px; font-size:12px; min-height:30px;" onclick="openRatingModal(${b.id})"><i class="bi bi-star"></i> Rate</button>
                ` : `
                  <span style="font-size:12px; color:var(--amber); font-weight:700;"><i class="bi bi-star-fill text-amber"></i> ${b.ratingStars} / 5</span>
                `}
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Filter pills
  document.querySelectorAll('#statusFilterPills .pill-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#statusFilterPills .pill-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderBookingsTable();
    });
  });

  // Cancel Booking
  window.cancelBooking = async function(reqId) {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const res = await fetch(`/api/requests/${reqId}/cancel`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Cancellation failed');
      window.toast('Booking cancelled successfully.');
      await loadBookings();
    } catch (err) {
      window.toast('Error: ' + err.message);
    }
  };

  // Reschedule Modal
  window.openRescheduleModal = function(reqId, currentDate) {
    const minDate = new Date().toISOString().split('T')[0];
    const cDate = currentDate || minDate;
    const bodyHtml = `
      <form id="rescheduleForm">
        <div class="form-grid">
          <div class="form-field full">
            <label>New Service Date</label>
            <input type="date" name="new_date" min="${minDate}" value="${cDate}" required />
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
        const res = await fetch(`/api/requests/${reqId}/reschedule`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            new_date: newDate,
            new_start_minute: sH * 60 + (sM || 0),
            new_end_minute: eH * 60 + (eM || 0)
          })
        });
        const data = await res.json();
        if (res.status === 409) {
          window.toast('Slot unavailable. Please choose another date or time.');
          if (btn) btn.disabled = false;
          return;
        }
        if (!res.ok || !data.ok) throw new Error(data.error || 'Reschedule failed');

        window.closeModal();
        window.toast('Service rescheduled successfully!');
        await loadBookings();
      } catch (err) {
        window.toast('Error: ' + err.message);
        if (btn) btn.disabled = false;
      }
    });
  };

  // Rating Modal
  window.openRatingModal = function(reqId) {
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
        const res = await fetch(`/api/ratings/by-request/${reqId}`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating_stars, review_comment })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || 'Rating failed');

        window.closeModal();
        window.toast('Thank you for rating your specialist!');
        await loadBookings();
      } catch (err) {
        window.toast('Rating error: ' + err.message);
        if (btn) btn.disabled = false;
      }
    });
  };

  await loadBookings();
});
