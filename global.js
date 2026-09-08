document.addEventListener("DOMContentLoaded", function() {
    // =========================
    // PRELOADER
    // =========================
    var loader = document.getElementById("loader-wrapper");
    if (loader) {
        setTimeout(function() {
            loader.style.opacity = "0";
            setTimeout(function() {
                loader.style.display = "none";
            }, 500);
        }, 800);
    }

    // =========================
    // DARK MODE
    // =========================
    var themeToggleBtn = document.getElementById("theme-toggle");
    if (themeToggleBtn) {
        var themeIcon = themeToggleBtn.querySelector("i");

        if (localStorage.getItem("theme") === "dark") {
            document.documentElement.setAttribute("data-theme", "dark");
            if (themeIcon) themeIcon.classList.replace("fa-moon", "fa-sun");
        }

        themeToggleBtn.addEventListener("click", function() {
            var isDark = document.documentElement.getAttribute("data-theme") === "dark";

            if (isDark) {
                document.documentElement.removeAttribute("data-theme");
                localStorage.setItem("theme", "light");
                if (themeIcon) themeIcon.classList.replace("fa-sun", "fa-moon");
            } else {
                document.documentElement.setAttribute("data-theme", "dark");
                localStorage.setItem("theme", "dark");
                if (themeIcon) themeIcon.classList.replace("fa-moon", "fa-sun");
            }
        });
    }

    // =========================
    // CURRENT USER
    // =========================
    var currentUser = null;
    try {
        currentUser = MockDB.getCurrentUser();
    } catch (e) {
        console.error("MockDB not loaded:", e);
    }

    // =========================
    // NAVIGATION AUTH AREA
    // =========================
    var navAuthArea = document.getElementById("nav-auth-area");

    if (currentUser && navAuthArea) {
        var dashboardLink = "index.html"; // CUSTOMERS go to homepage
        if (currentUser.role === "provider") {
            dashboardLink = "provider.html";
        } else if (currentUser.role === "admin") {
            dashboardLink = "admin.html";
        }

        // Check if user is customer - show different menu
        var isCustomer = currentUser.role === "customer";
        var menuItems = '';
        
        if (isCustomer) {
            // Customer menu - link to homepage with booking section
            menuItems = 
                '<a href="index.html#marketplace-section"><i class="fa-solid fa-search"></i> Browse Services</a>' +
                '<a href="customer.html"><i class="fa-solid fa-list"></i> My Bookings</a>';
        } else {
            // Provider/Admin menu
            menuItems = 
                '<a href="' + dashboardLink + '"><i class="fa-solid fa-gauge"></i> My Dashboard</a>' +
                '<a href="' + dashboardLink + '"><i class="fa-solid fa-list"></i> Order History</a>';
        }

        navAuthArea.innerHTML = 
            '<div class="user-menu-container">' +
                '<button class="user-profile-btn" type="button">' +
                    '<img src="' + currentUser.avatar + '" alt="User">' +
                    '<span>' + currentUser.name.split(" ")[0] + ' <i class="fa-solid fa-chevron-down" style="font-size:0.8rem"></i></span>' +
                '</button>' +
                '<div class="dropdown-menu">' +
                    menuItems +
                    '<a href="#" id="global-logout" class="logout-btn"><i class="fa-solid fa-right-from-bracket"></i> Logout</a>' +
                '</div>' +
            '</div>';

        var logout = document.getElementById("global-logout");
        if (logout) {
            logout.addEventListener("click", function(e) {
                e.preventDefault();
                localStorage.removeItem("currentUser");
                window.location.reload();
            });
        }
    }

    // =========================
    // MARKETPLACE
    // =========================
    var marketplaceSection = document.getElementById("marketplace-section");
    var gigsGrid = document.getElementById("gigs-grid");

    if (!marketplaceSection || !gigsGrid) {
        return;
    }

    // =========================
    // RENDER PROVIDERS
    // =========================
    // =========================
// RENDER PROVIDERS - UPDATED WITH BETTER ICONS
// =========================
function renderGigs(providers, titleText, shouldScroll) {
    shouldScroll = shouldScroll || false;
    var subtitle = document.getElementById("marketplace-subtitle");

    if (subtitle) {
        subtitle.textContent = titleText;
    }

    marketplaceSection.style.display = "block";
    gigsGrid.innerHTML = "";

    if (!providers || providers.length === 0) {
        gigsGrid.innerHTML = '<p style="text-align:center; grid-column:1/-1;">No providers found.</p>';
        return;
    }

    providers.forEach(function(provider) {
        // --- REPLACE THIS SECTION WITH THE NEW ICON MAPPING ---
        var icon = "fa-tools";
        var iconColor = "#6b7280";
        var iconBg = "rgba(107, 114, 128, 0.1)";
        
        if (provider.category && provider.category.includes("AC")) {
            icon = "fa-snowflake";
            iconColor = "#4a90e2";
            iconBg = "rgba(74, 144, 226, 0.1)";
        } else if (provider.category && provider.category.includes("Plumb")) {
            icon = "fa-faucet-drip";
            iconColor = "#10b981";
            iconBg = "rgba(16, 185, 129, 0.1)";
        } else if (provider.category && provider.category.includes("Elect")) {
            icon = "fa-bolt";
            iconColor = "#f59e0b";
            iconBg = "rgba(245, 158, 11, 0.1)";
        } else if (provider.category && provider.category.includes("Clean")) {
            icon = "fa-spray-can-sparkles";
            iconColor = "#8b5cf6";
            iconBg = "rgba(139, 92, 246, 0.1)";
        } else if (provider.category && provider.category.includes("Carpent")) {
            icon = "fa-hammer";
            iconColor = "#f97316";
            iconBg = "rgba(249, 115, 22, 0.1)";
        } else if (provider.category && provider.category.includes("Paint")) {
            icon = "fa-paintbrush";
            iconColor = "#ec4899";
            iconBg = "rgba(236, 72, 153, 0.1)";
        } else if (provider.category && provider.category.includes("Garden")) {
            icon = "fa-seedling";
            iconColor = "#22c55e";
            iconBg = "rgba(34, 197, 94, 0.1)";
        } else if (provider.category && provider.category.includes("Security")) {
            icon = "fa-shield-halved";
            iconColor = "#ef4444";
            iconBg = "rgba(239, 68, 68, 0.1)";
        } else if (provider.category && provider.category.includes("IT")) {
            icon = "fa-network-wired";
            iconColor = "#6366f1";
            iconBg = "rgba(99, 102, 241, 0.1)";
        }

        var avatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(provider.name) + '&background=1A365D&color=fff';
        var safeName = provider.name.replace(/'/g, "\\'");
        var safeCategory = provider.category.replace(/'/g, "\\'");

        var card = document.createElement("div");
        card.className = "gig-card";
        card.innerHTML = 
            '<div class="gig-image" style="background: ' + iconBg + '; display: flex; align-items: center; justify-content: center;">' +
                '<i class="fa-solid ' + icon + '" style="font-size: 4rem; color: ' + iconColor + ';"></i>' +
            '</div>' +
            '<div class="gig-info">' +
                '<div class="gig-provider">' +
                    '<img src="' + avatar + '" class="provider-avatar" alt="' + provider.name + '">' +
                    '<span>' + provider.name + '</span>' +
                '</div>' +
                '<h4>Professional ' + provider.category + ' Service</h4>' +
                '<div class="gig-rating">' +
                    '<i class="fa-solid fa-star"></i> ' + provider.rating +
                    ' <span>(' + provider.jobsCompleted + ' jobs)</span>' +
                '</div>' +
                '<div class="gig-footer">' +
                    '<span class="gig-price">৳' + provider.pricePerHour + '</span>' +
                    '<button class="btn-primary" onclick="initiateBooking(\'' + provider.id + '\', \'' + safeName + '\', \'' + safeCategory + '\', ' + provider.pricePerHour + ')">Book Now</button>' +
                '</div>' +
            '</div>';
        gigsGrid.appendChild(card);
    });

    if (shouldScroll) {
        marketplaceSection.scrollIntoView({ behavior: "smooth" });
    }
}

    // =========================
    // SHOW ALL PROVIDERS
    // =========================
    var allProviders = [];
    try {
        allProviders = MockDB.getProviders();
    } catch (e) {
        console.error("Could not get providers:", e);
    }
    renderGigs(allProviders, "All available service providers", false);

    // =========================
    // SEARCH
    // =========================
    var searchBtn = document.getElementById("search-btn");
    var searchInput = document.getElementById("hero-search");

    if (searchBtn && searchInput) {
        searchBtn.addEventListener("click", function() {
            var keyword = searchInput.value.trim();
            var results = [];
            try {
                results = MockDB.searchProviders(keyword);
            } catch (e) {
                console.error("Search error:", e);
                results = allProviders;
            }
            renderGigs(results, keyword ? 'Search results for "' + keyword + '"' : "All available service providers", true);
        });

        searchInput.addEventListener("keydown", function(e) {
            if (e.key === "Enter") {
                e.preventDefault();
                searchBtn.click();
            }
        });
    }

    // =========================
    // CATEGORY FILTER
    // =========================
    document.querySelectorAll(".category-trigger").forEach(function(card) {
        card.addEventListener("click", function() {
            var category = card.dataset.category;
            var results = [];
            try {
                results = MockDB.getProviders().filter(function(p) { return p.category === category; });
            } catch (e) {
                console.error("Category filter error:", e);
                results = allProviders.filter(function(p) { return p.category === category; });
            }
            renderGigs(results, "Showing experts for " + category, true);
        });
    });

    // =========================
    // BOOKING MODAL
    // =========================
    var bookingModal = document.getElementById("booking-modal");

    window.initiateBooking = function(id, name, category, price) {
        var user = null;
        try {
            user = MockDB.getCurrentUser();
        } catch (e) {
            console.error("Could not get user:", e);
        }

        if (!user || user.role !== "customer") {
            var authModal = document.getElementById("auth-modal");
            if (authModal) {
                authModal.classList.add("active");
                document.body.style.overflow = "hidden";
            }
            return;
        }

        var providerIdInput = document.getElementById("book-provider-id");
        var providerNameInput = document.getElementById("book-provider-name");
        var providerCategoryInput = document.getElementById("book-provider-category");
        var providerPriceInput = document.getElementById("book-provider-price");

        if (providerIdInput) providerIdInput.value = id;
        if (providerNameInput) providerNameInput.value = name;
        if (providerCategoryInput) providerCategoryInput.value = category;
        if (providerPriceInput) providerPriceInput.value = price;

        if (bookingModal) {
            bookingModal.classList.add("active");
        }

        var dateInput = document.getElementById("book-date");
        if (dateInput) {
            dateInput.min = new Date().toISOString().split("T")[0];
        }
    };

    // Close booking modal
    var closeBooking = document.getElementById("close-booking");
    if (closeBooking) {
        closeBooking.addEventListener("click", function() {
            if (bookingModal) bookingModal.classList.remove("active");
        });
    }

    if (bookingModal) {
        bookingModal.addEventListener("click", function(e) {
            if (e.target === bookingModal) {
                bookingModal.classList.remove("active");
            }
        });
    }

    // =========================
    // DIRECT BOOKING
    // =========================
    var directBookingForm = document.getElementById("direct-booking-form");
    if (directBookingForm) {
        directBookingForm.addEventListener("submit", function(e) {
            e.preventDefault();

            var user = null;
            try {
                user = MockDB.getCurrentUser();
            } catch (e) {
                console.error("Could not get user:", e);
                alert("Please log in first.");
                return;
            }

            if (!user) {
                alert("Please log in first.");
                return;
            }

            try {
                MockDB.createBooking({
                    customerId: user.id,
                    customerName: user.name,
                    providerId: document.getElementById("book-provider-id").value,
                    providerName: document.getElementById("book-provider-name").value,
                    serviceCategory: document.getElementById("book-provider-category").value,
                    price: document.getElementById("book-provider-price").value,
                    date: document.getElementById("book-date").value,
                    time: document.getElementById("book-time").value,
                    location: document.getElementById("book-location").value,
                    details: document.getElementById("book-details").value
                });

                alert("Booking Confirmed! You can track it in your Dashboard.");
                window.location.href = "customer.html";
            } catch (e) {
                console.error("Booking error:", e);
                alert("There was an error creating your booking. Please try again.");
            }
        });
    }
});