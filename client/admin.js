document.addEventListener("DOMContentLoaded", async function() {
    // --- 1. Auth Check ---
    var currentUser = null;
    try {
        var meRes = await window.API.get('/api/auth/me');
        if (meRes && meRes.ok && meRes.user && meRes.user.role === 'admin') {
            currentUser = meRes.user;
            localStorage.setItem("currentUser", JSON.stringify(currentUser));
        } else {
            alert("Access Denied: Administrator privileges required.");
            window.location.href = "index.html";
            return;
        }
    } catch (e) {
        alert("Access Denied: Administrator privileges required.");
        window.location.href = "index.html";
        return;
    }

    var navAvatar = document.getElementById("nav-avatar");
    var navUsername = document.getElementById("nav-username");
    if (navAvatar) navAvatar.src = "https://ui-avatars.com/api/?name=Admin&background=ef4444&color=fff&size=100&bold=true";
    if (navUsername) navUsername.textContent = currentUser.full_name || "Admin";

    // --- 2. Tab Switching ---
    var menuItems = document.querySelectorAll(".sidebar-menu li[data-target]");
    var sections = document.querySelectorAll(".dash-section");

    menuItems.forEach(function(item) {
        item.addEventListener("click", function() {
            menuItems.forEach(function(m) { m.classList.remove("active"); });
            sections.forEach(function(s) { s.classList.remove("active"); });

            item.classList.add("active");
            var target = document.getElementById(item.dataset.target);
            if (target) target.classList.add("active");
        });
    });

    // Logout
    var logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async function() {
            try { await window.API.post('/api/auth/logout', {}); } catch (e) {}
            localStorage.removeItem("currentUser");
            window.location.href = "index.html";
        });
    }

    // --- 3. Fetch Admin Stats & Populate KPI Cards ---
    var statTotalBookings = document.getElementById("stat-total-bookings");
    var statTotalProviders = document.getElementById("stat-total-providers");
    var statTotalUsers = document.getElementById("stat-total-users");
    var statTotalRevenue = document.getElementById("stat-total-revenue");

    try {
        var statsRes = await window.API.get('/api/admin/stats');
        if (statsRes && statsRes.ok && statsRes.stats) {
            var stats = statsRes.stats;
            if (statTotalBookings) statTotalBookings.textContent = stats.total_bookings;
            if (statTotalProviders) statTotalProviders.textContent = stats.total_providers;
            if (statTotalUsers) statTotalUsers.textContent = stats.total_users;
            if (statTotalRevenue) statTotalRevenue.textContent = "৳" + Number(stats.total_revenue || 0).toLocaleString();

            // Populate Providers Table
            var providersTable = document.getElementById("admin-providers-table");
            if (providersTable && statsRes.providers) {
                if (statsRes.providers.length === 0) {
                    providersTable.innerHTML = '<tr><td colspan="5" style="text-align:center;">No providers registered yet.</td></tr>';
                } else {
                    providersTable.innerHTML = statsRes.providers.map(function(p) {
                        return (
                            '<tr>' +
                                '<td><strong>' + (p.name || "N/A") + '</strong></td>' +
                                '<td>' + (p.category || "N/A") + '</td>' +
                                '<td>৳' + (p.price_per_hour || 500) + '</td>' +
                                '<td>⭐ ' + (p.rating || 5.0) + '</td>' +
                                '<td>' + (p.rating_count || 0) + '</td>' +
                            '</tr>'
                        );
                    }).join("");
                }
            }

            // Populate Users Table
            var usersTable = document.getElementById("admin-users-table");
            if (usersTable && statsRes.users) {
                if (statsRes.users.length === 0) {
                    usersTable.innerHTML = '<tr><td colspan="3" style="text-align:center;">No users registered yet.</td></tr>';
                } else {
                    usersTable.innerHTML = statsRes.users.map(function(u) {
                        var avatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(u.name || 'User') + '&background=0052cc&color=fff&size=60';
                        return (
                            '<tr>' +
                                '<td>' +
                                    '<div style="display:flex; align-items:center; gap:10px;">' +
                                        '<img src="' + avatar + '" style="width:30px; height:30px; border-radius:50%; object-fit:cover;">' +
                                        '<strong>' + (u.name || "N/A") + '</strong>' +
                                    '</div>' +
                                '</td>' +
                                '<td>' + (u.email || "N/A") + '</td>' +
                                '<td><span class="role-badge role-' + (u.role || "customer") + '">' + (u.role || "customer") + '</span></td>' +
                            '</tr>'
                        );
                    }).join("");
                }
            }
        }
    } catch (e) {
        console.error("Error fetching admin stats:", e);
    }

    // --- 4. Fetch All Bookings via GET /api/requests/mine ---
    var bookingsTable = document.getElementById("admin-bookings-table");
    try {
        var reqRes = await window.API.get('/api/requests/mine');
        var bookings = (reqRes && reqRes.requests) || [];

        if (bookingsTable) {
            if (bookings.length === 0) {
                bookingsTable.innerHTML = '<tr><td colspan="6" style="text-align:center;">No bookings in the system yet.</td></tr>';
            } else {
                bookingsTable.innerHTML = bookings.map(function(b) {
                    var badgeClass = "status-Active";
                    if (b.status === "requested") badgeClass = "status-Requested";
                    if (b.status === "completed") badgeClass = "status-Completed";

                    var dateStr = b.preferred_date ? String(b.preferred_date).split("T")[0] : "";
                    var statusLabel = b.status.replace(/_/g, " ").replace(/\b\w/g, function(l){ return l.toUpperCase(); });

                    return (
                        '<tr>' +
                            '<td><strong>#' + b.id + '</strong><br><small class="text-muted">' + dateStr + '</small></td>' +
                            '<td>' + (b.customer_name || "Customer #" + b.customer_id) + '</td>' +
                            '<td>' + (b.provider_name || (b.assigned_provider_id ? "Provider #" + b.assigned_provider_id : "Unassigned")) + '</td>' +
                            '<td>' + (b.category_name || "Service") + '</td>' +
                            '<td><strong>৳' + (b.estimated_price || 0) + '</strong></td>' +
                            '<td><span class="badge-status ' + badgeClass + '">' + statusLabel + '</span></td>' +
                        '</tr>'
                    );
                }).join("");
            }
        }
    } catch (e) {
        console.error("Error fetching bookings:", e);
        if (bookingsTable) {
            bookingsTable.innerHTML = '<tr><td colspan="6" style="text-align:center;">Could not load bookings.</td></tr>';
        }
    }
});
