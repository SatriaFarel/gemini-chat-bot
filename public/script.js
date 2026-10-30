const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const chatBox = document.getElementById("chat-box");

// Maintains chat history in memory
const conversationHistory = [];

// --- Logika Dark/Light Mode ---
const themeToggleBtn = document.getElementById("theme-toggle");
const darkIcon = document.getElementById("theme-toggle-dark-icon");
const lightIcon = document.getElementById("theme-toggle-light-icon");

// Cek tema awal dari localStorage atau preferensi OS
if (
    localStorage.getItem("color-theme") === "dark" ||
    (!("color-theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
) {
    document.documentElement.classList.add("dark");
    lightIcon.classList.remove("hidden");
} else {
    document.documentElement.classList.remove("dark");
    darkIcon.classList.remove("hidden");
}

themeToggleBtn.addEventListener("click", () => {
    darkIcon.classList.toggle("hidden");
    lightIcon.classList.toggle("hidden");

    if (document.documentElement.classList.contains("dark")) {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("color-theme", "light");
    } else {
        document.documentElement.classList.add("dark");
        localStorage.setItem("color-theme", "dark");
    }
});

/**
 * Creates and appends a stylized message bubble into the chat box.
 */
function appendMessage(sender, text) {
    const wrapper = document.createElement("div");
    const isUser = sender === "user";

    wrapper.className = isUser
        ? "flex items-start justify-end gap-3 max-w-[85%] ml-auto"
        : "flex items-start gap-3 max-w-[85%]";

    // Avatar / Badge
    const avatar = document.createElement("div");
    avatar.className = isUser
        ? "w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-900/50 border border-sky-200 dark:border-sky-700/50 text-sky-600 dark:text-sky-300 flex items-center justify-center text-xs font-semibold shrink-0 order-2"
        : "w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-700/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-xs font-semibold shrink-0";
    avatar.textContent = isUser ? "You" : "AI";

    // Message Bubble
    const bubble = document.createElement("div");
    bubble.className = isUser
        ? "bg-indigo-600 text-white text-sm px-4 py-3 rounded-2xl rounded-tr-sm shadow-md leading-relaxed break-words whitespace-pre-wrap order-1"
        : "bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/70 text-slate-800 dark:text-slate-200 text-sm px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm leading-relaxed break-words whitespace-pre-wrap";
    bubble.textContent = text;

    wrapper.appendChild(avatar);
    wrapper.appendChild(bubble);

    chatBox.appendChild(wrapper);
    chatBox.scrollTop = chatBox.scrollHeight;

    return bubble;
}

chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const userText = userInput.value.trim();
    if (!userText) return;

    // 1. Add user's message to chat & conversation history
    appendMessage("user", userText);
    conversationHistory.push({ role: "user", text: userText });

    // Clear and disable input during processing
    userInput.value = "";
    userInput.disabled = true;

    // 2. Show temporary "Thinking..." bubble
    const botBubble = appendMessage("bot", "Memikirkan...");
    botBubble.classList.add("italic", "text-slate-400", "dark:text-slate-400");

    try {
        // 3. Send request to backend
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                conversation: conversationHistory,
            }),
        });

        if (!response.ok) {
            throw new Error(`Server returned status: ${response.status}`);
        }

        const data = await response.json();

        botBubble.classList.remove("italic", "text-slate-400", "dark:text-slate-400");

        // 4. Update bot message with response or fallback message
        if (data && data.result) {
            botBubble.textContent = data.result;
            conversationHistory.push({ role: "model", text: data.result });
        } else {
            botBubble.textContent = "Maaf, tidak ada respon yang diterima.";
            conversationHistory.pop();
        }
    } catch (error) {
        console.error("Chat error:", error);
        botBubble.classList.remove("italic", "text-slate-400", "dark:text-slate-400");
        botBubble.textContent = "Gagal mengambil respon dari server.";
        conversationHistory.pop();
    } finally {
        userInput.disabled = false;
        userInput.focus();
        chatBox.scrollTop = chatBox.scrollHeight;
    }
});