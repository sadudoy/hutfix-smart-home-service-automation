/**
 * HutFix — Provider Service Gigs (MPA)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.renderLayout('provider', 'my-gigs');
  if (!user) return;

  const container = document.getElementById('gigsListContainer');

  async function loadGigs() {
    try {
      const res = await fetch(`/api/providers/${user.id}/profile`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load profile gigs');
      const data = await res.json();
      const services = data.provider?.services || [];

      if (services.length === 0) {
        container.innerHTML = `<div class="empty-state">No service gigs registered yet. Click "Create a gig" to offer your services.</div>`;
        return;
      }

      container.innerHTML = services.map(s => `
        <div class="gig-row" style="padding:16px 0; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:16px;">
            <div class="gig-thumb cover-wash" style="width:48px; height:48px; display:flex; align-items:center; justify-content:center; border-radius:10px; font-size:20px; color:var(--blue);"><i class="bi bi-tools"></i></div>
            <div>
              <strong style="font-size:15px; display:block;">${window.escapeHtml(s.category_name)}</strong>
              <small style="color:var(--muted);">Category: ${window.escapeHtml(s.category_slug)} · <span class="status completed"><i class="bi bi-check-circle"></i> Published</span></small>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:20px;">
            <div style="text-align:right;">
              <strong style="font-size:16px; color:var(--blue); display:block;">${window.money(s.price)}</strong>
              <small style="color:var(--muted);">Hourly / base rate</small>
            </div>
            <button class="secondary-btn" onclick="window.toast('Gig editing enabled in business tier.')" style="padding:4px 10px; font-size:12px; min-height:30px;">Edit</button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = `<div class="empty-state">${window.escapeHtml(err.message)}</div>`;
    }
  }

  document.getElementById('createGigBtn')?.addEventListener('click', () => {
    window.toast('New gig creation will be enabled in business tier.');
  });

  await loadGigs();
});
