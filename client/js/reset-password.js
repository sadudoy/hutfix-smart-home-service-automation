/**
 * HutFix — Reset Password Logic (MPA)
 */

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('themeToggle')?.addEventListener('click', window.toggleTheme);

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const form = document.getElementById('resetPasswordForm');
  const submitBtn = document.getElementById('resetSubmitBtn');
  const errorEl = document.getElementById('resetError');
  const passInput = document.getElementById('newPasswordInput');
  const confirmInput = document.getElementById('confirmPasswordInput');

  if (!token) {
    if (errorEl) {
      errorEl.textContent = 'Invalid or missing reset token. Please request a new password reset link.';
      errorEl.style.display = 'block';
    }
    if (submitBtn) submitBtn.disabled = true;
    return;
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (errorEl) errorEl.style.display = 'none';

    const password = passInput?.value || '';
    const confirmPass = confirmInput?.value || '';

    if (password.length < 6) {
      if (errorEl) {
        errorEl.textContent = 'Password must be at least 6 characters long.';
        errorEl.style.display = 'block';
      }
      return;
    }

    if (password !== confirmPass) {
      if (errorEl) {
        errorEl.textContent = 'Passwords do not match.';
        errorEl.style.display = 'block';
      }
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Updating password...';
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }

      window.toast('Password updated successfully! Redirecting to login...', 'success');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1000);
    } catch (err) {
      if (errorEl) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
      }
      window.toast(err.message, 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Update password';
      }
    }
  });
});
