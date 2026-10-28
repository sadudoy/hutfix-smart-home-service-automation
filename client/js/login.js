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
    demoRow.style.display = isSignup ? 'none' : 'block';
    if (errorEl) errorEl.style.display = 'none';
  });

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
