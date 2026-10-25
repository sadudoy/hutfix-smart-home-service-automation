document.addEventListener('DOMContentLoaded', async () => {
    const tabsRow = document.querySelector('.auth-tabs');
    const tabButtons = document.querySelectorAll('.auth-tabs button');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const authError = document.getElementById('auth-error');
    const authSuccess = document.getElementById('auth-success');
    const whoSpan = document.getElementById('who');
    const roleSpan = document.getElementById('role');
    const logoutBtn = document.getElementById('logout-btn');

    function showError(message) {
        if (authError) {
            authError.textContent = message;
            authError.classList.remove('d-none');
        }
    }

    function clearError() {
        if (authError) {
            authError.textContent = '';
            authError.classList.add('d-none');
        }
    }

    function showLoggedIn(user) {
        clearError();
        if (tabsRow) tabsRow.classList.add('d-none');
        if (loginForm) loginForm.classList.add('d-none');
        if (registerForm) registerForm.classList.add('d-none');
        if (authSuccess) authSuccess.classList.remove('d-none');
        if (whoSpan) whoSpan.textContent = user.full_name || user.email;
        if (roleSpan) roleSpan.textContent = user.role;
    }

    // Try auto-login on page load
    try {
        const res = await window.API.get('/api/auth/me');
        if (res && res.user) {
            showLoggedIn(res.user);
        }
    } catch (_) {
        // Not logged in; remain on login form
    }

    // Tab switching
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            clearError();
            tabButtons.forEach(b => b.classList.remove('active', 'btn-primary'));
            tabButtons.forEach(b => b.classList.add('btn-outline-primary'));

            btn.classList.add('active', 'btn-primary');
            btn.classList.remove('btn-outline-primary');

            const target = btn.dataset.target;
            if (target === 'register') {
                if (loginForm) loginForm.classList.add('d-none');
                if (registerForm) registerForm.classList.remove('d-none');
            } else {
                if (registerForm) registerForm.classList.add('d-none');
                if (loginForm) loginForm.classList.remove('d-none');
            }
        });
    });

    // Login submit
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearError();

            const emailInput = document.getElementById('login-email');
            const passwordInput = document.getElementById('login-password');
            const submitBtn = loginForm.querySelector('button[type="submit"]');

            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';

            if (!email || !password) {
                showError('Please enter both email and password.');
                return;
            }

            const originalBtnText = submitBtn ? submitBtn.textContent : '';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Signing in...';
            }

            try {
                const res = await window.API.post('/api/auth/login', { email, password });
                if (res && res.user) {
                    showLoggedIn(res.user);
                }
            } catch (err) {
                showError(err.message || 'Login failed. Please check your credentials.');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                }
            }
        });
    }

    // Register submit
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearError();

            const nameInput = document.getElementById('reg-name');
            const emailInput = document.getElementById('reg-email');
            const phoneInput = document.getElementById('reg-phone');
            const passwordInput = document.getElementById('reg-password');
            const roleSelect = document.getElementById('reg-role');
            const submitBtn = registerForm.querySelector('button[type="submit"]');

            const full_name = nameInput ? nameInput.value.trim() : '';
            const email = emailInput ? emailInput.value.trim() : '';
            const phone = phoneInput ? phoneInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';
            const role = roleSelect ? roleSelect.value : 'customer';

            if (!full_name || !email || !password) {
                showError('Name, email, and password are required.');
                return;
            }

            if (password.length < 6) {
                showError('Password must be at least 6 characters long.');
                return;
            }

            const originalBtnText = submitBtn ? submitBtn.textContent : '';
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Creating account...';
            }

            try {
                const payload = { email, password, full_name, phone, role };
                const res = await window.API.post('/api/auth/register', payload);
                if (res && res.user) {
                    showLoggedIn(res.user);
                }
            } catch (err) {
                showError(err.message || 'Registration failed.');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                }
            }
        });
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await window.API.post('/api/auth/logout');
            } catch (_) {}
            window.location.reload();
        });
    }
});
