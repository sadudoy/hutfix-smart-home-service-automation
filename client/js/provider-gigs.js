/**
 * HutFix — Provider Service Gigs (MPA)
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.renderLayout('provider', 'my-gigs');
  if (!user) return;

  const container = document.getElementById('gigsListContainer');

  async function loadGigs() {
    try {
      const res = await fetch('/api/provider/services', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load provider services');
      const data = await res.json();
      const services = data.services || [];

      if (services.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="padding:40px 20px;">
            <i class="bi bi-briefcase" style="font-size:32px; color:var(--text-muted); display:block; margin-bottom:12px;"></i>
            <strong>No active service gigs</strong>
            <p style="margin-top:4px; font-size:13px; color:var(--text-muted);">You currently have no service offerings listed. Click "Create a gig" above to start receiving bookings.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = services.map(s => `
        <div class="gig-row" style="padding:18px 0; border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:16px;">
            <div class="gig-thumb cover-wash" style="width:48px; height:48px; display:flex; align-items:center; justify-content:center; border-radius:10px; font-size:22px; color:var(--primary); background:var(--bg-body);">
              <i class="bi bi-tools"></i>
            </div>
            <div>
              <strong style="font-size:15px; display:block; color:var(--text-main);">${window.escapeHtml(s.category_name)}</strong>
              <small style="color:var(--text-muted);">Category: ${window.escapeHtml(s.category_slug)} · <span class="status completed" style="font-size:11px; padding:2px 8px;"><i class="bi bi-check-circle"></i> Published</span></small>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:16px;">
            <div style="text-align:right;">
              <strong style="font-size:17px; color:var(--primary); display:block;">${window.money(s.price)}</strong>
              <small style="color:var(--text-muted);">Hourly / base rate</small>
            </div>
            <button class="secondary-btn" onclick="openEditGigModal(${s.id}, '${window.escapeHtml(s.category_name)}', ${s.price})" style="padding:6px 12px; font-size:12px; min-height:34px;">
              <i class="bi bi-pencil-square"></i> Edit
            </button>
            <button class="secondary-btn" onclick="deleteGig(${s.id}, '${window.escapeHtml(s.category_name)}')" style="padding:6px 12px; font-size:12px; min-height:34px; color:var(--red); border-color:rgba(231,104,104,0.3);">
              <i class="bi bi-trash"></i> Delete
            </button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = `<div class="empty-state">${window.escapeHtml(err.message)}</div>`;
    }
  }

  // Open Edit Gig Modal
  window.openEditGigModal = function(id, name, currentPrice) {
    const modalHtml = `
      <form id="editGigForm" style="display:grid; gap:16px;">
        <div class="form-field full">
          <label>Service Category</label>
          <input type="text" value="${name}" disabled style="background:var(--bg-body); cursor:not-allowed;" />
        </div>
        <div class="form-field full">
          <label>Hourly / Base Price (BDT ৳)</label>
          <input type="number" name="price" id="gigPriceInput" value="${currentPrice}" min="100" max="20000" step="50" required />
        </div>
        <div class="modal-actions" style="margin-top:8px;">
          <button type="button" class="secondary-btn" onclick="window.closeModal()">Cancel</button>
          <button type="submit" class="primary-btn" id="saveGigBtn"><i class="bi bi-check2"></i> Save Changes</button>
        </div>
      </form>
    `;
    window.openModal(`Edit Gig — ${name}`, modalHtml, 'GIG SETTINGS');

    document.getElementById('editGigForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('saveGigBtn');
      if (btn) btn.disabled = true;

      const price = parseFloat(document.getElementById('gigPriceInput').value);
      try {
        const res = await fetch(`/api/provider/services/${id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ price })
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
  };

  // Delete Gig
  window.deleteGig = async function(id, name) {
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
  };

  // Create Gig Modal
  document.getElementById('createGigBtn')?.addEventListener('click', async () => {
    let categories = [];
    try {
      const cRes = await fetch('/api/services');
      if (cRes.ok) {
        const cData = await cRes.json();
        categories = cData.categories || [];
      }
    } catch (_) {}

    const modalHtml = `
      <form id="createGigForm" style="display:grid; gap:16px;">
        <div class="form-field full">
          <label>Select Category</label>
          <select name="category_id" required style="padding:10px; font-size:14px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-surface); color:var(--text-main);">
            ${categories.map(c => `<option value="${c.id}">${window.escapeHtml(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-field full">
          <label>Hourly / Base Rate (BDT ৳)</label>
          <input type="number" name="price" value="800" min="100" max="20000" step="50" required />
        </div>
        <div class="modal-actions" style="margin-top:8px;">
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
      const category_id = parseInt(fd.get('category_id'), 10);
      const price = parseFloat(fd.get('price'));

      try {
        const res = await fetch('/api/provider/services', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category_id, price })
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
