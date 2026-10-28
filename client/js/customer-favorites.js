/**
 * HutFix — Customer Saved Favorites (MPA)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.renderLayout('customer', 'favorites');
  if (!user) return;

  const grid = document.getElementById('favoritesGrid');

  async function loadFavorites() {
    try {
      const res = await fetch('/api/favorites/mine', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load saved services');
      const data = await res.json();
      const list = data.favorites || [];

      if (list.length === 0) {
        grid.innerHTML = `
          <div class="empty-state" style="grid-column:1/-1; padding:60px 20px;">
            <div style="font-size:36px; margin-bottom:12px; color:var(--text-muted);"><i class="bi bi-heart"></i></div>
            <h3 style="margin:0 0 8px;">No saved services yet</h3>
            <p style="margin:0 0 16px; color:var(--text-muted);">Browse top providers on the Discover page and tap the heart icon to save specialists for quick booking.</p>
            <a href="index.html" class="primary-btn">Discover services</a>
          </div>
        `;
        return;
      }

      grid.innerHTML = list.map(p => {
        const coverStyle = p.banner_url ? `background-image:url('${p.banner_url}'); background-size:cover; background-position:center;` : '';
        const avatarHtml = p.logo_url
          ? `<img src="${p.logo_url}" alt="${window.escapeHtml(p.name)}" style="width:38px; height:38px; border-radius:50%; object-fit:cover; border:1px solid var(--border-color); flex-shrink:0;" />`
          : `<div class="avatar avatar-green">${(p.name || 'P').slice(0, 2).toUpperCase()}</div>`;

        return `
        <article class="service-card" data-provider-id="${p.id}" style="position:relative;">
          <div class="service-cover cover-wash" style="${coverStyle} position:relative;">
            <button class="fav-heart-btn active" onclick="window.toggleFavorite(${p.id}, event)" title="Remove from favorites" style="position:absolute; top:12px; right:12px; background:rgba(255,255,255,0.92); backdrop-filter:blur(4px); border:none; border-radius:50%; width:34px; height:34px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:16px; color:var(--red); z-index:5;">
              <i class="bi bi-heart-fill" style="color:var(--red);"></i>
            </button>
            <span class="cover-badge">SAVED</span>
            ${!p.banner_url ? '<span class="cover-emoji" style="font-size:2.5rem; color:var(--blue);"><i class="bi bi-person-badge"></i></span>' : ''}
          </div>
          <div class="service-body">
            <div class="service-topline">
              <h3 style="cursor:pointer;" onclick="window.location.href='gig-details.html?id=${p.id}'">${window.escapeHtml(p.name)}</h3>
              <div class="rating"><i class="bi bi-star-fill text-amber"></i> ${Number(p.rating || 5.0).toFixed(1)} <span>(${p.rating_count || 1})</span></div>
            </div>
            <div class="provider-line" style="cursor:pointer;" onclick="window.location.href='gig-details.html?id=${p.id}'">
              ${avatarHtml}
              <div>
                <div class="provider-name">${window.escapeHtml(p.name)} <span class="verified"><i class="bi bi-check-circle-fill text-green"></i></span></div>
                <div class="provider-sub">${window.escapeHtml(p.headline || p.category || 'Specialist Pro')}</div>
              </div>
            </div>`;
      }).join('');
            <p class="service-desc">${window.escapeHtml(p.address || 'Dhaka, Bangladesh')} · ${p.years_experience || 3}+ years verified experience.</p>
            <div class="service-foot">
              <div class="price"><strong>${window.money(p.price_per_hour)}</strong> <small>/ hr</small></div>
              <div style="display:flex; gap:6px;">
                <a href="gig-details.html?id=${p.id}" class="secondary-btn" style="padding:6px 10px; font-size:12px; min-height:34px;">Profile</a>
                <button class="primary-btn" onclick="window.openBooking(${p.id}, '${p.category_slug || ''}')" style="padding:6px 12px; font-size:12px; min-height:34px;">Book <i class="bi bi-arrow-right"></i></button>
              </div>
            </div>
          </div>
        </article>
      `).join('');
    } catch (err) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">${window.escapeHtml(err.message)}</div>`;
    }
  }

  window.onFavoriteChange = function() {
    loadFavorites();
  };

  await loadFavorites();
});
