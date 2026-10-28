/**
 * HutFix — Provider Service Gigs (MPA)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.renderLayout('provider', 'my-gigs');
  if (!user) return;

  const container = document.getElementById('gigsListContainer');

  let activeServices = [];

  async function loadGigs() {
    try {
      const res = await fetch('/api/provider/services', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load provider services');
      const data = await res.json();
      activeServices = data.services || [];

      if (activeServices.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="padding:40px 20px; text-align:center;">
            <i class="bi bi-briefcase" style="font-size:32px; color:var(--text-muted); display:block; margin-bottom:12px;"></i>
            <strong>No active service gigs</strong>
            <p style="margin-top:4px; font-size:13px; color:var(--text-muted);">You currently have no service offerings listed. Click "Create a gig" above to start receiving bookings.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = activeServices.map(s => {
        const thumbHtml = s.banner_url
          ? `<img src="${s.banner_url}" alt="Banner" style="width:54px; height:54px; border-radius:10px; object-fit:cover; border:1px solid var(--border-color); flex-shrink:0;" />`
          : `<div class="gig-thumb cover-wash" style="width:54px; height:54px; display:flex; align-items:center; justify-content:center; border-radius:10px; font-size:22px; color:var(--primary); background:var(--bg-body); flex-shrink:0;">
               <i class="bi bi-tools"></i>
             </div>`;

        return `
          <div class="gig-row" style="padding:18px 0; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; gap:16px;">
            <div style="display:flex; align-items:flex-start; gap:16px; flex:1;">
              ${thumbHtml}
              <div>
                <strong style="font-size:16px; display:block; color:var(--text-main);">${window.escapeHtml(s.title || s.category_name)}</strong>
                <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">
                  <span style="font-weight:600; color:var(--primary);"><i class="bi bi-clock"></i> Est. ${s.duration_minutes || 60} mins</span> · 
                  Category: ${window.escapeHtml(s.category_name || s.category_slug)} · 
                  <span class="status completed" style="font-size:11px; padding:2px 8px;"><i class="bi bi-check-circle"></i> Published</span>
                </div>
                ${s.description ? `<p style="font-size:13px; color:var(--text-muted); margin:4px 0 0; max-width:600px;">${window.escapeHtml(s.description)}</p>` : ''}
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:16px; flex-shrink:0;">
              <div style="text-align:right;">
                <strong style="font-size:17px; color:var(--primary); display:block;">${window.money(s.price)}</strong>
                <small style="color:var(--text-muted);">Base fee</small>
              </div>
              <button class="secondary-btn edit-gig-btn" data-gig-id="${s.id}" style="padding:6px 12px; font-size:12px; min-height:34px;">
                <i class="bi bi-pencil-square"></i> Edit
              </button>
              <button class="secondary-btn delete-gig-btn" data-gig-id="${s.id}" data-gig-name="${window.escapeHtml(s.title || s.category_name)}" style="padding:6px 12px; font-size:12px; min-height:34px; color:var(--red); border-color:rgba(231,104,104,0.3);">
                <i class="bi bi-trash"></i> Delete
              </button>
            </div>
          </div>
        `;
      }).join('');

      // Wire edit & delete buttons
      container.querySelectorAll('.edit-gig-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = parseInt(btn.dataset.gigId, 10);
          const gig = activeServices.find(g => Number(g.id) === id);
          if (gig) openEditGigModal(gig);
        });
      });

      container.querySelectorAll('.delete-gig-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = parseInt(btn.dataset.gigId, 10);
          const name = btn.dataset.gigName;
          deleteGig(id, name);
        });
      });

    } catch (err) {
      container.innerHTML = `<div class="empty-state">${window.escapeHtml(err.message)}</div>`;
    }
  }

  // Open Edit Gig Modal
  function openEditGigModal(gig) {
    const bannerPreview = gig.banner_url
      ? `<div style="margin-bottom:8px;"><img src="${gig.banner_url}" alt="Current Banner" style="width:100%; height:110px; object-fit:cover; border-radius:8px; border:1px solid var(--border-color);" /></div>`
      : '';

    const modalHtml = `
      <form id="editGigForm" style="display:grid; gap:14px;">
        <div class="form-field full">
          <label style="font-size:13px; font-weight:600; color:var(--text-main);">Service Category</label>
          <input type="text" value="${window.escapeHtml(gig.category_name || gig.category_slug)}" disabled style="background:var(--bg-body); cursor:not-allowed;" />
        </div>
        <div class="form-field full">
          <label style="font-size:13px; font-weight:600; color:var(--text-main);">Gig Title</label>
          <input type="text" name="title" id="editGigTitle" value="${window.escapeHtml(gig.title || gig.category_name)}" placeholder="e.g. Emergency AC Deep Cleaning" required />
        </div>
        <div class="form-field full">
          <label style="font-size:13px; font-weight:600; color:var(--text-main);">Description</label>
          <textarea name="description" id="editGigDesc" rows="3" placeholder="Describe the inclusions, tools, and warranties for this gig...">${window.escapeHtml(gig.description || '')}</textarea>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div class="form-field">
            <label style="font-size:13px; font-weight:600; color:var(--text-main);">Duration (minutes)</label>
            <input type="number" name="duration_minutes" id="editGigDuration" value="${gig.duration_minutes || 60}" min="15" max="480" step="15" required />
          </div>
          <div class="form-field">
            <label style="font-size:13px; font-weight:600; color:var(--text-main);">Base Price (BDT ৳)</label>
            <input type="number" name="price" id="editGigPrice" value="${gig.price}" min="100" max="20000" step="50" required />
          </div>
        </div>
        <div class="form-field full">
          <label style="font-size:13px; font-weight:600; color:var(--text-main);">Banner Image</label>
          ${bannerPreview}
          <input type="file" name="banner" id="editGigBanner" accept="image/*" style="font-size:13px;" />
          <small style="color:var(--text-muted); font-size:11px;">Upload a custom banner image for this gig (JPEG, PNG, WebP up to 10MB).</small>
        </div>
        <div class="modal-actions" style="margin-top:10px;">
          <button type="button" class="secondary-btn" onclick="window.closeModal()">Cancel</button>
          <button type="submit" class="primary-btn" id="saveEditGigBtn"><i class="bi bi-check2"></i> Save Changes</button>
        </div>
      </form>
    `;
    window.openModal(`Edit Gig — ${gig.title || gig.category_name}`, modalHtml, 'GIG SETTINGS');

    document.getElementById('editGigForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('saveEditGigBtn');
      if (btn) btn.disabled = true;

      const fd = new FormData(e.target);

      try {
        const res = await fetch(`/api/provider/services/${gig.id}`, {
          method: 'PATCH',
          credentials: 'include',
          body: fd // Do NOT set Content-Type header manually when using FormData
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to update gig');

        window.closeModal();
        window.toast('Service gig updated successfully!');
        await loadGigs();
      } catch (err) {
        window.toast('Error: ' + err.message);
        if (btn) btn.disabled = false;
      }
    });
  }

  // Delete Gig
  async function deleteGig(id, name) {
    if (!confirm(`Are you sure you want to remove "${name}" from your offered service gigs?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/provider/services/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to delete gig');

      window.toast(`Gig "${name}" deleted.`);
      await loadGigs();
    } catch (err) {
      window.toast('Error: ' + err.message);
    }
  }

  // Create Gig Modal
  document.getElementById('createGigBtn')?.addEventListener('click', async () => {
    let categories = [];
    try {
      const cRes = await fetch('/api/services');
      if (cRes.ok) {
        const cData = await cRes.json();
        categories = cData.categories || cData.services || [];
      }
    } catch (err) {
      console.warn('Could not load categories:', err);
    }

    if (categories.length === 0) {
      window.toast('Error: Could not load categories. Please try again.');
      return;
    }

    const modalHtml = `
      <form id="createGigForm" style="display:grid; gap:14px;">
        <div class="form-field full">
          <label style="font-size:13px; font-weight:600; color:var(--text-main);">Category</label>
          <select name="category_id" id="createGigCategory" required style="padding:10px; font-size:14px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-surface); color:var(--text-main);">
            ${categories.map(c => `<option value="${c.id}">${window.escapeHtml(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-field full">
          <label style="font-size:13px; font-weight:600; color:var(--text-main);">Gig Title</label>
          <input type="text" name="title" id="createGigTitle" placeholder="e.g. Emergency Pipe Leak Fix" required />
        </div>
        <div class="form-field full">
          <label style="font-size:13px; font-weight:600; color:var(--text-main);">Description</label>
          <textarea name="description" id="createGigDesc" rows="3" placeholder="Fixes leaks, replaces washers, inspects drainage lines..."></textarea>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div class="form-field">
            <label style="font-size:13px; font-weight:600; color:var(--text-main);">Duration (minutes)</label>
            <input type="number" name="duration_minutes" id="createGigDuration" value="60" min="15" max="480" step="15" required />
          </div>
          <div class="form-field">
            <label style="font-size:13px; font-weight:600; color:var(--text-main);">Price (BDT ৳)</label>
            <input type="number" name="price" id="createGigPrice" value="800" min="100" max="20000" step="50" required />
          </div>
        </div>
        <div class="form-field full">
          <label style="font-size:13px; font-weight:600; color:var(--text-main);">Banner Image</label>
          <input type="file" name="banner" id="createGigBanner" accept="image/*" style="font-size:13px;" />
          <small style="color:var(--text-muted); font-size:11px;">Optional: Custom banner graphic for this specific gig (JPEG, PNG, WebP).</small>
        </div>
        <div class="modal-actions" style="margin-top:10px;">
          <button type="button" class="secondary-btn" onclick="window.closeModal()">Cancel</button>
          <button type="submit" class="primary-btn" id="confirmCreateGigBtn"><i class="bi bi-plus-lg"></i> Create Gig</button>
        </div>
      </form>
    `;
    window.openModal('Create New Service Gig', modalHtml, 'NEW GIG');

    document.getElementById('createGigForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('confirmCreateGigBtn');
      if (btn) btn.disabled = true;

      const fd = new FormData(e.target);

      try {
        const res = await fetch('/api/provider/services', {
          method: 'POST',
          credentials: 'include',
          body: fd // Do NOT set Content-Type header manually when using FormData
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to create gig');

        window.closeModal();
        window.toast('New service gig published successfully!');
        await loadGigs();
      } catch (err) {
        window.toast('Error: ' + err.message);
        if (btn) btn.disabled = false;
      }
    });
  });

  await loadGigs();
});
