/**
 * HutFix — Provider Availability & Blackouts (MPA)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.renderLayout('provider', 'availability');
  if (!user) return;

  const minToday = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('blackoutDateInput');
  if (dateInput) {
    dateInput.min = minToday;
    dateInput.value = minToday;
  }

  const weeklyContainer = document.getElementById('weeklyGridContainer');
  const blackoutsContainer = document.getElementById('blackoutsListContainer');

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  async function loadSchedule() {
    try {
      const [availRes, blackRes] = await Promise.all([
        fetch('/api/provider/availability', { credentials: 'include' }),
        fetch('/api/provider/blackouts', { credentials: 'include' })
      ]);

      const availData = availRes.ok ? await availRes.json() : { availability: [] };
      const blackData = blackRes.ok ? await blackRes.json() : { blackouts: [] };

      const availability = availData.availability || [];
      const blackouts = blackData.blackouts || [];

      // Render Weekly Grid
      weeklyContainer.innerHTML = daysOfWeek.map((day, dIdx) => {
        const slots = [
          { start: 540, end: 600, label: '09:00 - 10:00 AM' },
          { start: 600, end: 660, label: '10:00 - 11:00 AM' },
          { start: 660, end: 720, label: '11:00 - 12:00 PM' },
          { start: 840, end: 900, label: '02:00 - 03:00 PM' },
          { start: 900, end: 960, label: '03:00 - 04:00 PM' },
          { start: 960, end: 1020, label: '04:00 - 05:00 PM' }
        ];

        return `
          <div style="padding:12px 0; border-bottom:1px solid var(--border-color);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <strong style="font-size:14px;">${day}</strong>
              <span class="status completed" style="font-size:11px; padding:2px 8px;">Active</span>
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">
              ${slots.map(s => `
                <span class="badge" style="font-size:11px; padding:4px 8px; background:var(--bg-body); border:1px solid var(--border-color); border-radius:6px;">
                  <i class="bi bi-clock" style="margin-right:4px; color:var(--blue);"></i> ${s.label}
                </span>
              `).join('')}
            </div>
          </div>
        `;
      }).join('');

      // Render Blackouts
      if (blackouts.length === 0) {
        blackoutsContainer.innerHTML = `<div class="empty-state" style="padding:20px 0;">No blackout dates scheduled. You are available for matching every standard day.</div>`;
      } else {
        blackoutsContainer.innerHTML = blackouts.map(b => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:var(--bg-body); border-radius:8px; border:1px solid var(--border-color); margin-bottom:8px;">
            <div>
              <strong style="font-size:13px; color:var(--text-main); display:block;">
                <i class="bi bi-calendar-x" style="color:var(--red); margin-right:6px;"></i> ${b.blackout_date}
              </strong>
              <small style="color:var(--muted);">${window.escapeHtml(b.reason || 'Blocked Day')}</small>
            </div>
            <button class="danger-btn" onclick="removeBlackout(${b.id})" style="padding:4px 8px; font-size:11px; min-height:26px;">
              <i class="bi bi-trash"></i> Remove
            </button>
          </div>
        `).join('');
      }
    } catch (err) {
      console.error('loadSchedule error:', err);
    }
  }

  // Add Blackout
  document.getElementById('addBlackoutForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('addBlackoutBtn');
    if (btn) btn.disabled = true;

    const fd = new FormData(e.target);
    const blackout_date = fd.get('blackout_date');
    const reason = fd.get('reason') || '';

    try {
      const res = await fetch('/api/provider/blackouts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blackout_date, reason })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to add blackout');

      window.toast('Blackout date added successfully!');
      e.target.reset();
      if (dateInput) dateInput.value = minToday;
      await loadSchedule();
    } catch (err) {
      window.toast('Error: ' + err.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  window.removeBlackout = async function(id) {
    if (!confirm('Remove this blackout date?')) return;
    try {
      const res = await fetch(`/api/provider/blackouts/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to delete blackout');
      window.toast('Blackout date removed.');
      await loadSchedule();
    } catch (err) {
      window.toast('Error: ' + err.message);
    }
  };

  await loadSchedule();
});
