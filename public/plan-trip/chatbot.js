const statusText = document.getElementById("status");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const chatMessages = document.getElementById("chat-messages");
const sendBtn = document.getElementById("send-btn");
const languageSelect = document.getElementById("language-select");
const quickPrompts = document.getElementById("quick-prompts");

function setStatus(text, isError = false) {
    statusText.textContent = text;
    statusText.classList.toggle("status-text--error", isError);
}

function addMessage(text, role) {
    const el = document.createElement("div");
    el.className = `msg ${role}`;
    el.textContent = text;
    chatMessages.appendChild(el);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return el;
}

// Strips out markdown bolding symbols so they don't appear in the text UI
function cleanText(text) {
    return (text || "").replace(/\*\*/g, "");
}

// Heavy regex formatter - cleans up AI spacing and line breaks
function formatAssistantText(text) {
    return (text || "")
        .replace(/\r/g, "")
        .replace(/[ \t]{2,}/g, " ")
        .replace(/ *\n */g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/\s+([,.;:!?])/g, "$1")
        .trim();
}

function setSendingState(isSending) {
    sendBtn.disabled = isSending;
    if (isSending) {
        sendBtn.textContent = "Sending...";
    } else {
        sendBtn.innerHTML =
            'Send <span class="material-symbols-outlined" aria-hidden="true">send</span>';
    }
}

async function streamChatReply(userPrompt, language, assistantMessageEl) {
    const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: userPrompt,
            language
        })
    });

    if (!response.ok) {
        const details = await response.text();
        throw new Error(`Request failed: ${response.status} ${details}`);
    }
    if (!response.body) {
        throw new Error("No stream body returned from server.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let answer = "";
    
    // Performance Fix: Track time to throttle DOM scrolling
    let lastScrollTime = 0;

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
                const piece = JSON.parse(payload);
                // Accumulate raw text
                answer += piece;
                
                // Performance Fix 1: Just do a basic clean during the live stream
                assistantMessageEl.textContent = cleanText(answer);
                
                // Performance Fix 2: Only force a browser reflow (scroll) every 100ms
                const now = Date.now();
                if (now - lastScrollTime > 100) {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                    lastScrollTime = now;
                }
            } catch (_) {
                // Ignore malformed JSON chunks.
            }
        }
    }

    // Performance Fix 3: Run the heavy regex formatting exactly ONCE at the end
    if (!answer) {
        assistantMessageEl.textContent = "No response text returned.";
    } else {
        const finalCleaned = cleanText(answer);
        assistantMessageEl.textContent = formatAssistantText(finalCleaned);
        chatMessages.scrollTop = chatMessages.scrollHeight; // Final scroll to bottom
    }
}

chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const prompt = userInput.value.trim();
    const language = languageSelect.value;
    if (!prompt) return;

    addMessage(prompt, "user");
    userInput.value = "";
    const assistantMessage = addMessage("Thinking...", "assistant");
    setSendingState(true);
    setStatus("Streaming reply...");

    try {
        await streamChatReply(prompt, language, assistantMessage);
        setStatus("Connected");
    } catch (error) {
        assistantMessage.textContent = "Sorry, I could not complete the request.";
        setStatus(error.message, true);
    } finally {
        setSendingState(false);
    }
});

userInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        chatForm.requestSubmit();
    }
});

if (quickPrompts) {
    quickPrompts.addEventListener("click", (event) => {
        const chip = event.target.closest(".prompt-chip");
        if (!chip) return;
        userInput.value = chip.textContent.trim();
        chatForm.requestSubmit();
    });
}

function buildTripPromptFromForm() {
    const daysEl = document.getElementById("trip-days");
    const paceEl = document.getElementById("trip-pace");
    const budgetEl = document.getElementById("trip-budget");
    const partyEl = document.getElementById("trip-party");
    const days = daysEl ? daysEl.value : "3";
    const pace = paceEl ? paceEl.value.replace(/^\w/, (c) => c.toUpperCase()) : "Balanced";
    const budget = budgetEl ? budgetEl.options[budgetEl.selectedIndex].text.replace(/\s—.*$/, "").trim() : "moderate";
    const party = partyEl ? partyEl.value : "a solo traveler";
    const interests = Array.from(document.querySelectorAll(".trip-interest:checked")).map((c) => c.value);
    const interestLine = interests.length ? interests.join(", ") : "general sightseeing";

    return (
        `Plan a ${days}-day Mizoram trip for ${party} with a ${pace.toLowerCase()} pace and a ${budget.toLowerCase()} budget. ` +
        `Interests: ${interestLine}. ` +
        `Include realistic travel times between regions, one quieter half-day option, ` +
        `and any permit or seasonal notes I should know. Keep the reply structured by day.`
    );
}

const planGenerateBtn = document.getElementById("plan-generate-btn");
const planClearBtn = document.getElementById("plan-clear-prompt-btn");

if (planGenerateBtn && userInput) {
    planGenerateBtn.addEventListener("click", () => {
        userInput.value = buildTripPromptFromForm();
        userInput.focus();
        userInput.scrollIntoView({ behavior: "smooth", block: "center" });
    });
}

if (planClearBtn && userInput) {
    planClearBtn.addEventListener("click", () => {
        userInput.value = "";
        userInput.focus();
    });
}

window.addEventListener("DOMContentLoaded", () => {
    setStatus("Smart Planner is online.");
    addMessage(
        "Hi! Ask me anything about planning your Mizoram trip — or use AI trip builder above to draft a detailed prompt.",
        "assistant"
    );
});