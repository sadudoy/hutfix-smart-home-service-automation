document.addEventListener("DOMContentLoaded", async function() {
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
        }, 300);
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
    // CATEGORY ICON HELPER
    // =========================
    function getCategoryIcon(categoryName) {
        var icons = {
            "AC & Appliance": { icon: "fa-snowflake", color: "#4a90e2", bg: "rgba(74, 144, 226, 0.1)" },
            "Appliance Repair": { icon: "fa-snowflake", color: "#4a90e2", bg: "rgba(74, 144, 226, 0.1)" },
            "Plumbing": { icon: "fa-faucet-drip", color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" },
            "Electrical": { icon: "fa-bolt", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" },
            "Cleaning": { icon: "fa-spray-can-sparkles", color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.1)" },
            "Carpentry": { icon: "fa-hammer", color: "#f97316", bg: "rgba(249, 115, 22, 0.1)" },
            "Painting": { icon: "fa-paintbrush", color: "#ec4899", bg: "rgba(236, 72, 153, 0.1)" },
            "Gardening": { icon: "fa-seedling", color: "#22c55e", bg: "rgba(34, 197, 94, 0.1)" },
            "Security": { icon: "fa-shield-halved", color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" },
            "IT & Networking": { icon: "fa-network-wired", color: "#6366f1", bg: "rgba(99, 102, 241, 0.1)" }
        };
        for (var key in icons) {
            if (categoryName.toLowerCase().indexOf(key.toLowerCase()) !== -1) {
                return icons[key];
            }
        }
        return { icon: "fa-tools", color: "#6b7280", bg: "rgba(107, 114, 128, 0.1)" };
    }

    // =========================
    // AUTH STATE & NAVBAR
    // =========================
    var currentUser = null;
    try {
        var meRes = await window.API.get('/api/auth/me');
        if (meRes && meRes.ok && meRes.user) {
            currentUser = meRes.user;
            localStorage.setItem("currentUser", JSON.stringify(currentUser));
        } else {
            localStorage.removeItem("currentUser");
        }
    } catch (e) {
        currentUser = null;
        localStorage.removeItem("currentUser");
    }

    var navAuthArea = document.getElementById("nav-auth-area");
    if (navAuthArea) {
        if (currentUser) {
            var dashboardHref = "/customer.html";
            if (currentUser.role === "provider") dashboardHref = "/provider.html";
            else if (currentUser.role === "admin") dashboardHref = "/admin.html";

            navAuthArea.innerHTML = 
                '<div style="display:flex; align-items:center; gap:12px;">' +
                    '<a href="' + dashboardHref + '" class="btn-primary" style="text-decoration:none; padding:8px 16px; font-size:0.9rem;">' +
                        '<i class="fa-solid fa-gauge"></i> Dashboard' +
                    '</a>' +
                    '<button id="global-logout" class="btn-outline" style="padding:8px 14px; font-size:0.9rem; cursor:pointer;">' +
                        '<i class="fa-solid fa-right-from-bracket"></i> Logout' +
                    '</button>' +
                '</div>';

            var logoutBtn = document.getElementById("global-logout");
            if (logoutBtn) {
                logoutBtn.addEventListener("click", async function(e) {
                    e.preventDefault();
                    try { await window.API.post('/api/auth/logout', {}); } catch (err) {}
                    localStorage.removeItem("currentUser");
                    window.location.reload();
                });
            }
        } else {
            navAuthArea.innerHTML = '<button class="btn-primary auth-trigger">Login / Sign Up</button>';
            var triggerBtn = navAuthArea.querySelector(".auth-trigger");
            if (triggerBtn) {
                triggerBtn.addEventListener("click", function(e) {
                    e.preventDefault();
                    var modal = document.getElementById("auth-modal");
                    if (modal) {
                        modal.classList.add("active");
                        document.body.style.overflow = "hidden";
                    }
                });
            }
        }
    }

    // =========================
    // FETCH & RENDER CATEGORIES
    // =========================
    var servicesMap = {};
    var categorySlugMap = {};
    var servicesGrid = document.querySelector(".services-grid");

    try {
        var servicesRes = await window.API.get('/api/services');
        if (servicesRes && servicesRes.ok && servicesRes.services) {
            var services = servicesRes.services;
            services.forEach(function(s) {
                servicesMap[s.slug] = s;
                categorySlugMap[s.name] = s.slug;
            });

            if (servicesGrid) {
                servicesGrid.innerHTML = services.map(function(s) {
                    var iconInfo = getCategoryIcon(s.name);
                    return (
                        '<div class="service-card category-trigger" data-category="' + s.name + '" data-slug="' + s.slug + '">' +
                            '<div class="card-icon-wrapper" style="background: ' + iconInfo.bg + '; color: ' + iconInfo.color + ';">' +
                                '<i class="fa-solid ' + iconInfo.icon + '"></i>' +
                            '</div>' +
                            '<h3>' + s.name + '</h3>' +
                        '</div>'
                    );
                }).join("");
            }
        }
    } catch (err) {
        console.error("Failed to load services:", err);
    }

    // =========================
    // MARKETPLACE & PROVIDERS
    // =========================
    var marketplaceSection = document.getElementById("marketplace-section");
    var gigsGrid = document.getElementById("gigs-grid");
    var subtitle = document.getElementById("marketplace-subtitle");

    async function loadAndRenderProviders(categorySlug, titleText, shouldScroll) {
        if (!marketplaceSection || !gigsGrid) return;

        marketplaceSection.style.display = "block";
        if (subtitle && titleText) subtitle.textContent = titleText;
        gigsGrid.innerHTML = '<p style="text-align:center; grid-column:1/-1;">Loading technicians...</p>';

        try {
            var url = '/api/providers';
            if (categorySlug) url += '?category_slug=' + encodeURIComponent(categorySlug);
            var res = await window.API.get(url);
            var providers = (res && res.providers) || [];

            if (providers.length === 0) {
                gigsGrid.innerHTML = '<p style="text-align:center; grid-column:1/-1;">No providers found for this category.</p>';
            } else {
                gigsGrid.innerHTML = providers.map(function(p) {
                    var iconData = getCategoryIcon(p.category || "Service");
                    var avatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(p.name) + '&background=1A365D&color=fff&size=120';
                    var safeName = (p.name || '').replace(/'/g, "\\'");
                    var safeCat = (p.category || '').replace(/'/g, "\\'");
                    var catSlug = p.category_slug || categorySlugMap[p.category] || '';

                    return (
                        '<div class="gig-card">' +
                            '<div class="gig-image" style="background: ' + iconData.bg + '; display: flex; align-items: center; justify-content: center;">' +
                                '<i class="fa-solid ' + iconData.icon + '" style="font-size: 3.5rem; color: ' + iconData.color + ';"></i>' +
                            '</div>' +
                            '<div class="gig-info">' +
                                '<div class="gig-provider">' +
                                    '<img src="' + avatar + '" class="provider-avatar" alt="' + p.name + '">' +
                                    '<span>' + p.name + '</span>' +
                                '</div>' +
                                '<h4>' + (p.headline || ('Professional ' + p.category + ' Service')) + '</h4>' +
                                '<div class="gig-rating">' +
                                    '<i class="fa-solid fa-star"></i> ' + (p.rating || 5.0) +
                                    ' <span>(' + (p.rating_count || 0) + ' reviews)</span>' +
                                '</div>' +
                                '<div class="gig-footer">' +
                                    '<span class="gig-price">৳' + (p.price_per_hour || 500) + '</span>' +
                                    '<button class="btn-primary" onclick="initiateBooking(\'' + p.id + '\', \'' + safeName + '\', \'' + safeCat + '\', ' + (p.price_per_hour || 500) + ', \'' + catSlug + '\')">Book Now</button>' +
                                '</div>' +
                            '</div>' +
                        '</div>'
                    );
                }).join("");
            }

            if (shouldScroll) {
                marketplaceSection.scrollIntoView({ behavior: "smooth" });
            }
        } catch (e) {
            console.error("Error loading providers:", e);
            gigsGrid.innerHTML = '<p style="text-align:center; grid-column:1/-1;">Could not load providers.</p>';
        }
    }

    // Handle Category Trigger Clicks
    document.addEventListener("click", function(e) {
        var card = e.target.closest(".category-trigger");
        if (!card) return;

        // Check if user is logged in
        if (!currentUser) {
            var authModal = document.getElementById("auth-modal");
            if (authModal) {
                authModal.classList.add("active");
                document.body.style.overflow = "hidden";
            }
            return;
        }

        var catSlug = card.dataset.slug;
        var catName = card.dataset.category || (servicesMap[catSlug] && servicesMap[catSlug].name) || catSlug;
        loadAndRenderProviders(catSlug, "Showing experts for " + catName, true);
    });

    // Search button
    var searchBtn = document.getElementById("search-btn");
    var searchInput = document.getElementById("hero-search");
    if (searchBtn && searchInput) {
        searchBtn.addEventListener("click", async function() {
            var kw = searchInput.value.trim();
            if (!marketplaceSection || !gigsGrid) return;
            marketplaceSection.style.display = "block";
            gigsGrid.innerHTML = '<p style="text-align:center; grid-column:1/-1;">Searching...</p>';

            try {
                var res = await window.API.get('/api/providers?search=' + encodeURIComponent(kw));
                var providers = (res && res.providers) || [];
                if (providers.length === 0) {
                    gigsGrid.innerHTML = '<p style="text-align:center; grid-column:1/-1;">No technicians found matching "' + kw + '".</p>';
                } else {
                    gigsGrid.innerHTML = providers.map(function(p) {
                        var iconData = getCategoryIcon(p.category || "Service");
                        var avatar = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(p.name) + '&background=1A365D&color=fff&size=120';
                        var safeName = (p.name || '').replace(/'/g, "\\'");
                        var safeCat = (p.category || '').replace(/'/g, "\\'");
                        var catSlug = p.category_slug || categorySlugMap[p.category] || '';

                        return (
                            '<div class="gig-card">' +
                                '<div class="gig-image" style="background: ' + iconData.bg + '; display: flex; align-items: center; justify-content: center;">' +
                                    '<i class="fa-solid ' + iconData.icon + '" style="font-size: 3.5rem; color: ' + iconData.color + ';"></i>' +
                                '</div>' +
                                '<div class="gig-info">' +
                                    '<div class="gig-provider">' +
                                        '<img src="' + avatar + '" class="provider-avatar" alt="' + p.name + '">' +
                                        '<span>' + p.name + '</span>' +
                                    '</div>' +
                                    '<h4>' + (p.headline || ('Professional ' + p.category + ' Service')) + '</h4>' +
                                    '<div class="gig-rating">' +
                                        '<i class="fa-solid fa-star"></i> ' + (p.rating || 5.0) +
                                    '</div>' +
                                    '<div class="gig-footer">' +
                                        '<span class="gig-price">৳' + (p.price_per_hour || 500) + '</span>' +
                                        '<button class="btn-primary" onclick="initiateBooking(\'' + p.id + '\', \'' + safeName + '\', \'' + safeCat + '\', ' + (p.price_per_hour || 500) + ', \'' + catSlug + '\')">Book Now</button>' +
                                    '</div>' +
                                '</div>' +
                            '</div>'
                        );
                    }).join("");
                }
                marketplaceSection.scrollIntoView({ behavior: "smooth" });
            } catch (err) {
                console.error(err);
            }
        });

        searchInput.addEventListener("keydown", function(e) {
            if (e.key === "Enter") {
                e.preventDefault();
                searchBtn.click();
            }
        });
    }

    // =========================
    // BOOKING MODAL
    // =========================
    var bookingModal = document.getElementById("booking-modal");
    var activeCategorySlug = "";

    window.initiateBooking = function(id, name, category, price, slug) {
        if (!currentUser) {
            var authModal = document.getElementById("auth-modal");
            if (authModal) {
                authModal.classList.add("active");
                document.body.style.overflow = "hidden";
            }
            return;
        }

        activeCategorySlug = slug || categorySlugMap[category] || "appliance-repair";

        var providerIdInput = document.getElementById("book-provider-id");
        var providerNameInput = document.getElementById("book-provider-name");
        var providerCategoryInput = document.getElementById("book-provider-category");
        var providerPriceInput = document.getElementById("book-provider-price");

        if (providerIdInput) providerIdInput.value = id;
        if (providerNameInput) providerNameInput.value = name;
        if (providerCategoryInput) providerCategoryInput.value = category;
        if (providerPriceInput) providerPriceInput.value = price;

        var dateInput = document.getElementById("book-date");
        if (dateInput) {
            var tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            var dateStr = tomorrow.toISOString().split("T")[0];
            dateInput.min = dateStr;
            dateInput.value = dateStr;
        }

        var timeInput = document.getElementById("book-time");
        if (timeInput && !timeInput.value) {
            timeInput.value = "10:00";
        }

        if (bookingModal) {
            bookingModal.classList.add("active");
            document.body.style.overflow = "hidden";
        }
    };

    var closeBooking = document.getElementById("close-booking");
    if (closeBooking) {
        closeBooking.addEventListener("click", function() {
            if (bookingModal) {
                bookingModal.classList.remove("active");
                document.body.style.overflow = "auto";
            }
        });
    }

    if (bookingModal) {
        bookingModal.addEventListener("click", function(e) {
            if (e.target === bookingModal) {
                bookingModal.classList.remove("active");
                document.body.style.overflow = "auto";
            }
        });
    }

    // =========================
    // DIRECT BOOKING FORM (MULTIPART / POST /api/requests)
    // =========================
    var directBookingForm = document.getElementById("direct-booking-form");
    if (directBookingForm) {
        directBookingForm.addEventListener("submit", async function(e) {
            e.preventDefault();

            if (!currentUser) {
                alert("Please log in first.");
                var authModal = document.getElementById("auth-modal");
                if (authModal) authModal.classList.add("active");
                return;
            }

            var providerId = document.getElementById("book-provider-id").value;
            var categoryName = document.getElementById("book-provider-category").value;
            var dateVal = document.getElementById("book-date").value;
            var timeVal = document.getElementById("book-time").value || "10:00";
            var locationVal = document.getElementById("book-location").value;
            var detailsVal = document.getElementById("book-details").value;

            var timeParts = timeVal.split(":");
            var startMin = parseInt(timeParts[0], 10) * 60 + parseInt(timeParts[1] || 0, 10);
            var endMin = startMin + 60;

            var slug = activeCategorySlug || categorySlugMap[categoryName] || "appliance-repair";

            var formData = new FormData();
            formData.append("category_slug", slug);
            formData.append("provider_id", providerId);
            formData.append("preferred_date", dateVal);
            formData.append("preferred_start_minute", String(startMin));
            formData.append("preferred_end_minute", String(endMin));
            formData.append("urgency", "normal");
            formData.append("address", locationVal);
            formData.append("description", detailsVal || ("Booking for " + categoryName));
            formData.append("contact_phone", currentUser.phone || "01700000000");
            formData.append("latitude", "23.7465");
            formData.append("longitude", "90.3760");

            var submitBtn = directBookingForm.querySelector('button[type="submit"]');
            var originalText = submitBtn ? submitBtn.innerHTML : "Confirm Booking";
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Booking...';
                submitBtn.disabled = true;
            }

            try {
                var res = await window.API.post('/api/requests', formData);
                if (res && res.ok) {
                    alert("Booking Confirmed! You can track it in your Dashboard.");
                    if (bookingModal) bookingModal.classList.remove("active");
                    window.location.href = "/customer.html";
                } else {
                    alert((res && res.error) || "Failed to create booking.");
                }
            } catch (err) {
                alert(err.message || "Failed to create booking. Please try another time slot.");
            } finally {
                if (submitBtn) {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            }
        });
    }
});
