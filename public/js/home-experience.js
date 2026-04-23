/**
 * Homepage: Aizawl weather card, crowd estimates, Leaflet map.
 */
(function () {
    const CROWD_NOTE =
        "Estimates only: based on typical patterns (weekend, time of day). Not live visitor counts.";

    function clamp(n, min, max) {
        return Math.min(max, Math.max(min, n));
    }

    function crowdScoreForSpot(spot, now) {
        let score = spot.crowdBase;
        const dow = now.getDay();
        const isWeekend = dow === 0 || dow === 6;
        if (isWeekend) score += 1;
        const h = now.getHours();
        if (h >= 11 && h <= 16) score += 1;
        if (h >= 9 && h <= 11) score += 0.5;
        return clamp(Math.round(score), 1, 5);
    }

    function labelForScore(score) {
        if (score <= 1) return { label: "Quiet", tone: "crowd--quiet" };
        if (score === 2) return { label: "Calm", tone: "crowd--calm" };
        if (score === 3) return { label: "Moderate", tone: "crowd--mod" };
        if (score === 4) return { label: "Busy", tone: "crowd--busy" };
        return { label: "Very busy", tone: "crowd--vbusy" };
    }

    function renderCrowd(container) {
        if (!container || !window.VM_DESTINATIONS) return;
        const now = new Date();
        const featured = window.VM_DESTINATIONS.filter((s) =>
            ["aizawl", "reiek", "phawngpui", "hmuifang"].includes(s.id)
        );
        container.innerHTML = "";
        const note = document.createElement("p");
        note.className = "home-crowd-note";
        note.textContent = CROWD_NOTE;
        container.appendChild(note);
        const row = document.createElement("div");
        row.className = "home-crowd-row";
        featured.forEach((spot) => {
            const score = crowdScoreForSpot(spot, now);
            const { label, tone } = labelForScore(score);
            const card = document.createElement("div");
            card.className = "home-crowd-card";
            card.innerHTML =
                `<span class="home-crowd-name">${spot.name}</span>` +
                `<span class="home-crowd-meter" aria-hidden="true">${"●".repeat(score)}${"○".repeat(5 - score)}</span>` +
                `<span class="home-crowd-label ${tone}">${label}</span>`;
            card.setAttribute(
                "aria-label",
                `${spot.name}: ${label} crowd estimate, ${score} of 5`
            );
            row.appendChild(card);
        });
        container.appendChild(row);
    }

    async function renderWeather(card) {
        if (!card) return;
        const body = card.querySelector(".home-weather-body");
        if (!body) return;
        body.innerHTML = '<p class="home-weather-loading">Loading weather…</p>';

        try {
            const res = await fetch("/api/weather?q=" + encodeURIComponent("Aizawl"));
            const data = await res.json();
            if (!data.ok) {
                body.innerHTML =
                    `<p class="home-weather-fallback"><strong>Aizawl</strong> — ` +
                    `Live weather is unavailable. <span class="home-weather-hint">${escapeHtml(
                        data.message || "Try again later."
                    )}</span></p>` +
                    `<p class="home-weather-static">Typical hill climate: mild days, cool evenings; carry a light rain layer.</p>`;
                return;
            }
            const place = [data.location.name, data.location.region].filter(Boolean).join(", ");
            const cur = data.current;
            const icon =
                cur.icon ?
                    `<img src="${escapeHtml(cur.icon)}" alt="" width="64" height="64" class="home-weather-icon">` :
                    "";
            body.innerHTML =
                `<div class="home-weather-main">` +
                icon +
                `<div class="home-weather-temps">` +
                `<span class="home-weather-temp">${Math.round(cur.temp_c)}°C</span>` +
                `<span class="home-weather-feels">Feels like ${Math.round(cur.feelslike_c)}°C</span>` +
                `<span class="home-weather-desc">${escapeHtml(cur.condition || "")}</span>` +
                `</div></div>` +
                `<p class="home-weather-meta">${escapeHtml(place)} · Humidity ${cur.humidity}% · Wind ${Math.round(
                    cur.wind_kph
                )} km/h</p>`;
        } catch (_) {
            body.innerHTML =
                '<p class="home-weather-fallback">Could not load weather. Check your connection.</p>';
        }
    }

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function initMap() {
        const el = document.getElementById("home-leaflet-map");
        if (!el || typeof L === "undefined" || !window.VM_DESTINATIONS) return;

        const map = L.map(el, {
            scrollWheelZoom: false,
            attributionControl: true
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        const bounds = L.latLngBounds(window.VM_mapBounds);
        map.fitBounds(bounds, { padding: [24, 24] });

        const layer = L.layerGroup().addTo(map);
        const now = new Date();

        window.VM_DESTINATIONS.forEach((spot) => {
            const score = crowdScoreForSpot(spot, now);
            const { label } = labelForScore(score);
            const marker = L.circleMarker([spot.lat, spot.lng], {
                radius: spot.id === "aizawl" ? 9 : 7,
                fillColor: "#0a3323",
                color: "#c2ecd4",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.85
            }).addTo(layer);
            marker.bindPopup(
                `<strong>${escapeHtml(spot.name)}</strong><br>` +
                    `${escapeHtml(spot.blurb)}<br>` +
                    `<em>Crowd (estimate): ${escapeHtml(label)}</em>`
            );
        });

        el.addEventListener(
            "click",
            () => {
                if (!map.scrollWheelZoom.enabled()) map.scrollWheelZoom.enable();
            },
            { once: true }
        );
    }

    document.addEventListener("DOMContentLoaded", () => {
        renderCrowd(document.getElementById("home-crowd-panel"));
        renderWeather(document.getElementById("home-weather-card"));
        initMap();
    });
})();
