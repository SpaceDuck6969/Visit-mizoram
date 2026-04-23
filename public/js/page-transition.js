(function () {
    const prefersReducedMotion = () =>
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    document.addEventListener("DOMContentLoaded", () => {
        document.body.classList.add("page-transition-enter");
    });

    document.addEventListener(
        "click",
        (e) => {
            const a = e.target.closest("a[href]");
            if (!a) return;

            if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            if (a.target === "_blank" || a.hasAttribute("download")) return;

            const href = (a.getAttribute("href") || "").trim();
            if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
            if (/^mailto:/i.test(href) || /^tel:/i.test(href)) return;

            let url;
            try {
                url = new URL(href, window.location.href);
            } catch {
                return;
            }

            if (url.origin !== window.location.origin) return;

            if (
                url.pathname === window.location.pathname &&
                url.search === window.location.search
            ) {
                return;
            }

            if (prefersReducedMotion()) return;

            e.preventDefault();

            let overlay = document.getElementById("page-transition-overlay");
            if (!overlay) {
                overlay = document.createElement("div");
                overlay.id = "page-transition-overlay";
                overlay.setAttribute("aria-hidden", "true");
                document.body.appendChild(overlay);
            }

            requestAnimationFrame(() => {
                overlay.classList.add("is-visible");
            });

            const delay = 420;
            window.setTimeout(() => {
                window.location.href = url.href;
            }, delay);
        },
        false
    );
})();
