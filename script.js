/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Configure your Cloudflare Worker URL here (replace with your worker URL)
const WORKER_URL = "https://YOUR_WORKER_SUBDOMAIN.workers.dev/";

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
  el.textContent = text;
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
  const res = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: messagesPayload }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Worker request failed: ${res.status} ${text}`);
  }

  return res.json();
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

    // OpenAI chat completion response: data.choices[0].message.content
    const assistantText =
      data?.choices?.[0]?.message?.content ||
      data?.choices?.[0]?.text ||
      "(no response)";

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
