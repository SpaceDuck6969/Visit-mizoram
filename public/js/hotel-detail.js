document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const hotelId = urlParams.get('id');

    if (!hotelId) {
        document.getElementById('detail-name').innerText = "Hotel not found.";
        document.getElementById('detail-contact').innerText = "N/A";
        return;
    }

    const origin = window.location.protocol === 'file:' ? 'http://localhost:3000' : window.location.origin;

    // --- Carousel Variables ---
    let carouselImages = [];
    let currentImageIndex = 0;
    const imageEl = document.getElementById('detail-image');
    const prevBtn = document.getElementById('prev-img');
    const nextBtn = document.getElementById('next-img');
    const dotsContainer = document.getElementById('carousel-dots');

    // --- BULLETPROOF USER ID EXTRACTOR ---
    function getValidUserId() {
        const userStr = localStorage.getItem("visit_mizoram_user");
        if (userStr) {
            try {
                const userObj = JSON.parse(userStr);
                const uid = userObj.user_id || userObj.id; 
                if (uid) return uid;
            } catch (e) { }
        }
        
        const token = localStorage.getItem("visit_mizoram_token"); 
        if (!token) return null;
        
        try {
            let base64Url = token.split('.')[1];
            let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            let jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const payload = JSON.parse(jsonPayload);
            if (payload && payload.id) return payload.id;
        } catch(e) { }
        
        return null;
    }

    try {
        // Fetch Hotel Data
        const hotelRes = await fetch(`${origin}/api/hotels/${hotelId}`);
        if (!hotelRes.ok) throw new Error("Failed to load hotel data.");
        const hotel = await hotelRes.json();

        // Populate Text Data
        document.getElementById('detail-name').innerText = hotel.hotel_name || 'Unnamed Stay';
        document.getElementById('detail-rating').innerText = hotel.hotel_rating ? `${hotel.hotel_rating} / 5` : 'New';
        document.getElementById('detail-address').innerText = hotel.hotel_address || 'Address not provided';
        document.getElementById('detail-desc').innerText = hotel.hotel_description || 'No description available.';
        
        const contactEl = document.getElementById('detail-contact');
        if (hotel.hotel_contact && hotel.hotel_contact.trim() !== "") {
            contactEl.innerText = hotel.hotel_contact;
        } else {
            contactEl.innerText = "Contact unavailable";
        }

        // Setup Image Carousel
        imageEl.onerror = function() {
            this.src = `${origin}/uploads/default.jpg`;
        };

        if (hotel.images && Array.isArray(hotel.images) && hotel.images.length > 0) {
            carouselImages = hotel.images.map(img => {
                let cleanPath = img.trim();
                if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;
                return `${origin}${cleanPath}`;
            });
            
            updateCarouselUI();

            if (carouselImages.length > 1) {
                prevBtn.classList.remove('hidden');
                nextBtn.classList.remove('hidden');
                
                carouselImages.forEach((_, index) => {
                    const dot = document.createElement('div');
                    dot.classList.add('dot');
                    if (index === 0) dot.classList.add('active');
                    dot.addEventListener('click', () => {
                        currentImageIndex = index;
                        updateCarouselUI();
                    });
                    dotsContainer.appendChild(dot);
                });

                prevBtn.addEventListener('click', () => {
                    currentImageIndex = (currentImageIndex === 0) ? carouselImages.length - 1 : currentImageIndex - 1;
                    updateCarouselUI();
                });
                
                nextBtn.addEventListener('click', () => {
                    currentImageIndex = (currentImageIndex === carouselImages.length - 1) ? 0 : currentImageIndex + 1;
                    updateCarouselUI();
                });
            }
        } else {
            imageEl.src = `${origin}/uploads/default.jpg`;
        }

        function updateCarouselUI() {
            if (carouselImages.length === 0) return;
            imageEl.style.opacity = 0.8;
            setTimeout(() => {
                imageEl.src = carouselImages[currentImageIndex];
                imageEl.style.opacity = 1;
            }, 50);

            const allDots = document.querySelectorAll('.dot');
            allDots.forEach((dot, index) => {
                if (index === currentImageIndex) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        }

        // Initialize Leaflet Map
        if (hotel.latitude && hotel.longitude) {
            const map = L.map('map').setView([hotel.latitude, hotel.longitude], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map);
            L.marker([hotel.latitude, hotel.longitude]).addTo(map)
                .bindPopup(`<b>${hotel.hotel_name || 'Hotel Location'}</b>`).openPopup();
        } else {
            document.getElementById('map').innerHTML = `
                <div style="height: 100%; display: flex; align-items: center; justify-content: center; background: #f0f0f0; border-radius: 16px; color: #888;">
                    Map coordinates not available.
                </div>`;
        }

        // Fetch & Display Reviews
        try {
            const reviewsRes = await fetch(`${origin}/api/hotels/${hotelId}/reviews`);
            if (reviewsRes.ok) {
                const reviews = await reviewsRes.json();
                const reviewsList = document.getElementById('reviews-list');
                
                if (reviews.length === 0) {
                    reviewsList.innerHTML = "<p style='color: #888;'>No reviews yet. Be the first to share your experience!</p>";
                } else {
                    reviewsList.innerHTML = reviews.map(rev => `
                        <div class="review-card">
                            <div class="review-header">
                                <span class="review-title">${rev.title || 'Review'}</span>
                                <span class="review-stars">⭐ ${rev.rating}/5</span>
                            </div>
                            <p class="review-body">${rev.comment || ''}</p>
                            <div class="review-author">By ${rev.username || 'Traveler'} • ${new Date(rev.created_at).toLocaleDateString()}</div>
                        </div>
                    `).join('');
                }

                const currentUserId = getValidUserId(); 
                
                if (!currentUserId) {
                    document.getElementById('login-to-review-msg').classList.remove('hidden');
                } else {
                    const hasReviewed = reviews.some(r => String(r.user_id) === String(currentUserId));
                    if (hasReviewed) {
                        document.getElementById('already-reviewed-msg').classList.remove('hidden');
                    } else {
                        document.getElementById('review-form-container').classList.remove('hidden');
                        initStarRating(); // Trigger Star Logic
                    }
                }
            }
        } catch (reviewErr) {
            document.getElementById('reviews-list').innerHTML = "<p style='color: #888;'>Could not load reviews.</p>";
        }

        // --- INTERACTIVE STAR RATING LOGIC ---
        function initStarRating() {
            const stars = document.querySelectorAll('.star-rating-input .star');
            const ratingInput = document.getElementById('review-rating');
            let currentRating = parseInt(ratingInput.value); 

            function renderStars(ratingValue) {
                stars.forEach(s => {
                    if (parseInt(s.dataset.value) <= ratingValue) {
                        s.classList.add('active');
                    } else {
                        s.classList.remove('active');
                    }
                });
            }

            stars.forEach(star => {
                star.addEventListener('mouseover', function() {
                    renderStars(parseInt(this.dataset.value));
                });
                star.addEventListener('mouseout', function() {
                    renderStars(currentRating);
                });
                star.addEventListener('click', function() {
                    currentRating = parseInt(this.dataset.value);
                    ratingInput.value = currentRating;
                    renderStars(currentRating);
                });
            });

            renderStars(currentRating);
        }

        // Handle Review Submission
        document.getElementById('submit-review-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const currentUserId = getValidUserId();
            if (!currentUserId) {
                alert("Session expired. Please log in again.");
                return;
            }

            const rating = document.getElementById('review-rating').value;
            const title = document.getElementById('review-title').value;
            const comment = document.getElementById('review-comment').value;

 // Replace the bottom part of your submit listener with this:
            try {
                const submitRes = await fetch(`${origin}/api/reviews`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        hotel_id: hotelId, 
                        user_id: currentUserId, 
                        rating, 
                        title, 
                        comment
                    })
                });

                if (submitRes.ok) {
                    // REPLACE alert() with this:
                    showNotification('Review submitted successfully!');
                    
                    // Wait a moment for the user to see the message before reloading
                    setTimeout(() => window.location.reload(), 1500); 
                } else {
                    const errorData = await submitRes.json();
                    // REPLACE alert() with this:
                    showNotification(errorData.error || 'Failed to submit review', true);
                }
            } catch (err) {
                showNotification('A network error occurred.', true);
            }
        });

    } catch (error) {
        console.error("Critical error loading hotel details:", error);
        document.getElementById('detail-name').innerText = "Oops! Something went wrong.";
        document.getElementById('detail-desc').innerText = "We could not load the hotel details.";
        document.getElementById('detail-contact').innerText = "Error";
    }
});

function showNotification(message, isError = false) {
    // Create container if it doesn't exist
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    // Create Toast
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'toast-error' : ''}`;
    const icon = isError ? 'error' : 'check_circle';
    
    toast.innerHTML = `
        <span class="material-symbols-outlined toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}