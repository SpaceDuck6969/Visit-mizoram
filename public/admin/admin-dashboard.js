// public/js/admin-dashboard.js

// Global variables to store fetched data
window.allHotels = [];
window.allUsers = [];

// --- 1. SECURITY CHECK ---
if (!localStorage.getItem('admin_token')) {
    window.location.replace('admin-login.html');
}

// --- 2. UI SETUP ---
document.addEventListener('DOMContentLoaded', () => {
    try {
        const adminDataString = localStorage.getItem('admin_user');
        if (adminDataString) {
            const adminData = JSON.parse(adminDataString);
            if (adminData.name) {
                document.getElementById('admin-name-display').textContent = adminData.name;
            }
        }
    } catch (e) {
        console.error("Error setting admin name", e);
    }
    window.loadHotels();
});

// --- 3. GLOBAL FUNCTIONS ---
window.logout = function() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    window.location.replace('admin-login.html');
};

window.switchTab = function(tabId, element) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');

    document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));
    document.getElementById(`view-${tabId}`).classList.add('active');

    if (tabId === 'hotels') window.loadHotels();
    if (tabId === 'users') window.loadUsers();
};

// --- MODAL LOGIC ---
window.closeModal = function() {
    document.getElementById('info-modal').classList.remove('active');
};

window.viewHotel = function(hotelId) {
    const hotel = window.allHotels.find(h => h.hotel_id === hotelId);
    if (!hotel) return;

    document.getElementById('modal-title').textContent = hotel.hotel_name;
    
    // Generate Images HTML if they exist
    let imagesHtml = '';
    if (hotel.images && hotel.images.length > 0) {
        imagesHtml = `<div class="modal-images">` + 
            hotel.images.map(img => `<img src="${img}" alt="Hotel Image" onerror="this.style.display='none'">`).join('') + 
            `</div>`;
    }

    document.getElementById('modal-body').innerHTML = `
        <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value">${hotel.is_verified == 1 ? '<span style="color:green;font-weight:bold;">Verified</span>' : '<span style="color:red;font-weight:bold;">Pending</span>'}</span></div>
        <div class="detail-row"><span class="detail-label">Contact</span><span class="detail-value">${hotel.hotel_contact || 'N/A'}</span></div>
        <div class="detail-row"><span class="detail-label">Address</span><span class="detail-value">${hotel.hotel_address || 'N/A'}</span></div>
        <div class="detail-row"><span class="detail-label">Description</span><span class="detail-value">${hotel.hotel_description || 'N/A'}</span></div>
        <div class="detail-row"><span class="detail-label">Coordinates</span><span class="detail-value">${hotel.latitude || 'N/A'}, ${hotel.longitude || 'N/A'}</span></div>
        ${imagesHtml}
    `;
    
    document.getElementById('info-modal').classList.add('active');
};

window.viewUser = function(userId) {
    const user = window.allUsers.find(u => u.user_id === userId);
    if (!user) return;

    document.getElementById('modal-title').textContent = "User Profile: " + user.username;
    document.getElementById('modal-body').innerHTML = `
        <div class="detail-row"><span class="detail-label">User ID</span><span class="detail-value">#${user.user_id}</span></div>
        <div class="detail-row"><span class="detail-label">Username</span><span class="detail-value">${user.username}</span></div>
        <div class="detail-row"><span class="detail-label">Email Address</span><span class="detail-value">${user.email}</span></div>
        <div class="detail-row"><span class="detail-label">OTP Status</span><span class="detail-value">${user.is_verified == 1 ? 'Verified ✅' : 'Pending ❌'}</span></div>
    `;
    
    document.getElementById('info-modal').classList.add('active');
};

// --- DATA FETCHING ---
window.loadHotels = async function() {
    try {
        const response = await fetch('/api/hotels'); 
        if (!response.ok) throw new Error("Server error");
        
        window.allHotels = await response.json(); // Save globally
        const tbody = document.getElementById('hotel-table-body');
        
        if (window.allHotels.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5">No hotels found.</td></tr>';
            return;
        }

        tbody.innerHTML = window.allHotels.map(hotel => {
            const isVerified = hotel.is_verified == 1; 
            const badgeClass = isVerified ? "status-verified" : "status-pending";
            const badgeText = isVerified ? "Verified" : "Pending";
            const btnClass = isVerified ? "btn-revoke" : "btn-approve";
            const btnText = isVerified ? "Revoke" : "Approve";
            const nextStatus = isVerified ? 0 : 1; 

            // Added a "View" button next to the Approve/Revoke button
            return `
                <tr>
                    <td>#${hotel.hotel_id}</td>
                    <td><strong>${hotel.hotel_name}</strong></td>
                    <td>${hotel.hotel_contact}</td>
                    <td><span class="status-badge ${badgeClass}">${badgeText}</span></td>
                    <td style="white-space: nowrap;">
                        <button class="action-btn btn-view" onclick="window.viewHotel(${hotel.hotel_id})">
                            <span class="material-symbols-outlined" style="font-size: 1rem;">visibility</span> View
                        </button>
                        <button class="action-btn ${btnClass}" onclick="window.toggleVerification(${hotel.hotel_id}, ${nextStatus})">
                            ${btnText}
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error(error);
        document.getElementById('hotel-table-body').innerHTML = '<tr><td colspan="5">Error loading hotels.</td></tr>';
    }
};

window.toggleVerification = async function(hotelId, newStatus) {
    try {
        const response = await fetch(`/api/hotels/${hotelId}/verify`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_verified: newStatus })
        });
        if (!response.ok) throw new Error("Update failed");
        window.loadHotels(); 
    } catch (error) {
        console.error(error);
        alert("Failed to update status.");
    }
};

window.loadUsers = async function() {
    try {
        const response = await fetch('/api/admin/users'); 
        if (!response.ok) throw new Error("Server error");

        window.allUsers = await response.json(); // Save globally
        const tbody = document.getElementById('user-table-body');
        
        if (window.allUsers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4">No users found.</td></tr>';
            return;
        }

        tbody.innerHTML = window.allUsers.map(user => `
            <tr>
                <td>#${user.user_id}</td>
                <td><strong>${user.username}</strong></td>
                <td>${user.email}</td>
                <td style="white-space: nowrap;">
                    <button class="action-btn btn-view" onclick="window.viewUser(${user.user_id})">
                        <span class="material-symbols-outlined" style="font-size: 1rem;">visibility</span> View
                    </button>
                    <button class="action-btn btn-delete" onclick="window.deleteUser(${user.user_id}, '${user.username}')">
                        <span class="material-symbols-outlined" style="font-size: 1rem;">delete</span> Delete
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error(error);
        document.getElementById('user-table-body').innerHTML = '<tr><td colspan="4">Error loading users.</td></tr>';
    }
};

window.deleteUser = async function(userId, username) {
    if (!confirm(`Are you sure you want to permanently delete ${username}?`)) return;
    try {
        const response = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error("Delete failed");
        window.loadUsers(); 
    } catch (error) {
        console.error(error);
        alert("Failed to delete user.");
    }
};