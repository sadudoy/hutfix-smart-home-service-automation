// Coordinates lookup for major Dhaka areas
const AREAS = {
  'dhanmondi': [23.7465, 90.3760],
  'mirpur': [23.8041, 90.3667],
  'uttara': [23.8759, 90.3795],
  'banani': [23.7925, 90.4078],
  'gulshan': [23.7800, 90.4167],
  'mohammadpur': [23.7610, 90.3620],
  'bashundhara': [23.8150, 90.4250],
  'motijheel': [23.7300, 90.4180]
};

const DHAKA_FALLBACK = [23.7461, 90.3742];

function resolveCoordinates(address) {
  if (!address || typeof address !== 'string') return DHAKA_FALLBACK;
  const lower = address.toLowerCase();
  for (const [area, coords] of Object.entries(AREAS)) {
    if (lower.includes(area)) {
      return coords;
    }
  }
  return DHAKA_FALLBACK;
}

function timeStringToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('request-form');
  const categorySelect = document.getElementById('req-category');
  const dateInput = document.getElementById('req-date');
  const startInput = document.getElementById('req-start');
  const endInput = document.getElementById('req-end');
  const urgencySelect = document.getElementById('req-urgency');
  const addressInput = document.getElementById('req-address');
  const descInput = document.getElementById('req-description');
  const phoneInput = document.getElementById('req-phone');
  const imageInput = document.getElementById('req-image');
  const formError = document.getElementById('form-error');

  const matchLoading = document.getElementById('match-loading');
  const matchEmpty = document.getElementById('match-empty');
  const matchEmptyMsg = document.getElementById('match-empty-msg');
  const matchList = document.getElementById('match-list');
  const matchCount = document.getElementById('match-count');
  const matchSuccess = document.getElementById('match-success');
  const matchSuccessMsg = document.getElementById('match-success-msg');
  const btnBookAnother = document.getElementById('btn-book-another');
  const roleWarning = document.getElementById('role-warning');
  const authNavBtn = document.getElementById('auth-nav-btn');

  function showError(msg) {
    if (formError) {
      formError.textContent = msg;
      formError.classList.remove('d-none');
    }
  }

  function clearError() {
    if (formError) {
      formError.textContent = '';
      formError.classList.add('d-none');
    }
  }

  // 1. Auth Guard
  try {
    const res = await window.API.get('/api/auth/me');
    if (!res || !res.user) {
      window.location.href = '/login.html';
      return;
    }

    if (authNavBtn) {
      authNavBtn.textContent = res.user.full_name || 'My Account';
      authNavBtn.href = '/login.html';
    }

    if (res.user.role !== 'customer') {
      if (form) form.classList.add('d-none');
      if (roleWarning) roleWarning.classList.remove('d-none');
      return;
    }

    if (res.user.phone && phoneInput) {
      phoneInput.value = res.user.phone;
    }
  } catch (err) {
    window.location.href = '/login.html';
    return;
  }

  // 2. Set min date to today and default date
  const today = new Date().toISOString().split('T')[0];
  if (dateInput) {
    dateInput.min = today;
    if (!dateInput.value) {
      dateInput.value = today;
    }
  }

  // 3. Populate categories from /api/services
  try {
    const res = await window.API.get('/api/services');
    if (res.ok && Array.isArray(res.services)) {
      categorySelect.innerHTML = '<option value="" disabled selected>Select a service category</option>';
      const urlParams = new URLSearchParams(window.location.search);
      const preselectedCategory = urlParams.get('category');

      res.services.forEach(svc => {
        const opt = document.createElement('option');
        opt.value = svc.slug;
        opt.textContent = `${svc.name} (from ৳${parseFloat(svc.base_price).toFixed(0)})`;
        if (preselectedCategory && preselectedCategory === svc.slug) {
          opt.selected = true;
        }
        categorySelect.appendChild(opt);
      });
    }
  } catch (err) {
    showError('Failed to load service categories. Please refresh the page.');
  }

  // 4. Handle Matching Form Submit
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearError();

      const startMin = timeStringToMinutes(startInput.value);
      const endMin = timeStringToMinutes(endInput.value);

      if (startMin >= endMin) {
        showError('Start time must be earlier than end time.');
        return;
      }

      const address = addressInput.value.trim();
      if (!address) {
        showError('Please provide a valid service address.');
        return;
      }

      const [lat, lng] = resolveCoordinates(address);

      const payload = {
        category_slug: categorySelect.value,
        preferred_date: dateInput.value,
        preferred_start_minute: startMin,
        preferred_end_minute: endMin,
        urgency: urgencySelect.value || 'normal',
        address,
        latitude: lat,
        longitude: lng
      };

      // UI state -> loading
      matchLoading.classList.remove('d-none');
      matchEmpty.classList.add('d-none');
      matchList.classList.add('d-none');
      matchSuccess.classList.add('d-none');

      try {
        const res = await window.API.post('/api/requests/match', payload);

        matchLoading.classList.add('d-none');

        if (!res.ok || !res.candidates || res.candidates.length === 0) {
          matchEmpty.classList.remove('d-none');
          matchEmptyMsg.textContent = 'No available technicians found for this time slot. Try adjusting your date or time window.';
          matchCount.textContent = '0 found';
          return;
        }

        matchCount.textContent = `${res.candidates.length} found`;
        renderCandidates(res.candidates, payload);
        matchList.classList.remove('d-none');
      } catch (err) {
        matchLoading.classList.add('d-none');
        showError(err.message || 'Failed to match providers. Please try again.');
      }
    });
  }

  // 5. Render candidates list
  function renderCandidates(candidates, matchPayload) {
    matchList.innerHTML = candidates.map((c, index) => {
      const p = c.provider;
      const collapseId = `collapse-breakdown-${index}`;
      const distText = p.distance_km != null ? `${p.distance_km} km away` : 'Dhaka Metro';
      const ratingStars = p.rating ? `★ ${p.rating.toFixed(1)}` : 'New';

      return `
        <div class="candidate-card">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              <h3 class="h6 fw-bold mb-0 text-dark">${p.name}</h3>
              <p class="text-muted small mb-0">${p.headline || 'Verified Service Professional'} &bull; ${p.years_experience} yrs exp</p>
            </div>
            <div class="text-end">
              <span class="score-badge"><i class="bi bi-cpu me-1"></i>Score: ${(c.score * 100).toFixed(0)}%</span>
            </div>
          </div>

          <div class="d-flex flex-wrap gap-2 text-secondary small mb-3">
            <span class="badge bg-warning-subtle text-dark border border-warning-subtle fw-semibold">
              ${ratingStars} (${p.rating_count} reviews)
            </span>
            <span class="badge bg-light text-secondary border">
              <i class="bi bi-geo-alt me-1"></i>${distText}
            </span>
            <span class="badge bg-light text-secondary border">
              <i class="bi bi-tag me-1"></i>৳${p.price}
            </span>
          </div>

          <div class="mb-3">
            <button class="btn btn-sm btn-link text-decoration-none p-0 text-primary small" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}">
              <i class="bi bi-info-circle me-1"></i>Why this match?
            </button>
            <div class="collapse mt-2" id="${collapseId}">
              <div class="p-2 bg-light rounded border small">
                <div class="d-flex justify-content-between mb-1">
                  <span>Availability (30%):</span>
                  <span class="fw-semibold">${(c.breakdown.availability * 100).toFixed(0)}%</span>
                </div>
                <div class="d-flex justify-content-between mb-1">
                  <span>Rating (25%):</span>
                  <span class="fw-semibold">${(c.breakdown.rating * 100).toFixed(0)}%</span>
                </div>
                <div class="d-flex justify-content-between mb-1">
                  <span>Proximity (20%):</span>
                  <span class="fw-semibold">${(c.breakdown.distance * 100).toFixed(0)}%</span>
                </div>
                <div class="d-flex justify-content-between mb-1">
                  <span>Pricing (15%):</span>
                  <span class="fw-semibold">${(c.breakdown.price * 100).toFixed(0)}%</span>
                </div>
                <div class="d-flex justify-content-between">
                  <span>Workload Balance (10%):</span>
                  <span class="fw-semibold">${(c.breakdown.workload * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>

          <button type="button" class="btn btn-primary w-100 py-2 btn-book-provider fw-semibold" data-provider-id="${p.id}">
            Book this provider (৳${p.price})
          </button>
        </div>
      `;
    }).join('');

    // Attach click listeners to all "Book this provider" buttons
    matchList.querySelectorAll('.btn-book-provider').forEach(btn => {
      btn.addEventListener('click', async () => {
        const providerId = btn.dataset.providerId;
        await handleBooking(providerId, matchPayload, btn);
      });
    });
  }

  // 6. Handle Booking via multipart/form-data
  async function handleBooking(providerId, payload, btn) {
    clearError();
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Securing booking...';

    const formData = new FormData();
    formData.append('category_slug', payload.category_slug);
    formData.append('preferred_date', payload.preferred_date);
    formData.append('preferred_start_minute', payload.preferred_start_minute);
    formData.append('preferred_end_minute', payload.preferred_end_minute);
    formData.append('urgency', payload.urgency);
    formData.append('address', payload.address);
    formData.append('latitude', payload.latitude);
    formData.append('longitude', payload.longitude);
    formData.append('provider_id', providerId);

    const description = descInput ? descInput.value.trim() : '';
    if (description) formData.append('description', description);

    const contactPhone = phoneInput ? phoneInput.value.trim() : '';
    if (contactPhone) formData.append('contact_phone', contactPhone);

    if (imageInput && imageInput.files && imageInput.files[0]) {
      formData.append('image', imageInput.files[0]);
    }

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const data = await response.json().catch(() => null);

      if (response.status === 409) {
        alert(data && data.error ? data.error : 'Slot already booked, please choose another provider or time slot.');
        btn.disabled = false;
        btn.textContent = originalText;
        return;
      }

      if (!response.ok) {
        throw new Error((data && data.error) || `Booking failed with status ${response.status}`);
      }

      // Success
      matchList.classList.add('d-none');
      matchEmpty.classList.add('d-none');
      matchSuccess.classList.remove('d-none');
      matchCount.textContent = 'Booked';

      if (matchSuccessMsg && data && data.request) {
        matchSuccessMsg.textContent = `Request #${data.request.id} created — the provider will be notified.`;
      }
    } catch (err) {
      alert(err.message || 'An error occurred while creating your booking.');
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  // 7. Reset / Book Another
  if (btnBookAnother) {
    btnBookAnother.addEventListener('click', () => {
      form.reset();
      matchSuccess.classList.add('d-none');
      matchList.classList.add('d-none');
      matchEmpty.classList.remove('d-none');
      matchEmptyMsg.textContent = 'Fill out the request form on the left and click "Find Providers" to view ranked technicians.';
      matchCount.textContent = '0 found';
      clearError();
    });
  }
});
