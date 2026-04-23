const messages = document.getElementById("messages");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChatBtn");
const typingWrap = document.getElementById("typingWrap");
const welcomeScreen = document.getElementById("welcomeScreen");

const exampleButtons = document.querySelectorAll(".example-btn");
const welcomeCards = document.querySelectorAll(".welcome-card");

let chatHistory = [];

function autoResizeTextarea() {
  chatInput.style.height = "auto";
  chatInput.style.height = Math.min(chatInput.scrollHeight, 180) + "px";
}

chatInput.addEventListener("input", autoResizeTextarea);

function scrollToBottom() {
  messages.scrollTop = messages.scrollHeight;
}

function hideWelcome() {
  welcomeScreen.classList.add("hidden");
}

function addMessage(role, text) {
  const message = document.createElement("div");
  message.className = `message ${role === "user" ? "user-message" : "ai-message"}`;

  const avatar = document.createElement("div");
  avatar.className = `avatar ${role === "user" ? "user-avatar" : "ai-avatar"}`;
  avatar.textContent = role === "user" ? "DU" : "AI";

  const bubble = document.createElement("div");
  bubble.className = `bubble ${role === "user" ? "user-bubble" : "ai-bubble"}`;
  bubble.textContent = text;

  message.appendChild(avatar);
  message.appendChild(bubble);
  messages.appendChild(message);

  scrollToBottom();
}

function showTyping(show) {
  typingWrap.classList.toggle("hidden", !show);
  if (show) scrollToBottom();
}

async function sendMessage(text) {
  const userText = text.trim();
  if (!userText) return;

  hideWelcome();
  addMessage("user", userText);
  chatHistory.push({ role: "user", content: userText });

  chatInput.value = "";
  autoResizeTextarea();
  showTyping(true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: userText,
        history: chatHistory
      })
    });

    const data = await response.json();
    showTyping(false);

    if (!response.ok) {
      addMessage("ai", data.error || "Es gab einen Fehler bei der Anfrage.");
      return;
    }

    addMessage("ai", data.reply);
    chatHistory.push({ role: "assistant", content: data.reply });
  } catch (error) {
    showTyping(false);
    addMessage("ai", "Netzwerkfehler. Bitte versuche es erneut.");
    console.error(error);
  }
}

sendBtn.addEventListener("click", () => {
  sendMessage(chatInput.value);
});

chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage(chatInput.value);
  }
});

newChatBtn.addEventListener("click", () => {
  chatHistory = [];
  messages.innerHTML = "";
  showTyping(false);
  welcomeScreen.classList.remove("hidden");
});

exampleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    sendMessage(button.textContent);
  });
});

welcomeCards.forEach((card) => {
  card.addEventListener("click", () => {
    sendMessage(card.textContent);
  });
});

autoResizeTextarea();