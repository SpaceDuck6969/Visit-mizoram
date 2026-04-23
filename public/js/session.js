// js/session.js

// Function to update the Header UI based on login status
function updateSessionUI() {
    const token = localStorage.getItem("visit_mizoram_token");
    const userStr = localStorage.getItem("visit_mizoram_user");

    const joinBtn = document.getElementById("join-btn");
    const userMenuContainer = document.getElementById("user-menu-container");
    const navUsername = document.getElementById("nav-username");

    if (token && userStr) {
        // --- USER IS LOGGED IN ---
        const user = JSON.parse(userStr);
        if (joinBtn) joinBtn.style.display = "none";
        if (userMenuContainer) userMenuContainer.style.display = "inline-block";
        if (navUsername) navUsername.textContent = user.username;
    } else {
        // --- USER IS LOGGED OUT ---
        if (joinBtn) joinBtn.style.display = "inline-flex";
        if (userMenuContainer) userMenuContainer.style.display = "none";
        
        // Force close the chat window just in case it was left open before hitting "back"
        const plannerWidget = document.getElementById("planner-widget");
        if (plannerWidget) {
            plannerWidget.setAttribute("aria-hidden", "true");
            plannerWidget.classList.remove("active"); 
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // 1. Run the UI check on normal load
    updateSessionUI();

    // 2. The Chatbot Interceptor (The Bouncer)
    const chatFab = document.getElementById("smart-planner-fab");
    if (chatFab) {
        // Notice the 'true' at the end of this listener. 
        // That runs this code BEFORE your planner-widget.js file can see the click!
        chatFab.addEventListener("click", (e) => {
            const token = localStorage.getItem("visit_mizoram_token");
            
            if (!token) {
                // User is not logged in: KILL the click dead in its tracks.
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                // Show our beautiful custom modal instead
                const alertModal = document.getElementById("custom-alert-modal");
                if (alertModal) {
                    alertModal.style.display = "flex";
                } else {
                    // Fallback if the modal HTML is missing on a specific page
                    window.location.href = "/login.html";
                }
            }
        }, true); 
    }

    // 3. User Dropdown Menu Logic
    const userDropdownBtn = document.getElementById("user-dropdown-btn");
    const userDropdownContent = document.getElementById("user-dropdown-content");
    if (userDropdownBtn && userDropdownContent) {
        userDropdownBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            userDropdownContent.classList.toggle("show");
        });
        
        document.addEventListener("click", () => {
            userDropdownContent.classList.remove("show");
        });
    }

    // 4. Logout Button Logic
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            localStorage.removeItem("visit_mizoram_token");
            localStorage.removeItem("visit_mizoram_user");
            window.location.href = "/"; // Send them back to the homepage
        });
    }

    // 5. Custom Modal Close Logic
    const alertCloseBtn = document.getElementById("custom-alert-close");
    const alertModalOverlay = document.getElementById("custom-alert-modal");
    
    if (alertCloseBtn && alertModalOverlay) {
        alertCloseBtn.addEventListener("click", () => {
            alertModalOverlay.style.display = "none";
        });
        
        // Close if clicking the dark background around the box
        alertModalOverlay.addEventListener("click", (e) => {
            if (e.target === alertModalOverlay) {
                alertModalOverlay.style.display = "none";
            }
        });
    }
});

// 6. The "Back Button" Fix (pageshow event)
// This explicitly triggers every time the page becomes visible, even from the cache
window.addEventListener("pageshow", (event) => {
    // If the browser loaded this from memory (like hitting the back button)
    if (event.persisted || performance.getEntriesByType("navigation")[0].type === "back_forward") {
        updateSessionUI();
    }
});

// ==========================================
// THE AUTH WALL MANAGER
// ==========================================
// Check if the page has an Auth Wall, and remove it if the user is logged in
document.addEventListener("DOMContentLoaded", function() {
    const wall = document.getElementById("auth-wall");
    const token = localStorage.getItem("visit_mizoram_token");
    
    // If the wall exists AND the user has a valid token
    if (wall && token && token !== "null" && token !== "undefined") {
        wall.remove(); // Tear down the wall!
    }
});