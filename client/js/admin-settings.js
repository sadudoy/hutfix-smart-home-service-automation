/**
 * HutFix — Admin Platform Settings (MPA)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const admin = await window.renderLayout('admin', 'settings');
  if (!admin) return;

  const form = document.getElementById('platformSettingsForm');
  const bkashInp = document.getElementById('bkashNumberInput');
  const nagadInp = document.getElementById('nagadNumberInput');
  const btn = document.getElementById('saveSettingsBtn');

  async function loadSettings() {
    try {
      const res = await fetch('/api/admin/settings', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load platform settings');
      const data = await res.json();
      const settings = data.settings || {};

      if (bkashInp) bkashInp.value = settings.bkash_number || '01700000000';
      if (nagadInp) nagadInp.value = settings.nagad_number || '01700000000';
    } catch (err) {
      window.toast('Error loading settings: ' + err.message);
    }
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (btn) btn.disabled = true;

    const bkash_number = bkashInp.value.trim();
    const nagad_number = nagadInp.value.trim();

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bkash_number, nagad_number })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to update settings');

      window.toast('Platform settings updated successfully!');
    } catch (err) {
      window.toast('Error: ' + err.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  await loadSettings();
});
