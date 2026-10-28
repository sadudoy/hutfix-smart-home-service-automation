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

  const daysConfig = [
    { name: 'Monday', weekday: 1 },
    { name: 'Tuesday', weekday: 2 },
    { name: 'Wednesday', weekday: 3 },
    { name: 'Thursday', weekday: 4 },
    { name: 'Friday', weekday: 5 },
    { name: 'Saturday', weekday: 6 },
    { name: 'Sunday', weekday: 0 }
  ];

  function minsToTimeStr(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function timeStrToMins(str) {
    if (!str) return 540;
    const [h, m] = str.split(':').map(Number);
    return (h * 60) + (m || 0);
  }

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

      // Render Editable Weekly Hours Grid
      weeklyContainer.innerHTML = daysConfig.map(d => {
        const existing = availability.find(a => Number(a.weekday) === d.weekday);
        const isActive = existing ? true : (d.weekday !== 0); // Default active Mon-Sat
        const startVal = minsToTimeStr(existing ? existing.start_minute : 540);  // 09:00
        const endVal = minsToTimeStr(existing ? existing.end_minute : 1080);   // 18:00

        return `
          <div class="weekday-row" data-weekday="${d.weekday}" style="padding:14px 0; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
            <div style="display:flex; align-items:center; gap:12px; min-width:160px;">
              <input type="checkbox" class="day-active-cb" id="cb_${d.weekday}" data-weekday="${d.weekday}" ${isActive ? 'checked' : ''} style="width:18px; height:18px; accent-color:var(--primary); cursor:pointer;" />
              <label for="cb_${d.weekday}" style="font-size:14px; font-weight:700; cursor:pointer; margin:0; color:var(--text-main);">
                ${d.name}
              </label>
            </div>

            <div class="time-inputs-group" style="display:flex; align-items:center; gap:8px;">
              <input type="time" class="time-picker start-time" data-weekday="${d.weekday}" value="${startVal}" ${!isActive ? 'disabled style="opacity:0.4;"' : ''} style="padding:6px 10px; font-size:13px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-surface); color:var(--text-main);" />
              <span style="color:var(--text-muted); font-size:12px;">to</span>
              <input type="time" class="time-picker end-time" data-weekday="${d.weekday}" value="${endVal}" ${!isActive ? 'disabled style="opacity:0.4;"' : ''} style="padding:6px 10px; font-size:13px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-surface); color:var(--text-main);" />
            </div>

            <div style="min-width:110px; text-align:right;">
              <span class="status-tag status ${isActive ? 'completed' : 'cancelled'}" id="status_${d.weekday}" style="font-size:11px; padding:3px 10px;">
                ${isActive ? 'Active' : 'Off / Closed'}
              </span>
            </div>
          </div>
        `;
      }).join('');

      // Wire checkbox toggle to enable/disable inputs
      document.querySelectorAll('.day-active-cb').forEach(cb => {
        cb.addEventListener('change', (e) => {
          const w = e.target.dataset.weekday;
          const isChecked = e.target.checked;
          const row = document.querySelector(`.weekday-row[data-weekday="${w}"]`);
          if (row) {
            row.querySelectorAll('.time-picker').forEach(inp => {
              inp.disabled = !isChecked;
              inp.style.opacity = isChecked ? '1' : '0.4';
            });
            const tag = document.getElementById(`status_${w}`);
            if (tag) {
              tag.className = `status-tag status ${isChecked ? 'completed' : 'cancelled'}`;
              tag.textContent = isChecked ? 'Active' : 'Off / Closed';
            }
          }
        });
      });

      // Render Blackouts
      if (blackouts.length === 0) {
        blackoutsContainer.innerHTML = `<div class="empty-state" style="padding:20px 0;">No blackout dates scheduled. You are available for matching every standard day.</div>`;
      } else {
        blackoutsContainer.innerHTML = blackouts.map(b => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid var(--border-color);">
            <div>
              <strong style="font-size:14px; display:block; color:var(--text-main);">${new Date(b.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</strong>
              <small style="color:var(--text-muted);">${window.escapeHtml(b.reason || 'Personal Leave / Off-duty')}</small>
            </div>
            <button class="secondary-btn" onclick="removeBlackout(${b.id})" style="padding:4px 8px; font-size:12px; min-height:28px; color:var(--red); border-color:rgba(231,104,104,0.3);">
              <i class="bi bi-trash"></i> Remove
            </button>
          </div>
        `).join('');
      }

    } catch (err) {
      weeklyContainer.innerHTML = `<div class="empty-state">${window.escapeHtml(err.message)}</div>`;
    }
  }

  // Save Working Hours (PUT /api/provider/availability)
  document.getElementById('saveWeeklyHoursBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('saveWeeklyHoursBtn');
    if (btn) btn.disabled = true;

    const payloadItems = [];
    let hasError = false;

    document.querySelectorAll('.weekday-row').forEach(row => {
      const cb = row.querySelector('.day-active-cb');
      if (cb && cb.checked) {
        const weekday = parseInt(row.dataset.weekday, 10);
        const startVal = row.querySelector('.start-time')?.value;
        const endVal = row.querySelector('.end-time')?.value;

        const startMin = timeStrToMins(startVal);
        const endMin = timeStrToMins(endVal);

        if (startMin >= endMin) {
          window.toast(`Error on day: Start time must be before end time.`);
          hasError = true;
          return;
        }

        payloadItems.push({
          weekday,
          start_minute: startMin,
          end_minute: endMin
        });
      }
    });

    if (hasError) {
      if (btn) btn.disabled = false;
      return;
    }

    try {
      const res = await fetch('/api/provider/availability', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: payloadItems })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to save working hours');

      window.toast('Weekly working hours updated successfully!');
      await loadSchedule();
    } catch (err) {
      window.toast('Error: ' + err.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  // Add Blackout Date
  document.getElementById('addBlackoutForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('addBlackoutBtn');
    if (btn) btn.disabled = true;

    const fd = new FormData(e.target);
    const date = fd.get('blackout_date');
    const reason = fd.get('reason');

    try {
      const res = await fetch('/api/provider/blackouts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, reason })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to add blackout');

      window.toast('Blackout date added.');
      e.target.reset();
      if (dateInput) dateInput.value = minToday;
      await loadSchedule();
    } catch (err) {
      window.toast('Error: ' + err.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  // Remove Blackout Date
  window.removeBlackout = async function(id) {
    if (!confirm('Remove this blackout date and reopen for booking?')) return;
    try {
      const res = await fetch(`/api/provider/blackouts/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to remove blackout');

      window.toast('Blackout date removed.');
      await loadSchedule();
    } catch (err) {
      window.toast('Error: ' + err.message);
    }
  };

  await loadSchedule();
});
