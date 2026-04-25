const messages = document.getElementById("messages");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChatBtn");
const typingWrap = document.getElementById("typingWrap");
const welcomeScreen = document.getElementById("welcomeScreen");

const imageInput = document.getElementById("imageInput");
const imageBtn = document.getElementById("imageBtn");
const imagePreview = document.getElementById("imagePreview");

const exampleButtons = document.querySelectorAll(".example-btn");
const welcomeCards = document.querySelectorAll(".welcome-card");

let chatHistory = JSON.parse(localStorage.getItem("mgeexAI_history")) || [];
let selectedImage = null;

function saveHistory() {
  localStorage.setItem("mgeexAI_history", JSON.stringify(chatHistory));
}

function autoResizeTextarea() {
  chatInput.style.height = "auto";
  chatInput.style.height = Math.min(chatInput.scrollHeight, 170) + "px";
}

function scrollToBottom() {
  messages.scrollTop = messages.scrollHeight;
}

function hideWelcome() {
  welcomeScreen.classList.add("hidden");
}

function showWelcomeIfEmpty() {
  welcomeScreen.classList.toggle("hidden", chatHistory.length > 0);
}

function addMessage(role, text, save = true) {
  const wrapper = document.createElement("div");
  wrapper.className = `message-row ${role}`;

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = text;

  wrapper.appendChild(bubble);
  messages.appendChild(wrapper);

  if (save) {
    chatHistory.push({ role, content: text });
    saveHistory();
  }

  scrollToBottom();
}

function renderHistory() {
  messages.innerHTML = "";

  chatHistory.forEach((msg) => {
    addMessage(msg.role, msg.content, false);
  });

  showWelcomeIfEmpty();
}

function showTyping(show) {
  typingWrap.classList.toggle("hidden", !show);
  if (show) scrollToBottom();
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(",")[1];

      resolve({
        mimeType: file.type,
        data: base64
      });
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function showImagePreview(file) {
  imagePreview.innerHTML = "";

  const img = document.createElement("img");
  img.src = URL.createObjectURL(file);

  imagePreview.appendChild(img);
  imagePreview.classList.remove("hidden");
}

function clearImagePreview() {
  selectedImage = null;
  imageInput.value = "";
  imagePreview.innerHTML = "";
  imagePreview.classList.add("hidden");
}

async function sendMessage(text) {
  const userText = text.trim();

  if (!userText && !selectedImage) return;

  hideWelcome();

  const visibleText = selectedImage
    ? `${userText || "Analysiere dieses Bild."}\n[Bild hochgeladen]`
    : userText;

  addMessage("user", visibleText);

  chatInput.value = "";
  autoResizeTextarea();
  showTyping(true);
  sendBtn.disabled = true;

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: userText || "Analysiere dieses Bild.",
        history: chatHistory.slice(-10),
        image: selectedImage
      })
    });

    const data = await response.json();

    showTyping(false);
    sendBtn.disabled = false;
    clearImagePreview();

    if (!response.ok) {
      addMessage("assistant", data.error || "Es gab einen Fehler bei Gemini.");
      return;
    }

    if (!data.reply || data.reply.trim().length < 2) {
      addMessage("assistant", "Die Antwort konnte nicht vollständig generiert werden.");
      return;
    }

    addMessage("assistant", data.reply.trim());
  } catch (error) {
    showTyping(false);
    sendBtn.disabled = false;
    addMessage("assistant", "Netzwerkfehler. Bitte versuche es erneut.");
    console.error(error);
  }
}

sendBtn.addEventListener("click", () => {
  sendMessage(chatInput.value);
});

chatInput.addEventListener("input", autoResizeTextarea);

chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage(chatInput.value);
  }
});

newChatBtn.addEventListener("click", () => {
  chatHistory = [];
  saveHistory();
  messages.innerHTML = "";
  showTyping(false);
  clearImagePreview();
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

imageBtn.addEventListener("click", () => {
  imageInput.click();
});

imageInput.addEventListener("change", async () => {
  const file = imageInput.files[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Bitte nur Bilder hochladen.");
    return;
  }

  selectedImage = await fileToBase64(file);
  showImagePreview(file);
});

renderHistory();
autoResizeTextarea();
