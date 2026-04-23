// Scroll reveal animation
const elements = document.querySelectorAll(".animate");

window.addEventListener("scroll", () => {
    elements.forEach(el => {
        const position = el.getBoundingClientRect().top;
        const screenHeight = window.innerHeight;

        if (position < screenHeight - 100) {
            el.classList.add("show");
        }
    });
});

function scrollToSection() {
    document.getElementById("destinations").scrollIntoView({
        behavior: "smooth"
    });
}

// Initialize tabs on page load
document.addEventListener("DOMContentLoaded", () => {
  // Set first tab as active by default for all dropdowns
  const allTabs = document.querySelectorAll(".mega-tabs");
  
  allTabs.forEach(tabGroup => {
    const firstTab = tabGroup.querySelector(".tab");
    const megaDropdown = tabGroup.closest(".mega-dropdown");

    if (!megaDropdown) return;

    const tabContent = megaDropdown.querySelector(".tab-content");
    
    if (firstTab) {
      firstTab.classList.add("active");
    }
    if (tabContent) {
      tabContent.classList.add("active");
    }
  });

  // Handle tab clicks
  const tabs = document.querySelectorAll(".tab");
  const contents = document.querySelectorAll(".tab-content");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      // Get all tabs in the same group
      const tabGroup = tab.closest(".mega-tabs");
      const tabsInGroup = tabGroup.querySelectorAll(".tab");
      const megaDropdown = tabGroup.closest(".mega-dropdown");

      if (!megaDropdown) return;

      const contentsInGroup = megaDropdown.querySelectorAll(".tab-content");

      // Remove active from all tabs in this group
      tabsInGroup.forEach(t => t.classList.remove("active"));
      contentsInGroup.forEach(c => c.classList.remove("active"));

      // Add active to clicked tab and content
      tab.classList.add("active");
      const targetContent = megaDropdown.querySelector(`.tab-content#${tab.dataset.tab}`);
      if (targetContent) {
        targetContent.classList.add("active");
      }
    });
  });
});

// All dropdowns functionality
document.addEventListener("DOMContentLoaded", () => {
  const dropdowns = document.querySelectorAll(".nav-item.dropdown");

  dropdowns.forEach(dropdown => {
    const trigger = dropdown.querySelector("a");

    // Toggle dropdown on click
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      
      // Close other dropdowns
      dropdowns.forEach(d => {
        if (d !== dropdown) {
          d.classList.remove("open");
        }
      });

      // Toggle current dropdown
      dropdown.classList.toggle("open");
      
      // Disable body scroll when dropdown opens
      if (dropdown.classList.contains("open")) {
        document.body.classList.add("no-scroll");
      } else {
        document.body.classList.remove("no-scroll");
      }
    });
  });

  // Close when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".nav-item.dropdown")) {
      dropdowns.forEach(d => {
        d.classList.remove("open");
        document.body.classList.remove("no-scroll");
      });
    }
  });

  // Close when pressing Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      dropdowns.forEach(d => {
        d.classList.remove("open");
        document.body.classList.remove("no-scroll");
      });
    }
  });
});