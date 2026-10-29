/**
 * HutFix — Admin All Bookings Ledger (MPA)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const admin = await window.renderLayout('admin', 'all-bookings');
  if (!admin) return;

  let allBookings = [];
  let searchQuery = '';
  let statusFilter = 'All';

  const tbody = document.getElementById('allBookingsTableBody');

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
      const res = await fetch('/api/admin/bookings?limit=100', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load bookings');
      const data = await res.json();
      allBookings = data.bookings || [];
      renderTable();
    } catch (err) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="empty-state">${window.escapeHtml(err.message)}</td></tr>`;
    }
  }

  function renderTable() {
    if (!tbody) return;

    const filtered = allBookings.filter(b => {
      const norm = normalizeStatus(b.status);
      const matchStatus = statusFilter === 'All' || norm === statusFilter;
      const matchQ = !searchQuery || (String(b.id) + ' ' + (b.category_name || '') + ' ' + (b.customer_name || '') + ' ' + (b.provider_name || '')).toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchQ;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:32px 16px; color:var(--muted);">No bookings match the filter criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(b => {
      const norm = normalizeStatus(b.status);
      return `
        <tr>
          <td data-label="ID"><strong>#${b.id}</strong></td>
          <td data-label="Date">${b.preferred_date || 'N/A'}</td>
          <td data-label="Customer">${window.escapeHtml(b.customer_name || 'Customer')}</td>
          <td data-label="Provider">${window.escapeHtml(b.provider_name || 'Unassigned')}</td>
          <td data-label="Service">${window.escapeHtml(b.category_name || 'Service')}</td>
          <td data-label="Payment Method"><span class="badge font-mono" style="font-size:11px; padding:3px 8px;">${(b.payment_method || 'bKash').toUpperCase()}</span></td>
          <td data-label="Amount"><strong>${window.money(b.estimated_price)}</strong></td>
          <td data-label="Status"><span class="status ${statusClass(norm)}">${norm}</span></td>
        </tr>
      `;
    }).join('');
  }

  document.getElementById('adminBookingSearch')?.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderTable();
  });

  document.getElementById('adminBookingStatusFilter')?.addEventListener('change', (e) => {
    statusFilter = e.target.value;
    renderTable();
  });

  await loadBookings();
});
