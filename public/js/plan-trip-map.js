(function () {

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function colorForScore(score) {
        if (score <= 1) return "#2ecc71";   // Quiet
        if (score === 2) return "#27ae60";  // Calm
        if (score === 3) return "#f39c12";  // Moderate
        if (score === 4) return "#e74c3c";  // Busy
        return "#c0392b";                   // Very Busy
    }

    function crowdScoreForSpot(spot, now) {
        let score = spot.crowdBase;

        const dow = now.getDay();
        if (dow === 0 || dow === 6) score += 1;

        const h = now.getHours();
        if (h >= 11 && h <= 16) score += 1;
        if (h >= 9 && h <= 11) score += 0.5;

        const month = now.getMonth();
        if (month >= 10 || month <= 2) score += 1; // Tourist season

        return Math.min(5, Math.max(1, Math.round(score)));
    }

    function labelForScore(score) {
        if (score <= 1) return "Quiet";
        if (score === 2) return "Calm";
        if (score === 3) return "Moderate";
        if (score === 4) return "Busy";
        return "Very busy";
    }

    document.addEventListener("DOMContentLoaded", () => {
        const el = document.getElementById("plan-leaflet-map");
        if (!el || typeof L === "undefined" || !window.VM_DESTINATIONS) return;

        const map = L.map(el, { scrollWheelZoom: true });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap"
        }).addTo(map);

        const bounds = L.latLngBounds(window.VM_mapBounds);
        map.fitBounds(bounds, { padding: [20, 20] });

        // Legend
        const legend = L.control({ position: "bottomright" });
        legend.onAdd = function () {
            const div = L.DomUtil.create("div", "map-legend");
            div.innerHTML = `
                <strong>Crowd Level</strong><br>
                <span style="color:#2ecc71">●</span> Quiet<br>
                <span style="color:#27ae60">●</span> Calm<br>
                <span style="color:#f39c12">●</span> Moderate<br>
                <span style="color:#e74c3c">●</span> Busy<br>
                <span style="color:#c0392b">●</span> Very Busy
            `;
            return div;
        };
        legend.addTo(map);

        const now = new Date();

        window.VM_DESTINATIONS.forEach((spot) => {
            const score = crowdScoreForSpot(spot, now);
            const label = labelForScore(score);

            const marker = L.circleMarker([spot.lat, spot.lng], {
                radius: spot.id === "aizawl" ? 9 : 7,
                fillColor: colorForScore(score),
                color: "#ffffff",
                weight: 1,
                fillOpacity: 0.9
            }).addTo(map);

            marker.bindPopup(`
                <strong>${escapeHtml(spot.name)}</strong><br>
                ${escapeHtml(spot.blurb)}<br>
                <strong>Crowd:</strong> ${escapeHtml(label)}
            `);
        });
    });

})();