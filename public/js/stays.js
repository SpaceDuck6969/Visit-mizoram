function staysApiOrigin() {
    if (window.location.protocol === 'file:') return 'http://localhost:3000';
    return window.location.origin;
}

async function loadStays() {
    const grid = document.getElementById('hotelGrid');
    const origin = staysApiOrigin();
    
    try {
        const response = await fetch(origin + '/api/hotels/verified');
        if (!response.ok) throw new Error('HTTP error! status: ' + response.status);
        
        let hotels = await response.json();

        if (!Array.isArray(hotels) || hotels.length === 0) {
            grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center;">No properties found. <a href="register.html">Register the first stay</a>.</p>`;
            return;
        }

        // 1. Sort hotels by rating (Highest to Lowest)
        hotels.sort((a, b) => {
            const ratingA = parseFloat(a.hotel_rating) || 0;
            const ratingB = parseFloat(b.hotel_rating) || 0;
            return ratingB - ratingA;
        });

        // 2. Make cards clickable by wrapping in <a> tag with URL parameter
        grid.innerHTML = hotels.map((hotel) => {
            const desc = (hotel.hotel_description || '').replace(/</g, '&lt;');
            const snippet = desc.length > 85 ? desc.substring(0, 85) + '…' : desc;
            const imgPath = hotel.images && hotel.images[0] ? hotel.images[0] : '/uploads/default.jpg';
            const fullImgUrl = origin + imgPath;
            const ratingDisplay = hotel.hotel_rating ? `⭐ ${hotel.hotel_rating}/5` : 'New';

            return `
            <a href="hotel-detail.html?id=${hotel.hotel_id}" style="text-decoration: none; color: inherit;">
                <div class="stay-card leaf-radius editorial-shadow">
                    <div class="stay-thumb">
                        <img src="${fullImgUrl}" alt="${(hotel.hotel_name || '').replace(/"/g, '&quot;')}" onerror="this.src='${origin}/uploads/default.jpg'">
                        <div class="stay-price-tag">${ratingDisplay}</div>
                    </div>
                    <div class="stay-info">
                        <span class="stay-loc">${hotel.hotel_address || ''}</span>
                        <h3 class="stay-name">${hotel.hotel_name || ''}</h3>
                        <p class="stay-desc">${snippet}</p>
                        <div class="stay-action-bar">
                            <div class="stay-contact-chip">
                                <span class="material-symbols-outlined">phone_in_talk</span>
                                ${hotel.hotel_contact || ''}
                            </div>
                            <span class="stay-view-btn" aria-hidden="true">
                                EXPLORE <span class="material-symbols-outlined">arrow_outward</span>
                            </span>
                        </div>
                    </div>
                </div>
            </a>`;
        }).join('');
    } catch (err) {
        console.error('Fetch error:', err);
        grid.innerHTML = `<p>Error loading stays: ${err.message}</p>`;
    }
}

window.addEventListener('DOMContentLoaded', loadStays);
