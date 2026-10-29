/**
 * HutFix — Discover & Marketplace Page (MPA)
 */

document.addEventListener('DOMContentLoaded', async () => {
  await window.renderLayout('public', 'discover');

  let allServices = [];
  let currentCategory = 'All services';
  let searchQuery = '';
  let filterRating = '';
  let filterPrice = '';
  let filterSort = '';

  const categories = [
    ['All services', '<i class="bi bi-grid"></i>', 'bg-blue', 'All'],
    ['Appliance', '<i class="bi bi-tools"></i>', 'bg-blue', 'Appliance & Gadget'],
    ['Plumbing', '<i class="bi bi-droplet"></i>', 'bg-green', 'Water & Pipes'],
    ['Electrical', '<i class="bi bi-lightning-charge"></i>', 'bg-orange', 'Wiring & Power'],
    ['Cleaning', '<i class="bi bi-brush"></i>', 'bg-purple', 'Cleaning & Pest'],
    ['Maintenance', '<i class="bi bi-house-gear"></i>', 'bg-yellow', 'Home Maintenance']
  ];

  // Category management & selection
  const catGrid = document.getElementById('categoryGrid');

  function updateCategorySelection() {
    if (!catGrid) return;
    catGrid.querySelectorAll('.category-card').forEach(b => {
      const catVal = b.dataset.category || b.dataset.cat;
      if (catVal === currentCategory) {
        b.classList.add('selected');
      } else {
        b.classList.remove('selected');
      }
    });
  }

  function renderCategoryButtons() {
    if (!catGrid) return;
    catGrid.innerHTML = categories.map(([cat, ic, bg, sub]) => `
      <button type="button" class="category-card ${cat === currentCategory ? 'selected' : ''}" data-category="${cat}" data-cat="${cat}">
        <span class="category-icon ${bg}">${ic}</span>
        <strong>${cat}</strong>
        <small>${sub}</small>
      </button>
    `).join('');

    catGrid.querySelectorAll('.category-card').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        currentCategory = btn.dataset.category || btn.dataset.cat;
        updateCategorySelection();
        btn.blur();
        searchQuery = '';
        const searchInput = document.getElementById('serviceSearch');
        if (searchInput) searchInput.value = '';
        renderServiceCards();
      });
    });
  }

  if (catGrid) {
    renderCategoryButtons();
  }

  document.getElementById('viewAllCatBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    currentCategory = 'All services';
    updateCategorySelection();
    renderServiceCards();
  });

  // Load services and specialists catalog
  async function loadServices() {
    try {
      const [svcRes, provRes] = await Promise.all([
        fetch('/api/services'),
        fetch('/api/providers/search')
      ]);

      const svcData = await svcRes.json();
      const provData = await provRes.json();

      const rawServices = svcData.services || [];
      const providers = provData.providers || [];

      if (providers.length > 0) {
        allServices = providers.map((p, idx) => {
          const bannerImage = p.gig_banner_url || p.banner_url || (window.IMAGES?.category ? window.IMAGES.category(p.category_slug) : '');
          return {
            id: p.service_id || (idx + 1),
            slug: p.category_slug || 'appliance-repair',
            title: p.gig_title || p.category || 'Home Repair Service',
            category: p.category || 'General',
            desc: p.gig_description || 'Professional home service with guaranteed parts and verified workmanship.',
            duration_minutes: Number(p.duration_minutes) || 60,
            price: Number(p.price_per_hour || 650),
            providerId: p.id,
            provider: p.name || 'Rahim Electronics',
            subtitle: p.headline || 'Certified Specialist',
            rating: Number(p.rating || 4.9).toFixed(1),
            reviews: p.rating_count || 120,
            address: p.address || 'Dhaka, Bangladesh',
            logo_url: p.logo_url || null,
            banner_url: bannerImage,
            verified: true,
            avatar: idx % 2 === 0 ? 'avatar-green' : 'avatar-lilac',
            cover: 'cover-wash'
          };
        });
      } else {
        allServices = rawServices.map((s, idx) => ({
          id: s.id,
          slug: s.slug,
          title: s.name,
          category: s.name.split(' ')[0] || 'Appliance',
          desc: s.description || 'Professional home service with guaranteed parts and verified workmanship.',
          duration_minutes: 60,
          price: Number(s.base_price || 650),
          providerId: 1,
          provider: 'Rahim Electronics',
          subtitle: 'Certified Specialist',
          rating: '4.9',
          reviews: 120,
          address: 'Dhaka, Bangladesh',
          logo_url: null,
          banner_url: window.IMAGES?.category ? window.IMAGES.category(s.slug) : '',
          verified: true,
          avatar: idx % 2 === 0 ? 'avatar-green' : 'avatar-lilac',
          cover: 'cover-wash'
        }));
      }

      renderServiceCards();
    } catch (err) {
      console.error('loadServices error:', err);
      const grid = document.getElementById('servicesGrid');
      if (grid) grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">Failed to load services. Please refresh.</div>';
    }
  }

  function renderServiceCards() {
    const grid = document.getElementById('servicesGrid');
    if (!grid) return;

    let filtered = allServices.filter(s => {
      const matchCat = currentCategory === 'All services' || s.title.toLowerCase().includes(currentCategory.toLowerCase()) || s.category.toLowerCase().includes(currentCategory.toLowerCase());
      const matchQ = !searchQuery || (s.title + ' ' + s.desc + ' ' + s.slug + ' ' + s.provider).toLowerCase().includes(searchQuery.toLowerCase());
      const matchR = !filterRating || Number(s.rating) >= Number(filterRating);
      const matchP = !filterPrice || Number(s.price) <= Number(filterPrice);
      return matchCat && matchQ && matchR && matchP;
    });

    if (filterSort === 'rating_desc') {
      filtered.sort((a, b) => b.rating - a.rating);
    } else if (filterSort === 'price_asc') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (filterSort === 'price_desc') {
      filtered.sort((a, b) => b.price - a.price);
    }

    const headingEl = document.getElementById('servicesHeading');
    const subheadEl = document.getElementById('servicesSubheading');
    const searchLabel = document.getElementById('searchResultsLabel');
    const locText = sessionStorage.getItem('hutfix_location') || 'Dhaka';

    if (headingEl) {
      headingEl.textContent = searchQuery ? 'Search results' : (currentCategory === 'All services' ? 'Available services' : `${currentCategory} services`);
    }
    if (subheadEl) {
      subheadEl.textContent = `${filtered.length} verified services ready in ${locText}`;
    }
    if (searchLabel) {
      if (searchQuery) {
        searchLabel.textContent = `Showing results for “${searchQuery}”`;
        searchLabel.style.display = 'block';
      } else {
        searchLabel.style.display = 'none';
      }
    }

    if (filtered.length === 0) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">No services match your criteria. Try adjusting filters.</div>';
      return;
    }

    grid.innerHTML = filtered.map(s => {
      const isFav = window.favoriteProviderIds && window.favoriteProviderIds.has(s.providerId);
      const imageUrl = s.banner_url || (window.IMAGES?.category ? window.IMAGES.category(s.slug) : '');
      const coverHtml = imageUrl
        ? `<div class="service-cover ${s.cover}" style="background-image:url('${imageUrl}'); background-size:cover; background-position:center; position:relative;">
             <button class="fav-heart-btn ${isFav ? 'active' : ''}" data-fav-provider="${s.providerId}" onclick="window.toggleFavorite(${s.providerId}, event)" title="${isFav ? 'Remove from favorites' : 'Save specialist'}" style="position:absolute; top:12px; right:12px; background:rgba(255,255,255,0.92); backdrop-filter:blur(4px); border:none; border-radius:50%; width:34px; height:34px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:16px; color:${isFav ? 'var(--red)' : '#64748b'}; z-index:5;">
               <i class="bi ${isFav ? 'bi-heart-fill' : 'bi-heart'}" style="${isFav ? 'color:var(--red);' : ''}"></i>
             </button>
             <span class="cover-badge">${s.category.toUpperCase()}</span>
           </div>`
        : `<div class="service-cover ${s.cover}" style="position:relative;">
             <button class="fav-heart-btn ${isFav ? 'active' : ''}" data-fav-provider="${s.providerId}" onclick="window.toggleFavorite(${s.providerId}, event)" title="${isFav ? 'Remove from favorites' : 'Save specialist'}" style="position:absolute; top:12px; right:12px; background:rgba(255,255,255,0.92); backdrop-filter:blur(4px); border:none; border-radius:50%; width:34px; height:34px; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:16px; color:${isFav ? 'var(--red)' : '#64748b'}; z-index:5;">
               <i class="bi ${isFav ? 'bi-heart-fill' : 'bi-heart'}" style="${isFav ? 'color:var(--red);' : ''}"></i>
             </button>
             <span class="cover-badge">${s.category.toUpperCase()}</span>
             <span class="cover-emoji" style="font-size:2.5rem; color:var(--blue);"><i class="bi bi-tools"></i></span>
           </div>`;

      const avatarHtml = s.logo_url
        ? `<img src="${s.logo_url}" alt="${escapeHtml(s.provider)}" style="width:38px; height:38px; border-radius:50%; object-fit:cover; border:1px solid var(--border-color); flex-shrink:0;" />`
        : `<div class="avatar ${s.avatar}">${s.provider.slice(0, 2).toUpperCase()}</div>`;

      return `
        <article class="service-card" data-provider-id="${s.providerId}">
          ${coverHtml}
          <div class="service-body">
            <div class="service-topline">
              <h3 style="cursor:pointer;" onclick="window.location.href='gig-details.html?id=${s.id}'">${escapeHtml(s.title)}</h3>
              <div class="rating"><i class="bi bi-star-fill text-amber"></i> ${s.rating} <span>(${s.reviews})</span></div>
            </div>
            <div style="font-size:12px; color:var(--text-muted); margin:-4px 0 8px; display:flex; align-items:center; gap:8px;">
              <span style="font-weight:600; color:var(--primary);"><i class="bi bi-clock"></i> Est. ${s.duration_minutes || 60} mins</span>
              <span>·</span>
              <span>${escapeHtml(s.category)}</span>
            </div>
            <div class="provider-line" style="cursor:pointer;" onclick="window.location.href='provider-public-profile.html?id=${s.providerId}'">
              ${avatarHtml}
              <div>
                <div class="provider-name">${escapeHtml(s.provider)} <span class="verified"><i class="bi bi-check-circle-fill text-green"></i></span></div>
                <div class="provider-sub">${escapeHtml(s.subtitle)}</div>
              </div>
            </div>
            <p class="service-desc">${escapeHtml(s.desc)}</p>
            <div class="service-foot">
              <div class="price"><strong>${window.money(s.price)}</strong> <small>/ base</small></div>
              <div style="display:flex; gap:6px;">
                <a href="gig-details.html?id=${s.id}" class="secondary-btn" style="padding:6px 10px; font-size:12px; min-height:34px;">Details</a>
                <button class="primary-btn book-service-btn" data-provider-id="${s.providerId}" data-slug="${s.slug}" data-title="${escapeHtml(s.title)}" data-duration="${s.duration_minutes || 60}" data-price="${s.price}" style="padding:6px 12px; font-size:12px; min-height:34px;">Book <i class="bi bi-arrow-right"></i></button>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Wire booking buttons
    grid.querySelectorAll('.book-service-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const provId = parseInt(btn.dataset.providerId, 10);
        const slug = btn.dataset.slug;
        const title = btn.dataset.title;
        const duration = parseInt(btn.dataset.duration, 10) || 60;
        const price = parseFloat(btn.dataset.price) || 0;
        window.openBooking(provId, slug, { title, duration, price });
      });
    });
  }

  // Search input listeners
  const searchInput = document.getElementById('serviceSearch');
  const searchBtn = document.getElementById('searchBtn');

  function doSearch() {
    searchQuery = (searchInput?.value || '').trim();
    renderServiceCards();
  }

  searchBtn?.addEventListener('click', doSearch);
  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
  });

  // Filter change listeners
  document.getElementById('filterRating')?.addEventListener('change', (e) => {
    filterRating = e.target.value;
    renderServiceCards();
  });

  document.getElementById('filterPrice')?.addEventListener('change', (e) => {
    filterPrice = e.target.value;
    renderServiceCards();
  });

  document.getElementById('filterSort')?.addEventListener('change', (e) => {
    filterSort = e.target.value;
    renderServiceCards();
  });

  window.onLocationChange = function() {
    renderServiceCards();
  };

  await loadServices();
});
