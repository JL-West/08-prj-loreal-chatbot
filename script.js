/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Set initial message
chatWindow.textContent = "👋 Hello! How can I help you today?";

/* Handle form submit */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();

  // When using Cloudflare, you'll need to POST a `messages` array in the body,
  // and handle the response using: data.choices[0].message.content

  // Show message
  chatWindow.innerHTML = "I can help with that!";
});
//REPLACE with your actual Cloudflare Worker URL
const CLOUDFLARE_WORKER_URL = "https://loreal-chatbot-worker.jaammiiee99.workers.dev/";
// Send a POST request to the Cloudflare Worker
async function sendMessageToWorker(messages) {
  const response = await fetch(CLOUDFLARE_WORKER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ messages })
  });

  const data = await response.json();
  return data;
}

/* Example usage of sendMessageToWorker */
async function exampleUsage() {
  const messages = [
    { role: "user", content: "Hello, how are you?" }
  ];

  const response = await sendMessageToWorker(messages);
  console.log(response);
}exampleUsage();