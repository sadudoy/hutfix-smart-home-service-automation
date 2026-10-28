document.addEventListener('DOMContentLoaded', async () => {
  // 1. Fetch user data
  const res = await fetch('/api/auth/me', { credentials: 'include' });
  if (!res.ok) {
    window.location.href = 'login.html';
    return;
  }
  const data = await res.json();
  const user = data.user;

  const role = user.role === 'customer' ? 'client' : user.role === 'provider' ? 'repairman' : 'admin';

  // 2. Render Layout (Sidebar + Topbar)
  await window.renderLayout(role, 'admin-payments', user); // Pass the user object!

  // 3. Load page specific data (after layout is rendered)
  await loadPayments();
});

async function loadPayments() {
  const tbody = document.getElementById('paymentsTableBody');
  if (!tbody) return;

  try {
    const res = await window.api('/admin/payments');
    const payments = res.payments || [];

    if (payments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state" style="text-align:center; padding:32px; color:var(--text-muted);"><i class="bi bi-shield-check" style="font-size:28px; display:block; margin-bottom:8px; color:var(--accent);"></i>No pending payment verifications found. All transactions reconciled.</td></tr>';
      return;
    }

    tbody.innerHTML = payments.map(p => {
      const dt = p.created_at ? new Date(p.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
      const methodBadge = p.payment_method === 'nagad' ? '<span class="badge" style="background:#f97316; color:#fff;">Nagad</span>' : '<span class="badge" style="background:#ec4899; color:#fff;">bKash</span>';

      return `
        <tr>
          <td><strong style="color:var(--text-main);">${dt}</strong><div class="table-sub">Req #${p.id}</div></td>
          <td>
            <div style="font-weight:600; color:var(--text-main);">${window.escapeHtml(p.customer_name || 'Customer')}</div>
            <div class="table-sub"><i class="bi bi-telephone"></i> ${window.escapeHtml(p.customer_phone || p.customer_email || '—')}</div>
          </td>
          <td>
            <code style="background:var(--bg-sunken); padding:3px 8px; border-radius:4px; font-weight:700; color:var(--accent); font-family:var(--font-mono);">${window.escapeHtml(p.trx_id || 'N/A')}</code>
          </td>
          <td>
            <span style="font-family:var(--font-mono); font-weight:600; color:var(--text-main);">${window.escapeHtml(p.sender_number || '—')}</span>
            <div>${methodBadge}</div>
          </td>
          <td>
            <div style="font-weight:500; color:var(--text-main);">${window.escapeHtml(p.category_name || 'General')}</div>
            <div class="table-sub">Slot: ${window.escapeHtml(p.preferred_date || '—')}</div>
          </td>
          <td>
            <strong style="color:var(--accent); font-size:15px;">${window.money(p.estimated_price || 0)}</strong>
          </td>
          <td>
            <div style="display:flex; gap:6px; align-items:center;">
              <button class="btn btn-sm btn-primary" onclick="verifyPayment(${p.id}, 'verify', this)">
                <i class="bi bi-check-circle"></i> Verify
              </button>
              <button class="btn btn-sm btn-ghost" style="color:var(--danger); border-color:var(--danger);" onclick="verifyPayment(${p.id}, 'reject', this)">
                <i class="bi bi-x-circle"></i> Reject
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load payments:', err);
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state" style="color:var(--danger); text-align:center; padding:24px;">Failed to load payments: ${window.escapeHtml(err.message)}</td></tr>`;
  }
}

window.verifyPayment = async function(id, action, btnElement) {
  if (btnElement) {
    btnElement.disabled = true;
    btnElement.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Processing...';
  }

  try {
    await window.api(`/admin/payments/${id}/verify`, {
      method: 'PATCH',
      body: { action }
    });
    window.toast(action === 'verify' ? 'Payment verified successfully.' : 'Payment proof rejected.', 'success');
    await loadPayments();
  } catch (err) {
    console.error('Verify payment error:', err);
    window.toast(err.message || 'Operation failed', 'error');
    if (btnElement) {
      btnElement.disabled = false;
      btnElement.innerHTML = action === 'verify' ? '<i class="bi bi-check-circle"></i> Verify' : '<i class="bi bi-x-circle"></i> Reject';
    }
  }
};
