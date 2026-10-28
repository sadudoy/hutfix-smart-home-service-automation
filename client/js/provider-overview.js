/**
 * HutFix — Provider Overview Logic (MPA)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.renderLayout('provider', 'overview');
  if (!user) return;

  const heading = document.getElementById('welcomeGreeting');
  if (heading) heading.textContent = `Good morning, ${user.full_name || 'Specialist'}`;

  async function loadOverview() {
    try {
      const [incRes, actRes, profRes, invRes] = await Promise.all([
        fetch('/api/provider/requests?bucket=incoming', { credentials: 'include' }),
        fetch('/api/provider/requests?bucket=active', { credentials: 'include' }),
        fetch(`/api/providers/${user.id}/profile`, { credentials: 'include' }),
        fetch('/api/invoices/mine', { credentials: 'include' })
      ]);

      const incData = incRes.ok ? await incRes.json() : { requests: [] };
      const actData = actRes.ok ? await actRes.json() : { requests: [] };
      const profData = profRes.ok ? await profRes.json() : { provider: {} };
      const invData = invRes.ok ? await invRes.json() : { totals: { sum_total: 0 } };

      const provider = profData.provider || {};
      const activeJobs = actData.requests || [];
      const incomingJobs = incData.requests || [];
      const earnings = invData.totals?.sum_total || 0;

      // Stats
      const earnEl = document.getElementById('statEarnings');
      const actEl = document.getElementById('statActive');
      const incEl = document.getElementById('statIncoming');
      const rateEl = document.getElementById('statRating');
      const revEl = document.getElementById('statReviews');

      if (earnEl) earnEl.textContent = window.money(earnings);
      if (actEl) actEl.textContent = activeJobs.length;
      if (incEl) incEl.textContent = incomingJobs.length;
      if (rateEl) rateEl.textContent = Number(provider.rating || 4.9).toFixed(1);
      if (revEl) revEl.textContent = `From ${provider.rating_count || 120} client reviews`;

      const scoreText = document.getElementById('scoreText');
      const scoreBar = document.getElementById('scoreBar');
      if (scoreText) scoreText.textContent = `${Number(provider.rating || 4.9).toFixed(1)} / 5.0`;
      if (scoreBar) scoreBar.style.width = `${((Number(provider.rating || 4.9)) / 5) * 100}%`;

      // Active jobs list
      const listEl = document.getElementById('activeJobsList');
      if (listEl) {
        if (activeJobs.length === 0) {
          listEl.innerHTML = `
            <div class="empty-state">
              No active jobs right now. Check incoming requests to accept appointments!
            </div>
          `;
        } else {
          listEl.innerHTML = activeJobs.map(r => `
            <div class="gig-row">
              <div class="gig-thumb cover-wash"><i class="bi bi-tools"></i></div>
              <div class="gig-info">
                <strong>${window.escapeHtml(r.category_name || 'Repair Service')} · Request #${r.id}</strong>
                <small>${r.preferred_date} · ${window.minutesToTime(r.preferred_start_minute)} · ${window.escapeHtml(r.address)}</small>
              </div>
              <div class="gig-meta">
                <strong>${window.money(r.estimated_price)}</strong>
                <small><span class="status progress">${r.status}</span></small>
              </div>
            </div>
          `).join('');
        }
      }
    } catch (err) {
      console.error('Provider overview error:', err);
    }
  }

  await loadOverview();
});
