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
        ? '<span class="status-pill progress">Specialist</span>'
        : (t.role === 'admin' 
            ? '<span class="status-pill review">Admin</span>' 
            : '<span class="status-pill completed">Customer</span>');

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
            <div style="display:flex; gap:6px; align-items:center;">
              <button class="btn btn-sm btn-primary" onclick="openAdminTicketChat(${t.id})" title="Open live ticket conversation">
                <i class="bi bi-chat-dots"></i> Chat
              </button>
              ${canAct ? `
                <button class="btn btn-sm btn-secondary" onclick="resolveTicket(${t.id}, 'resolved', this)" title="Mark as resolved">
                  <i class="bi bi-check-circle"></i> Resolve
                </button>
              ` : `
                <button class="btn btn-sm btn-ghost" style="color:var(--text-muted);" onclick="resolveTicket(${t.id}, 'open', this)" title="Reopen ticket">
                  Reopen
                </button>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Failed to load tickets:', err);
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state" style="color:var(--danger); text-align:center; padding:24px;">Failed to load tickets: ${window.escapeHtml(err.message)}</td></tr>`;
  }
}

window.openAdminTicketChat = async function(ticketId) {
  try {
    const res = await window.api(`/support/${ticketId}/messages`);
    const ticket = res.ticket;
    const messages = res.messages || [];

    const isResolved = ticket.status === 'resolved' || ticket.status === 'closed';

    const renderChatMessages = (msgs) => {
      if (msgs.length === 0) {
        return '<div style="text-align:center; color:var(--text-muted); font-size:13px; padding:20px;">No messages in this ticket thread yet.</div>';
      }
      return msgs.map(m => {
        const isAdminSender = m.sender_role === 'admin' || Number(m.sender_id) === Number(window.currentUser?.id);
        const timeStr = m.created_at ? new Date(m.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
        const roleLabel = isAdminSender ? 'You (Admin)' : `${window.escapeHtml(m.sender_name || 'User')} (${m.sender_role || 'User'})`;

        return `
          <div class="chat-msg ${isAdminSender ? 'mine' : 'theirs'}">
            <div class="chat-msg-meta">
              <strong>${roleLabel}</strong>
              <span class="chat-msg-time">${timeStr}</span>
            </div>
            <div>${window.escapeHtml(m.message)}</div>
          </div>
        `;
      }).join('');
    };

    const chatHtml = `
      <div class="chat-container">
        <div class="chat-header">
          <div>
            <strong style="color:var(--text-main); font-size:15px;">${window.escapeHtml(ticket.subject)}</strong>
            <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">
              User: <strong style="color:var(--text-main);">${window.escapeHtml(ticket.user_name || 'User')}</strong> (${ticket.user_email || '—'}) · Ticket #${ticket.id}
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="badge ${ticket.status === 'resolved' ? 'badge-completed' : 'badge-pending'}">${ticket.status.toUpperCase()}</span>
            <button class="btn btn-sm ${ticket.status === 'resolved' ? 'btn-ghost' : 'btn-secondary'}" onclick="resolveTicketInChat(${ticket.id}, '${ticket.status === 'resolved' ? 'open' : 'resolved'}')">
              <i class="bi ${ticket.status === 'resolved' ? 'bi-arrow-counterclockwise' : 'bi-check-circle'}"></i> ${ticket.status === 'resolved' ? 'Reopen' : 'Resolve'}
            </button>
          </div>
        </div>

        <div class="chat-messages" id="adminChatMessagesBox">
          ${renderChatMessages(messages)}
        </div>

        <form id="adminTicketReplyForm" class="chat-input-bar">
          <input type="text" name="message" id="adminChatReplyInput" placeholder="Reply to user as Admin Support..." autocomplete="off" required />
          <button type="submit" class="btn btn-primary" id="adminSendReplyBtn" style="padding:10px 18px;">
            <i class="bi bi-send-fill"></i> Send Reply
          </button>
        </form>
      </div>
    `;

    window.openModal(`Support Desk: Ticket #${ticket.id}`, chatHtml, 'ADMIN CHAT INTERFACE');

    const box = document.getElementById('adminChatMessagesBox');
    if (box) box.scrollTop = box.scrollHeight;

    document.getElementById('adminTicketReplyForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('adminChatReplyInput');
      const sendBtn = document.getElementById('adminSendReplyBtn');
      const text = input ? input.value.trim() : '';
      if (!text) return;

      if (sendBtn) sendBtn.disabled = true;

      try {
        await window.api(`/support/${ticketId}/messages`, {
          method: 'POST',
          body: { message: text }
        });
        if (input) input.value = '';
        window.openAdminTicketChat(ticketId);
        loadTickets();
      } catch (err) {
        window.toast('Error sending message: ' + err.message);
        if (sendBtn) sendBtn.disabled = false;
      }
    });

  } catch (err) {
    console.error('openAdminTicketChat error:', err);
    window.toast('Could not open ticket thread: ' + err.message);
  }
};

window.resolveTicketInChat = async function(id, status) {
  try {
    await window.api(`/admin/support/${id}`, {
      method: 'PATCH',
      body: { status }
    });
    window.toast(`Ticket #${id} marked as ${status}.`, 'success');
    window.openAdminTicketChat(id);
    loadTickets();
  } catch (err) {
    window.toast('Error updating ticket: ' + err.message);
  }
};

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
