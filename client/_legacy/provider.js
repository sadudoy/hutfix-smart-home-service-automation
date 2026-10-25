document.addEventListener("DOMContentLoaded", function() {
    // ============================================================
    // 1. AUTH CHECK
    // ============================================================
    var currentUser = null;

    try {
        currentUser = JSON.parse(localStorage.getItem("currentUser"));
    } catch (e) {
        console.error("Could not read currentUser:", e);
        currentUser = null;
    }

    if (!currentUser || currentUser.role !== "provider") {
        window.location.href = "index.html";
        return;
    }

    // ============================================================
    // 2. DOM ELEMENTS
    // ============================================================
    var navAvatar = document.getElementById("nav-avatar");
    var navUsername = document.getElementById("nav-username");
    var avatarInput = document.getElementById("upload-avatar");
    var profilePreview = document.getElementById("profile-preview");
    var profileForm = document.getElementById("provider-profile-form");
    var profileNameInput = document.getElementById("prof-name");
    var profileCategoryInput = document.getElementById("prof-category");

    var serviceForm = document.getElementById("service-settings-form");
    var serviceChargeInput = document.getElementById("service-charge");
    var serviceAreaInput = document.getElementById("service-area");
    var serviceTypesInput = document.getElementById("service-types");
    var serviceAvailableCheck = document.getElementById("service-available");

    var displayCharge = document.getElementById("display-charge");
    var displayArea = document.getElementById("display-area");
    var displayTypes = document.getElementById("display-types");
    var displayAvailability = document.getElementById("display-availability");

    var pricePresets = document.querySelectorAll(".price-preset");

    var DEFAULT_AVATAR = "assets/images/default-avatar.png";

    // ============================================================
    // 3. HELPER - SAVE CURRENT USER
    // ============================================================
    function saveCurrentUser() {
        try {
            localStorage.setItem("currentUser", JSON.stringify(currentUser));
            return true;
        } catch (e) {
            console.error("Failed to save currentUser:", e);
            if (e.name === "QuotaExceededError") {
                alert("The profile picture is too large. Please choose a smaller image.");
            } else {
                alert("Could not save your profile information.");
            }
            return false;
        }
    }

    // ============================================================
    // 4. LOAD USER INFORMATION - FIXED
    // ============================================================
    var initialAvatar = currentUser.avatar || DEFAULT_AVATAR;
    var initialName = currentUser.name || "";
    var initialCategory = currentUser.category || "";

    // Get the provider's category from the providers list
    try {
        var providers = JSON.parse(localStorage.getItem("hf_providers")) || [];
        var provider = providers.find(function(p) { return p.id === currentUser.id; });
        if (provider && provider.category) {
            initialCategory = provider.category;
            // Also update current user with the correct category
            currentUser.category = provider.category;
            localStorage.setItem("currentUser", JSON.stringify(currentUser));
        }
    } catch (e) {
        console.error("Error loading provider category:", e);
    }

    if (navAvatar) navAvatar.src = initialAvatar;
    if (navUsername) navUsername.textContent = initialName.split(" ")[0] || "Provider";
    if (profilePreview) profilePreview.src = initialAvatar;
    if (profileNameInput) profileNameInput.value = initialName;
    if (profileCategoryInput) profileCategoryInput.value = initialCategory;

    // ============================================================
    // 5. LOAD SERVICE SETTINGS
    // ============================================================
    function loadServiceSettings() {
        try {
            var providers = JSON.parse(localStorage.getItem("hf_providers")) || [];
            var provider = providers.find(function(p) { return p.id === currentUser.id; });

            if (provider) {
                if (serviceChargeInput) {
                    serviceChargeInput.value = provider.serviceCharge || provider.pricePerHour || 500;
                }
                if (serviceAreaInput) {
                    serviceAreaInput.value = provider.serviceArea || "Dhaka";
                }
                if (serviceTypesInput) {
                    serviceTypesInput.value = (provider.serviceTypes || ["General Service"]).join(", ");
                }
                if (serviceAvailableCheck) {
                    serviceAvailableCheck.checked = provider.available !== false;
                }

                if (displayCharge) {
                    displayCharge.textContent = "৳" + (provider.serviceCharge || provider.pricePerHour || 500) + "/hr";
                }
                if (displayArea) {
                    displayArea.textContent = provider.serviceArea || "Not set";
                }
                if (displayTypes) {
                    displayTypes.textContent = (provider.serviceTypes || ["General Service"]).join(", ");
                }
                if (displayAvailability) {
                    var isAvailable = provider.available !== false;
                    displayAvailability.textContent = isAvailable ? "✅ Available for bookings" : "❌ Currently Unavailable";
                    displayAvailability.style.color = isAvailable ? "#10b981" : "#ef4444";
                }

                var currentCharge = provider.serviceCharge || provider.pricePerHour || 500;
                pricePresets.forEach(function(btn) {
                    var amount = parseInt(btn.getAttribute("data-amount"));
                    if (amount === currentCharge) {
                        btn.style.borderColor = "var(--royal-blue)";
                        btn.style.background = "rgba(0, 82, 204, 0.1)";
                    } else {
                        btn.style.borderColor = "var(--border-color)";
                        btn.style.background = "transparent";
                    }
                });
            }
        } catch (e) {
            console.error("Error loading service settings:", e);
        }
    }

    loadServiceSettings();

    // ============================================================
    // 6. PRICE PRESET BUTTONS
    // ============================================================
    pricePresets.forEach(function(button) {
        button.addEventListener("click", function() {
            var amount = parseInt(this.getAttribute("data-amount"));
            if (serviceChargeInput) {
                serviceChargeInput.value = amount;
                pricePresets.forEach(function(btn) {
                    btn.style.borderColor = "var(--border-color)";
                    btn.style.background = "transparent";
                });
                this.style.borderColor = "var(--royal-blue)";
                this.style.background = "rgba(0, 82, 204, 0.1)";
                
                if (displayCharge) {
                    displayCharge.textContent = "৳" + amount + "/hr";
                }
            }
        });
    });

    // ============================================================
    // 7. TAB SWITCHING
    // ============================================================
    var menuItems = document.querySelectorAll(".sidebar-menu li[data-target]");
    var sections = document.querySelectorAll(".dash-section");

    menuItems.forEach(function(item) {
        item.addEventListener("click", function() {
            menuItems.forEach(function(m) { m.classList.remove("active"); });
            sections.forEach(function(s) { s.classList.remove("active"); });

            item.classList.add("active");
            var target = document.getElementById(item.dataset.target);
            if (target) {
                target.classList.add("active");
                if (item.dataset.target === "section-services") {
                    loadServiceSettings();
                }
            }
        });
    });

    // ============================================================
    // 8. LOGOUT
    // ============================================================
    var logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function() {
            localStorage.removeItem("currentUser");
            window.location.href = "index.html";
        });
    }

    // ============================================================
    // 9. GET JOBS - No auto dummy jobs
    // ============================================================
    function getMyJobs() {
        var bookings = [];

        try {
            bookings = JSON.parse(localStorage.getItem("hf_bookings")) || [];
        } catch (e) {
            console.error("Could not read bookings:", e);
            bookings = [];
        }

        var providerName = currentUser.name;
        try {
            var providers = JSON.parse(localStorage.getItem("hf_providers")) || [];
            var provider = providers.find(function(p) { return p.id === currentUser.id; });
            if (provider) providerName = provider.name;
        } catch (e) {
            console.error("Error getting provider name:", e);
        }

        var myJobs = bookings.filter(function(booking) {
            return booking.providerName === providerName || booking.providerId === currentUser.id;
        });

        return myJobs;
    }

    // ============================================================
    // 10. UPDATE JOB STATUS
    // ============================================================
    function updateJobStatus(jobId, newStatus) {
        var bookings = [];

        try {
            bookings = JSON.parse(localStorage.getItem("hf_bookings")) || [];
        } catch (e) {
            console.error("Could not read bookings:", e);
            return;
        }

        var index = bookings.findIndex(function(booking) { return booking.id === jobId; });

        if (index !== -1) {
            bookings[index].status = newStatus;
            localStorage.setItem("hf_bookings", JSON.stringify(bookings));
            renderDashboard();
        }
    }

    // ============================================================
    // 11. GLOBAL JOB FUNCTIONS
    // ============================================================
    window.acceptJob = function(jobId) {
        updateJobStatus(jobId, "Accepted");
    };

    window.rejectJob = function(jobId) {
        updateJobStatus(jobId, "Rejected");
    };

    window.changeStatus = function(jobId, selectElement) {
        if (!selectElement) return;
        updateJobStatus(jobId, selectElement.value);
    };

    // ============================================================
    // 12. RENDER DASHBOARD
    // ============================================================
    function renderDashboard() {
        var jobs = getMyJobs();

        var requests = jobs.filter(function(job) { return job.status === "Requested"; });
        var active = jobs.filter(function(job) {
            return ["Accepted", "On the Way", "In Progress"].indexOf(job.status) !== -1;
        });
        var history = jobs.filter(function(job) {
            return ["Completed", "Rejected"].indexOf(job.status) !== -1;
        });

        var badge = document.getElementById("request-badge");
        if (badge) {
            badge.textContent = requests.length;
            badge.style.display = requests.length > 0 ? "inline-block" : "none";
        }

        var reqList = document.getElementById("requests-list");
        if (reqList) {
            if (requests.length === 0) {
                reqList.innerHTML = '<p class="text-muted">No new requests right now.</p>';
            } else {
                reqList.innerHTML = requests.map(function(job) {
                    return (
                        '<div class="booking-card">' +
                            '<div class="booking-header">' +
                                '<div>' +
                                    '<h3>' + job.serviceCategory + '</h3>' +
                                    '<span class="text-muted">ID: ' + job.id + ' | ' + job.date + ' @ ' + job.time + '</span>' +
                                '</div>' +
                                '<span class="badge-status status-Requested">New Request</span>' +
                            '</div>' +
                            '<p><strong>Customer:</strong> ' + job.customerName + '</p>' +
                            '<p><strong>Location:</strong> ' + job.location + '</p>' +
                            '<p><strong>Details:</strong> ' + (job.details || "No details provided") + '</p>' +
                            '<p style="margin-top:5px;"><strong>Est. Payout:</strong> ৳' + (job.price || 0) + '</p>' +
                            '<div class="job-actions">' +
                                '<button class="btn-success" onclick="acceptJob(\'' + job.id + '\')">Accept Job</button>' +
                                '<button class="btn-danger" onclick="rejectJob(\'' + job.id + '\')">Reject</button>' +
                            '</div>' +
                        '</div>'
                    );
                }).join("");
            }
        }

        var actList = document.getElementById("active-jobs-list");
        if (actList) {
            if (active.length === 0) {
                actList.innerHTML = '<p class="text-muted">You have no active jobs.</p>';
            } else {
                actList.innerHTML = active.map(function(job) {
                    return (
                        '<div class="booking-card">' +
                            '<div class="booking-header">' +
                                '<div>' +
                                    '<h3>' + job.serviceCategory + '</h3>' +
                                    '<span class="text-muted">ID: ' + job.id + '</span>' +
                                '</div>' +
                                '<span class="badge-status status-Active">' + job.status + '</span>' +
                            '</div>' +
                            '<p><strong>Customer:</strong> ' + job.customerName + ' - ' + job.location + '</p>' +
                            '<div class="mock-map-container">' +
                                '<div class="map-overlay"></div>' +
                                '<i class="fa-solid fa-location-dot map-pin"></i>' +
                            '</div>' +
                            '<div class="status-updater">' +
                                '<label><strong>Update Status:</strong></label>' +
                                '<select onchange="changeStatus(\'' + job.id + '\', this)">' +
                                    '<option value="Accepted"' + (job.status === "Accepted" ? ' selected' : '') + '>Accepted</option>' +
                                    '<option value="On the Way"' + (job.status === "On the Way" ? ' selected' : '') + '>On the Way</option>' +
                                    '<option value="In Progress"' + (job.status === "In Progress" ? ' selected' : '') + '>In Progress</option>' +
                                    '<option value="Completed">Mark as Completed</option>' +
                                '</select>' +
                            '</div>' +
                        '</div>'
                    );
                }).join("");
            }
        }

        var histList = document.getElementById("history-list");
        if (histList) {
            if (history.length === 0) {
                histList.innerHTML = '<p class="text-muted">No completed jobs yet.</p>';
            } else {
                histList.innerHTML = history.map(function(job) {
                    return (
                        '<div class="booking-card">' +
                            '<div class="booking-header">' +
                                '<div>' +
                                    '<h3>' + job.serviceCategory + '</h3>' +
                                    '<span class="text-muted">' + job.date + '</span>' +
                                '</div>' +
                                '<span class="badge-status status-Completed">' + job.status + '</span>' +
                            '</div>' +
                            '<p><strong>Customer:</strong> ' + job.customerName + '</p>' +
                            '<p><strong>Earned:</strong> ৳' + (job.price || 0) + '</p>' +
                            (job.isReviewed ? '<p style="color:#10b981;"><i class="fa-solid fa-star"></i> Reviewed by customer</p>' : '') +
                        '</div>'
                    );
                }).join("");
            }
        }
    }

    // ============================================================
    // 13. UPDATE PROVIDER DATABASE
    // ============================================================
    function updateProviderDatabase() {
        if (typeof MockDB === "undefined" || !currentUser.id) return;

        try {
            if (typeof MockDB.updateProvider === "function") {
                MockDB.updateProvider(currentUser.id, currentUser);
                return;
            }
            if (typeof MockDB.updateProviderDetails === "function") {
                MockDB.updateProviderDetails(currentUser.id, currentUser.name, currentUser.category);
            }
            if (typeof MockDB.updateProviderAvatar === "function") {
                MockDB.updateProviderAvatar(currentUser.id, currentUser.avatar);
            }
        } catch (e) {
            console.error("Could not update MockDB provider:", e);
        }
    }

    // ============================================================
    // 14. PROFILE PICTURE UPLOAD
    // ============================================================
    if (avatarInput) {
        avatarInput.addEventListener("change", function() {
            var file = this.files && this.files[0];
            if (!file) return;

            if (!file.type.startsWith("image/")) {
                alert("Please select a valid image file.");
                this.value = "";
                return;
            }

            var MAX_FILE_SIZE = 2 * 1024 * 1024;
            if (file.size > MAX_FILE_SIZE) {
                alert("Please choose an image smaller than 2 MB.");
                this.value = "";
                return;
            }

            var reader = new FileReader();
            reader.onload = function(event) {
                var base64Image = event.target.result;
                if (typeof base64Image !== "string" || !base64Image.startsWith("data:image/")) {
                    alert("Could not process this image.");
                    return;
                }

                currentUser.avatar = base64Image;
                if (!saveCurrentUser()) return;

                if (profilePreview) profilePreview.src = base64Image;
                if (navAvatar) navAvatar.src = base64Image;

                updateProviderDatabase();
                alert("Profile picture updated successfully!");
            };

            reader.onerror = function() {
                alert("There was a problem reading the image.");
            };

            reader.readAsDataURL(file);
        });
    }

    // ============================================================
    // 15. PROFILE FORM
    // ============================================================
    if (profileForm) {
        profileForm.addEventListener("submit", function(e) {
            e.preventDefault();

            var newName = profileNameInput ? profileNameInput.value.trim() : "";
            var newCategory = profileCategoryInput ? profileCategoryInput.value.trim() : "";

            if (!newName) {
                alert("Please enter your name.");
                return;
            }

            currentUser.name = newName;
            currentUser.category = newCategory;

            if (!saveCurrentUser()) return;

            if (navUsername) {
                navUsername.textContent = newName.split(" ")[0] || "Provider";
            }

            try {
                var providers = JSON.parse(localStorage.getItem("hf_providers")) || [];
                var index = providers.findIndex(function(p) { return p.id === currentUser.id; });
                if (index !== -1) {
                    providers[index].name = newName;
                    providers[index].category = newCategory;
                    localStorage.setItem("hf_providers", JSON.stringify(providers));
                }
            } catch (err) {
                console.error("Error updating provider:", err);
            }

            updateProviderDatabase();
            alert("Profile updated! Your new details are now live.");
            renderDashboard();
        });
    }

    // ============================================================
    // 16. SERVICE SETTINGS FORM
    // ============================================================
    if (serviceForm) {
        serviceForm.addEventListener("submit", function(e) {
            e.preventDefault();

            var charge = parseInt(serviceChargeInput ? serviceChargeInput.value : 500) || 500;
            var area = serviceAreaInput ? serviceAreaInput.value : "Dhaka";
            var typesRaw = serviceTypesInput ? serviceTypesInput.value : "";
            var types = typesRaw.split(",").map(function(t) { return t.trim(); }).filter(function(t) { return t.length > 0; });
            var available = serviceAvailableCheck ? serviceAvailableCheck.checked : true;

            if (charge < 100) {
                alert("⚠️ Service charge must be at least ৳100 per hour.");
                serviceChargeInput.focus();
                return;
            }

            if (charge > 10000) {
                alert("⚠️ Service charge seems too high. Please enter a reasonable amount.");
                serviceChargeInput.focus();
                return;
            }

            if (types.length === 0) {
                alert("⚠️ Please enter at least one service type.");
                serviceTypesInput.focus();
                return;
            }

            try {
                var providers = JSON.parse(localStorage.getItem("hf_providers")) || [];
                var index = providers.findIndex(function(p) { return p.id === currentUser.id; });

                if (index === -1) {
                    alert("⚠️ Provider not found. Please contact support.");
                    return;
                }

                providers[index] = {
                    ...providers[index],
                    serviceCharge: charge,
                    pricePerHour: charge,
                    serviceArea: area,
                    serviceTypes: types,
                    available: available
                };

                localStorage.setItem("hf_providers", JSON.stringify(providers));

                alert("✅ Service settings saved successfully!");
                loadServiceSettings();

            } catch (err) {
                console.error("Error saving service settings:", err);
                alert("❌ There was an error saving your settings. Please try again.");
            }
        });
    }

    // ============================================================
    // 17. REAL-TIME CHARGE UPDATE DISPLAY
    // ============================================================
    if (serviceChargeInput) {
        serviceChargeInput.addEventListener("input", function() {
            var value = parseInt(this.value) || 0;
            if (displayCharge && value >= 0) {
                if (value >= 100) {
                    displayCharge.textContent = "৳" + value + "/hr";
                    displayCharge.style.color = "var(--sky-blue)";
                } else if (value > 0) {
                    displayCharge.textContent = "৳" + value + "/hr (Below minimum)";
                    displayCharge.style.color = "#ef4444";
                } else {
                    displayCharge.textContent = "Invalid amount";
                    displayCharge.style.color = "#ef4444";
                }
            }
        });
    }

    // ============================================================
    // 18. INITIAL DASHBOARD RENDER
    // ============================================================
    renderDashboard();
});