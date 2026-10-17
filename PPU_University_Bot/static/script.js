
const launcher = document.getElementById("chatLauncher");
const chatWindow = document.getElementById("chatWindow");
const closeChatButton = document.getElementById("closeChat");
const openChatButton = document.getElementById("openChat");
const openChatBottom = document.getElementById("openChatBottom");

const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const chatMessages = document.getElementById("chatMessages");
const quickQuestions = document.getElementById("quickQuestions");

let isSending = false;


function openChat() {
    chatWindow.classList.add("open");
    launcher.classList.add("is-open");

    launcher.setAttribute("aria-expanded", "true");
    chatWindow.setAttribute("aria-hidden", "false");

    messageInput.focus();
}


function closeChat() {
    chatWindow.classList.remove("open");
    launcher.classList.remove("is-open");

    launcher.setAttribute("aria-expanded", "false");
    chatWindow.setAttribute("aria-hidden", "true");
}


function toggleChat() {
    if (chatWindow.classList.contains("open")) {
        closeChat();
    } else {
        openChat();
    }
}


function addMessage(text, sender) {
    const message = document.createElement("div");
    message.className = `message ${sender}-message`;

    if (sender === "bot") {
        const avatar = document.createElement("div");
        avatar.className = "message-avatar";
        avatar.textContent = "🎓";
        message.appendChild(avatar);
    }

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";

    // نستخدم textContent لمنع تفسير الرد كـ HTML
    bubble.textContent = text;

    message.appendChild(bubble);
    chatMessages.appendChild(message);

    chatMessages.scrollTop = chatMessages.scrollHeight;

    return message;
}


function showTyping() {
    const typing = document.createElement("div");

    typing.className = "typing-indicator";
    typing.textContent = "المساعد يكتب...";

    chatMessages.appendChild(typing);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return typing;
}


async function sendMessage(text) {
    const message = text.trim();

    if (!message || isSending) {
        return;
    }

    openChat();

    if (quickQuestions) {
        quickQuestions.remove();
    }

    addMessage(message, "user");

    messageInput.value = "";
    isSending = true;
    sendButton.disabled = true;
    messageInput.disabled = true;

    const typing = showTyping();

    try {
        const response = await fetch("/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: message
            })
        });

        const data = await response.json();

        typing.remove();

        if (!response.ok) {
            addMessage(
                data.reply || "تعذر إرسال السؤال. حاول مرة أخرى.",
                "bot"
            );
            return;
        }

        addMessage(
            data.reply || "لم يصل رد من المساعد.",
            "bot"
        );

    } catch (error) {
        typing.remove();

        addMessage(
            "تعذر الاتصال بالخادم. تأكد أن برنامج Python يعمل، ثم حاول مرة أخرى.",
            "bot"
        );

        console.error("Chat request failed:", error);

    } finally {
        isSending = false;
        sendButton.disabled = false;
        messageInput.disabled = false;
        messageInput.focus();
    }
}


// فتح وإغلاق نافذة الدردشة
launcher.addEventListener("click", toggleChat);
closeChatButton.addEventListener("click", closeChat);

openChatButton.addEventListener("click", openChat);
openChatBottom.addEventListener("click", openChat);


// إرسال الرسالة
chatForm.addEventListener("submit", function (event) {
    event.preventDefault();
    sendMessage(messageInput.value);
});


// الأسئلة المقترحة داخل المحادثة
chatMessages.addEventListener("click", function (event) {
    const button = event.target.closest("[data-question]");

    if (!button) {
        return;
    }

    sendMessage(button.dataset.question);
});


// بطاقات الخدمات في الصفحة
document.querySelectorAll(".service-card").forEach(function (card) {
    card.addEventListener("click", function () {
        sendMessage(card.dataset.question);
    });
});


// إغلاق النافذة باستخدام زر Escape
document.addEventListener("keydown", function (event) {
    if (
        event.key === "Escape" &&
        chatWindow.classList.contains("open")
    ) {
        closeChat();
    }
});
