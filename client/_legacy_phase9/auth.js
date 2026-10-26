document.addEventListener("DOMContentLoaded", function() {
    var authModal = document.getElementById("auth-modal");
    var closeBtn = document.getElementById("close-auth");
    
    var loginError = document.getElementById("login-error");
    var signupError = document.getElementById("signup-error");

    var providerCategoryGroup = document.getElementById("provider-category-group");
    var roleRadios = document.querySelectorAll('input[name="role"]');

    function clearErrors() {
        if (loginError) {
            loginError.textContent = "";
            loginError.style.display = "none";
        }
        if (signupError) {
            signupError.textContent = "";
            signupError.style.display = "none";
        }
    }

    function displayError(element, message) {
        if (element) {
            element.textContent = message;
            element.style.display = "block";
        }
    }

    function toggleCategoryDropdown() {
        var selectedRole = document.querySelector('input[name="role"]:checked');
        if (selectedRole && providerCategoryGroup) {
            if (selectedRole.value === "provider") {
                providerCategoryGroup.style.display = "block";
            } else {
                providerCategoryGroup.style.display = "none";
            }
        }
    }

    roleRadios.forEach(function(radio) {
        radio.addEventListener("change", function() {
            toggleCategoryDropdown();
        });
    });

    var authTriggers = document.querySelectorAll(".auth-trigger");
    authTriggers.forEach(function(button) {
        button.addEventListener("click", function(e) {
            e.preventDefault();
            clearErrors();
            if (authModal) {
                authModal.classList.add("active");
                document.body.style.overflow = "hidden";
                toggleCategoryDropdown();
            }
        });
    });

    function closeModal() {
        if (authModal) {
            authModal.classList.remove("active");
            document.body.style.overflow = "auto";
            clearErrors();
        }
    }

    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (authModal) {
        authModal.addEventListener("click", function(e) {
            if (e.target === authModal) closeModal();
        });
    }

    var tabs = document.querySelectorAll(".auth-tab");
    var forms = document.querySelectorAll(".auth-form");

    tabs.forEach(function(tab) {
        tab.addEventListener("click", function() {
            clearErrors();
            tabs.forEach(function(t) { t.classList.remove("active"); });
            forms.forEach(function(f) { f.classList.remove("active"); });
            tab.classList.add("active");
            var target = document.getElementById(tab.dataset.target);
            if (target) target.classList.add("active");
            
            if (tab.dataset.target === "signup-form") {
                setTimeout(toggleCategoryDropdown, 50);
            }
        });
    });

    function redirectBasedOnRole(role) {
        if (role === 'customer') {
            window.location.href = '/customer.html';
        } else if (role === 'provider') {
            window.location.href = '/provider.html';
        } else if (role === 'admin') {
            window.location.href = '/admin.html';
        } else {
            window.location.href = '/index.html';
        }
    }

    // ============================================================
    // LOGIN FORM
    // ============================================================
    var loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", async function(e) {
            e.preventDefault();
            clearErrors();

            var emailInput = document.getElementById("login-email");
            var passwordInput = document.getElementById("login-password");
            var email = emailInput ? emailInput.value.trim() : "";
            var password = passwordInput ? passwordInput.value : "";

            if (!email || !password) {
                displayError(loginError, "Please enter your email and password.");
                return;
            }

            var submitBtn = loginForm.querySelector('button[type="submit"]');
            var originalText = submitBtn ? submitBtn.innerHTML : "Login";
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Logging in...';
                submitBtn.disabled = true;
            }

            try {
                var res = await window.API.post('/api/auth/login', { email: email, password: password });
                if (res && res.user) {
                    try {
                        localStorage.setItem("currentUser", JSON.stringify(res.user));
                    } catch (e) {}
                    redirectBasedOnRole(res.user.role);
                } else {
                    displayError(loginError, "Login failed. Please check credentials.");
                }
            } catch (err) {
                displayError(loginError, err.message || "Invalid email or password.");
            } finally {
                if (submitBtn) {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            }
        });
    }

    // ============================================================
    // SIGNUP FORM
    // ============================================================
    var signupForm = document.getElementById("signup-form");
    if (signupForm) {
        signupForm.addEventListener("submit", async function(e) {
            e.preventDefault();
            clearErrors();

            var nameInput = document.getElementById("signup-name");
            var emailInput = document.getElementById("signup-email");
            var passwordInput = document.getElementById("signup-password");
            var roleRadio = document.querySelector('input[name="role"]:checked');

            var fullName = nameInput ? nameInput.value.trim() : "";
            var email = emailInput ? emailInput.value.trim() : "";
            var password = passwordInput ? passwordInput.value : "";
            var role = roleRadio ? roleRadio.value : "customer";

            if (!fullName || !email || !password) {
                displayError(signupError, "Please fill in all required fields.");
                return;
            }

            if (password.length < 6) {
                displayError(signupError, "Password must be at least 6 characters long.");
                return;
            }

            var submitBtn = signupForm.querySelector('button[type="submit"]');
            var originalText = submitBtn ? submitBtn.innerHTML : "Create Account";
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Creating...';
                submitBtn.disabled = true;
            }

            try {
                var res = await window.API.post('/api/auth/register', {
                    email: email,
                    password: password,
                    full_name: fullName,
                    role: role
                });
                if (res && res.user) {
                    try {
                        localStorage.setItem("currentUser", JSON.stringify(res.user));
                    } catch (e) {}
                    redirectBasedOnRole(res.user.role);
                } else {
                    displayError(signupError, "Registration failed.");
                }
            } catch (err) {
                displayError(signupError, err.message || "Registration failed.");
            } finally {
                if (submitBtn) {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            }
        });
    }

    if (providerCategoryGroup) {
        providerCategoryGroup.style.display = "none";
    }
});
