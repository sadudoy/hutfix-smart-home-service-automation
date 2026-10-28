document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.renderLayout('admin', 'payouts');
  if (!user) return;

  loadPayouts();
});

async function loadPayouts() {
  const tbody = document.getElementById('payoutsTableBody');
  if (!tbody) return;

  try {
    const res = await window.api('/admin/payouts');
    const payouts = res.payouts || [];

    if (payouts.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state" style="text-align:center; padding:32px; color:var(--text-muted);"><i class="bi bi-wallet2" style="font-size:28px; display:block; margin-bottom:8px; color:var(--accent);"></i>No pending payout requests found. All provider disbursements are up to date.</td></tr>';
      return;
    }

    tbody.innerHTML = payouts.map(p => {
      const dt = p.created_at ? new Date(p.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
      const statusBadge = '<span class="badge badge-pending">Pending</span>';

      return `
        <tr>
          <td><strong style="color:var(--text-main);">${dt}</strong><div class="table-sub">Req #${p.id}</div></td>
          <td>
            <div style="font-weight:600; color:var(--text-main);">${window.escapeHtml(p.provider_name || 'Specialist')}</div>
            <div class="table-sub">Provider ID #${p.provider_id}</div>
          </td>
          <td>
            <div style="font-family:var(--font-mono); font-weight:600; color:var(--text-main);"><i class="bi bi-telephone"></i> ${window.escapeHtml(p.provider_phone || '—')}</div>
            <div class="table-sub"><i class="bi bi-envelope"></i> ${window.escapeHtml(p.provider_email || '—')}</div>
          </td>
          <td>
            <strong style="color:var(--accent); font-size:16px;">${window.money(p.amount || 0)}</strong>
          </td>
          <td>${statusBadge}</td>
          <td>
            <div style="display:flex; gap:6px; align-items:center;">
              <button class="btn btn-sm btn-primary" onclick="approvePayout(${p.id}, 'approve', this)">
                <i class="bi bi-check-circle"></i> Approve
              </button>
              <button class="btn btn-sm btn-ghost" style="color:var(--danger); border-color:var(--danger);" onclick="approvePayout(${p.id}, 'reject', this)">
                <i class="bi bi-x-circle"></i> Reject
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load payouts:', err);
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state" style="color:var(--danger); text-align:center; padding:24px;">Failed to load payouts: ${window.escapeHtml(err.message)}</td></tr>`;
  }
}

window.approvePayout = async function(id, action, btnElement) {
  if (btnElement) {
    btnElement.disabled = true;
    btnElement.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Processing...';
  }

  try {
    await window.api(`/admin/payouts/${id}/approve`, {
      method: 'PATCH',
      body: { action }
    });
    window.toast(action === 'approve' ? 'Payout approved and queued for bank transfer.' : 'Payout request rejected.', 'success');
    await loadPayouts();
  } catch (err) {
    console.error('Approve payout error:', err);
    window.toast(err.message || 'Operation failed', 'error');
    if (btnElement) {
      btnElement.disabled = false;
      btnElement.innerHTML = action === 'approve' ? '<i class="bi bi-check-circle"></i> Approve' : '<i class="bi bi-x-circle"></i> Reject';
    }
  }
};
