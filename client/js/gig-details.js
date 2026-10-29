/**
 * HutFix — Service Gig Details Page (MPA)
 * Fiverr-style service gig presentation with isolated details & reviews
 */

document.addEventListener('DOMContentLoaded', async () => {
  await window.renderLayout('public', 'discover');

  const urlParams = new URLSearchParams(window.location.search);
  const gigId = parseInt(urlParams.get('id') || '1', 10);

  const container = document.getElementById('gigContainer');
  if (!container) return;

  async function loadGigDetails() {
    try {
      const [gigRes, revRes] = await Promise.all([
        fetch(`/api/gigs/${gigId}`),
        fetch(`/api/gigs/${gigId}/reviews`)
      ]);

      if (!gigRes.ok) throw new Error('Service gig not found');

      const gigData = await gigRes.json();
      const gig = gigData.gig;
      if (!gig) throw new Error('Service gig data is missing');

      let reviews = [];
      if (revRes.ok) {
        const revData = await revRes.json();
        reviews = revData.reviews || [];
      }

      const categorySlug = gig.category_slug || 'appliance-repair';
      const categoryName = gig.category_name || 'Home Service';
      const bannerUrl = gig.banner_url || (window.IMAGES?.category ? window.IMAGES.category(categorySlug) : '');
      const duration = Number(gig.duration_minutes) || 60;
      const price = Number(gig.price) || 0;
      const rating = Number(gig.provider_rating || 5.0).toFixed(1);
      const isFav = window.favoriteProviderIds && window.favoriteProviderIds.has(gig.provider_id);

      container.innerHTML = `
        <!-- Gig Hero Banner -->
        <div class="panel" style="overflow:hidden; padding:0; margin-bottom:24px; position:relative; border-radius:18px;">
          <div style="height:240px; background-image:url('${bannerUrl}'); background-size:cover; background-position:center; position:relative;">
            <div style="position:absolute; inset:0; background:linear-gradient(180deg, rgba(11,18,32,0.25) 0%, rgba(11,18,32,0.85) 100%);"></div>
            <div style="position:absolute; bottom:20px; left:24px; right:24px; display:flex; justify-content:space-between; align-items:flex-end; gap:20px; flex-wrap:wrap;">
              <div style="color:#ffffff;">
                <span class="cover-badge" style="background:var(--primary); color:#ffffff; margin-bottom:8px; display:inline-block;">${window.escapeHtml(categoryName.toUpperCase())}</span>
                <h1 style="color:#ffffff; margin:4px 0 8px; font-size:28px; letter-spacing:-0.5px;">${window.escapeHtml(gig.title)}</h1>
                <div style="display:flex; align-items:center; gap:16px; font-size:14px; color:#e2e8f0; flex-wrap:wrap;">
                  <span style="color:var(--amber, #f59e0b); font-weight:700;"><i class="bi bi-star-fill text-amber"></i> ${rating}</span>
                  <span><i class="bi bi-clock"></i> Est. ${duration} mins</span>
                  <span><i class="bi bi-person"></i> Provided by <strong>${window.escapeHtml(gig.provider_name || 'Verified Pro')}</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 2-Column Details Layout -->
        <div class="gig-layout gig-grid" style="display:grid; grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr); gap:24px; align-items:start;">
          
          <!-- Left Column: Details, Highlights & Reviews -->
          <div>
            <!-- Gig Description -->
            <div class="panel" style="margin-bottom:20px;">
              <div class="panel-head">
                <h3>About This Service</h3>
              </div>
              <p style="color:var(--text-main); font-size:15px; line-height:1.7; margin:0 0 16px; white-space:pre-line;">
                ${window.escapeHtml(gig.description || 'Professional home service executed by background-verified specialists. Includes initial diagnosis, genuine component replacements (billed transparently), and HutFix quality guarantee.')}
              </p>

              <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:12px; padding-top:16px; border-top:1px solid var(--border-color);">
                <div style="display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text-muted);">
                  <i class="bi bi-shield-check" style="color:var(--green); font-size:18px;"></i>
                  <span>100% Background Checked</span>
                </div>
                <div style="display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text-muted);">
                  <i class="bi bi-tools" style="color:var(--primary); font-size:18px;"></i>
                  <span>Standard Toolset Included</span>
                </div>
                <div style="display:flex; align-items:center; gap:8px; font-size:13px; color:var(--text-muted);">
                  <i class="bi bi-lightning-charge" style="color:var(--amber); font-size:18px;"></i>
                  <span>Concurrency Protected</span>
                </div>
              </div>
            </div>

            <!-- Provider Teaser Box -->
            <div class="panel" style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap;">
              <div style="display:flex; align-items:center; gap:14px;">
                <div class="avatar avatar-green" style="width:48px; height:48px; font-size:16px;">
                  ${(gig.provider_name || 'P').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 style="margin:0 0 4px; font-size:16px; color:var(--text-main);">${window.escapeHtml(gig.provider_name || 'Specialist')}</h4>
                  <div style="font-size:12px; color:var(--text-muted);">
                    <i class="bi bi-star-fill text-amber"></i> ${rating} Rating · Verified Specialist
                  </div>
                </div>
              </div>
              <a href="provider-public-profile.html?id=${gig.provider_id}" class="secondary-btn" style="padding:8px 14px; font-size:13px; min-height:36px; display:inline-flex; align-items:center; gap:6px;">
                <i class="bi bi-person-badge"></i> View Provider Profile
              </a>
            </div>

            <!-- Reviews for this Gig -->
            <div class="panel">
              <div class="panel-head">
                <div>
                  <h3>Customer Reviews for this Service</h3>
                  <p>Real feedback from verified completed appointments</p>
                </div>
                <span class="status completed">${reviews.length} Review${reviews.length === 1 ? '' : 's'}</span>
              </div>

              ${reviews.length === 0 ? `
                <div class="empty-state" style="padding:24px; text-align:center;">
                  No reviews logged yet for this specific service. Be the first to book and rate!
                </div>
              ` : `
                <div class="list-stack">
                  ${reviews.map(r => `
                    <div style="padding:14px 0; border-bottom:1px solid var(--border-color);">
                      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                          <div class="avatar avatar-lilac" style="width:28px; height:28px; font-size:11px;">
                            ${(r.customer_name || 'C').slice(0, 2).toUpperCase()}
                          </div>
                          <strong style="font-size:14px; color:var(--text-main);">${window.escapeHtml(r.customer_name || 'Client')}</strong>
                        </div>
                        <div style="font-size:13px; color:var(--amber);">
                          ${Array.from({ length: 5 }, (_, i) => `<i class="bi bi-star${i < r.stars ? '-fill' : ''}"></i>`).join('')}
                        </div>
                      </div>
                      <p style="margin:4px 0 6px; font-size:14px; color:var(--text-main); line-height:1.5;">${window.escapeHtml(r.comment || 'Great service and prompt resolution.')}</p>
                      <time style="font-size:11px; color:var(--text-muted);">${new Date(r.created_at).toLocaleDateString()}</time>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>
          </div>

          <!-- Right Column: Sticky Booking Widget -->
          <div class="sticky-card booking-card-sidebar" style="position:sticky; top:24px;">
            <div class="panel" style="border: 2px solid var(--primary); box-shadow: var(--shadow);">
              <div class="panel-head">
                <span class="eyebrow" style="color:var(--primary);">INSTANT SERVICE</span>
                <span class="status completed">Available Now</span>
              </div>

              <div style="margin: 16px 0 20px;">
                <div style="font-size:12px; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Starting from</div>
                <div style="font-size:32px; font-weight:800; color:var(--text-main); margin-top:4px;">${window.money(price)}</div>
                <div style="display:flex; align-items:center; gap:6px; font-size:13px; color:var(--primary); font-weight:600; margin-top:6px;">
                  <i class="bi bi-clock-history"></i> Standard duration: ${duration} mins
                </div>
                <p style="font-size:13px; color:var(--text-muted); margin:12px 0 0; line-height:1.5;">
                  Transparent pricing guaranteed by HutFix. Concurrency lock prevents overlapping appointments.
                </p>
              </div>

              <button class="primary-btn" id="bookGigDirectBtn" style="width:100%; justify-content:center; padding:14px; font-size:15px; font-weight:700;">
                Book this service <i class="bi bi-arrow-right"></i>
              </button>

              <a href="provider-public-profile.html?id=${gig.provider_id}" class="secondary-btn" style="width:100%; justify-content:center; padding:10px; font-size:13px; font-weight:600; margin-top:10px;">
                <i class="bi bi-person-circle" style="margin-right:6px;"></i> View Provider Profile
              </a>

              <button class="secondary-btn" onclick="window.toggleFavorite(${gig.provider_id}, event)" data-fav-provider="${gig.provider_id}" style="width:100%; justify-content:center; padding:10px; font-size:13px; font-weight:600; margin-top:8px;">
                <i class="bi ${isFav ? 'bi-heart-fill text-danger' : 'bi-heart'}" style="${isFav ? 'color:var(--red);' : ''}"></i>
                <span style="margin-left:6px;">${isFav ? 'Saved in Favorites' : 'Save Specialist'}</span>
              </button>

              <div style="font-size:12px; color:var(--text-muted); text-align:center; margin-top:14px;">
                <i class="bi bi-shield-check"></i> HutFix Advisory Lock & Dispatched Protection
              </div>
            </div>
          </div>

        </div>
      `;

      // Wire the Book button to the global modal
      document.getElementById('bookGigDirectBtn')?.addEventListener('click', () => {
        window.openBooking(gig.provider_id, categorySlug);
      });

    } catch (err) {
      container.innerHTML = `
        <div class="empty-state" style="padding:40px; text-align:center;">
          <h3 style="margin-bottom:8px; color:var(--text-main);">Service Not Found</h3>
          <p style="color:var(--text-muted); margin-bottom:16px;">${window.escapeHtml(err.message)}</p>
          <a href="index.html" class="primary-btn">Return to Services Catalog</a>
        </div>
      `;
    }
  }

  loadGigDetails();
});
