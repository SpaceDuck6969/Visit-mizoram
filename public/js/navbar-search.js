// Navbar Search Functionality
(function() {
    // Search data - all searchable pages and content
    const searchData = [
        { title: 'Home', url: 'index.html', desc: 'Visit Mizoram homepage', icon: 'home' },
        { title: 'Destinations', url: 'index.html#destinations', desc: 'Explore destinations in Mizoram', icon: 'explore' },
        { title: 'Reiek', url: 'destinations/reiek/reiek.html', desc: 'Hill station with panoramic views', icon: 'landscape' },
        { title: 'Hmuifang', url: 'destinations/hmuifang/hmuifang.html', desc: 'Mountain retreat and festival venue', icon: 'forest' },
        { title: 'Phawngpui', url: 'destinations/phawngpui/phawngpui.html', desc: 'Blue Mountain - highest peak', icon: 'terrain' },
        { title: 'Phulpui', url: 'destinations/phulpui/phulpui.html', desc: 'Zawlpala Thlantlang memorial', icon: 'location_on' },
        { title: 'Sakawrhmuituai', url: 'destinations/sakawrhmuituai/sakawrhmuituai.html', desc: 'Historic battlefield site', icon: 'history' },
        { title: 'Mawmrang', url: 'destinations/mawmrang/mawmrang.html', desc: 'Scenic mountain destination', icon: 'landscape' },
        { title: 'Lianchhiari', url: 'destinations/lianchhiari/lianchhiari.html', desc: 'Folklore and cultural site', icon: 'auto_stories' },
        { title: 'Travel Guidelines', url: 'guideline.html', desc: 'Entry permits and travel tips', icon: 'article' },
        { title: 'Cultural Heritage', url: 'heritage.html', desc: 'Mizo traditions and festivals', icon: 'museum' },
        { title: 'Mizo Cuisine', url: 'cuisine.html', desc: 'Local food and traditional dishes', icon: 'restaurant' },
        { title: 'Safety & Emergency', url: 'safety.html', desc: 'Emergency contacts and safety tips', icon: 'health_and_safety' },
        { title: 'Stay Directory', url: 'stays.html', desc: 'Hotels and homestays', icon: 'hotel' },
        { title: 'Plan Trip', url: 'plan-trip/index.html', desc: 'AI trip planner', icon: 'map' },
        { title: 'Register Property', url: 'register.html', desc: 'List your hotel or homestay', icon: 'add_business' },
        { title: 'Login', url: 'login.html', desc: 'Sign in to your account', icon: 'login' }
    ];

    // Initialize search when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        initializeSearch();
        initializeBackButton();
    });

    function initializeSearch() {
        const searchInput = document.getElementById('nav-search-input');
        const searchResults = document.getElementById('search-results');
        const searchBtn = document.getElementById('nav-search-btn');

        if (!searchInput || !searchResults) return;

        // Handle input
        searchInput.addEventListener('input', function() {
            const query = this.value.trim().toLowerCase();
            
            if (query.length === 0) {
                searchResults.classList.remove('active');
                return;
            }

            const results = searchData.filter(item => 
                item.title.toLowerCase().includes(query) || 
                item.desc.toLowerCase().includes(query)
            );

            displayResults(results, searchResults);
        });

        // Handle search button click
        if (searchBtn) {
            searchBtn.addEventListener('click', function() {
                const query = searchInput.value.trim().toLowerCase();
                if (query) {
                    const results = searchData.filter(item => 
                        item.title.toLowerCase().includes(query) || 
                        item.desc.toLowerCase().includes(query)
                    );
                    if (results.length > 0) {
                        window.location.href = results[0].url;
                    }
                }
            });
        }

        // Close search results when clicking outside
        document.addEventListener('click', function(e) {
            if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
                searchResults.classList.remove('active');
            }
        });

        // Handle keyboard navigation
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                const query = this.value.trim().toLowerCase();
                const results = searchData.filter(item => 
                    item.title.toLowerCase().includes(query) || 
                    item.desc.toLowerCase().includes(query)
                );
                if (results.length > 0) {
                    window.location.href = results[0].url;
                }
            }
        });
    }

    function displayResults(results, container) {
        if (results.length === 0) {
            container.innerHTML = '<div class="search-no-results">No results found</div>';
            container.classList.add('active');
            return;
        }

        const html = results.map(item => `
            <a href="${item.url}" class="search-result-item">
                <span class="material-symbols-outlined search-result-icon">${item.icon}</span>
                <div class="search-result-text">
                    <p class="search-result-title">${item.title}</p>
                    <p class="search-result-desc">${item.desc}</p>
                </div>
            </a>
        `).join('');

        container.innerHTML = html;
        container.classList.add('active');
    }

    function initializeBackButton() {
        const backBtn = document.getElementById('back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', function(e) {
                e.preventDefault();
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    // Fallback to home if no history
                    window.location.href = 'index.html';
                }
            });
        }
    }
})();
