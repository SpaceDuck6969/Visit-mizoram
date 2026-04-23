document.addEventListener("DOMContentLoaded", () => {
    // 1. SELECTORS
    const header = document.getElementById("main-header");
    
    // Destinations Elements
    const destTrigger = document.getElementById("destinations-trigger");
    const destMenu = document.getElementById("destinations-menu");
    const destIcon = document.getElementById("dest-icon");
    
    // Explore Elements
    const exploreTrigger = document.getElementById('explore-trigger');
    const exploreMenu = document.getElementById('explore-menu');
    const exploreIcon = document.getElementById('explore-icon');

    // Back Button
    const backBtn = document.getElementById('back-btn');

    // Filter Elements
    const filterBtns = document.querySelectorAll(".filter-btn");
    const cards = document.querySelectorAll("#destinations-menu .dest-card");;

    // 2. HELPER FUNCTIONS
    function closeAllMenus() {
        // Use 'is-open' to match your CSS
        destMenu.classList.remove('is-open');
        exploreMenu.classList.remove('is-open');

        const plannerWidgetEl = document.getElementById("planner-widget");
        if (plannerWidgetEl) {
            plannerWidgetEl.classList.remove("is-open");
            const fab = document.getElementById("smart-planner-fab");
            if (fab) fab.setAttribute("aria-expanded", "false");
        }
        
        // Reset Icons
        if (destIcon) {
            destIcon.style.transform = "rotate(0deg)";
            destIcon.innerText = 'expand_more';
        }
        if (exploreIcon) {
            exploreIcon.style.transform = "rotate(0deg)";
            exploreIcon.innerText = 'expand_more';
        }
        
        // Re-enable scrolling
        document.body.style.overflow = "";
    }

    // 3. SCROLL EFFECT
    window.addEventListener("scroll", () => {
        if (window.scrollY > 50) {
            header.classList.add("header-scrolled");
        } else {
            header.classList.remove("header-scrolled");
        }
    });

    // 4. BACK BUTTON FUNCTIONALITY
    if (backBtn) {
        backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.location.href = 'index.html';
            }
        });
    }

    // 5. NAVIGATION TOGGLES
    // Destinations Toggle
    destTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = destMenu.classList.contains('is-open');
        
        closeAllMenus();
        
        if (!isOpen) {
            destMenu.classList.add('is-open');
            destIcon.style.transform = "rotate(180deg)";
            destIcon.innerText = 'expand_less';
            document.body.style.overflow = "hidden"; // Stop main page scrolling
        }
    });

    // Explore Toggle
    exploreTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const isOpen = exploreMenu.classList.contains('is-open');
        
        closeAllMenus();
        
        if (!isOpen) {
            exploreMenu.classList.add('is-open');
            exploreIcon.style.transform = "rotate(180deg)";
            exploreIcon.innerText = 'expand_less';
            document.body.style.overflow = "hidden";
        }
    });

    // 6. CLOSE ON OUTSIDE CLICK
    document.addEventListener('click', (e) => {
        if (e.target.closest('#smart-planner-fab') || e.target.closest('#planner-widget')) {
            return;
        }
        // If click is not inside a menu and not on a trigger
        if (!e.target.closest('.destinations-menu') && !e.target.closest('.nav-dropdown-trigger')) {
            closeAllMenus();
        }
    });

    // 7. FILTER LOGIC
    filterBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation(); // Prevents menu from closing

            const category = btn.getAttribute("data-filter");

            // Reset ALL buttons to neutral style
            filterBtns.forEach(b => b.classList.remove("is-active"));

            // Make ONLY the clicked button active
            btn.classList.add("is-active");

            // Filter cards
            cards.forEach(card => {
                if (card.getAttribute("data-category") === category) {
                    card.classList.remove("is-hidden");
                } else {
                    card.classList.add("is-hidden");
                }
            });
        });
    });

    // 8. INITIAL STATE
    // Auto-activate first button (Hill stations) on page load
    if (filterBtns.length > 0) {
        filterBtns[0].classList.add("is-active");
        cards.forEach(card => {
            if (card.getAttribute("data-category") === "hill-stations") {
                card.classList.remove("is-hidden");
            } else {
                card.classList.add("is-hidden");
            }
        });
    }
});