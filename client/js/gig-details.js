/**
 * HutFix — Specialist Gig Profile & Direct Booking Page (MPA)
 */

document.addEventListener('DOMContentLoaded', async () => {
  await window.renderLayout('public', 'discover');

  const urlParams = new URLSearchParams(window.location.search);
  const provId = parseInt(urlParams.get('id') || '1', 10) || 1;

  const container = document.getElementById('gigContainer');

  async function loadGig() {
    try {
      const res = await fetch(`/api/gigs/${provId}`);
      if (!res.ok) throw new Error('Provider gig profile not found');
      const data = await res.json();

      const provider = data.provider || {};
      const services = provider.services || [];
      const reviews = data.reviews || [];
      const breakdown = data.ratingBreakdown || [];

      const firstService = services[0] || { category_slug: 'appliance-repair', price: 900, category_name: 'Appliance Repair' };
      const heroImage = window.IMAGES?.category ? window.IMAGES.category(firstService.category_slug) : '';
      const avatarUrl = window.IMAGES?.providerAvatar ? window.IMAGES.providerAvatar(provider.full_name) : '';
      const basePrice = Number(firstService.price || 900);

      const isFav = window.favoriteProviderIds && window.favoriteProviderIds.has(provId);

      const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      if (breakdown.length > 0) {
        breakdown.forEach(b => { starCounts[b.stars] = Number(b.count); });
      } else if (Number(provider.rating_count) > 0) {
        const tot = Number(provider.rating_count);
        starCounts[5] = Math.round(tot * 0.75);
        starCounts[4] = Math.round(tot * 0.20);
        starCounts[3] = Math.round(tot * 0.05);
      }
      const totalCount = Object.values(starCounts).reduce((a, b) => a + b, 0) || Number(provider.rating_count) || 1;

      container.innerHTML = `
        <!-- Top Section Banner -->
        <div class="panel" style="overflow:hidden; padding:0; margin-bottom:24px; position:relative;">
          <div style="height:220px; background-image:url('${heroImage}'); background-size:cover; background-position:center; position:relative;">
            <div style="position:absolute; inset:0; background:linear-gradient(180deg, rgba(11,18,32,0.2) 0%, rgba(11,18,32,0.85) 100%);"></div>
            <div style="position:absolute; bottom:20px; left:24px; right:24px; display:flex; align-items:flex-end; gap:20px;">
              <img src="${avatarUrl}" alt="${window.escapeHtml(provider.full_name)}" style="width:84px; height:84px; border-radius:18px; border:3px solid #fff; box-shadow:0 8px 24px rgba(0,0,0,0.2); object-fit:cover; background:#1e293b;" />
              <div style="color:#fff;">
                <span class="eyebrow" style="color:var(--blue-light, #93c5fd);">VERIFIED SPECIALIST</span>
                <h1 style="color:#fff; margin:4px 0 6px; font-size:28px;">${window.escapeHtml(provider.full_name)}</h1>
                <div style="display:flex; align-items:center; gap:16px; font-size:14px; color:#e2e8f0; flex-wrap:wrap;">
                  <span style="color:var(--amber, #f59e0b); font-weight:700;"><i class="bi bi-star-fill"></i> ${provider.rating || '4.8'} (${provider.rating_count || 120})</span>
                  <span><i class="bi bi-geo-alt"></i> ${window.escapeHtml(provider.address || 'Dhaka, Bangladesh')}</span>
                  <span><i class="bi bi-briefcase"></i> ${provider.years_experience || 5} Years Experience</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Main Content 2-Column Grid -->
        <div style="display:grid; grid-template-columns: 2fr 1fr; gap:24px; align-items:start;">
          <!-- Left Column -->
          <div>
            <div class="panel" style="margin-bottom:20px;">
              <div class="panel-head"><h3>About the Pro</h3></div>
              <p style="color:var(--text); line-height:1.65; margin:0 0 16px;">
                ${window.escapeHtml(provider.bio || provider.headline || 'Experienced home service specialist offering guaranteed repairs and fast response times across Dhaka.')}
              </p>
              <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px; padding-top:16px; border-top:1px solid var(--border-color);">
                <div style="display:flex; align-items:center; gap:8px; font-size:13px; color:var(--muted);">
                  <i class="bi bi-shield-check" style="color:var(--green); font-size:18px;"></i>
                  <span>Background Verified</span>
                </div>
                <div style="display:flex; align-items:center; gap:8px; font-size:13px; color:var(--muted);">
                  <i class="bi bi-award" style="color:var(--blue); font-size:18px;"></i>
                  <span>Certified Specialist</span>
                </div>
                <div style="display:flex; align-items:center; gap:8px; font-size:13px; color:var(--muted);">
                  <i class="bi bi-lightning-charge" style="color:var(--orange, #f97316); font-size:18px;"></i>
                  <span>Concurrency Locked</span>
                </div>
              </div>
            </div>

            <div class="panel">
              <div class="panel-head">
                <div><h3>Services Offered</h3><p>Transparent upfront pricing per service category</p></div>
              </div>
              <div class="list-stack">
                ${services.map(s => `
                  <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 0; border-bottom:1px solid var(--border-color); gap:16px;">
                    <div>
                      <strong style="font-size:15px; color:var(--text);">${window.escapeHtml(s.category_name)}</strong>
                      <div style="font-size:12px; color:var(--muted); margin-top:2px;">Category: ${window.escapeHtml(s.category_slug)}</div>
                    </div>
                    <div style="display:flex; align-items:center; gap:16px;">
                      <div style="text-align:right;">
                        <span style="font-size:17px; font-weight:800; color:var(--blue);">${window.money(s.price)}</span>
                        <small style="color:var(--muted); display:block; font-size:11px;">/ base rate</small>
                      </div>
                      <button class="secondary-btn" onclick="window.openBooking(${provId}, '${s.category_slug}')" style="padding:6px 12px; font-size:12px; font-weight:600; min-height:34px;">
                        Book <i class="bi bi-arrow-right"></i>
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Right Sticky Column -->
          <div style="position:sticky; top:24px;">
            <div class="panel" style="border: 2px solid var(--blue); box-shadow: 0 10px 30px rgba(37,99,235,0.08);">
              <div class="panel-head">
                <h3>Book this Pro</h3>
                <span class="status completed">Available</span>
              </div>
              <div style="margin: 16px 0 20px;">
                <div style="font-size:12px; color:var(--muted); text-transform:uppercase; font-weight:700;">Starting from</div>
                <div style="font-size:32px; font-weight:800; color:var(--text); margin-top:4px;">${window.money(basePrice)}</div>
                <p style="font-size:13px; color:var(--muted); margin:8px 0 0; line-height:1.5;">
                  Includes initial diagnosis, standard visit dispatch, and HutFix service guarantee.
                </p>
              </div>
              <button class="primary-btn" onclick="window.openBooking(${provId}, '${firstService.category_slug}')" style="width:100%; justify-content:center; padding:14px; font-size:14px; font-weight:700;">
                Book this Pro <i class="bi bi-arrow-right"></i>
              </button>
              <button class="secondary-btn" onclick="window.toggleFavorite(${provId}, event)" data-fav-provider="${provId}" style="width:100%; justify-content:center; padding:10px; font-size:13px; font-weight:600; margin-top:8px;">
                <i class="bi ${isFav ? 'bi-heart-fill text-danger' : 'bi-heart'}" style="${isFav ? 'color:var(--red);' : ''}"></i>
                <span style="margin-left:6px;">${isFav ? 'Saved in Favorites' : 'Save Specialist'}</span>
              </button>
              <div style="font-size:12px; color:var(--muted); text-align:center; margin-top:12px;">
                <i class="bi bi-lightning-charge"></i> Concurrency protected · No double booking
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom Reviews Section -->
        <div class="panel" style="margin-top:24px;">
          <div class="panel-head">
            <div><h3>Client Reviews</h3><p>Verified feedback from clients across Dhaka</p></div>
            <div style="font-size:16px; font-weight:700; color:var(--amber);"><i class="bi bi-star-fill"></i> ${provider.rating || '4.8'} (${provider.rating_count || 120} reviews)</div>
          </div>
          <div style="display:grid; grid-template-columns: 280px 1fr; gap:32px; margin-top:16px;">
            <div>
              ${[5, 4, 3, 2, 1].map(star => {
                const count = starCounts[star] || 0;
                const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
                return `
                  <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px; font-size:13px;">
                    <span style="width:36px; font-weight:600; color:var(--text);">${star} <i class="bi bi-star-fill text-amber"></i></span>
                    <div style="flex:1; height:8px; background:var(--border-color); border-radius:4px; overflow:hidden;">
                      <div style="width:${pct}%; height:100%; background:var(--blue); border-radius:4px;"></div>
                    </div>
                    <span style="width:32px; text-align:right; color:var(--muted); font-size:12px;">${count}</span>
                  </div>
                `;
              }).join('')}
            </div>

            <div>
              <h4 style="margin:0 0 16px; font-size:14px; color:var(--text);">Recent Reviews (${reviews.length})</h4>
              <div class="list-stack">
                ${reviews.length > 0 ? reviews.map(r => `
                  <div style="padding:14px 0; border-bottom:1px solid var(--border-color);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                      <strong style="font-size:14px;">${window.escapeHtml(r.customer_name || 'Verified Customer')}</strong>
                      <span style="font-size:12px; color:var(--muted);">${new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    <div style="font-size:13px; margin-bottom:6px;">
                      <span class="text-amber">${'<i class="bi bi-star-fill"></i>'.repeat(r.stars)}</span><span class="text-muted">${'<i class="bi bi-star"></i>'.repeat(5 - r.stars)}</span>
                    </div>
                    <p style="margin:0; font-size:13px; color:var(--text); line-height:1.5;">${window.escapeHtml(r.comment || 'Great service and very professional.')}</p>
                  </div>
                `).join('') : `
                  <div style="padding:20px 0; color:var(--muted); font-size:13px;">
                    <p style="margin:0 0 6px;"><i class="bi bi-star-fill text-amber"></i> Verified Client Feedback</p>
                    <small>No written reviews submitted yet. Average rating: ${provider.rating || '4.8'} based on completed appointments.</small>
                  </div>
                `}
              </div>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="empty-state">${window.escapeHtml(err.message)}</div>`;
    }
  }

  await loadGig();
});
