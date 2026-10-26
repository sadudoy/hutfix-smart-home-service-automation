const MockDB = {
    init() {
        if (!localStorage.getItem("hf_providers")) {
            localStorage.setItem("hf_providers", JSON.stringify(this.seedProviders()));
        }
        if (!localStorage.getItem("hf_bookings")) {
            localStorage.setItem("hf_bookings", JSON.stringify([]));
        }
        if (!localStorage.getItem("hf_users")) {
            localStorage.setItem("hf_users", JSON.stringify([]));
        }
        if (!localStorage.getItem("hf_reviews")) {
            localStorage.setItem("hf_reviews", JSON.stringify([]));
        }
    },

    seedProviders() {
        return [
            {
                id: "p1",
                name: "Rahim Electronics",
                category: "AC & Appliance",
                rating: 4.8,
                pricePerHour: 1000,
                serviceCharge: 1000,
                jobsCompleted: 142,
                serviceArea: "Dhaka",
                serviceTypes: ["AC Repair", "Appliance Repair", "Refrigerator"],
                available: true,
                totalReviews: 142,
                totalRatingScore: 681.6
            },
            {
                id: "p2",
                name: "CoolFix Techs",
                category: "AC & Appliance",
                rating: 4.2,
                pricePerHour: 800,
                serviceCharge: 800,
                jobsCompleted: 56,
                serviceArea: "Gazipur",
                serviceTypes: ["AC Installation", "AC Repair"],
                available: true,
                totalReviews: 56,
                totalRatingScore: 235.2
            },
            {
                id: "p3",
                name: "Karim Plumbing Bros",
                category: "Plumbing",
                rating: 4.9,
                pricePerHour: 500,
                serviceCharge: 500,
                jobsCompleted: 310,
                serviceArea: "Dhaka",
                serviceTypes: ["Pipe Repair", "Bathroom Installation", "Water Heater"],
                available: true,
                totalReviews: 310,
                totalRatingScore: 1519
            },
            {
                id: "p4",
                name: "Dhaka Pipe Masters",
                category: "Plumbing",
                rating: 4.5,
                pricePerHour: 600,
                serviceCharge: 600,
                jobsCompleted: 89,
                serviceArea: "Narayanganj",
                serviceTypes: ["Drain Cleaning", "Pipe Installation"],
                available: true,
                totalReviews: 89,
                totalRatingScore: 400.5
            },
            {
                id: "p5",
                name: "Spark Electricals",
                category: "Electrical",
                rating: 4.7,
                pricePerHour: 700,
                serviceCharge: 700,
                jobsCompleted: 205,
                serviceArea: "Dhaka",
                serviceTypes: ["Wiring", "Lighting", "Panel Installation"],
                available: true,
                totalReviews: 205,
                totalRatingScore: 963.5
            },
            {
                id: "p6",
                name: "Spotless Home Care",
                category: "Cleaning",
                rating: 4.6,
                pricePerHour: 1200,
                serviceCharge: 1200,
                jobsCompleted: 178,
                serviceArea: "Dhaka",
                serviceTypes: ["Deep Cleaning", "Carpet Cleaning", "Pest Control"],
                available: true,
                totalReviews: 178,
                totalRatingScore: 818.8
            }
        ];
    },

    getProviders() {
        try {
            return JSON.parse(localStorage.getItem("hf_providers")) || [];
        } catch (e) {
            return [];
        }
    },

    getBookings() {
        try {
            return JSON.parse(localStorage.getItem("hf_bookings")) || [];
        } catch (e) {
            return [];
        }
    },

    getUsers() {
        try {
            return JSON.parse(localStorage.getItem("hf_users")) || [];
        } catch (e) {
            return [];
        }
    },

    getReviews() {
        try {
            return JSON.parse(localStorage.getItem("hf_reviews")) || [];
        } catch (e) {
            return [];
        }
    },

    getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem("currentUser")) || null;
        } catch (e) {
            return null;
        }
    },

    getProviderById: function(providerId) {
        var providers = this.getProviders();
        return providers.find(function(p) { return p.id === providerId; }) || null;
    },

    // ============================================================
    // FIXED: REGISTER USER - Properly saves selected category
    // ============================================================
    registerUser: function(userData, providerCategory) {
        this.init();
        var users = this.getUsers();
        userData.email = userData.email.trim().toLowerCase();

        var existingUser = users.find(function(user) {
            return user.email.toLowerCase() === userData.email;
        });

        if (existingUser) {
            return { success: false, message: "Email is already registered. Please log in." };
        }

        // Save the provider category in user data
        if (userData.role === "provider" && providerCategory) {
            userData.providerCategory = providerCategory;
        }

        users.push(userData);
        localStorage.setItem("hf_users", JSON.stringify(users));

        // =========================================================
        // CREATE PROVIDER WITH SELECTED CATEGORY
        // =========================================================
        if (userData.role === "provider") {
            var providers = this.getProviders();
            var existingProvider = providers.find(function(p) { return p.id === userData.id; });

            if (!existingProvider) {
                // USE THE SELECTED CATEGORY, NOT DEFAULT "AC & Appliance"
                var category = providerCategory || "Other";
                
                var newProvider = {
                    id: userData.id,
                    name: userData.name,
                    category: category,
                    rating: 0,
                    pricePerHour: 500,
                    serviceCharge: 500,
                    jobsCompleted: 0,
                    serviceArea: "Dhaka",
                    serviceTypes: [category],
                    available: true,
                    totalReviews: 0,
                    totalRatingScore: 0
                };
                providers.push(newProvider);
                localStorage.setItem("hf_providers", JSON.stringify(providers));
                
                // Also update the current user's category
                var currentUser = this.getCurrentUser();
                if (currentUser && currentUser.id === userData.id) {
                    currentUser.providerCategory = category;
                    currentUser.category = category;
                    localStorage.setItem("currentUser", JSON.stringify(currentUser));
                }
            }
        }

        return { success: true, user: userData };
    },

    verifyUser: function(email, password) {
        var users = this.getUsers();
        email = email.trim().toLowerCase();

        var user = users.find(function(u) { return u.email.toLowerCase() === email; });

        if (!user) {
            return { success: false, message: "Account not found. Please sign up first." };
        }

        if (user.password !== password) {
            return { success: false, message: "Incorrect password. Please try again." };
        }

        return { success: true, user: user };
    },

    updateProviderProfile: function(providerId, profileData) {
        var providers = this.getProviders();
        var index = providers.findIndex(function(p) { return p.id === providerId; });

        if (index === -1) {
            return { success: false, message: "Provider not found." };
        }

        providers[index] = {
            ...providers[index],
            name: profileData.name || providers[index].name,
            category: profileData.category || providers[index].category,
            serviceCharge: profileData.serviceCharge || providers[index].serviceCharge,
            serviceArea: profileData.serviceArea || providers[index].serviceArea,
            serviceTypes: profileData.serviceTypes || providers[index].serviceTypes,
            available: profileData.available !== undefined ? profileData.available : providers[index].available,
            pricePerHour: profileData.serviceCharge || providers[index].pricePerHour
        };

        localStorage.setItem("hf_providers", JSON.stringify(providers));

        var users = this.getUsers();
        var userIndex = users.findIndex(function(u) { return u.id === providerId; });
        if (userIndex !== -1) {
            users[userIndex].name = profileData.name || users[userIndex].name;
            if (profileData.category) {
                users[userIndex].providerCategory = profileData.category;
                users[userIndex].category = profileData.category;
            }
            localStorage.setItem("hf_users", JSON.stringify(users));
        }

        var currentUser = this.getCurrentUser();
        if (currentUser && currentUser.id === providerId) {
            currentUser.name = profileData.name || currentUser.name;
            if (profileData.category) {
                currentUser.providerCategory = profileData.category;
                currentUser.category = profileData.category;
            }
            localStorage.setItem("currentUser", JSON.stringify(currentUser));
        }

        return { success: true, provider: providers[index] };
    },

    updateProviderAvatar: function(providerId, avatarUrl) {
        var users = this.getUsers();
        var userIndex = users.findIndex(function(u) { return u.id === providerId; });

        if (userIndex !== -1) {
            users[userIndex].avatar = avatarUrl;
            localStorage.setItem("hf_users", JSON.stringify(users));
        }

        var currentUser = this.getCurrentUser();
        if (currentUser && currentUser.id === providerId) {
            currentUser.avatar = avatarUrl;
            localStorage.setItem("currentUser", JSON.stringify(currentUser));
        }

        return { success: true };
    },

    updateProvider: function(providerId, providerData) {
        return this.updateProviderProfile(providerId, providerData);
    },

    updateProviderDetails: function(providerId, newName, newCategory) {
        return this.updateProviderProfile(providerId, {
            name: newName,
            category: newCategory
        });
    },

    searchProviders: function(keyword) {
        var providers = this.getProviders();
        if (!keyword || !keyword.trim()) { return providers; }
        var searchText = keyword.toLowerCase().trim();
        return providers.filter(function(provider) {
            return provider.name.toLowerCase().includes(searchText) ||
                provider.category.toLowerCase().includes(searchText) ||
                (provider.serviceTypes && provider.serviceTypes.some(function(type) {
                    return type.toLowerCase().includes(searchText);
                })) ||
                (provider.serviceArea && provider.serviceArea.toLowerCase().includes(searchText));
        });
    },

    findMatch: function(category, date, time, location) {
        var providers = this.getProviders();
        var matchingProviders = providers.filter(function(provider) {
            return provider.category === category && provider.available !== false;
        });

        if (matchingProviders.length === 0) { return null; }

        matchingProviders.sort(function(a, b) {
            var ratingDiff = (b.rating || 0) - (a.rating || 0);
            if (ratingDiff !== 0) return ratingDiff;
            return (b.jobsCompleted || 0) - (a.jobsCompleted || 0);
        });

        var provider = matchingProviders[0];
        return {
            ...provider,
            distance: (Math.random() * 8 + 1).toFixed(1),
            estimatedPrice: provider.serviceCharge || provider.pricePerHour || 500,
            areaMatch: provider.serviceArea && location.toLowerCase().includes(provider.serviceArea.toLowerCase())
        };
    },

    createBooking: function(bookingData) {
        var bookings = this.getBookings();
        var price = bookingData.price || 500;
        if (bookingData.providerId) {
            var provider = this.getProviderById(bookingData.providerId);
            if (provider) {
                price = provider.serviceCharge || provider.pricePerHour || 500;
            }
        }

        var newBooking = {
            id: "ORD-" + Math.floor(100000 + Math.random() * 900000),
            ...bookingData,
            price: price,
            status: "Requested",
            isReviewed: false,
            createdAt: new Date().toISOString()
        };

        bookings.push(newBooking);
        localStorage.setItem("hf_bookings", JSON.stringify(bookings));
        return newBooking;
    },

    getCustomerBookings: function(customerId) {
        return this.getBookings().filter(function(b) { return b.customerId === customerId; });
    },

    getProviderBookings: function(providerId) {
        return this.getBookings().filter(function(b) { return b.providerId === providerId; });
    },

    updateBookingStatus: function(bookingId, newStatus) {
        var bookings = this.getBookings();
        var index = bookings.findIndex(function(b) { return b.id === bookingId; });
        if (index === -1) return false;
        bookings[index].status = newStatus;
        localStorage.setItem("hf_bookings", JSON.stringify(bookings));
        return true;
    },

    addReview: function(providerId, bookingId, rating, comment) {
        var currentUser = this.getCurrentUser();
        if (!currentUser) {
            return { success: false, message: "You must be logged in to review." };
        }

        var bookings = this.getBookings();
        var bookingIndex = bookings.findIndex(function(b) { return b.id === bookingId; });
        if (bookingIndex === -1) {
            return { success: false, message: "Booking not found." };
        }

        var booking = bookings[bookingIndex];
        if (booking.customerId !== currentUser.id) {
            return { success: false, message: "You can only review your own bookings." };
        }
        if (booking.status !== "Completed") {
            return { success: false, message: "You can only review completed jobs." };
        }
        if (booking.isReviewed) {
            return { success: false, message: "You have already reviewed this booking." };
        }
        if (rating < 1 || rating > 5) {
            return { success: false, message: "Rating must be between 1 and 5." };
        }

        var reviews = this.getReviews();
        var newReview = {
            id: "rev_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
            providerId: providerId,
            customerId: currentUser.id,
            customerName: currentUser.name,
            bookingId: bookingId,
            rating: rating,
            comment: comment || "",
            createdAt: new Date().toISOString()
        };

        reviews.push(newReview);
        localStorage.setItem("hf_reviews", JSON.stringify(reviews));

        bookings[bookingIndex].isReviewed = true;
        localStorage.setItem("hf_bookings", JSON.stringify(bookings));

        this.updateProviderRating(providerId);

        return { success: true, message: "Thank you for your review!", review: newReview };
    },

    updateProviderRating: function(providerId) {
        var reviews = this.getReviews();
        var providerReviews = reviews.filter(function(r) { return r.providerId === providerId; });
        var providers = this.getProviders();
        var providerIndex = providers.findIndex(function(p) { return p.id === providerId; });
        if (providerIndex === -1) return;

        if (providerReviews.length === 0) {
            providers[providerIndex].rating = 0;
            providers[providerIndex].totalReviews = 0;
            providers[providerIndex].totalRatingScore = 0;
        } else {
            var totalRating = providerReviews.reduce(function(sum, r) { return sum + r.rating; }, 0);
            var averageRating = totalRating / providerReviews.length;
            providers[providerIndex].rating = Math.round(averageRating * 10) / 10;
            providers[providerIndex].totalReviews = providerReviews.length;
            providers[providerIndex].totalRatingScore = totalRating;
            providers[providerIndex].jobsCompleted = providerReviews.length;
        }

        localStorage.setItem("hf_providers", JSON.stringify(providers));
    }
};

document.addEventListener("DOMContentLoaded", function() {
    MockDB.init();
});