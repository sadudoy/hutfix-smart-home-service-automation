/**
 * HutFix — Customer Profile & Address Book Logic (MPA)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.renderLayout('customer', 'profile');
  if (!user) return;

  const initials = (user.full_name || 'U').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase();
  const nameEl = document.getElementById('profileBigName');
  const subEl = document.getElementById('profileBigSubtitle');
  const avEl = document.getElementById('profileBigAvatar');

  if (nameEl) nameEl.textContent = user.full_name || 'Customer';
  if (subEl) subEl.textContent = `Client account · ${user.email}`;
  if (avEl) avEl.textContent = initials;

  const addressTbody = document.getElementById('addressTableBody');

  async function loadAddresses() {
    try {
      const res = await fetch('/api/addresses', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load address book');
      const data = await res.json();
      const addresses = data.addresses || [];

      if (addresses.length === 0) {
        addressTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:24px; color:var(--muted);">No saved addresses. Click "Add Address" to save your location.</td></tr>`;
        return;
      }

      addressTbody.innerHTML = addresses.map(a => `
        <tr>
          <td><strong>${window.escapeHtml(a.label || 'Home')}</strong></td>
          <td>${window.escapeHtml(a.address_line)}</td>
          <td>
            ${a.is_default
              ? `<span class="status completed"><i class="bi bi-check-circle-fill"></i> Default</span>`
              : `<button class="secondary-btn" onclick="setDefaultAddress(${a.id})" style="padding:4px 8px; font-size:11px; min-height:26px;">Set Default</button>`}
          </td>
          <td>
            <button class="danger-btn" onclick="deleteAddress(${a.id})" style="padding:4px 10px; font-size:12px; min-height:28px;">
              <i class="bi bi-trash"></i> Delete
            </button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      addressTbody.innerHTML = `<tr><td colspan="4" class="empty-state">${window.escapeHtml(err.message)}</td></tr>`;
    }
  }

  // Add Address Modal
  document.getElementById('openAddAddressBtn')?.addEventListener('click', () => {
    const bodyHtml = `
      <form id="addAddressForm">
        <div class="form-grid">
          <div class="form-field full">
            <label>Label</label>
            <select name="label" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-surface); color:var(--text-main);">
              <option value="Home">Home</option>
              <option value="Work / Office">Work / Office</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div class="form-field full">
            <label>Full Address Line</label>
            <textarea name="address_line" placeholder="House #, Road #, Sector/Area, Dhaka" rows="3" required></textarea>
          </div>
          <div class="form-field full" style="display:flex; align-items:center; gap:8px;">
            <input type="checkbox" name="is_default" id="addrDefaultCheck" style="width:18px; height:18px;" />
            <label for="addrDefaultCheck" style="margin:0; font-size:13px; font-weight:600; cursor:pointer;">Set as my default service address</label>
          </div>
        </div>
        <div class="modal-actions" style="margin-top:20px;">
          <button type="button" class="secondary-btn" onclick="window.closeModal()">Cancel</button>
          <button type="submit" class="primary-btn" id="saveAddressBtn"><i class="bi bi-geo-alt"></i> Save Address</button>
        </div>
      </form>
    `;

    window.openModal('Add New Address', bodyHtml, 'ADDRESS BOOK');

    document.getElementById('addAddressForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('saveAddressBtn');
      if (btn) btn.disabled = true;

      const fd = new FormData(e.target);
      const label = fd.get('label');
      const address_line = fd.get('address_line');
      const is_default = fd.get('is_default') === 'on';

      try {
        const aRes = await fetch('/api/addresses', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label, address_line, is_default })
        });
        const aData = await aRes.json();
        if (!aRes.ok || !aData.ok) throw new Error(aData.error || 'Failed to save address');

        window.closeModal();
        window.toast('Address added to your address book!');
        await loadAddresses();
      } catch (err) {
        window.toast('Error: ' + err.message);
        if (btn) btn.disabled = false;
      }
    });
  });

  window.deleteAddress = async function(id) {
    if (!confirm('Delete this address?')) return;
    try {
      const res = await fetch(`/api/addresses/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to delete address');
      window.toast('Address removed.');
      await loadAddresses();
    } catch (err) {
      window.toast('Error: ' + err.message);
    }
  };

  window.setDefaultAddress = async function(id) {
    try {
      const res = await fetch(`/api/addresses/${id}/default`, { method: 'PATCH', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to set default address');
      window.toast('Default address updated.');
      await loadAddresses();
    } catch (err) {
      window.toast('Error: ' + err.message);
    }
  };

  const newPassInput = document.getElementById('newPasswordInput');
  const oldPassInput = document.getElementById('oldPasswordInput');
  newPassInput?.addEventListener('input', () => {
    if (oldPassInput) oldPassInput.required = !!newPassInput.value.trim();
  });

  // Change Password
  document.getElementById('changePasswordForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('savePasswordBtn');
    if (btn) btn.disabled = true;

    const fd = new FormData(e.target);
    const old_password = fd.get('old_password');
    const new_password = fd.get('new_password');
    const confirm_password = fd.get('confirm_password');

    if (!old_password) {
      window.toast('Current password is required.');
      if (btn) btn.disabled = false;
      return;
    }

    if (new_password !== confirm_password) {
      window.toast('New passwords do not match.');
      if (btn) btn.disabled = false;
      return;
    }

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: new_password, old_password })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Password update failed');

      window.toast('Password updated successfully!');
      e.target.reset();
      if (oldPassInput) oldPassInput.required = false;
    } catch (err) {
      window.toast('Error: ' + err.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  await loadAddresses();
});
