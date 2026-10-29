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
          <td><span class="status-pill ${u.role === 'admin' ? 'review' : isPro ? (isActive ? 'progress' : 'danger') : 'completed'}">${u.role}</span></td>
          <td>${window.escapeHtml(u.email)}<br><small style="color:var(--muted);">${window.escapeHtml(u.phone || 'N/A')}</small></td>
          <td>${new Date(u.created_at).toLocaleDateString()}</td>
          <td>
            <div class="admin-actions" style="display:flex; gap:6px;">
              <button class="secondary-btn" style="padding:4px 10px; font-size:12px; min-height:30px;" onclick="viewUser(${u.id})">
                <i class="bi bi-eye"></i> View
              </button>
              ${isPro ? `
                <button class="${isActive ? 'danger-btn' : 'primary-btn'}" style="padding:4px 12px; font-size:12px; min-height:30px;" onclick="verifyUser(${u.id}, ${isActive})">
                  ${isActive ? 'Suspend' : '<i class="bi bi-patch-check"></i> Verify'}
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  window.viewUser = async function(id) {
    try {
      const res = await fetch(`/api/admin/users/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch user details');
      const data = await res.json();
      const u = data.user;

      const isProvider = u.role === 'provider';
      const modalContent = `
        <div style="display:grid; gap:16px;">
          <div style="display:flex; align-items:center; gap:16px; padding-bottom:14px; border-bottom:1px solid var(--border-color);">
            <div class="avatar ${isProvider ? 'avatar-green' : 'avatar-lilac'}" style="width:48px; height:48px; font-size:18px;">
              ${(u.full_name || 'U').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 style="margin:0 0 4px; font-size:18px; color:var(--text-main);">${window.escapeHtml(u.full_name)}</h3>
              <span class="status-pill ${u.role === 'admin' ? 'review' : isProvider ? 'progress' : 'completed'}" style="font-size:11px; padding:2px 8px;">${u.role.toUpperCase()} ACCOUNT</span>
              ${isProvider ? `<span class="status ${u.is_active ? 'completed' : 'danger'}" style="margin-left:6px; font-size:11px; padding:2px 8px;">${u.is_active ? 'Verified & Active' : 'Pending Verification'}</span>` : ''}
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
            <div style="background:var(--bg-body); padding:12px; border-radius:10px; border:1px solid var(--border-color);">
              <small style="color:var(--text-muted); display:block; font-size:11px; text-transform:uppercase;">Email Address</small>
              <strong style="font-size:13px; color:var(--text-main);">${window.escapeHtml(u.email)}</strong>
            </div>
            <div style="background:var(--bg-body); padding:12px; border-radius:10px; border:1px solid var(--border-color);">
              <small style="color:var(--text-muted); display:block; font-size:11px; text-transform:uppercase;">Phone Number</small>
              <strong style="font-size:13px; color:var(--text-main);">${window.escapeHtml(u.phone || 'Not provided')}</strong>
            </div>
            <div style="background:var(--bg-body); padding:12px; border-radius:10px; border:1px solid var(--border-color); grid-column:1/-1;">
              <small style="color:var(--text-muted); display:block; font-size:11px; text-transform:uppercase;">Physical Address (${u.role === 'customer' ? 'Customer Address' : 'Provider Service Base'})</small>
              <strong style="font-size:13px; color:var(--text-main);">${window.escapeHtml(u.address || 'Dhaka, Bangladesh')}</strong>
            </div>

            ${isProvider ? `
              <div style="background:var(--bg-body); padding:12px; border-radius:10px; border:1px solid var(--border-color);">
                <small style="color:var(--text-muted); display:block; font-size:11px; text-transform:uppercase;">National ID (NID)</small>
                <strong style="font-size:13px; color:var(--primary);">${window.escapeHtml(u.nid_number || 'NID-VERIFIED')}</strong>
              </div>
              <div style="background:var(--bg-body); padding:12px; border-radius:10px; border:1px solid var(--border-color);">
                <small style="color:var(--text-muted); display:block; font-size:11px; text-transform:uppercase;">Rating</small>
                <strong style="font-size:13px; color:var(--amber);"><i class="bi bi-star-fill text-amber"></i> ${u.rating ? u.rating : '5.0'} (${u.rating_count} reviews)</strong>
              </div>
              ${u.headline ? `
                <div style="background:var(--bg-body); padding:12px; border-radius:10px; border:1px solid var(--border-color); grid-column:1/-1;">
                  <small style="color:var(--text-muted); display:block; font-size:11px; text-transform:uppercase;">Professional Headline</small>
                  <strong style="font-size:13px; color:var(--text-main);">${window.escapeHtml(u.headline)}</strong>
                </div>
              ` : ''}
            ` : ''}

            <div style="background:var(--bg-body); padding:12px; border-radius:10px; border:1px solid var(--border-color); grid-column:1/-1;">
              <small style="color:var(--text-muted); display:block; font-size:11px; text-transform:uppercase;">Account Created</small>
              <span style="font-size:13px; color:var(--text-main);">${new Date(u.created_at).toLocaleString()}</span>
            </div>
          </div>

          <div class="modal-actions" style="margin-top:8px;">
            ${isProvider ? `
              <button class="${u.is_active ? 'danger-btn' : 'primary-btn'}" onclick="window.closeModal(); verifyUser(${u.id}, ${u.is_active})">
                ${u.is_active ? 'Suspend Specialist' : '<i class="bi bi-patch-check"></i> Verify & Activate Specialist'}
              </button>
            ` : ''}
            <button class="secondary-btn" onclick="window.closeModal()">Close</button>
          </div>
        </div>
      `;

      window.openModal(`User Details — ${window.escapeHtml(u.full_name)}`, modalContent, 'USER DOSSIER');
    } catch (err) {
      window.toast('Error: ' + err.message);
    }
  };

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
