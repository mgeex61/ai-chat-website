const messages = document.getElementById("messages");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChatBtn");
const clearChatBtn = document.getElementById("clearChatBtn");
const typingWrap = document.getElementById("typingWrap");
const welcomeScreen = document.getElementById("welcomeScreen");
const modelSelect = document.getElementById("modelSelect");

const exampleButtons = document.querySelectorAll(".example-btn");
const welcomeCards = document.querySelectorAll(".welcome-card");

const CHAT_STORAGE_KEY = "mgeexai_chat_history_v2";
const MODEL_STORAGE_KEY = "mgeexai_selected_model_v1";

let chatHistory = [];
let selectedModel = localStorage.getItem(MODEL_STORAGE_KEY) || "gemini-2.5-flash";

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
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistory));
}

function loadChatHistory() {
  try {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Fehler beim Laden des Chatverlaufs:", error);
    return [];
  }
}

function createCopyButton(text) {
  const button = document.createElement("button");
  button.className = "copy-btn";
  button.textContent = "Kopieren";

  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "Kopiert";
      setTimeout(() => {
        button.textContent = "Kopieren";
      }, 1200);
    } catch (error) {
      button.textContent = "Fehler";
      setTimeout(() => {
        button.textContent = "Kopieren";
      }, 1200);
    }
  });

  return button;
}

function createMessageElement(role, text = "") {
  const message = document.createElement("div");
  message.className = `message ${role === "user" ? "user-message" : "ai-message"}`;

  const avatar = document.createElement("div");
  avatar.className = `avatar ${role === "user" ? "user-avatar" : "ai-avatar"}`;
  avatar.textContent = role === "user" ? "DU" : "AI";

  const contentWrap = document.createElement("div");
  contentWrap.className = "message-content";

  const bubble = document.createElement("div");
  bubble.className = `bubble ${role === "user" ? "user-bubble" : "ai-bubble"}`;
  bubble.textContent = text;

  contentWrap.appendChild(bubble);

  if (role === "ai" && text) {
    const actions = document.createElement("div");
    actions.className = "message-actions";
    actions.appendChild(createCopyButton(text));
    contentWrap.appendChild(actions);
  }

  message.appendChild(avatar);
  message.appendChild(contentWrap);

  return { message, bubble, contentWrap };
}

function addMessage(role, text) {
  const { message } = createMessageElement(role, text);
  messages.appendChild(message);
  scrollToBottom();
}

function addStreamingMessage(role) {
  const { message, bubble, contentWrap } = createMessageElement(role, "");
  messages.appendChild(message);
  scrollToBottom();
  return { bubble, contentWrap };
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

function attachCopyAction(contentWrap, text) {
  const actions = document.createElement("div");
  actions.className = "message-actions";
  actions.appendChild(createCopyButton(text));
  contentWrap.appendChild(actions);
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
        history: chatHistory,
        model: selectedModel
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
    const { bubble, contentWrap } = addStreamingMessage("ai");

    await streamTextToBubble(bubble, reply);
    attachCopyAction(contentWrap, reply);

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
  }
});

newChatBtn.addEventListener("click", () => {
  chatHistory = [];
  localStorage.removeItem(CHAT_STORAGE_KEY);
  messages.innerHTML = "";
  showTyping(false);
  showWelcome();
  chatInput.value = "";
  autoResizeTextarea();
});

clearChatBtn.addEventListener("click", () => {
  const confirmed = confirm("Willst du den kompletten Chat wirklich löschen?");
  if (!confirmed) return;

  chatHistory = [];
  localStorage.removeItem(CHAT_STORAGE_KEY);
  messages.innerHTML = "";
  showTyping(false);
  showWelcome();
});

modelSelect.value = selectedModel;

modelSelect.addEventListener("change", () => {
  selectedModel = modelSelect.value;
  localStorage.setItem(MODEL_STORAGE_KEY, selectedModel);
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
