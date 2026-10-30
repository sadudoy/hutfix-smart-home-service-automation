/**
 * HutFix — Login & Register Logic (MPA)
 */

document.addEventListener('DOMContentLoaded', () => {
  let isSignup = false;

  const urlParams = new URLSearchParams(window.location.search);
  const redirectTarget = urlParams.get('redirect');

  const headingEl = document.getElementById('authHeading');
  const submitBtn = document.getElementById('authSubmitBtn');
  const toggleBtn = document.getElementById('toggleModeBtn');
  const nameF = document.getElementById('authNameField');
  const phoneF = document.getElementById('authPhoneField');
  const roleF = document.getElementById('authRoleField');
  const forgotLink = document.getElementById('forgotPasswordLink');
  const demoRow = document.getElementById('demoRow');
  const errorEl = document.getElementById('authError');
  const form = document.getElementById('authForm');

  document.getElementById('themeToggle')?.addEventListener('click', window.toggleTheme);

  toggleBtn?.addEventListener('click', () => {
    isSignup = !isSignup;
    headingEl.textContent = isSignup ? 'Create your account' : 'Sign in to your account';
    submitBtn.textContent = isSignup ? 'Create account' : 'Sign in';
    toggleBtn.textContent = isSignup ? 'Already have an account? Sign in' : "Don't have an account? Create an account";

    nameF.style.display = isSignup ? 'block' : 'none';
    phoneF.style.display = isSignup ? 'block' : 'none';
    roleF.style.display = isSignup ? 'block' : 'none';
    if (forgotLink) forgotLink.style.display = isSignup ? 'none' : 'inline';
    demoRow.style.display = isSignup ? 'none' : 'block';
    if (errorEl) errorEl.style.display = 'none';
  });

  if (urlParams.get('mode') === 'signup' || window.location.hash === '#signup') {
    toggleBtn?.click();
  }

  // Demo user fills
  document.querySelectorAll('[data-demo]').forEach(btn => {
    btn.addEventListener('click', () => {
      const demo = btn.dataset.demo;
      const emails = {
        customer: 'customer@demo.test',
        provider: 'provider@demo.test',
        admin: 'admin@demo.test'
      };
      const emailInput = form.querySelector('input[name="email"]');
      const passInput = form.querySelector('input[name="password"]');
      if (emailInput) emailInput.value = emails[demo];
      if (passInput) passInput.value = 'demo1234';
      if (errorEl) errorEl.style.display = 'none';
    });
  });

  // Forgot Password modal
  forgotLink?.addEventListener('click', (e) => {
    e.preventDefault();
    const modalHtml = `
      <form id="forgotPasswordForm" style="display:grid; gap:16px;">
        <div class="form-field full">
          <label style="font-size:13px; font-weight:600; color:var(--text-main);">Registered Email Address</label>
          <input type="email" name="email" id="forgotEmailInput" placeholder="you@domain.com" required style="width:100%; padding:10px 12px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-surface); color:var(--text-main);" />
          <small style="color:var(--text-muted); font-size:12px; margin-top:4px;">We'll generate a secure password reset link for your account.</small>
        </div>
        <div id="forgotError" style="color:var(--red); font-size:13px; display:none;"></div>
        <div class="modal-actions" style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
          <button type="button" class="secondary-btn" onclick="window.closeModal()">Cancel</button>
          <button type="submit" class="primary-btn" id="confirmForgotBtn">Send Reset Link</button>
        </div>
      </form>
    `;

    window.openModal('Forgot Password', modalHtml, 'ACCOUNT RECOVERY');

    document.getElementById('forgotPasswordForm')?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const btn = document.getElementById('confirmForgotBtn');
      const errBox = document.getElementById('forgotError');
      const email = document.getElementById('forgotEmailInput')?.value.trim();

      if (!email) return;
      if (btn) btn.disabled = true;
      if (errBox) errBox.style.display = 'none';

      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          throw new Error(data.error || 'Failed to request password reset');
        }

        window.closeModal();
        window.toast('Reset link sent! Check server console.', 'success');
      } catch (err) {
        if (errBox) {
          errBox.textContent = err.message;
          errBox.style.display = 'block';
        }
        window.toast(err.message, 'error');
        if (btn) btn.disabled = false;
      }
    });
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (submitBtn) submitBtn.disabled = true;
    if (errorEl) errorEl.style.display = 'none';

    const fd = new FormData(form);
    const email = fd.get('email');
    const password = fd.get('password');

    if (isSignup) {
      const full_name = fd.get('full_name') || 'New User';
      const phone = fd.get('phone') || '';
      const role = fd.get('role') || 'customer';

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, full_name, phone, role })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          throw new Error(data.error || 'Registration failed');
        }

        if (data.token) localStorage.setItem('hutfix_token', data.token);
        if (data.user) localStorage.setItem('hutfix_user', JSON.stringify(data.user));

        if (role === 'provider') {
          window.toast('Account registered! Pending admin verification before public matching.');
          setTimeout(() => {
            window.location.href = 'provider-overview.html';
          }, 1000);
        } else {
          window.toast('Welcome to HutFix! Account created successfully.');
          setTimeout(() => {
            window.location.href = redirectTarget ? decodeURIComponent(redirectTarget) : 'index.html';
          }, 800);
        }
      } catch (err) {
        if (errorEl) {
          errorEl.textContent = err.message;
          errorEl.style.display = 'block';
        }
        if (submitBtn) submitBtn.disabled = false;
      }
    } else {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          throw new Error(data.error || 'Invalid email or password');
        }

        if (data.token) localStorage.setItem('hutfix_token', data.token);
        if (data.user) localStorage.setItem('hutfix_user', JSON.stringify(data.user));

        window.toast('Signed in successfully!');
        setTimeout(() => {
          if (redirectTarget) {
            window.location.href = decodeURIComponent(redirectTarget);
          } else if (data.user?.role === 'admin') {
            window.location.href = 'admin-overview.html';
          } else if (data.user?.role === 'provider') {
            window.location.href = 'provider-overview.html';
          } else {
            window.location.href = 'index.html';
          }
        }, 600);
      } catch (err) {
        if (errorEl) {
          errorEl.textContent = err.message;
          errorEl.style.display = 'block';
        }
        if (submitBtn) submitBtn.disabled = false;
      }
    }
  });
});
