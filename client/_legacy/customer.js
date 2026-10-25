document.addEventListener("DOMContentLoaded", function() {
    // --- 1. Authentication Check ---
    var currentUser = MockDB.getCurrentUser();

    // If not logged in or not a customer, redirect to homepage
    if (!currentUser || currentUser.role !== "customer") {
        window.location.href = "index.html";
        return;
    }

    // Populate Nav Profile
    var navAvatar = document.getElementById("nav-avatar");
    var navUsername = document.getElementById("nav-username");
    if (navAvatar) navAvatar.src = currentUser.avatar;
    if (navUsername) navUsername.textContent = currentUser.name.split(" ")[0];

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
        // Insert before logout
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
        logoutBtn.addEventListener("click", function() {
            localStorage.removeItem("currentUser");
            window.location.href = "index.html";
        });
    }

    // --- 3. Smart Booking Engine ---
    var bookingForm = document.getElementById("booking-form");
    var matchContainer = document.getElementById("match-result-container");
    var matchDetails = document.getElementById("match-details");
    var currentMatchedProvider = null;
    var pendingBookingData = null;

    var dateInput = document.getElementById("book-date");
    if (dateInput) {
        dateInput.min = new Date().toISOString().split("T")[0];
    }

    if (bookingForm) {
        bookingForm.addEventListener("submit", function(e) {
            e.preventDefault();
            var submitBtn = bookingForm.querySelector('button[type="submit"]');
            var originalText = submitBtn.innerHTML;

            submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Finding Best Match...';
            submitBtn.disabled = true;

            setTimeout(function() {
                var category = document.getElementById("book-category").value;
                var date = document.getElementById("book-date").value;
                var time = document.getElementById("book-time").value;
                var location = document.getElementById("book-location").value;

                var match = MockDB.findMatch(category, date, time, location);

                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;

                if (match === "NO_AVAILABLE_PROVIDERS") {
                    alert("Sorry, all providers in this category are fully booked at that time. Please try another time slot.");
                    return;
                } else if (!match) {
                    alert("No providers found for this service category.");
                    return;
                }

                currentMatchedProvider = match;
                pendingBookingData = {
                    customerId: currentUser.id,
                    customerName: currentUser.name,
                    customerLocation: location,
                    providerId: match.id,
                    providerName: match.name,
                    serviceCategory: category,
                    date: date,
                    time: time,
                    urgency: document.getElementById("book-urgency").value,
                    details: document.getElementById("book-details").value,
                    price: match.estimatedPrice
                };

                if (matchDetails) {
                    matchDetails.innerHTML = 
                        '<div class="match-stat"><span>Provider:</span> <strong>' + match.name + '</strong></div>' +
                        '<div class="match-stat"><span>Rating:</span> <strong>⭐ ' + match.rating + ' (' + match.jobsCompleted + ' jobs)</strong></div>' +
                        '<div class="match-stat"><span>Distance:</span> <strong>📍 ' + match.distance + ' km away</strong></div>' +
                        '<div class="match-stat"><span>Est. Charge:</span> <strong>৳' + match.estimatedPrice + '</strong></div>';
                }

                if (matchContainer) matchContainer.style.display = "block";
                if (bookingForm) bookingForm.style.display = "none";
            }, 1500);
        });
    }

    // Confirm Booking
    var confirmBtn = document.getElementById("confirm-booking-btn");
    if (confirmBtn) {
        confirmBtn.addEventListener("click", function() {
            MockDB.createBooking(pendingBookingData);
            alert("Booking Confirmed! Track it in 'My Bookings'.");

            if (bookingForm) {
                bookingForm.reset();
                bookingForm.style.display = "block";
            }
            if (matchContainer) matchContainer.style.display = "none";

            var historyTab = document.querySelector('[data-target="section-history"]');
            if (historyTab) historyTab.click();
        });
    }

    // Cancel Booking
    var cancelBtn = document.getElementById("cancel-booking-btn");
    if (cancelBtn) {
        cancelBtn.addEventListener("click", function() {
            if (bookingForm) bookingForm.style.display = "block";
            if (matchContainer) matchContainer.style.display = "none";
            currentMatchedProvider = null;
        });
    }

    // --- 4. Render Bookings ---
    function renderBookings() {
        var bookingsList = document.getElementById("bookings-list");
        var myBookings = MockDB.getCustomerBookings(currentUser.id);

        if (!bookingsList) return;

        if (myBookings.length === 0) {
            bookingsList.innerHTML = 
                '<p class="text-muted">You have no booking history yet.</p>' +
                '<div style="margin-top: 15px;">' +
                    '<a href="index.html#marketplace-section" class="btn-primary">Browse Services</a>' +
                '</div>';
            return;
        }

        bookingsList.innerHTML = myBookings.map(function(b) {
            var stages = ["Requested", "Accepted", "On the Way", "In Progress", "Completed"];
            var currentIndex = stages.indexOf(b.status);

            var badgeClass = "status-Active";
            if (b.status === "Requested") badgeClass = "status-Requested";
            if (b.status === "Completed") badgeClass = "status-Completed";

            var timelineHTML = '<div class="timeline">';
            stages.forEach(function(stage, idx) {
                var statusClass = "";
                if (idx < currentIndex) statusClass = "completed";
                if (idx === currentIndex) statusClass = "active";

                var icon = "fa-check";
                if (idx === 0) icon = "fa-file-signature";
                if (idx === 1) icon = "fa-thumbs-up";
                if (idx === 2) icon = "fa-truck-fast";
                if (idx === 3) icon = "fa-tools";

                timelineHTML += 
                    '<div class="timeline-step ' + statusClass + '">' +
                        '<div class="timeline-icon"><i class="fa-solid ' + icon + '"></i></div>' +
                        '<span>' + stage + '</span>' +
                    '</div>';
            });
            timelineHTML += '</div>';

            var priceDisplay = b.price || "0";

            var reviewButton = '';
            if (b.status === "Completed" && !b.isReviewed) {
                reviewButton = '<button class="btn-outline mt-2" onclick="window.openReviewModal(\'' + b.providerId + '\', \'' + b.id + '\')" style="width:100%; border-color:#f59e0b; color:#f59e0b;">' +
                    '<i class="fa-solid fa-star"></i> Leave a Review</button>';
            }

            var reviewedText = '';
            if (b.isReviewed) {
                reviewedText = '<p style="color:#10b981; font-weight:600; margin-top:10px;"><i class="fa-solid fa-check"></i> Reviewed</p>';
            }

            return (
                '<div class="booking-card">' +
                    '<div class="booking-header">' +
                        '<div>' +
                            '<h3 style="margin-bottom:5px;">' + b.serviceCategory + '</h3>' +
                            '<span class="text-muted">Order ID: ' + b.id + ' | ' + b.date + ' at ' + b.time + '</span>' +
                        '</div>' +
                        '<span class="badge-status ' + badgeClass + '">' + b.status + '</span>' +
                    '</div>' +
                    '<p style="margin-bottom: 10px;"><strong>Provider:</strong> ' + b.providerName + '</p>' +
                    '<p><strong>Est. Charge:</strong> ৳' + priceDisplay + '</p>' +
                    reviewButton +
                    reviewedText +
                    timelineHTML +
                '</div>'
            );
        }).join("");

        // Add "Browse More Services" button at the bottom
        bookingsList.innerHTML += 
            '<div style="margin-top: 20px; text-align: center;">' +
                '<a href="index.html#marketplace-section" class="btn-primary"><i class="fa-solid fa-search"></i> Browse More Services</a>' +
            '</div>';
    }

    // --- 5. Profile Management ---
    var profName = document.getElementById("prof-name");
    var profEmail = document.getElementById("prof-email");
    if (profName) profName.value = currentUser.name;
    if (profEmail) profEmail.value = currentUser.email;

    var profileForm = document.getElementById("profile-form");
    if (profileForm) {
        profileForm.addEventListener("submit", function(e) {
            e.preventDefault();
            var newName = document.getElementById("prof-name").value;
            var newPass = document.getElementById("prof-password").value;

            currentUser.name = newName;
            if (newPass) currentUser.password = newPass;

            localStorage.setItem("currentUser", JSON.stringify(currentUser));
            var navUsername2 = document.getElementById("nav-username");
            if (navUsername2) navUsername2.textContent = newName.split(" ")[0];

            alert("Profile updated successfully!");
            var profPass = document.getElementById("prof-password");
            if (profPass) profPass.value = "";
        });
    }

    // --- 6. Review System ---
    var reviewModal = document.getElementById("review-modal");
    var stars = document.querySelectorAll(".star-btn");
    var selectedRating = 0;

    window.openReviewModal = function(providerId, bookingId) {
        var providerIdInput = document.getElementById("review-provider-id");
        var bookingIdInput = document.getElementById("review-booking-id");
        if (providerIdInput) providerIdInput.value = providerId;
        if (bookingIdInput) bookingIdInput.value = bookingId;

        selectedRating = 0;
        var reviewScore = document.getElementById("review-score");
        if (reviewScore) reviewScore.value = 0;
        stars.forEach(function(s) { s.style.color = "#e2e8f0"; });
        var reviewComment = document.getElementById("review-comment");
        if (reviewComment) reviewComment.value = "";

        if (reviewModal) {
            reviewModal.classList.add("active");
            document.body.style.overflow = "hidden";
        }
    };

    // Close Review Modal
    var closeReview = document.getElementById("close-review");
    if (closeReview) {
        closeReview.addEventListener("click", function() {
            if (reviewModal) {
                reviewModal.classList.remove("active");
                document.body.style.overflow = "auto";
            }
        });
    }

    if (reviewModal) {
        reviewModal.addEventListener("click", function(e) {
            if (e.target === reviewModal) {
                reviewModal.classList.remove("active");
                document.body.style.overflow = "auto";
            }
        });
    }

    // Star Rating
    stars.forEach(function(star) {
        star.addEventListener("mouseover", function() {
            var val = this.getAttribute("data-val");
            stars.forEach(function(s) {
                if (s.getAttribute("data-val") <= val) {
                    s.style.color = "#fcd34d";
                } else if (s.getAttribute("data-val") > selectedRating) {
                    s.style.color = "#e2e8f0";
                }
            });
        });

        star.addEventListener("mouseleave", function() {
            stars.forEach(function(s) {
                if (s.getAttribute("data-val") <= selectedRating) {
                    s.style.color = "#f59e0b";
                } else {
                    s.style.color = "#e2e8f0";
                }
            });
        });

        star.addEventListener("click", function() {
            selectedRating = parseInt(this.getAttribute("data-val"));
            var reviewScore = document.getElementById("review-score");
            if (reviewScore) reviewScore.value = selectedRating;
            stars.forEach(function(s) {
                if (s.getAttribute("data-val") <= selectedRating) {
                    s.style.color = "#f59e0b";
                } else {
                    s.style.color = "#e2e8f0";
                }
            });
        });
    });

    // Submit Review
    var reviewForm = document.getElementById("review-form");
    if (reviewForm) {
        reviewForm.addEventListener("submit", function(e) {
            e.preventDefault();

            var score = Number(document.getElementById("review-score").value);
            if (score === 0) {
                alert("Please select a star rating!");
                return;
            }

            var providerId = document.getElementById("review-provider-id").value;
            var bookingId = document.getElementById("review-booking-id").value;

            MockDB.addReview(providerId, bookingId, score);

            alert("Thank you for your feedback! The provider's rating has been updated.");
            if (reviewModal) {
                reviewModal.classList.remove("active");
                document.body.style.overflow = "auto";
            }

            renderBookings();
        });
    }

    // Initial render
    renderBookings();
});