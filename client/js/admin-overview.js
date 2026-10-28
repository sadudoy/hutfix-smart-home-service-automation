/**
 * HutFix — Admin Overview Control Center (MPA)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.renderLayout('admin', 'admin-overview');
  if (!user) return;

  async function loadAdminStats() {
    try {
      const [statsRes, bookingsRes, paymentsRes] = await Promise.all([
        fetch('/api/admin/stats', { credentials: 'include' }),
        fetch('/api/admin/bookings?limit=5', { credentials: 'include' }),
        fetch('/api/admin/payments', { credentials: 'include' })
      ]);

      const statsData = statsRes.ok ? await statsRes.json() : { stats: {} };
      const bookingsData = bookingsRes.ok ? await bookingsRes.json() : { bookings: [] };
      const paymentsData = paymentsRes.ok ? await paymentsRes.json() : { payments: [] };

      const stats = statsData.stats || {};
      const bookings = bookingsData.bookings || [];
      const payments = paymentsData.payments || [];

      const bEl = document.getElementById('valTotalBookings');
      const gEl = document.getElementById('valGrossVolume');
      const uEl = document.getElementById('valTotalUsers');
      const pEl = document.getElementById('valTotalProviders');

      if (bEl) bEl.textContent = stats.total_bookings ?? 0;
      if (gEl) gEl.textContent = window.money(stats.gross_volume ?? stats.total_revenue ?? 0);
      if (uEl) uEl.textContent = stats.total_users ?? 0;
      if (pEl) pEl.textContent = stats.total_providers ?? 0;

      // Recent Bookings Table
      const bTbody = document.getElementById('recentBookingsTbody');
      if (bTbody) {
        if (bookings.length === 0) {
          bTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--muted);">No bookings recorded.</td></tr>`;
        } else {
          bTbody.innerHTML = bookings.slice(0, 5).map(b => `
            <tr>
              <td><strong>#${b.id}</strong></td>
              <td>${window.escapeHtml(b.category_name || 'Service')}</td>
              <td>${window.escapeHtml(b.customer_name || 'Client')}</td>
              <td><span class="status ${b.status === 'completed' ? 'completed' : b.status === 'cancelled' ? 'cancelled' : 'progress'}">${b.status}</span></td>
            </tr>
          `).join('');
        }
      }

      // Pending Payments List
      const pList = document.getElementById('pendingPaymentsList');
      if (pList) {
        if (payments.length === 0) {
          pList.innerHTML = `<div class="empty-state">No pending payments to verify. All transactions settled.</div>`;
        } else {
          pList.innerHTML = payments.slice(0, 4).map(p => `
            <div class="activity-item" style="padding:10px 0; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
              <div>
                <strong style="font-size:13px; display:block;">TrxID: ${window.escapeHtml(p.trx_id || 'N/A')}</strong>
                <p style="font-size:12px; color:var(--muted); margin:2px 0 0;">${window.money(p.estimated_price)} from ${window.escapeHtml(p.customer_name || 'Customer')}</p>
              </div>
              <a href="admin-payments.html" class="primary-btn" style="padding:4px 8px; font-size:11px; min-height:26px;">Review</a>
            </div>
          `).join('');
        }
      }
    } catch (err) {
      console.error('loadAdminStats error:', err);
    }
  }

  await loadAdminStats();
});
