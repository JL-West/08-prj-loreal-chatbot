/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Set initial message
chatWindow.textContent = "👋 Hello! How can I help you today?";

/* Handle form submit */
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const userMessage = userInput.value.trim();

  // Show message
  chatWindow.innerHTML = "<strong>You asked:</strong> " + userMessage;
  userInput.value = "";
});
