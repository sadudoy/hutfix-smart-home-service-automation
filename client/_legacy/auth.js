document.addEventListener("DOMContentLoaded", function() {
    var authModal = document.getElementById("auth-modal");
    var closeBtn = document.getElementById("close-auth");
    
    var loginError = document.getElementById("login-error");
    var signupError = document.getElementById("signup-error");

    var providerCategoryGroup = document.getElementById("provider-category-group");
    var roleRadios = document.querySelectorAll('input[name="role"]');

    function clearErrors() {
        if (loginError) loginError.style.display = "none";
        if (signupError) signupError.style.display = "none";
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
                providerCategoryGroup.style.animation = "slideDown 0.3s ease";
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
                setTimeout(toggleCategoryDropdown, 100);
            }
        });
    });

    // ============================================================
    // SIGNUP FORM - Fixed to properly get and pass category
    // ============================================================
    var signupForm = document.getElementById("signup-form");
    if (signupForm) {
        signupForm.addEventListener("submit", function(e) {
            e.preventDefault();
            clearErrors();
            
            var name = document.getElementById("signup-name").value || "";
            var email = document.getElementById("signup-email").value || "";
            var password = document.getElementById("signup-password").value || "";
            var roleRadio = document.querySelector('input[name="role"]:checked');
            var role = roleRadio ? roleRadio.value : "customer";

            // Get the selected category
            var providerCategory = "";
            if (role === "provider") {
                var categorySelect = document.getElementById("signup-provider-category");
                providerCategory = categorySelect ? categorySelect.value : "";
                
                if (!providerCategory || providerCategory === "") {
                    displayError(signupError, "Please select your service category.");
                    return;
                }
            }

            if (!name || !email || !password) {
                displayError(signupError, "Please fill in all fields.");
                return;
            }

            var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                displayError(signupError, "Please enter a valid email address.");
                return;
            }

            if (password.length < 6) {
                displayError(signupError, "Password must be at least 6 characters long.");
                return;
            }

            var newUser = {
                id: 'user_' + Math.random().toString(36).substr(2, 9),
                name: name,
                email: email,
                password: password,
                role: role,
                avatar: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&background=0052CC&color=fff',
                providerCategory: providerCategory,
                category: providerCategory
            };

            // Pass the category to register function
            var dbResult = MockDB.registerUser(newUser, providerCategory);
            
            if (!dbResult.success) {
                displayError(signupError, dbResult.message);
                return;
            }

            localStorage.setItem("currentUser", JSON.stringify(newUser));
            showButtonLoading(signupForm.querySelector('button'), function() {
                redirectBasedOnRole(role);
            });
        });
    }

    var loginForm = document.getElementById("login-form");
    if (loginForm) {
        loginForm.addEventListener("submit", function(e) {
            e.preventDefault();
            clearErrors();
            
            var email = document.getElementById("login-email").value || "";
            var password = document.getElementById("login-password").value || "";
            
            if (!email || !password) {
                displayError(loginError, "Please enter your email and password.");
                return;
            }
            
            var dbResult = MockDB.verifyUser(email, password);
            
            if (!dbResult.success) {
                displayError(loginError, dbResult.message);
                return;
            }

            localStorage.setItem("currentUser", JSON.stringify(dbResult.user));
            showButtonLoading(loginForm.querySelector('button'), function() {
                redirectBasedOnRole(dbResult.user.role);
            });
        });
    }

    function showButtonLoading(button, callback) {
        if (!button) return;
        var originalText = button.innerHTML;
        button.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Processing...';
        button.disabled = true;
        setTimeout(function() {
            button.innerHTML = originalText;
            button.disabled = false;
            callback();
        }, 1000);
    }

    function redirectBasedOnRole(role) {
        if (role === 'customer') {
            window.location.href = 'index.html';
        } else if (role === 'provider') {
            window.location.href = 'provider.html';
        } else {
            window.location.href = 'index.html';
        }
    }

    if (providerCategoryGroup) {
        providerCategoryGroup.style.display = "none";
    }
});