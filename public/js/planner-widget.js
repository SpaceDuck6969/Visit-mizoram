document.addEventListener("DOMContentLoaded", () => {
    const plannerFab = document.getElementById("smart-planner-fab");
    const plannerWidget = document.getElementById("planner-widget");
    const plannerClose = document.getElementById("planner-widget-close");
    const plannerMessages = document.getElementById("planner-widget-messages");
    const plannerForm = document.getElementById("planner-widget-form");
    const plannerInput = document.getElementById("planner-widget-input");
    const plannerLanguage = document.getElementById("planner-language");
    const plannerSend = document.getElementById("planner-widget-send");
    const plannerPrompts = document.getElementById("planner-widget-prompts");

    if (!plannerFab || !plannerWidget || !plannerClose || !plannerForm || !plannerInput) {
        return;
    }

    function setPlannerOpen(open) {
        plannerWidget.classList.toggle("is-open", open);
        plannerFab.setAttribute("aria-expanded", open ? "true" : "false");
        plannerWidget.setAttribute("aria-hidden", open ? "false" : "true");
    }

    function closePlanner() {
        setPlannerOpen(false);
    }

    function appendPlannerMessage(text, role) {
        const div = document.createElement("div");
        div.className = `planner-msg ${role}`;
        div.textContent = (text || "").replace(/\*\*/g, "");
        plannerMessages.appendChild(div);
        plannerMessages.scrollTop = plannerMessages.scrollHeight;
        return div;
    }

    function formatAssistantText(text) {
        return (text || "")
            .replace(/\r/g, "")
            .replace(/[ \t]{2,}/g, " ")
            .replace(/ *\n */g, "\n")
            .replace(/\n{3,}/g, "\n\n")
            .replace(/\s+([,.;:!?])/g, "$1")
            .trim();
    }

    async function streamPlannerReply(message, language, targetEl) {
        const response = await fetch("/api/chat/stream", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, language })
        });
        if (!response.ok) {
            const details = await response.text();
            throw new Error(`Request failed: ${response.status} ${details}`);
        }
        if (!response.body) throw new Error("No response stream.");

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let output = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith("data:")) continue;
                const payload = trimmed.slice(5).trim();
                if (!payload || payload === "[DONE]") continue;
                if (payload.startsWith("[ERROR]")) throw new Error(payload);
                try {
                    const chunk = JSON.parse(payload);
                    output += (chunk || "").replace(/\*\*/g, "");
                    targetEl.textContent = formatAssistantText(output);
                    plannerMessages.scrollTop = plannerMessages.scrollHeight;
                } catch (_) {
                    // Ignore malformed chunks.
                }
            }
        }

        targetEl.textContent = formatAssistantText(output);
    }

    plannerFab.setAttribute("aria-expanded", "false");
    plannerFab.setAttribute("aria-controls", "planner-widget");
    plannerWidget.setAttribute("role", "dialog");
    plannerWidget.setAttribute("aria-labelledby", "planner-widget-title");

    plannerFab.addEventListener("click", () => {
        const willOpen = !plannerWidget.classList.contains("is-open");
        setPlannerOpen(willOpen);
        if (willOpen) {
            if (plannerMessages.children.length === 0) {
                appendPlannerMessage(
                    "Hi! I am your AI Trip Planner. Ask about routes, food, permits, weather, or quieter times to visit.",
                    "bot"
                );
            }
            plannerInput.focus();
        }
    });

    plannerClose.addEventListener("click", () => {
        closePlanner();
    });

    document.addEventListener(
        "click",
        (e) => {
            const target = e.target;
            if (
                target.closest("#destinations-trigger") ||
                target.closest("#explore-trigger") ||
                target.closest("li.nav-item.dropdown > a")
            ) {
                closePlanner();
            }
        },
        true
    );

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && plannerWidget.classList.contains("is-open")) {
            closePlanner();
            plannerFab.focus();
        }
    });

    plannerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const prompt = plannerInput.value.trim();
        if (!prompt) return;

        appendPlannerMessage(prompt, "user");
        plannerInput.value = "";
        const replyEl = appendPlannerMessage("Thinking...", "bot");
        plannerSend.disabled = true;
        plannerSend.textContent = "Sending...";
        try {
            await streamPlannerReply(prompt, plannerLanguage.value, replyEl);
        } catch (error) {
            replyEl.textContent = "Sorry, I could not complete the request.";
        } finally {
            plannerSend.disabled = false;
            plannerSend.textContent = "Send";
        }
    });

    if (plannerPrompts) {
        plannerPrompts.addEventListener("click", (event) => {
            const chip = event.target.closest(".planner-chip");
            if (!chip) return;
            plannerInput.value = chip.textContent.trim();
            plannerForm.requestSubmit();
        });
    }

    plannerInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            plannerForm.requestSubmit();
        }
    });
});
