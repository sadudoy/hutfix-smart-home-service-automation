/**
 * HutFix — Admin Users & Provider Verification (MPA)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const admin = await window.renderLayout('admin', 'users');
  if (!admin) return;

  let allUsers = [];
  let searchQuery = '';
  let roleFilter = 'All';

  const tbody = document.getElementById('usersTableBody');

  async function loadUsers() {
    try {
      const res = await fetch('/api/admin/users', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      allUsers = data.users || [];
      renderUsersTable();
    } catch (err) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="empty-state">${window.escapeHtml(err.message)}</td></tr>`;
    }
  }

  function renderUsersTable() {
    if (!tbody) return;

    const filtered = allUsers.filter(u => {
      const matchRole = roleFilter === 'All' || u.role === roleFilter;
      const matchQ = !searchQuery || (u.full_name + ' ' + u.email + ' ' + u.role).toLowerCase().includes(searchQuery.toLowerCase());
      return matchRole && matchQ;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:32px 16px; color:var(--muted);">No users match the search/filter criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(u => {
      const isPro = u.role === 'provider';
      const isActive = u.is_active !== undefined ? Boolean(u.is_active) : (u.provider_active !== false);

      return `
        <tr>
          <td>
            <div class="admin-user" style="display:flex; align-items:center; gap:12px;">
              <div class="avatar ${isPro ? 'avatar-green' : 'avatar-lilac'}">
                ${(u.full_name || 'U').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <strong>${window.escapeHtml(u.full_name)}</strong>
                ${isPro && !isActive ? `<span class="status danger" style="margin-left:8px; font-size:11px; padding:2px 8px;">Pending Verification</span>` : ''}
              </div>
            </div>
          </td>
          <td><span class="status ${u.role === 'admin' ? 'review' : isPro ? (isActive ? 'progress' : 'danger') : 'completed'}">${u.role}</span></td>
          <td>${window.escapeHtml(u.email)}<br><small style="color:var(--muted);">${window.escapeHtml(u.phone || 'N/A')}</small></td>
          <td>${new Date(u.created_at).toLocaleDateString()}</td>
          <td>
            <div class="admin-actions">
              ${isPro ? `
                <button class="${isActive ? 'danger-btn' : 'primary-btn'}" style="padding:4px 12px; font-size:12px; min-height:30px;" onclick="verifyUser(${u.id}, ${isActive})">
                  ${isActive ? 'Suspend' : '<i class="bi bi-patch-check"></i> Verify'}
                </button>
              ` : `
                <span style="font-size:12px; color:var(--muted);">Standard</span>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.verifyUser = async function(id, isActive) {
    try {
      const res = await fetch(`/api/admin/users/${id}/verify`, { method: 'PATCH', credentials: 'include' });
      if (!res.ok) throw new Error('Verification toggle failed');
      window.toast(isActive ? 'Specialist suspended from matching.' : 'Specialist verified and active for bookings!');
      await loadUsers();
    } catch (err) {
      window.toast('Error: ' + err.message);
    }
  };

  document.getElementById('adminUserSearch')?.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderUsersTable();
  });

  document.getElementById('adminUserRoleFilter')?.addEventListener('change', (e) => {
    roleFilter = e.target.value;
    renderUsersTable();
  });

  await loadUsers();
});
