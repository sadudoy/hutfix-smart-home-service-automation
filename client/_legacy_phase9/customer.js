document.addEventListener("DOMContentLoaded", async function() {
    // --- 1. Authentication Check ---
    var currentUser = null;
    try {
        var meRes = await window.API.get('/api/auth/me');
        if (meRes && meRes.ok && meRes.user && meRes.user.role === 'customer') {
            currentUser = meRes.user;
            localStorage.setItem("currentUser", JSON.stringify(currentUser));
        } else {
            window.location.href = "/index.html";
            return;
        }
    } catch (err) {
        window.location.href = "/index.html";
        return;
    }

    // Populate Nav Profile
    var navAvatar = document.getElementById("nav-avatar");
    var navUsername = document.getElementById("nav-username");
    if (navAvatar) {
        navAvatar.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(currentUser.full_name) + '&background=0052cc&color=fff&size=100&bold=true';
    }
    if (navUsername) {
        navUsername.textContent = currentUser.full_name.split(" ")[0];
    }

    // Populate Profile Tab
    var profName = document.getElementById("prof-name");
    var profEmail = document.getElementById("prof-email");
    if (profName) profName.value = currentUser.full_name;
    if (profEmail) profEmail.value = currentUser.email;

    // --- 2. Sidebar Tab Switching ---
    var menuItems = document.querySelectorAll(".sidebar-menu li[data-target]");
    var sections = document.querySelectorAll(".dash-section");

    menuItems.forEach(function(item) {
        item.addEventListener("click", function() {
            menuItems.forEach(function(m) { m.classList.remove("active"); });
            sections.forEach(function(s) { s.classList.remove("active"); });

            item.classList.add("active");
            var target = document.getElementById(item.dataset.target);
            if (target) target.classList.add("active");

            if (item.dataset.target === "section-history") {
                renderBookings();
            }
        });
    });

    // Add "Browse Services" button to sidebar
    var sidebarMenu = document.querySelector(".sidebar-menu");
    if (sidebarMenu) {
        var browseLi = document.createElement("li");
        browseLi.innerHTML = '<i class="fa-solid fa-search"></i> Browse Services';
        browseLi.style.cursor = "pointer";
        browseLi.addEventListener("click", function() {
            window.location.href = "index.html#marketplace-section";
        });
        var logoutLi = document.getElementById("logout-btn");
        if (logoutLi) {
            sidebarMenu.insertBefore(browseLi, logoutLi);
        } else {
            sidebarMenu.appendChild(browseLi);
        }
    }

    // Logout
    var logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async function() {
            try { await window.API.post('/api/auth/logout', {}); } catch (e) {}
            localStorage.removeItem("currentUser");
            window.location.href = "index.html";
        });
    }

    // --- 3. Populate Categories in Booking Form ---
    var categorySelect = document.getElementById("book-category");
    try {
        var servicesRes = await window.API.get('/api/services');
        if (servicesRes && servicesRes.ok && servicesRes.services && categorySelect) {
            categorySelect.innerHTML = servicesRes.services.map(function(s) {
                return '<option value="' + s.slug + '">' + s.name + '</option>';
            }).join("");
        }
    } catch (e) {
        console.error("Failed to load services in customer.js:", e);
    }

    // --- 4. Smart Booking Engine ---
    var bookingForm = document.getElementById("booking-form");
    var matchContainer = document.getElementById("match-result-container");
    var matchDetails = document.getElementById("match-details");
    var pendingBooking = null;

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

    if (bookingForm) {
        bookingForm.addEventListener("submit", async function(e) {
            e.preventDefault();
            var submitBtn = bookingForm.querySelector('button[type="submit"]');
            var originalText = submitBtn.innerHTML;

            submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Finding Best Match...';
            submitBtn.disabled = true;

            var categorySlug = document.getElementById("book-category").value;
            var categoryName = categorySelect.options[categorySelect.selectedIndex].text;
            var dateVal = document.getElementById("book-date").value;
            var timeVal = document.getElementById("book-time").value || "10:00";
            var urgencyVal = document.getElementById("book-urgency") ? document.getElementById("book-urgency").value : "normal";
            var locationVal = document.getElementById("book-location").value;
            var detailsVal = document.getElementById("book-details") ? document.getElementById("book-details").value : "";

            var timeParts = timeVal.split(":");
            var startMin = parseInt(timeParts[0], 10) * 60 + parseInt(timeParts[1] || 0, 10);
            var endMin = startMin + 60;

            try {
                var matchRes = await window.API.post('/api/requests/match', {
                    category_slug: categorySlug,
                    preferred_date: dateVal,
                    preferred_start_minute: startMin,
                    preferred_end_minute: endMin,
                    urgency: urgencyVal,
                    address: locationVal,
                    latitude: 23.7465,
                    longitude: 90.3760
                });

                var candidates = (matchRes && matchRes.candidates) || [];
                if (candidates.length === 0) {
                    alert("No providers available for that time slot or category. Please try another time.");
                    return;
                }

                var best = candidates[0];
                pendingBooking = {
                    category_slug: categorySlug,
                    category_name: categoryName,
                    provider_id: best.provider_id,
                    provider_name: best.name,
                    preferred_date: dateVal,
                    preferred_start_minute: startMin,
                    preferred_end_minute: endMin,
                    urgency: urgencyVal,
                    address: locationVal,
                    description: detailsVal || ("Request for " + categoryName),
                    estimated_price: best.estimated_price || 500,
                    distance: best.distance_km != null ? best.distance_km.toFixed(1) : "1.5",
                    rating: best.rating || 5.0,
                    rating_count: best.rating_count || 0
                };

                if (matchDetails) {
                    matchDetails.innerHTML = 
                        '<div class="match-stat"><span>Provider:</span> <strong>' + best.name + '</strong></div>' +
                        '<div class="match-stat"><span>Rating:</span> <strong>⭐ ' + (best.rating || 5.0) + ' (' + (best.rating_count || 0) + ' reviews)</strong></div>' +
                        '<div class="match-stat"><span>Distance:</span> <strong>📍 ' + pendingBooking.distance + ' km away</strong></div>' +
                        '<div class="match-stat"><span>Est. Charge:</span> <strong>৳' + pendingBooking.estimated_price + '</strong></div>';
                }

                if (matchContainer) matchContainer.style.display = "block";
                if (bookingForm) bookingForm.style.display = "none";

            } catch (err) {
                alert(err.message || "Could not find a matching provider. Please try again.");
            } finally {
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // Confirm Booking
    var confirmBtn = document.getElementById("confirm-booking-btn");
    if (confirmBtn) {
        confirmBtn.addEventListener("click", async function() {
            if (!pendingBooking) return;
            var originalText = confirmBtn.innerHTML;
            confirmBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Confirming...';
            confirmBtn.disabled = true;

            try {
                var formData = new FormData();
                formData.append("category_slug", pendingBooking.category_slug);
                formData.append("provider_id", pendingBooking.provider_id);
                formData.append("preferred_date", pendingBooking.preferred_date);
                formData.append("preferred_start_minute", String(pendingBooking.preferred_start_minute));
                formData.append("preferred_end_minute", String(pendingBooking.preferred_end_minute));
                formData.append("urgency", pendingBooking.urgency);
                formData.append("address", pendingBooking.address);
                formData.append("description", pendingBooking.description);
                formData.append("contact_phone", currentUser.phone || "01700000000");
                formData.append("latitude", "23.7465");
                formData.append("longitude", "90.3760");

                var res = await window.API.post('/api/requests', formData);
                if (res && res.ok) {
                    alert("Booking Confirmed! You can track it in My Bookings.");
                    if (bookingForm) {
                        bookingForm.reset();
                        bookingForm.style.display = "block";
                    }
                    if (matchContainer) matchContainer.style.display = "none";
                    pendingBooking = null;

                    var historyTab = document.querySelector('[data-target="section-history"]');
                    if (historyTab) historyTab.click();
                } else {
                    alert((res && res.error) || "Could not confirm booking.");
                }
            } catch (err) {
                alert(err.message || "Error confirming booking.");
            } finally {
                confirmBtn.innerHTML = originalText;
                confirmBtn.disabled = false;
            }
        });
    }

    // Cancel Booking Selection
    var cancelBtn = document.getElementById("cancel-booking-btn");
    if (cancelBtn) {
        cancelBtn.addEventListener("click", function() {
            if (bookingForm) bookingForm.style.display = "block";
            if (matchContainer) matchContainer.style.display = "none";
            pendingBooking = null;
        });
    }

    // --- 5. Render Bookings (History Tab) ---
    async function renderBookings() {
        var bookingsList = document.getElementById("bookings-list");
        if (!bookingsList) return;

        bookingsList.innerHTML = '<p class="text-muted"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading bookings...</p>';

        try {
            var res = await window.API.get('/api/requests/mine');
            var bookings = (res && res.requests) || [];

            if (bookings.length === 0) {
                bookingsList.innerHTML = 
                    '<p class="text-muted">You have no booking history yet.</p>' +
                    '<div style="margin-top: 15px;">' +
                        '<a href="index.html#marketplace-section" class="btn-primary" style="text-decoration:none;">Browse Services</a>' +
                    '</div>';
                return;
            }

            var stages = ["requested", "accepted", "on_the_way", "in_progress", "completed"];
            var stageLabels = ["Requested", "Accepted", "On the Way", "In Progress", "Completed"];
            var stageIcons = ["fa-file-signature", "fa-thumbs-up", "fa-truck-fast", "fa-tools", "fa-check"];

            bookingsList.innerHTML = bookings.map(function(b) {
                var currentIndex = stages.indexOf(b.status);
                var isCancelled = b.status === "cancelled";

                var badgeClass = "status-Active";
                var statusLabel = b.status.replace(/_/g, " ").replace(/\b\w/g, function(l){ return l.toUpperCase(); });
                if (b.status === "requested") badgeClass = "status-Requested";
                if (b.status === "completed") badgeClass = "status-Completed";
                if (isCancelled) badgeClass = "status-Requested";

                var timelineHTML = '<div class="timeline">';
                stages.forEach(function(stage, idx) {
                    var statusClass = "";
                    if (!isCancelled) {
                        if (idx < currentIndex) statusClass = "completed";
                        if (idx === currentIndex) statusClass = "active";
                    }

                    timelineHTML += 
                        '<div class="timeline-step ' + statusClass + '">' +
                            '<div class="timeline-icon"><i class="fa-solid ' + stageIcons[idx] + '"></i></div>' +
                            '<span>' + stageLabels[idx] + '</span>' +
                        '</div>';
                });
                timelineHTML += '</div>';

                var actionsHTML = '<div style="margin-top: 14px; display:flex; flex-wrap:wrap; gap:10px; align-items:center;">';

                if (b.status === "completed") {
                    actionsHTML += 
                        '<a href="/invoice.html?id=' + b.id + '" target="_blank" class="btn-outline" style="text-decoration:none; padding:8px 14px; font-size:0.85rem;">' +
                            '<i class="fa-solid fa-receipt"></i> View Invoice' +
                        '</a>';

                    if (!b.rating_stars) {
                        actionsHTML += 
                            '<button class="btn-outline" onclick="window.openReviewModal(' + b.assigned_provider_id + ', ' + b.id + ')" style="border-color:#f59e0b; color:#f59e0b; padding:8px 14px; font-size:0.85rem; cursor:pointer;">' +
                                '<i class="fa-solid fa-star"></i> Leave a Review' +
                            '</button>';
                    } else {
                        actionsHTML += 
                            '<span style="color:#10b981; font-weight:600; font-size:0.9rem;">' +
                                '<i class="fa-solid fa-check"></i> Rated: ' + '★'.repeat(b.rating_stars) +
                            '</span>';
                    }
                }

                if (b.status === "requested" || b.status === "accepted") {
                    actionsHTML += 
                        '<button class="btn-outline" onclick="window.cancelCustomerRequest(' + b.id + ')" style="border-color:#ef4444; color:#ef4444; padding:6px 12px; font-size:0.85rem; cursor:pointer;">' +
                            '<i class="fa-solid fa-xmark"></i> Cancel Booking' +
                        '</button>';
                }

                actionsHTML += '</div>';

                var dateStr = b.preferred_date ? String(b.preferred_date).split("T")[0] : "";
                var timeH = Math.floor((b.preferred_start_minute || 0) / 60);
                var timeM = (b.preferred_start_minute || 0) % 60;
                var timeStr = String(timeH).padStart(2, "0") + ":" + String(timeM).padStart(2, "0");

                return (
                    '<div class="booking-card">' +
                        '<div class="booking-header">' +
                            '<div>' +
                                '<h3 style="margin-bottom:5px;">' + (b.category_name || "Home Service") + '</h3>' +
                                '<span class="text-muted">Order #' + b.id + ' | ' + dateStr + ' at ' + timeStr + '</span>' +
                            '</div>' +
                            '<span class="badge-status ' + badgeClass + '">' + statusLabel + '</span>' +
                        '</div>' +
                        '<p style="margin-bottom: 8px;"><strong>Provider:</strong> ' + (b.provider_name || "Assigned Provider") + '</p>' +
                        '<p style="margin-bottom: 8px;"><strong>Location:</strong> ' + (b.address || "Dhanmondi, Dhaka") + '</p>' +
                        '<p><strong>Est. Charge:</strong> ৳' + (b.estimated_price || 0) + '</p>' +
                        timelineHTML +
                        actionsHTML +
                    '</div>'
                );
            }).join("");

            bookingsList.innerHTML += 
                '<div style="margin-top: 25px; text-align: center;">' +
                    '<a href="index.html#marketplace-section" class="btn-primary" style="text-decoration:none;"><i class="fa-solid fa-search"></i> Browse More Services</a>' +
                '</div>';

        } catch (err) {
            console.error("Failed to render bookings:", err);
            bookingsList.innerHTML = '<p class="text-muted">Could not load bookings. Please refresh.</p>';
        }
    }

    // Expose cancel request globally
    window.cancelCustomerRequest = async function(id) {
        if (!confirm("Are you sure you want to cancel this booking?")) return;
        try {
            var res = await window.API.post('/api/requests/' + id + '/cancel', {});
            if (res && res.ok) {
                alert("Booking cancelled.");
                renderBookings();
            } else {
                alert((res && res.error) || "Could not cancel booking.");
            }
        } catch (e) {
            alert(e.message || "Failed to cancel booking.");
        }
    };

    // --- 6. Notifications System ---
    var notifBtn = document.getElementById("notif-btn");
    var notifDropdown = document.getElementById("notif-dropdown");
    var notifBadge = document.getElementById("notif-badge");
    var notifList = document.getElementById("notif-list");
    var notifMarkAll = document.getElementById("notif-mark-all");

    async function loadNotifications() {
        try {
            var res = await window.API.get('/api/notifications');
            var notifs = (res && res.notifications) || [];
            var unread = notifs.filter(function(n) { return !n.is_read; });

            if (notifBadge) {
                if (unread.length > 0) {
                    notifBadge.textContent = unread.length;
                    notifBadge.style.display = "inline-block";
                } else {
                    notifBadge.style.display = "none";
                }
            }

            if (notifList) {
                if (notifs.length === 0) {
                    notifList.innerHTML = '<p class="text-muted" style="font-size:0.85rem; padding:8px 0;">No notifications yet.</p>';
                } else {
                    notifList.innerHTML = notifs.slice(0, 10).map(function(n) {
                        return (
                            '<div style="padding:8px 0; border-bottom:1px solid var(--border-color); font-size:0.85rem; ' + (!n.is_read ? 'font-weight:600;' : 'opacity:0.8;') + '">' +
                                '<div>' + n.title + '</div>' +
                                '<div style="color:var(--text-secondary); font-size:0.75rem; margin-top:2px;">' + n.message + '</div>' +
                            '</div>'
                        );
                    }).join("");
                }
            }
        } catch (e) {
            console.error("Failed to load notifications:", e);
        }
    }

    if (notifBtn && notifDropdown) {
        notifBtn.addEventListener("click", function(e) {
            e.stopPropagation();
            var isShown = notifDropdown.style.display === "block";
            notifDropdown.style.display = isShown ? "none" : "block";
            if (!isShown) loadNotifications();
        });

        document.addEventListener("click", function(e) {
            if (!notifDropdown.contains(e.target) && e.target !== notifBtn) {
                notifDropdown.style.display = "none";
            }
        });
    }

    if (notifMarkAll) {
        notifMarkAll.addEventListener("click", async function() {
            try {
                await window.API.post('/api/notifications/read-all', {});
                if (notifBadge) notifBadge.style.display = "none";
                loadNotifications();
            } catch (e) {}
        });
    }

    loadNotifications();

    // --- 7. Review System ---
    var reviewModal = document.getElementById("review-modal");
    var stars = document.querySelectorAll("#star-rating i");
    var selectedRating = 0;

    window.openReviewModal = function(providerId, bookingId) {
        var providerIdInput = document.getElementById("review-provider-id");
        var bookingIdInput = document.getElementById("review-booking-id");
        if (providerIdInput) providerIdInput.value = providerId;
        if (bookingIdInput) bookingIdInput.value = bookingId;

        selectedRating = 5;
        var reviewScore = document.getElementById("review-score");
        if (reviewScore) reviewScore.value = 5;

        // Default to 5 stars highlighted
        stars.forEach(function(s, idx) {
            s.style.color = "#f59e0b";
        });

        var reviewComment = document.getElementById("review-comment");
        if (reviewComment) reviewComment.value = "";

        if (reviewModal) {
            reviewModal.classList.add("active");
            document.body.style.overflow = "hidden";
        }
    };

    stars.forEach(function(star, index) {
        star.addEventListener("click", function() {
            selectedRating = index + 1;
            var reviewScore = document.getElementById("review-score");
            if (reviewScore) reviewScore.value = selectedRating;

            stars.forEach(function(s, idx) {
                s.style.color = idx < selectedRating ? "#f59e0b" : "#e2e8f0";
            });
        });
    });

    var closeReview = document.getElementById("close-review");
    if (closeReview) {
        closeReview.addEventListener("click", function() {
            if (reviewModal) {
                reviewModal.classList.remove("active");
                document.body.style.overflow = "auto";
            }
        });
    }

    var reviewForm = document.getElementById("review-form");
    if (reviewForm) {
        reviewForm.addEventListener("submit", async function(e) {
            e.preventDefault();
            var bookingId = document.getElementById("review-booking-id").value;
            var score = parseInt(document.getElementById("review-score").value, 10) || selectedRating || 5;
            var comment = document.getElementById("review-comment").value.trim();

            var submitBtn = reviewForm.querySelector('button[type="submit"]');
            var originalText = submitBtn ? submitBtn.innerHTML : "Submit Review";
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Submitting...';
                submitBtn.disabled = true;
            }

            try {
                var res = await window.API.post('/api/ratings/by-request/' + bookingId, {
                    stars: score,
                    comment: comment
                });

                if (res && res.ok) {
                    alert("Thank you for your rating!");
                    if (reviewModal) {
                        reviewModal.classList.remove("active");
                        document.body.style.overflow = "auto";
                    }
                    renderBookings();
                } else {
                    alert((res && res.error) || "Could not submit rating.");
                }
            } catch (err) {
                alert(err.message || "Could not submit rating.");
            } finally {
                if (submitBtn) {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            }
        });
    }
});
