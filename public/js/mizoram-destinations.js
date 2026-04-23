/**
 * Shared coordinates and heuristic crowd baselines for Visit Mizoram maps.
 * crowdBase: 1 (often quiet) .. 5 (often busy) before day/time modifiers.
 */
window.VM_DESTINATIONS = [
    {
        id: "aizawl",
        name: "Aizawl",
        lat: 23.1645,
        lng: 92.9376,
        crowdBase: 4,
        blurb: "State capital — markets, viewpoints, and city life."
    },
    {
        id: "reiek",
        name: "Reiek",
        lat: 23.7456,
        lng: 92.6514,
        crowdBase: 2,
        blurb: "Hill viewpoint near Aizawl — popular for sunsets."
    },
    {
        id: "hmuifang",
        name: "Hmuifang",
        lat: 23.6333,
        lng: 92.5167,
        crowdBase: 2,
        blurb: "Green ridge line and cultural events venue."
    },
    {
        id: "phawngpui",
        name: "Phawngpui (Blue Mountain)",
        lat: 22.6344,
        lng: 93.0244,
        crowdBase: 2,
        blurb: "Remote high peak — plan permits and guides."
    },
    {
        id: "champhai",
        name: "Champhai",
        lat: 23.4569,
        lng: 93.3286,
        crowdBase: 3,
        blurb: "Border town — gateway to eastern districts."
    },
    {
        id: "lunglei",
        name: "Lunglei",
        lat: 22.8671,
        lng: 92.7657,
        crowdBase: 3,
        blurb: "Southern hub for longer hill circuits."
    },
    {
        id: "serchhip",
        name: "Serchhip (Vantawng area)",
        lat: 23.2969,
        lng: 92.8187,
        crowdBase: 2,
        blurb: "Base for Vantawng Falls day trips."
    }
];

window.VM_mapBounds = (function () {
    const spots = window.VM_DESTINATIONS;
    const lats = spots.map((s) => s.lat);
    const lngs = spots.map((s) => s.lng);
    const pad = 0.35;
    return [
        [Math.min(...lats) - pad, Math.min(...lngs) - pad],
        [Math.max(...lats) + pad, Math.max(...lngs) + pad]
    ];
})();
