document.addEventListener("DOMContentLoaded", async function() {
    // ============================================================
    // 1. AUTHENTICATION & USER SETUP
    // ============================================================
    var currentUser = null;
    try {
        var meRes = await window.API.get('/api/auth/me');
        if (meRes && meRes.ok && meRes.user && meRes.user.role === 'provider') {
            currentUser = meRes.user;
            localStorage.setItem("currentUser", JSON.stringify(currentUser));
        } else {
            window.location.href = "/index.html";
            return;
        }
    } catch (e) {
        window.location.href = "/index.html";
        return;
    }

    function getAvatar(name) {
        return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name || 'Provider') + '&background=1e293b&color=fff&size=200&bold=true';
    }

    var avatarUrl = getAvatar(currentUser.full_name);

    var navAvatar = document.getElementById("nav-avatar");
    var navUsername = document.getElementById("nav-username");
    var profilePreview = document.getElementById("profile-preview");
    var profileNameInput = document.getElementById("prof-name");

    if (navAvatar) navAvatar.src = avatarUrl;
    if (navUsername) navUsername.textContent = currentUser.full_name.split(" ")[0];
    if (profilePreview) profilePreview.src = avatarUrl;
    if (profileNameInput) profileNameInput.value = currentUser.full_name;

    // ============================================================
    // 2. TAB SWITCHING
    // ============================================================
    var menuItems = document.querySelectorAll(".sidebar-menu li[data-target]");
    var sections = document.querySelectorAll(".dash-section");

    menuItems.forEach(function(item) {
        item.addEventListener("click", function() {
            menuItems.forEach(function(m) { m.classList.remove("active"); });
            sections.forEach(function(s) { s.classList.remove("active"); });

            item.classList.add("active");
            var target = document.getElementById(item.dataset.target);
            if (target) target.classList.add("active");

            if (item.dataset.target === "section-requests") loadIncomingRequests();
            if (item.dataset.target === "section-active") loadActiveJobs();
            if (item.dataset.target === "section-history") loadJobHistory();
            if (item.dataset.target === "section-services") loadServiceSettings();
        });
    });

    // Logout
    var logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async function() {
            try { await window.API.post('/api/auth/logout', {}); } catch (e) {}
            localStorage.removeItem("currentUser");
            window.location.href = "/index.html";
        });
    }

    // ============================================================
    // 3. INCOMING REQUESTS
    // ============================================================
    async function loadIncomingRequests() {
        var reqList = document.getElementById("requests-list");
        var badge = document.getElementById("request-badge");
        if (reqList) reqList.innerHTML = '<p class="text-muted"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading incoming requests...</p>';

        try {
            var res = await window.API.get('/api/provider/requests?bucket=incoming');
            var requests = (res && res.requests) || [];

            if (badge) {
                badge.textContent = requests.length;
                badge.style.display = requests.length > 0 ? "inline-block" : "none";
            }

            if (!reqList) return;

            if (requests.length === 0) {
                reqList.innerHTML = '<p class="text-muted">No new job requests right now.</p>';
                return;
            }

            reqList.innerHTML = requests.map(function(job) {
                var dateStr = job.preferred_date ? String(job.preferred_date).split("T")[0] : "";
                var timeH = Math.floor((job.preferred_start_minute || 0) / 60);
                var timeM = (job.preferred_start_minute || 0) % 60;
                var timeStr = String(timeH).padStart(2, "0") + ":" + String(timeM).padStart(2, "0");

                return (
                    '<div class="booking-card">' +
                        '<div class="booking-header">' +
                            '<div>' +
                                '<h3>' + (job.category_name || "Service Request") + '</h3>' +
                                '<span class="text-muted">Order #' + job.id + ' | ' + dateStr + ' @ ' + timeStr + '</span>' +
                            '</div>' +
                            '<span class="badge-status status-Requested">Requested</span>' +
                        '</div>' +
                        '<p><strong>Customer:</strong> ' + (job.customer_name || "Customer") + (job.customer_phone ? ' (' + job.customer_phone + ')' : '') + '</p>' +
                        '<p><strong>Location:</strong> ' + (job.address || "Dhaka") + '</p>' +
                        '<p><strong>Est. Charge:</strong> ৳' + (job.estimated_price || 0) + '</p>' +
                        (job.description ? '<p><strong>Details:</strong> ' + job.description + '</p>' : '') +
                        '<div class="booking-actions" style="margin-top: 15px; display:flex; gap:10px;">' +
                            '<button class="btn-primary" onclick="window.acceptJob(' + job.id + ')" style="padding:8px 16px;">' +
                                '<i class="fa-solid fa-check"></i> Accept' +
                            '</button>' +
                            '<button class="btn-outline" onclick="window.rejectJob(' + job.id + ')" style="color:#ef4444; border-color:#ef4444; padding:8px 16px;">' +
                                '<i class="fa-solid fa-xmark"></i> Reject' +
                            '</button>' +
                        '</div>' +
                    '</div>'
                );
            }).join("");

        } catch (err) {
            console.error("Failed to load incoming requests:", err);
            if (reqList) reqList.innerHTML = '<p class="text-muted">Could not load requests.</p>';
        }
    }

    window.acceptJob = async function(id) {
        try {
            var res = await window.API.post('/api/requests/' + id + '/accept', {});
            if (res && res.ok) {
                alert("Job accepted! View it in Active Jobs.");
                loadIncomingRequests();
            } else {
                alert((res && res.error) || "Could not accept job.");
            }
        } catch (e) {
            alert(e.message || "Failed to accept job.");
        }
    };

    window.rejectJob = async function(id) {
        if (!confirm("Are you sure you want to reject this request?")) return;
        try {
            var res = await window.API.post('/api/requests/' + id + '/reject', {});
            if (res && res.ok) {
                alert("Job rejected.");
                loadIncomingRequests();
            } else {
                alert((res && res.error) || "Could not reject job.");
            }
        } catch (e) {
            alert(e.message || "Failed to reject job.");
        }
    };

    // ============================================================
    // 4. ACTIVE JOBS (NEXT STEP BUTTON)
    // ============================================================
    async function loadActiveJobs() {
        var activeList = document.getElementById("active-jobs-list");
        if (!activeList) return;
        activeList.innerHTML = '<p class="text-muted"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading active jobs...</p>';

        try {
            var res = await window.API.get('/api/provider/requests?bucket=active');
            var jobs = (res && res.requests) || [];

            if (jobs.length === 0) {
                activeList.innerHTML = '<p class="text-muted">No active jobs in progress.</p>';
                return;
            }

            activeList.innerHTML = jobs.map(function(job) {
                var nextStatus = "";
                var nextLabel = "";
                var icon = "fa-arrow-right";

                if (job.status === "accepted") {
                    nextStatus = "on_the_way";
                    nextLabel = "Next Step: On the Way";
                    icon = "fa-truck-fast";
                } else if (job.status === "on_the_way") {
                    nextStatus = "in_progress";
                    nextLabel = "Next Step: In Progress";
                    icon = "fa-tools";
                } else if (job.status === "in_progress") {
                    nextStatus = "completed";
                    nextLabel = "Next Step: Complete Job";
                    icon = "fa-circle-check";
                }

                var dateStr = job.preferred_date ? String(job.preferred_date).split("T")[0] : "";
                var timeH = Math.floor((job.preferred_start_minute || 0) / 60);
                var timeM = (job.preferred_start_minute || 0) % 60;
                var timeStr = String(timeH).padStart(2, "0") + ":" + String(timeM).padStart(2, "0");

                var statusFormatted = job.status.replace(/_/g, " ").replace(/\b\w/g, function(l){ return l.toUpperCase(); });

                return (
                    '<div class="booking-card">' +
                        '<div class="booking-header">' +
                            '<div>' +
                                '<h3>' + (job.category_name || "Service Job") + '</h3>' +
                                '<span class="text-muted">Order #' + job.id + ' | ' + dateStr + ' @ ' + timeStr + '</span>' +
                            '</div>' +
                            '<span class="badge-status status-Active">' + statusFormatted + '</span>' +
                        '</div>' +
                        '<p><strong>Customer:</strong> ' + (job.customer_name || "Customer") + (job.customer_phone ? ' (' + job.customer_phone + ')' : '') + '</p>' +
                        '<p><strong>Location:</strong> ' + (job.address || "Dhaka") + '</p>' +
                        '<p><strong>Est. Charge:</strong> ৳' + (job.estimated_price || 0) + '</p>' +
                        (job.description ? '<p><strong>Details:</strong> ' + job.description + '</p>' : '') +
                        '<div style="margin-top: 15px;">' +
                            '<button class="btn-primary" onclick="window.progressJobStatus(' + job.id + ', \'' + nextStatus + '\')" style="padding:10px 18px; font-weight:600;">' +
                                '<i class="fa-solid ' + icon + '"></i> ' + nextLabel +
                            '</button>' +
                        '</div>' +
                    '</div>'
                );
            }).join("");

        } catch (err) {
            console.error("Failed to load active jobs:", err);
            activeList.innerHTML = '<p class="text-muted">Could not load active jobs.</p>';
        }
    }

    window.progressJobStatus = async function(id, nextStatus) {
        if (!nextStatus) return;
        try {
            var res = await window.API.patch('/api/requests/' + id + '/status', { status: nextStatus });
            if (res && res.ok) {
                alert("Status updated to " + nextStatus.replace(/_/g, " ") + "!");
                loadActiveJobs();
            } else {
                alert((res && res.error) || "Could not update status.");
            }
        } catch (e) {
            alert(e.message || "Failed to update status.");
        }
    };

    // ============================================================
    // 5. JOB HISTORY
    // ============================================================
    async function loadJobHistory() {
        var histList = document.getElementById("history-list");
        if (!histList) return;
        histList.innerHTML = '<p class="text-muted"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading job history...</p>';

        try {
            var res = await window.API.get('/api/provider/requests?bucket=history');
            var jobs = (res && res.requests) || [];

            if (jobs.length === 0) {
                histList.innerHTML = '<p class="text-muted">No completed or cancelled jobs yet.</p>';
                return;
            }

            histList.innerHTML = jobs.map(function(job) {
                var dateStr = job.preferred_date ? String(job.preferred_date).split("T")[0] : "";
                var isCompleted = job.status === "completed";
                var statusClass = isCompleted ? "status-Completed" : "status-Requested";

                return (
                    '<div class="booking-card">' +
                        '<div class="booking-header">' +
                            '<div>' +
                                '<h3>' + (job.category_name || "Job") + '</h3>' +
                                '<span class="text-muted">Order #' + job.id + ' | ' + dateStr + '</span>' +
                            '</div>' +
                            '<span class="badge-status ' + statusClass + '">' + (isCompleted ? "Completed" : "Cancelled") + '</span>' +
                        '</div>' +
                        '<p><strong>Customer:</strong> ' + (job.customer_name || "Customer") + '</p>' +
                        '<p><strong>Earned:</strong> ৳' + (job.estimated_price || 0) + '</p>' +
                        (isCompleted ? '<p style="margin-top:10px;"><a href="/invoice.html?id=' + job.id + '" target="_blank" class="btn-outline" style="text-decoration:none; padding:4px 10px; font-size:0.8rem;"><i class="fa-solid fa-receipt"></i> Invoice</a></p>' : '') +
                    '</div>'
                );
            }).join("");

        } catch (err) {
            console.error("Failed to load history:", err);
            histList.innerHTML = '<p class="text-muted">Could not load history.</p>';
        }
    }

    // ============================================================
    // 6. SERVICE SETTINGS FORM
    // ============================================================
    var serviceForm = document.getElementById("service-settings-form");
    var serviceChargeInput = document.getElementById("service-charge");
    var serviceAreaInput = document.getElementById("service-area");
    var displayCharge = document.getElementById("display-charge");
    var displayArea = document.getElementById("display-area");
    var pricePresets = document.querySelectorAll(".price-preset");

    async function loadServiceSettings() {
        try {
            var res = await window.API.get('/api/provider/settings');
            if (res && res.ok && res.settings) {
                var s = res.settings;
                if (serviceChargeInput && s.base_rate) serviceChargeInput.value = s.base_rate;
                if (serviceAreaInput && s.area) serviceAreaInput.value = s.area;
                if (displayCharge && s.base_rate) displayCharge.textContent = "৳" + s.base_rate;
                if (displayArea && s.area) displayArea.textContent = s.area;
            }
        } catch (e) {
            console.error("Could not load provider settings:", e);
        }
    }

    pricePresets.forEach(function(btn) {
        btn.addEventListener("click", function() {
            var amount = btn.dataset.amount;
            if (serviceChargeInput) serviceChargeInput.value = amount;
            if (displayCharge) displayCharge.textContent = "৳" + amount;
        });
    });

    if (serviceChargeInput) {
        serviceChargeInput.addEventListener("input", function() {
            if (displayCharge) displayCharge.textContent = "৳" + (this.value || 0);
        });
    }

    if (serviceAreaInput) {
        serviceAreaInput.addEventListener("change", function() {
            if (displayArea) displayArea.textContent = this.value;
        });
    }

    if (serviceForm) {
        serviceForm.addEventListener("submit", async function(e) {
            e.preventDefault();

            var charge = parseInt(serviceChargeInput ? serviceChargeInput.value : 500, 10) || 500;
            var area = serviceAreaInput ? serviceAreaInput.value : "Dhaka";

            if (charge < 100) {
                alert("Service charge must be at least ৳100 per hour.");
                return;
            }

            var submitBtn = serviceForm.querySelector('button[type="submit"]');
            var originalText = submitBtn ? submitBtn.innerHTML : "Save Service Settings";
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...';
                submitBtn.disabled = true;
            }

            try {
                var res = await window.API.patch('/api/provider/settings', {
                    base_rate: charge,
                    area: area
                });

                if (res && res.ok) {
                    alert("Service settings saved successfully!");
                    if (displayCharge) displayCharge.textContent = "৳" + charge;
                    if (displayArea) displayArea.textContent = area;
                } else {
                    alert((res && res.error) || "Could not save settings.");
                }
            } catch (err) {
                alert(err.message || "Failed to save settings.");
            } finally {
                if (submitBtn) {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            }
        });
    }

    // Initial load
    loadIncomingRequests();
    loadServiceSettings();
});
