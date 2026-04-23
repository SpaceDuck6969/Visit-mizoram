// Consolidated Logic
document.addEventListener("DOMContentLoaded", () => {
    const header = document.getElementById("main-header");
    const trigger = document.getElementById("destinations-trigger");
    const menu = document.getElementById("destinations-menu");
    const backdrop = document.getElementById("mega-menu-backdrop");
    const icon = document.getElementById("dest-icon");
    const filterBtns = document.querySelectorAll(".filter-btn");
    const cards = document.querySelectorAll(".dest-card");

    let isMenuOpen = false;

    // 1. Scroll Effect
    window.addEventListener("scroll", () => {
        if (window.scrollY > 50) {
            header.classList.add("header-scrolled");
        } else {
            header.classList.remove("header-scrolled");
        }
    });

    // 2. Mega Menu Toggle
    function toggleMenu() {
        isMenuOpen = !isMenuOpen;

        if (isMenuOpen) {
            document.body.style.overflow = "hidden"; // Stops main page scrolling
            menu.classList.add("is-open");
            icon.style.transform = "rotate(180deg)";
        } else {
            menu.classList.remove("is-open");
            icon.style.transform = "rotate(0deg)";
            document.body.style.overflow = "";
        }
    }

    trigger.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleMenu();
    });

    // Backdrop listener removed (element doesn't exist in HTML and was crashing the script)
    // If you ever add <div id="mega-menu-backdrop"> later, you can re-add it here.

    // 3. Filter Logic – black pill ONLY after clicking, no hover change
    filterBtns.forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation(); // Prevents menu from closing

            const category = btn.getAttribute("data-filter");

            // Reset ALL buttons to neutral style
            filterBtns.forEach(b => {
                b.classList.remove("is-active");
            });

            // Make ONLY the clicked button black (exactly like your "Cities" pill)
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

    // Auto-activate first button (Hill stations) on page load – black appears via JS only
    if (filterBtns.length > 0) {
        const initialBtn = filterBtns[0];
        initialBtn.classList.add("is-active");

        // Initial filter
        cards.forEach(card => {
            if (card.getAttribute("data-category") === "hill-stations") {
                card.classList.remove("is-hidden");
            } else {
                card.classList.add("is-hidden");
            }
        });
    }
});