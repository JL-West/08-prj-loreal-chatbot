/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Configure your Cloudflare Worker URL here (replace with your worker URL)
const WORKER_URL = "https://loreal-chatbot-worker.jaammiiee99.workers.dev/";

// Resolve the effective worker URL. Priority:
// 1. `<meta name="worker-url" content="...">` in `index.html`
// 2. `localStorage.worker_url` (persisted on the client)
// 3. the `WORKER_URL` constant above (if not the placeholder)
function getEffectiveWorkerUrl() {
  try {
    const meta = document
      .querySelector('meta[name="worker-url"]')
      ?.content?.trim();
    if (meta) {
      localStorage.setItem("worker_url", meta);
      return meta;
    }

    const stored = localStorage.getItem("worker_url");
    if (stored) return stored;

    if (WORKER_URL && !WORKER_URL.includes("YOUR_WORKER_SUBDOMAIN")) {
      localStorage.setItem("worker_url", WORKER_URL);
      return WORKER_URL;
    }

    return null;
  } catch (e) {
    console.warn("Error resolving worker URL:", e);
    return null;
  }
}

/* Settings UI: allow editing worker URL from the page */
const settingsBtn = document.getElementById("settingsBtn");
const settingsPanel = document.getElementById("settingsPanel");
const workerUrlInput = document.getElementById("workerUrlInput");
const saveWorkerUrlBtn = document.getElementById("saveWorkerUrl");
const closeSettingsBtn = document.getElementById("closeSettings");

function openSettings() {
  const url = getEffectiveWorkerUrl() || "";
  workerUrlInput.value = url;
  settingsPanel.setAttribute("aria-hidden", "false");
  settingsPanel.classList.add("show");
}

function closeSettings() {
  settingsPanel.setAttribute("aria-hidden", "true");
  settingsPanel.classList.remove("show");
}

if (settingsBtn) {
  settingsBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const isHidden = settingsPanel.getAttribute("aria-hidden") === "true";
    if (isHidden) openSettings();
    else closeSettings();
  });
}

if (saveWorkerUrlBtn) {
  saveWorkerUrlBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const value = workerUrlInput.value.trim();
    if (value) {
      localStorage.setItem("worker_url", value);
      // Provide quick feedback
      saveWorkerUrlBtn.textContent = "Saved";
      setTimeout(() => (saveWorkerUrlBtn.textContent = "Save"), 1200);
      closeSettings();
    }
  });
}

if (closeSettingsBtn) {
  closeSettingsBtn.addEventListener("click", (e) => {
    e.preventDefault();
    closeSettings();
  });
}

// Conversation memory (sent to the worker as `messages`)
const messages = [
  {
    role: "system",
    content:
      "You are L'Oréal Product Advisor. Only answer questions about L'Oréal products, recommended routines, product usage, and product recommendations. If a user asks about topics that are not related to L'Oréal products, routines, or recommendations, politely decline and say you can only help with L'Oréal product-related questions. Keep answers helpful, concise, and professional.",
  },
];

// Initial greeting
appendMessage(
  "ai",
  "👋 Hello! I'm the L'Oréal Product Advisor — how can I help?"
);

/* Helper: append a message to the chat window */
function appendMessage(role, text, className = "") {
  const el = document.createElement("div");
  el.className = `msg ${role} ${className}`.trim();

  // avatar
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "user" ? "🙂" : "💄";

  // bubble with text and meta (timestamp)
  const bubble = document.createElement("div");
  bubble.className = "bubble";

  const bubbleText = document.createElement("div");
  bubbleText.className = "bubble-text";
  bubbleText.textContent = text;

  const meta = document.createElement("div");
  meta.className = "meta";
  const ts = document.createElement("span");
  ts.className = "timestamp";
  ts.textContent = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  meta.appendChild(ts);

  bubble.appendChild(bubbleText);
  bubble.appendChild(meta);

  el.appendChild(avatar);
  el.appendChild(bubble);

  chatWindow.appendChild(el);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return el;
}

/* Helper: show a simple loading indicator message */
function appendLoading() {
  return appendMessage("ai", "...", "loading");
}

/* Send a POST request to the Cloudflare Worker */
async function sendMessageToWorker(messagesPayload) {
  const effectiveUrl = getEffectiveWorkerUrl();
  if (!effectiveUrl) {
    throw new Error(
      'WORKER_URL is not configured. Add a <meta name="worker-url" content="https://..."> to index.html or set WORKER_URL in script.js.'
    );
  }

  try {
    const res = await fetch(effectiveUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: messagesPayload }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Worker request failed: ${res.status} ${text}`);
    }

    return res.json();
  } catch (err) {
    // Re-throw with an informative message for common causes
    if (err instanceof TypeError && err.message === "Failed to fetch") {
      throw new Error(
        "Failed to fetch the Worker. Possible causes: worker not deployed, wrong WORKER_URL, CORS blocked, or you're viewing the page via file://. Run a local server and ensure the worker URL is reachable."
      );
    }
    throw err;
  }
}

/* Handle form submit: capture input, display, send to worker, display reply */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const content = userInput.value.trim();
  if (!content) return;

  // show user message
  appendMessage("user", content);
  messages.push({ role: "user", content });

  // clear input and disable while waiting
  userInput.value = "";
  userInput.disabled = true;

  // show loading
  const loadingEl = appendLoading();

  try {
    const data = await sendMessageToWorker(messages);

    // Log raw response for debugging
    console.log("Worker response:", data);

    // If worker returned an error object, show it to the user
    let assistantText = null;
    if (data?.error) {
      // OpenAI or worker-side error
      const errMsg =
        data.error?.message || data.error || JSON.stringify(data.error);
      assistantText = `Error from worker: ${errMsg}`;
    } else if (Array.isArray(data?.choices) && data.choices.length > 0) {
      // Typical chat completion
      assistantText =
        data.choices[0]?.message?.content || data.choices[0]?.text || null;
    } else if (data && typeof data === "object") {
      // Unexpected but non-error response — show a truncated debug output
      assistantText = `Unexpected response structure: ${JSON.stringify(
        data
      ).slice(0, 500)}`;
    }

    if (!assistantText) {
      assistantText = "(no response)";
    }

    // remove loading and show assistant response
    loadingEl.remove();
    appendMessage("ai", assistantText);

    // save assistant message to convo
    messages.push({ role: "assistant", content: assistantText });
  } catch (err) {
    loadingEl.remove();
    appendMessage("ai", `Error: ${err.message}`);
    console.error(err);
  } finally {
    userInput.disabled = false;
    userInput.focus();
  }
});
