document.addEventListener("DOMContentLoaded", function () {
    const chatBox = document.getElementById("chat-box");
    const userInput = document.getElementById("user-input");
    const sendButton = document.getElementById("send-button");
    const voiceButton = document.getElementById("voice-button");
    const themeToggle = document.getElementById("theme-toggle");

    // Theme toggle functionality
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeIcon(savedTheme);

    themeToggle.addEventListener("click", () => {
        const currentTheme = document.documentElement.getAttribute("data-theme");
        const newTheme = currentTheme === "light" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);
        updateThemeIcon(newTheme);
    });

    function updateThemeIcon(theme) {
        themeToggle.textContent = theme === "light" ? "🌙" : "☀️";
    }

    // Send message to Flask backend
    function sendMessage(message) {
        if (message.trim() === "") return;
        appendMessage("You", message, "user");
        userInput.value = "";
        fetch("/get_response", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: message })
        })
        .then(response => response.json())
        .then(data => {
            appendMessage("AI Assistant", data.response, "ai");
            speakText(data.response);
        })
        .catch(error => {
            console.error("Error:", error);
            appendMessage("AI Assistant", "Oops, something went wrong!", "ai");
        });
    }

    // Quick reply support
    window.sendQuickReply = function(message) {
        sendMessage(message);
    };

    // Append message to chat window
    function appendMessage(sender, message, senderClass) {
        let messageDiv = document.createElement("div");
        messageDiv.classList.add("message", senderClass);
        messageDiv.innerHTML = `<strong>${sender}:</strong> ${message}`;
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // Speech synthesis
    function speakText(text) {
        let speech = new SpeechSynthesisUtterance(text);
        speech.lang = "en-US";
        speech.volume = 1;
        speech.pitch = 1;
        speech.rate = 1;
        window.speechSynthesis.speak(speech);
    }

    // Voice input
    function voiceInput() {
        let recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = "en-US";
        recognition.onstart = function () {
            console.log("Listening...");
            voiceButton.style.background = document.documentElement.getAttribute("data-theme") === "light" ? "#1e40af" : "#334155";
        };
        recognition.onresult = function (event) {
            let speechResult = event.results[0][0].transcript;
            userInput.value = speechResult;
            sendMessage(speechResult);
            voiceButton.style.background = "";
        };
        recognition.onend = function () {
            voiceButton.style.background = "";
        };
        recognition.start();
    }

    // Event listeners
    sendButton.addEventListener("click", () => sendMessage(userInput.value));
    voiceButton.addEventListener("click", voiceInput);
    userInput.addEventListener("keydown", function(event) {
        if (event.key === "Enter") {
            event.preventDefault();
            sendMessage(userInput.value);
        }
    });

    // Welcome message
    appendMessage("AI Assistant", "Hello! I'm here to help. What's on your mind?", "ai");
});