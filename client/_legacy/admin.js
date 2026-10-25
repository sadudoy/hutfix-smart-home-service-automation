document.addEventListener("DOMContentLoaded", function() {
    // --- 1. Auth Check ---
    var currentUser = null;
    try {
        currentUser = JSON.parse(localStorage.getItem("currentUser"));
    } catch (e) {
        console.error("Could not parse currentUser:", e);
    }

    if (!currentUser || currentUser.role !== "admin") {
        alert("Access Denied: Administrator privileges required.");
        window.location.href = "index.html";
        return;
    }

    var navAvatar = document.getElementById("nav-avatar");
    var navUsername = document.getElementById("nav-username");
    if (navAvatar) navAvatar.src = currentUser.avatar || "assets/images/default-avatar.png";
    if (navUsername) navUsername.textContent = "Admin";

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
        logoutBtn.addEventListener("click", function() {
            localStorage.removeItem("currentUser");
            window.location.href = "index.html";
        });
    }

    // --- 3. Fetch Data ---
    var bookings = [];
    var providers = [];
    var users = [];

    try {
        bookings = JSON.parse(localStorage.getItem("hf_bookings")) || [];
        providers = JSON.parse(localStorage.getItem("hf_providers")) || [];
        users = JSON.parse(localStorage.getItem("hf_users")) || [];
    } catch (e) {
        console.error("Error reading localStorage:", e);
    }

    // --- 4. Render Overview Stats ---
    var statTotalBookings = document.getElementById("stat-total-bookings");
    var statTotalProviders = document.getElementById("stat-total-providers");
    var statTotalUsers = document.getElementById("stat-total-users");
    var statTotalRevenue = document.getElementById("stat-total-revenue");

    if (statTotalBookings) statTotalBookings.textContent = bookings.length;
    if (statTotalProviders) statTotalProviders.textContent = providers.length;
    if (statTotalUsers) statTotalUsers.textContent = users.length;

    var totalValue = bookings.reduce(function(sum, order) {
        return sum + Number(order.price || 0);
    }, 0);
    if (statTotalRevenue) statTotalRevenue.textContent = "৳" + totalValue.toLocaleString();

    // --- 5. Render Bookings Table ---
    var bookingsTable = document.getElementById("admin-bookings-table");
    if (bookingsTable) {
        if (bookings.length === 0) {
            bookingsTable.innerHTML = '<tr><td colspan="6" style="text-align:center;">No bookings in the system yet.</td></tr>';
        } else {
            bookingsTable.innerHTML = bookings.slice().reverse().map(function(b) {
                var badgeClass = "status-Active";
                if (b.status === "Requested") badgeClass = "status-Requested";
                if (b.status === "Completed") badgeClass = "status-Completed";

                return (
                    '<tr>' +
                        '<td><strong>' + b.id + '</strong><br><small class="text-muted">' + (b.date || "") + '</small></td>' +
                        '<td>' + (b.customerName || "N/A") + '</td>' +
                        '<td>' + (b.providerName || "N/A") + '</td>' +
                        '<td>' + (b.serviceCategory || "N/A") + '</td>' +
                        '<td><strong>৳' + (b.price || 0) + '</strong></td>' +
                        '<td><span class="badge-status ' + badgeClass + '">' + (b.status || "N/A") + '</span></td>' +
                    '</tr>'
                );
            }).join("");
        }
    }

    // --- 6. Render Providers Table ---
    var providersTable = document.getElementById("admin-providers-table");
    if (providersTable) {
        if (providers.length === 0) {
            providersTable.innerHTML = '<tr><td colspan="5" style="text-align:center;">No providers registered yet.</td></tr>';
        } else {
            providersTable.innerHTML = providers.map(function(p) {
                return (
                    '<tr>' +
                        '<td><strong>' + (p.name || "N/A") + '</strong></td>' +
                        '<td>' + (p.category || "N/A") + '</td>' +
                        '<td>৳' + (p.pricePerHour || 0) + '</td>' +
                        '<td>⭐ ' + (p.rating || 0) + '</td>' +
                        '<td>' + (p.jobsCompleted || 0) + '</td>' +
                    '</tr>'
                );
            }).join("");
        }
    }

    // --- 7. Render Users Table ---
    var usersTable = document.getElementById("admin-users-table");
    if (usersTable) {
        if (users.length === 0) {
            usersTable.innerHTML = '<tr><td colspan="3" style="text-align:center;">No users registered yet.</td></tr>';
        } else {
            usersTable.innerHTML = users.slice().reverse().map(function(u) {
                return (
                    '<tr>' +
                        '<td>' +
                            '<div style="display:flex; align-items:center; gap:10px;">' +
                                '<img src="' + (u.avatar || "assets/images/default-avatar.png") + '" style="width:30px; height:30px; border-radius:50%; object-fit:cover;">' +
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
});