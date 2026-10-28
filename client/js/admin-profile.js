/**
 * HutFix — Admin Profile & Security (MPA)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const admin = await window.renderLayout('admin', 'admin-profile');
  if (!admin) return;

  const nameInp = document.getElementById('adminNameInput');
  const emailInp = document.getElementById('adminEmailInput');
  const phoneInp = document.getElementById('adminPhoneInput');

  if (nameInp) nameInp.value = admin.full_name || '';
  if (emailInp) emailInp.value = admin.email || '';
  if (phoneInp) phoneInp.value = admin.phone || '';

  // 1. Update personal details
  document.getElementById('adminDetailsForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveAdminDetailsBtn');
    if (btn) btn.disabled = true;

    const full_name = nameInp.value.trim();
    const email = emailInp.value.trim();
    const phone = phoneInp.value.trim();

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name, email, phone })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to update details');

      window.toast('Administrator details saved successfully!');
    } catch (err) {
      window.toast('Error: ' + err.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  // 2. Change Password
  const newPassInput = document.getElementById('newPasswordInput');
  const oldPassInput = document.getElementById('oldPasswordInput');
  newPassInput?.addEventListener('input', () => {
    if (oldPassInput) oldPassInput.required = !!newPassInput.value.trim();
  });

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
});
