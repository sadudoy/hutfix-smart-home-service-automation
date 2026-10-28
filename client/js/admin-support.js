document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.renderLayout('admin', 'support');
  if (!user) return;

  loadTickets();
});

async function loadTickets() {
  const tbody = document.getElementById('supportTableBody');
  if (!tbody) return;

  try {
    const res = await window.api('/admin/support');
    const tickets = res.tickets || [];

    if (tickets.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-state" style="text-align:center; padding:32px; color:var(--text-muted);"><i class="bi bi-chat-left-dots" style="font-size:28px; display:block; margin-bottom:8px; color:var(--accent);"></i>No support tickets found. Helpdesk inbox is empty.</td></tr>';
      return;
    }

    tbody.innerHTML = tickets.map(t => {
      const dt = t.created_at ? new Date(t.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
      const roleBadge = t.role === 'provider' 
        ? '<span class="badge" style="background:var(--accent-glow); color:var(--accent); font-weight:700;">Specialist</span>'
        : (t.role === 'admin' 
            ? '<span class="badge badge-assigned">Admin</span>' 
            : '<span class="badge badge-accepted">Customer</span>');

      let statusBadge = '<span class="badge badge-pending">Open</span>';
      if (t.status === 'resolved') {
        statusBadge = '<span class="badge badge-completed"><i class="bi bi-check-circle"></i> Resolved</span>';
      } else if (t.status === 'closed') {
        statusBadge = '<span class="badge" style="background:var(--bg-sunken); color:var(--text-muted);">Closed</span>';
      }

      const canAct = t.status === 'open';

      return `
        <tr>
          <td><strong style="color:var(--text-main);">${dt}</strong><div class="table-sub">Ticket #${t.id}</div></td>
          <td>
            <div style="font-weight:600; color:var(--text-main);">${window.escapeHtml(t.full_name || 'User')}</div>
            <div class="table-sub"><i class="bi bi-envelope"></i> ${window.escapeHtml(t.email || '—')}</div>
          </td>
          <td>${roleBadge}</td>
          <td>
            <strong style="color:var(--text-main);">${window.escapeHtml(t.subject || 'No subject')}</strong>
          </td>
          <td style="max-width:320px;">
            <div style="font-size:13px; color:var(--text-muted); white-space:pre-wrap; word-break:break-word;">${window.escapeHtml(t.message || '')}</div>
          </td>
          <td>${statusBadge}</td>
          <td>
            ${canAct ? `
              <div style="display:flex; gap:6px;">
                <button class="btn btn-sm btn-primary" onclick="resolveTicket(${t.id}, 'resolved', this)">
                  <i class="bi bi-check-circle"></i> Resolve
                </button>
                <button class="btn btn-sm btn-ghost" style="color:var(--text-muted);" onclick="resolveTicket(${t.id}, 'closed', this)">
                  Close
                </button>
              </div>
            ` : `
              <span style="font-size:12px; color:var(--text-muted);"><i class="bi bi-check2-all"></i> Done</span>
            `}
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load tickets:', err);
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state" style="color:var(--danger); text-align:center; padding:24px;">Failed to load tickets: ${window.escapeHtml(err.message)}</td></tr>`;
  }
}

window.resolveTicket = async function(id, status, btnElement) {
  if (btnElement) {
    btnElement.disabled = true;
    btnElement.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Updating...';
  }

  try {
    await window.api(`/admin/support/${id}`, {
      method: 'PATCH',
      body: { status }
    });
    window.toast(`Ticket #${id} marked as ${status}.`, 'success');
    await loadTickets();
  } catch (err) {
    console.error('Resolve ticket error:', err);
    window.toast(err.message || 'Operation failed', 'error');
    if (btnElement) {
      btnElement.disabled = false;
      btnElement.innerHTML = '<i class="bi bi-check-circle"></i> Resolve';
    }
  }
};
