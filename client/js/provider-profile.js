/**
 * HutFix — Provider Profile Logic (MPA)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.renderLayout('provider', 'repair-profile');
  if (!user) return;

  const initials = (user.full_name || 'PR').slice(0, 2).toUpperCase();
  const avEl = document.getElementById('provBigAvatar');
  const nameEl = document.getElementById('provBigName');
  const headEl = document.getElementById('provBigHeadline');
  const rateEl = document.getElementById('provBigRating');

  if (avEl) avEl.textContent = initials;
  if (nameEl) nameEl.innerHTML = `${window.escapeHtml(user.full_name || 'Specialist')} <span style="font-size:14px; color:var(--blue);"><i class="bi bi-patch-check-fill"></i></span>`;

  async function loadProfile() {
    try {
      const res = await fetch(`/api/providers/${user.id}/profile`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load provider profile');
      const data = await res.json();
      const p = data.provider || {};

      if (headEl) headEl.textContent = `${p.headline || 'Certified Specialist'} · ${p.address || 'Dhaka, Bangladesh'}`;
      if (rateEl) rateEl.innerHTML = `<i class="bi bi-star-fill text-amber"></i> ${p.rating || '4.9'} rating · ${p.rating_count || 120} reviews · ${p.years_experience || 5} years experience`;

      const nameInput = document.getElementById('proNameInput');
      const headInput = document.getElementById('proHeadlineInput');
      const yearsInput = document.getElementById('proYearsInput');
      const areaInput = document.getElementById('proAreaInput');
      const bioInput = document.getElementById('proBioInput');

      if (nameInput) nameInput.value = user.full_name || '';
      if (headInput) headInput.value = p.headline || 'Certified Specialist';
      if (yearsInput) yearsInput.value = `${p.years_experience || 5} years`;
      if (areaInput) areaInput.value = p.address || 'Dhanmondi, Dhaka';
      if (bioInput) bioInput.value = p.bio || 'Reliable home repair professional with certified technical skills and upfront pricing.';
    } catch (err) {
      console.error('loadProfile error:', err);
    }
  }

  document.getElementById('proDetailsForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    window.toast('Profile details updated successfully!');
  });

  document.getElementById('changePasswordForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('savePasswordBtn');
    if (btn) btn.disabled = true;

    const fd = new FormData(e.target);
    const new_password = fd.get('new_password');
    const confirm_password = fd.get('confirm_password');

    if (new_password !== confirm_password) {
      window.toast('New passwords do not match.');
      if (btn) btn.disabled = false;
      return;
    }

    try {
      const res = await fetch('/api/auth/password', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_password })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Password update failed');

      window.toast('Password updated successfully!');
      e.target.reset();
    } catch (err) {
      window.toast('Error: ' + err.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  await loadProfile();
});
