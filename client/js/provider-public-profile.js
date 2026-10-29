/**
 * HutFix — Provider Public Profile Page (MPA)
 * Standalone presentation of specialist biography, credentials, and catalog of all offered gigs
 */

document.addEventListener('DOMContentLoaded', async () => {
  await window.renderLayout('public', 'discover');

  const urlParams = new URLSearchParams(window.location.search);
  const provId = parseInt(urlParams.get('id') || '1', 10);

  const container = document.getElementById('providerProfileContainer');
  if (!container) return;

  async function loadProfile() {
    try {
      const res = await fetch(`/api/providers/${provId}/public`);
      if (!res.ok) throw new Error('Specialist profile not found');

      const data = await res.json();
      const p = data.provider;
      if (!p) throw new Error('Provider data is missing');

      const services = p.services || [];
      const rating = Number(p.rating || 5.0).toFixed(1);
      const ratingCount = p.rating_count || 0;
      const expYears = p.years_experience || 5;
      const isFav = window.favoriteProviderIds && window.favoriteProviderIds.has(p.id);

      const avatarHtml = p.logo_url
        ? `<img src="${p.logo_url}" alt="${window.escapeHtml(p.full_name)}" style="width:96px; height:96px; border-radius:50%; object-fit:cover; border:4px solid #ffffff; box-shadow:0 8px 24px rgba(0,0,0,0.15);" />`
        : `<div class="avatar avatar-green" style="width:96px; height:96px; font-size:32px; border:4px solid #ffffff; box-shadow:0 8px 24px rgba(0,0,0,0.15);">
             ${(p.full_name || 'U').slice(0, 2).toUpperCase()}
           </div>`;

      container.innerHTML = `
        <!-- Provider Header Card -->
        <div class="panel" style="padding:32px; margin-bottom:28px; position:relative; overflow:hidden;">
          <div style="display:flex; align-items:center; gap:24px; flex-wrap:wrap;">
            ${avatarHtml}
            <div style="flex:1; min-width:240px;">
              <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:6px;">
                <span class="eyebrow" style="color:var(--primary);">CERTIFIED SPECIALIST</span>
                <span class="status completed"><i class="bi bi-patch-check-fill"></i> Background Verified</span>
              </div>
              <h1 style="font-size:28px; margin:0 0 6px; color:var(--text-main); font-family:Manrope, sans-serif;">
                ${window.escapeHtml(p.full_name)}
              </h1>
              <div style="font-size:15px; font-weight:600; color:var(--primary); margin-bottom:8px;">
                ${window.escapeHtml(p.headline || 'Professional Home Maintenance & Repair Pro')}
              </div>
              <div style="display:flex; align-items:center; gap:20px; font-size:14px; color:var(--text-muted); flex-wrap:wrap;">
                <span style="font-weight:700; color:var(--amber);"><i class="bi bi-star-fill text-amber"></i> ${rating} (${ratingCount} reviews)</span>
                <span><i class="bi bi-briefcase"></i> ${expYears} Years of Experience</span>
                <span><i class="bi bi-geo-alt"></i> Dhaka Metropolitan Area</span>
              </div>
            </div>
            <div>
              <button class="secondary-btn" onclick="window.toggleFavorite(${p.id}, event)" data-fav-provider="${p.id}" style="padding:10px 18px; font-size:13px; font-weight:600; display:inline-flex; align-items:center; gap:8px;">
                <i class="bi ${isFav ? 'bi-heart-fill text-danger' : 'bi-heart'}" style="${isFav ? 'color:var(--red);' : ''}"></i>
                <span>${isFav ? 'Saved in Favorites' : 'Save Specialist'}</span>
              </button>
            </div>
          </div>

          ${p.bio ? `
            <div style="margin-top:20px; padding-top:20px; border-top:1px solid var(--border-color);">
              <h3 style="font-size:15px; margin:0 0 8px; color:var(--text-main);">About the Specialist</h3>
              <p style="margin:0; font-size:14px; line-height:1.7; color:var(--text-muted); white-space:pre-line;">
                ${window.escapeHtml(p.bio)}
              </p>
            </div>
          ` : ''}
        </div>

        <!-- Section Header for Services -->
        <div class="section-head" style="margin-bottom:20px;">
          <div>
            <h2 style="font-size:22px; margin:0 0 4px; color:var(--text-main); font-family:Manrope, sans-serif;">Services Offered by ${window.escapeHtml(p.full_name)}</h2>
            <p style="margin:0; font-size:13px; color:var(--text-muted);">Select a service to view full specifications, transparent rates, and book.</p>
          </div>
          <span class="status progress">${services.length} Active Gig${services.length === 1 ? '' : 's'}</span>
        </div>

        <!-- Services Grid -->
        ${services.length === 0 ? `
          <div class="empty-state" style="padding:32px; text-align:center;">
            This specialist has not published individual services yet.
          </div>
        ` : `
          <div class="service-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap:20px;">
            ${services.map(s => {
              const coverImg = s.banner_url || (window.IMAGES?.category ? window.IMAGES.category(s.category_slug) : '');
              return `
                <article class="service-card" style="display:flex; flex-direction:column; background:var(--bg-surface); border:1px solid var(--border-color); border-radius:16px; overflow:hidden; transition:transform 0.2s, box-shadow 0.2s;">
                  <div style="height:150px; background-image:url('${coverImg}'); background-size:cover; background-position:center; position:relative;">
                    <span class="cover-badge" style="position:absolute; top:12px; left:12px; background:rgba(11,18,32,0.75); color:#fff; padding:3px 8px; border-radius:6px; font-size:11px; font-weight:700;">
                      ${window.escapeHtml((s.category_name || 'General').toUpperCase())}
                    </span>
                  </div>
                  <div style="padding:16px; display:flex; flex-direction:column; flex:1;">
                    <h3 style="font-size:16px; margin:0 0 8px; color:var(--text-main); cursor:pointer;" onclick="window.location.href='gig-details.html?id=${s.id}'">
                      ${window.escapeHtml(s.title || s.category_name)}
                    </h3>
                    <div style="font-size:12px; color:var(--text-muted); display:flex; align-items:center; gap:6px; margin-bottom:14px;">
                      <i class="bi bi-clock"></i> Est. ${s.duration_minutes || 60} mins
                    </div>
                    <div style="margin-top:auto; display:flex; justify-content:space-between; align-items:center; padding-top:12px; border-top:1px solid var(--border-color);">
                      <div class="price">
                        <strong>${window.money(s.price)}</strong>
                        <small style="color:var(--text-muted); font-size:11px;">/ base</small>
                      </div>
                      <a href="gig-details.html?id=${s.id}" class="primary-btn" style="padding:6px 14px; font-size:12px; font-weight:600; min-height:32px;">
                        View Gig <i class="bi bi-arrow-right"></i>
                      </a>
                    </div>
                  </div>
                </article>
              `;
            }).join('')}
          </div>
        `}
      `;

    } catch (err) {
      container.innerHTML = `
        <div class="empty-state" style="padding:40px; text-align:center;">
          <h3 style="margin-bottom:8px; color:var(--text-main);">Specialist Not Found</h3>
          <p style="color:var(--text-muted); margin-bottom:16px;">${window.escapeHtml(err.message)}</p>
          <a href="index.html" class="primary-btn">Return to Services Catalog</a>
        </div>
      `;
    }
  }

  loadProfile();
});
