/**
 * HutFix — Provider Requests & Fulfillment Workflow (MPA)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.renderLayout('provider', 'requests');
  if (!user) return;

  const inContainer = document.getElementById('incomingContainer');
  const actContainer = document.getElementById('activeContainer');
  const histContainer = document.getElementById('historyContainer');

  const inHead = document.getElementById('incomingHeading');
  const actHead = document.getElementById('activeHeading');
  const histHead = document.getElementById('historyHeading');

  async function loadBuckets() {
    try {
      const [incRes, actRes, histRes] = await Promise.all([
        fetch('/api/provider/requests?bucket=incoming', { credentials: 'include' }),
        fetch('/api/provider/requests?bucket=active', { credentials: 'include' }),
        fetch('/api/provider/requests?bucket=history', { credentials: 'include' })
      ]);

      const incData = incRes.ok ? await incRes.json() : { requests: [] };
      const actData = actRes.ok ? await actRes.json() : { requests: [] };
      const histData = histRes.ok ? await histRes.json() : { requests: [] };

      const incoming = incData.requests || [];
      const active = actData.requests || [];
      const history = histData.requests || [];

      if (inHead) inHead.textContent = `Incoming requests (${incoming.length})`;
      if (actHead) actHead.textContent = `Active jobs (${active.length})`;
      if (histHead) histHead.textContent = `Completed jobs history (${history.length})`;

      // 1. Incoming
      if (incoming.length === 0) {
        inContainer.innerHTML = '<div class="empty-state">No incoming requests waiting for acceptance.</div>';
      } else {
        inContainer.innerHTML = incoming.map(r => `
          <div class="booking-card">
            <div class="booking-symbol cover-wash"><i class="bi bi-calendar-event"></i></div>
            <div class="booking-main">
              <h3>${window.escapeHtml(r.category_name || 'Home Service')} · Request #${r.id}</h3>
              <p>Client: <strong>${window.escapeHtml(r.customer_name || 'Customer')}</strong> (${r.phone || 'N/A'})<br>Date: ${r.preferred_date} · ${window.minutesToTime(r.preferred_start_minute)}<br>Address: ${window.escapeHtml(r.address)}<br>${r.description ? `Notes: “${window.escapeHtml(r.description)}”` : ''}</p>
            </div>
            <div class="booking-side">
              <strong>${window.money(r.estimated_price)}</strong>
              <span class="status pending">New Request</span>
              <div style="display:flex; gap:6px; margin-top:8px;">
                <button class="primary-btn" onclick="acceptRequest(${r.id})" style="padding:4px 10px; font-size:12px; min-height:30px;"><i class="bi bi-check-lg"></i> Accept</button>
                <button class="danger-btn" onclick="declineRequest(${r.id})" style="padding:4px 10px; font-size:12px; min-height:30px;">Decline</button>
              </div>
            </div>
          </div>
        `).join('');
      }

      // 2. Active
      if (active.length === 0) {
        actContainer.innerHTML = '<div class="empty-state">No active jobs in progress.</div>';
      } else {
        const nextMap = { accepted: 'on_the_way', on_the_way: 'in_progress', in_progress: 'completed' };
        const nextLabel = { accepted: 'Mark: On the way', on_the_way: 'Mark: In progress', in_progress: 'Mark: Completed' };

        actContainer.innerHTML = active.map(r => {
          const nextStatus = nextMap[r.status];
          return `
            <div class="booking-card">
              <div class="booking-symbol cover-cool"><i class="bi bi-tools"></i></div>
              <div class="booking-main">
                <h3>${window.escapeHtml(r.category_name || 'Home Service')} · Request #${r.id}</h3>
                <p>Client: <strong>${window.escapeHtml(r.customer_name || 'Customer')}</strong> (${r.phone || 'N/A'})<br>Date: ${r.preferred_date} · ${window.minutesToTime(r.preferred_start_minute)}<br>Address: ${window.escapeHtml(r.address)}</p>
              </div>
              <div class="booking-side">
                <strong>${window.money(r.estimated_price)}</strong>
                <span class="status progress">${r.status}</span>
                ${nextStatus ? `
                  <button class="primary-btn" onclick="advanceRequest(${r.id}, '${nextStatus}')" style="padding:6px 12px; font-size:12px; min-height:34px; margin-top:6px;">
                    ${nextLabel[r.status]} <i class="bi bi-arrow-right"></i>
                  </button>
                ` : ''}
              </div>
            </div>
          `;
        }).join('');
      }

      // 3. History
      if (history.length === 0) {
        histContainer.innerHTML = '<div class="empty-state">No past completed appointments recorded.</div>';
      } else {
        histContainer.innerHTML = history.map(r => `
          <div class="booking-card">
            <div class="booking-symbol cover-lavender"><i class="bi bi-check-circle"></i></div>
            <div class="booking-main">
              <h3>${window.escapeHtml(r.category_name)} · Request #${r.id}</h3>
              <p>Client: ${window.escapeHtml(r.customer_name)} · Date: ${r.preferred_date}</p>
            </div>
            <div class="booking-side">
              <strong>${window.money(r.estimated_price)}</strong>
              <span class="status completed">${r.status}</span>
            </div>
          </div>
        `).join('');
      }
    } catch (err) {
      console.error('loadBuckets error:', err);
    }
  }

  window.acceptRequest = async function(reqId) {
    try {
      const res = await fetch(`/api/requests/${reqId}/accept`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('Accept request failed');
      window.toast('Appointment confirmed and accepted!');
      await loadBuckets();
    } catch (err) {
      window.toast('Error: ' + err.message);
    }
  };

  window.declineRequest = async function(reqId) {
    if (!confirm('Decline this request?')) return;
    try {
      const res = await fetch(`/api/requests/${reqId}/decline`, { method: 'POST', credentials: 'include' });
      if (!res.ok) throw new Error('Decline failed');
      window.toast('Request declined.');
      await loadBuckets();
    } catch (err) {
      window.toast('Error: ' + err.message);
    }
  };

  window.advanceRequest = async function(reqId, nextStatus) {
    try {
      const res = await fetch(`/api/requests/${reqId}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (!res.ok) throw new Error('Status update failed');
      window.toast(`Job advanced to: ${nextStatus.replace(/_/g, ' ')}`);
      await loadBuckets();
    } catch (err) {
      window.toast('Error: ' + err.message);
    }
  };

  await loadBuckets();
});
