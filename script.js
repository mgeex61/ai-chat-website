const messages = document.getElementById("messages");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChatBtn");
const typingWrap = document.getElementById("typingWrap");
const welcomeScreen = document.getElementById("welcomeScreen");

const exampleButtons = document.querySelectorAll(".example-btn");
const welcomeCards = document.querySelectorAll(".welcome-card");

const STORAGE_KEY = "mgeexai_chat_history_v1";

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

function showWelcome() {
  welcomeScreen.classList.remove("hidden");
}

function saveChatHistory() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory));
}

function loadChatHistory() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Fehler beim Laden des Chatverlaufs:", error);
    return [];
  }
}

function createMessageElement(role, text = "") {
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

  return { message, bubble };
}

function addMessage(role, text) {
  const { message } = createMessageElement(role, text);
  messages.appendChild(message);
  scrollToBottom();
}

function addStreamingMessage(role) {
  const { message, bubble } = createMessageElement(role, "");
  messages.appendChild(message);
  scrollToBottom();
  return bubble;
}

function showTyping(show) {
  typingWrap.classList.toggle("hidden", !show);
  if (show) scrollToBottom();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function streamTextToBubble(bubble, text) {
  const words = text.split(" ");
  let current = "";

  for (let i = 0; i < words.length; i++) {
    current += (i === 0 ? "" : " ") + words[i];
    bubble.textContent = current;
    scrollToBottom();

    const word = words[i];
    const pause = Math.min(60, Math.max(18, word.length * 4));
    await sleep(pause);
  }
}

function renderSavedMessages() {
  messages.innerHTML = "";

  if (chatHistory.length === 0) {
    showWelcome();
    return;
  }

  hideWelcome();

  chatHistory.forEach((item) => {
    addMessage(item.role === "assistant" ? "ai" : "user", item.content);
  });
}

async function sendMessage(text) {
  const userText = text.trim();
  if (!userText) return;

  hideWelcome();

  addMessage("user", userText);
  chatHistory.push({ role: "user", content: userText });
  saveChatHistory();

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
      const errorText = data.error || "Es gab einen Fehler bei der Anfrage.";
      addMessage("ai", errorText);
      chatHistory.push({ role: "assistant", content: errorText });
      saveChatHistory();
      return;
    }

    const reply = data.reply || "Keine Antwort erhalten.";
    const bubble = addStreamingMessage("ai");

    await streamTextToBubble(bubble, reply);

    chatHistory.push({ role: "assistant", content: reply });
    saveChatHistory();
  } catch (error) {
    showTyping(false);
    const errorText = "Netzwerkfehler. Bitte versuche es erneut.";
    addMessage("ai", errorText);
    chatHistory.push({ role: "assistant", content: errorText });
    saveChatHistory();
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
    return;
  }

  if (event.key === "Enter" && event.shiftKey) {
    return;
  }
});

newChatBtn.addEventListener("click", () => {
  chatHistory = [];
  localStorage.removeItem(STORAGE_KEY);
  messages.innerHTML = "";
  showTyping(false);
  showWelcome();
  chatInput.value = "";
  autoResizeTextarea();
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

chatHistory = loadChatHistory();
renderSavedMessages();
autoResizeTextarea();
