const messages = document.getElementById("messages");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChatBtn");
const clearChatBtn = document.getElementById("clearChatBtn");
const typingWrap = document.getElementById("typingWrap");
const welcomeScreen = document.getElementById("welcomeScreen");
const modelSelect = document.getElementById("modelSelect");
const chatList = document.getElementById("chatList");

const exampleButtons = document.querySelectorAll(".example-btn");
const welcomeCards = document.querySelectorAll(".welcome-card");

const CHATS_STORAGE_KEY = "mgeexai_chats_v1";
const ACTIVE_CHAT_STORAGE_KEY = "mgeexai_active_chat_v1";
const MODEL_STORAGE_KEY = "mgeexai_selected_model_v1";

let chats = [];
let activeChatId = null;
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

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createChat(title = "Neuer Chat") {
  return {
    id: uid(),
    title,
    messages: []
  };
}

function saveChats() {
  localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats));
  localStorage.setItem(ACTIVE_CHAT_STORAGE_KEY, activeChatId || "");
}

function loadChats() {
  try {
    const raw = localStorage.getItem(CHATS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Fehler beim Laden der Chats:", error);
    return [];
  }
}

function getActiveChat() {
  return chats.find((chat) => chat.id === activeChatId) || null;
}

function ensureChatExists() {
  if (chats.length === 0) {
    const firstChat = createChat();
    chats.push(firstChat);
    activeChatId = firstChat.id;
    saveChats();
    return;
  }

  const exists = chats.some((chat) => chat.id === activeChatId);
  if (!exists) {
    activeChatId = chats[0].id;
    saveChats();
  }
}

function updateChatTitle(chat, fallbackText) {
  if (!chat) return;
  if (chat.title !== "Neuer Chat") return;

  const title = (fallbackText || "Neuer Chat").trim().slice(0, 32);
  chat.title = title || "Neuer Chat";
}

function renderChatList() {
  chatList.innerHTML = "";

  chats.forEach((chat) => {
    const row = document.createElement("div");
    row.className = "chat-list-item";

    const switchBtn = document.createElement("button");
    switchBtn.className = `chat-switch-btn ${chat.id === activeChatId ? "active" : ""}`;
    switchBtn.textContent = chat.title || "Neuer Chat";
    switchBtn.addEventListener("click", () => {
      activeChatId = chat.id;
      saveChats();
      renderChatList();
      renderActiveChat();
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "chat-delete-btn";
    deleteBtn.textContent = "✕";
    deleteBtn.addEventListener("click", () => {
      if (chats.length === 1) {
        chats = [createChat()];
        activeChatId = chats[0].id;
      } else {
        chats = chats.filter((item) => item.id !== chat.id);
        if (activeChatId === chat.id) {
          activeChatId = chats[0].id;
        }
      }
      saveChats();
      renderChatList();
      renderActiveChat();
    });

    row.appendChild(switchBtn);
    row.appendChild(deleteBtn);
    chatList.appendChild(row);
  });
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
    } catch {
      button.textContent = "Fehler";
      setTimeout(() => {
        button.textContent = "Kopieren";
      }, 1200);
    }
  });

  return button;
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function applyInlineMarkdown(text) {
  let html = escapeHtml(text);

  html = html.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>');
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

  return html;
}

function createCodeBlock(code, language = "") {
  const wrapper = document.createElement("div");
  wrapper.className = "code-block";

  const header = document.createElement("div");
  header.className = "code-header";

  const lang = document.createElement("span");
  lang.textContent = language || "Code";

  const copyBtn = document.createElement("button");
  copyBtn.className = "code-copy-btn";
  copyBtn.textContent = "Copy";

  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(code);
      copyBtn.textContent = "Copied";
      setTimeout(() => {
        copyBtn.textContent = "Copy";
      }, 1200);
    } catch {
      copyBtn.textContent = "Error";
      setTimeout(() => {
        copyBtn.textContent = "Copy";
      }, 1200);
    }
  });

  header.appendChild(lang);
  header.appendChild(copyBtn);

  const pre = document.createElement("pre");
  const codeEl = document.createElement("code");
  codeEl.textContent = code;
  pre.appendChild(codeEl);

  wrapper.appendChild(header);
  wrapper.appendChild(pre);

  return wrapper;
}

function renderMarkdownToBubble(bubble, text) {
  bubble.innerHTML = "";

  const parts = text.split(/```/);

  parts.forEach((part, index) => {
    if (index % 2 === 1) {
      const lines = part.split("\n");
      const language = lines[0].trim();
      const code = lines.slice(1).join("\n").trimEnd();
      bubble.appendChild(createCodeBlock(code, language));
      return;
    }

    const blocks = part.split(/\n{2,}/);

    blocks.forEach((block) => {
      const trimmed = block.trim();
      if (!trimmed) return;

      if (/^###\s+/.test(trimmed)) {
        const el = document.createElement("h3");
        el.innerHTML = applyInlineMarkdown(trimmed.replace(/^###\s+/, ""));
        bubble.appendChild(el);
        return;
      }

      if (/^##\s+/.test(trimmed)) {
        const el = document.createElement("h2");
        el.innerHTML = applyInlineMarkdown(trimmed.replace(/^##\s+/, ""));
        bubble.appendChild(el);
        return;
      }

      if (/^#\s+/.test(trimmed)) {
        const el = document.createElement("h1");
        el.innerHTML = applyInlineMarkdown(trimmed.replace(/^#\s+/, ""));
        bubble.appendChild(el);
        return;
      }

      if (/^(\-|\*)\s+/m.test(trimmed)) {
        const ul = document.createElement("ul");
        trimmed.split("\n").forEach((line) => {
          const match = line.match(/^(\-|\*)\s+(.*)$/);
          if (!match) return;
          const li = document.createElement("li");
          li.innerHTML = applyInlineMarkdown(match[2]);
          ul.appendChild(li);
        });
        bubble.appendChild(ul);
        return;
      }

      if (/^\d+\.\s+/m.test(trimmed)) {
        const ol = document.createElement("ol");
        trimmed.split("\n").forEach((line) => {
          const match = line.match(/^\d+\.\s+(.*)$/);
          if (!match) return;
          const li = document.createElement("li");
          li.innerHTML = applyInlineMarkdown(match[1]);
          ol.appendChild(li);
        });
        bubble.appendChild(ol);
        return;
      }

      const p = document.createElement("p");
      p.innerHTML = applyInlineMarkdown(trimmed).replace(/\n/g, "<br>");
      bubble.appendChild(p);
    });
  });
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

  if (role === "ai") {
    renderMarkdownToBubble(bubble, text);
  } else {
    bubble.textContent = text;
  }

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
    renderMarkdownToBubble(bubble, current);
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

function renderActiveChat() {
  messages.innerHTML = "";

  const activeChat = getActiveChat();
  if (!activeChat || activeChat.messages.length === 0) {
    showWelcome();
    return;
  }

  hideWelcome();

  activeChat.messages.forEach((item) => {
    addMessage(item.role === "assistant" ? "ai" : "user", item.content);
  });
}

async function sendMessage(text) {
  const userText = text.trim();
  if (!userText) return;

  const activeChat = getActiveChat();
  if (!activeChat) return;

  hideWelcome();

  updateChatTitle(activeChat, userText);
  addMessage("user", userText);

  activeChat.messages.push({ role: "user", content: userText });
  saveChats();
  renderChatList();

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
        history: activeChat.messages,
        model: selectedModel
      })
    });

    const data = await response.json();
    showTyping(false);

    if (!response.ok) {
      const errorText = data.error || "Es gab einen Fehler bei der Anfrage.";
      addMessage("ai", errorText);
      activeChat.messages.push({ role: "assistant", content: errorText });
      saveChats();
      return;
    }

    const reply = data.reply || "Keine Antwort erhalten.";
    const { bubble, contentWrap } = addStreamingMessage("ai");

    await streamTextToBubble(bubble, reply);
    attachCopyAction(contentWrap, reply);

    activeChat.messages.push({ role: "assistant", content: reply });
    saveChats();
  } catch (error) {
    showTyping(false);
    const errorText = "Netzwerkfehler. Bitte versuche es erneut.";
    addMessage("ai", errorText);
    activeChat.messages.push({ role: "assistant", content: errorText });
    saveChats();
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
  const newChat = createChat();
  chats.unshift(newChat);
  activeChatId = newChat.id;
  saveChats();
  renderChatList();
  renderActiveChat();
  showTyping(false);
  chatInput.value = "";
  autoResizeTextarea();
});

clearChatBtn.addEventListener("click", () => {
  const activeChat = getActiveChat();
  if (!activeChat) return;

  const confirmed = confirm("Willst du den aktuellen Chat wirklich löschen?");
  if (!confirmed) return;

  activeChat.messages = [];
  activeChat.title = "Neuer Chat";
  saveChats();
  renderChatList();
  renderActiveChat();
  showTyping(false);
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

chats = loadChats();
activeChatId = localStorage.getItem(ACTIVE_CHAT_STORAGE_KEY);

ensureChatExists();
renderChatList();
renderActiveChat();
autoResizeTextarea();
