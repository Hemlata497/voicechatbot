document.addEventListener("DOMContentLoaded", function () {
    const chatBox = document.getElementById("chat-box");
    const userInput = document.getElementById("user-input");
    const sendButton = document.getElementById("send-button");
    const voiceButton = document.getElementById("voice-button");
    const fileUpload = document.getElementById("file-upload");
    const uploadButton = document.getElementById("upload-button");
    const exportButton = document.getElementById("export-button");
    const voicePitch = document.getElementById("voice-pitch");
    const voiceSpeed = document.getElementById("voice-speed");
    const fileContent = document.getElementById("file-content");
    const fileViewer = document.getElementById("file-viewer");
    const voiceProgress = document.getElementById("voice-progress");
    const themeToggle = document.getElementById("theme-toggle");

    let isSending = false;

    // Clear chat history on page load
    localStorage.clear();
    chatBox.innerHTML = "";
    console.log("Chat history cleared on page load.");

    // Load particles.js
    particlesJS("particles", {
        particles: {
            number: { value: 50, density: { enable: true, value_area: 800 } },
            color: { value: "#ffffff" },
            opacity: { value: 0.3, random: true },
            size: { value: 3, random: true },
            move: { enable: true, speed: 1, direction: "none", random: true }
        }
    });

    // Theme toggle
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    updateThemeIcon(savedTheme);
    console.log(`Initialized theme: ${savedTheme}`);

    themeToggle.addEventListener("click", () => {
        const currentTheme = document.documentElement.getAttribute("data-theme");
        const newTheme = currentTheme === "light" ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("theme", newTheme);
        updateThemeIcon(newTheme);
        console.log(`Switched to theme: ${newTheme}`);
    });

    function updateThemeIcon(theme) {
        themeToggle.textContent = theme === "light" ? "🌙" : "☀️";
    }

    // Show typing animation
    function showTypingAnimation() {
        const typingDiv = document.createElement("div");
        typingDiv.classList.add("message", "ai", "typing");
        typingDiv.innerHTML = `<strong>Buddy:</strong> <span class="typing-dots">Typing...</span>`;
        chatBox.appendChild(typingDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
        return typingDiv;
    }

    function removeTypingAnimation(typingDiv) {
        if (typingDiv) typingDiv.remove();
    }

    // Append message to chat box
    function appendMessage(sender, message, className) {
        const messageDiv = document.createElement("div");
        messageDiv.classList.add("message", className);
        messageDiv.innerHTML = `<strong>${sender}:</strong> ${message}`;
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // Send text message
    function sendMessage(message) {
        if (isSending) {
            console.log("Send blocked: already sending.");
            return;
        }
        message = message.trim();
        if (!message) {
            appendMessage("Buddy", "Please type a message, buddy!", "ai");
            console.log("Empty message attempted.");
            return;
        }

        isSending = true;
        userInput.disabled = true;
        sendButton.disabled = true;
        console.log(`Sending message: ${message}`);

        appendMessage("You", message, "user");
        const typingDiv = showTypingAnimation();

        fetch("/get_response", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: message })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            removeTypingAnimation(typingDiv);
            appendMessage("Buddy", data.response, "ai");
            speakText(data.response);
            console.log("Message sent successfully, response received.");
        })
        .catch(error => {
            removeTypingAnimation(typingDiv);
            appendMessage("Buddy", "Oops, something went wrong, buddy! Try again?", "ai");
            console.error("Send message error:", error);
        })
        .finally(() => {
            isSending = false;
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.value = "";
            userInput.focus();
            console.log("Send process completed.");
        });
    }

    // File upload
    uploadButton.addEventListener("click", () => {
        fileUpload.click();
        console.log("File upload button clicked.");
    });

    fileUpload.addEventListener("change", function () {
        const file = fileUpload.files[0];
        if (!file) {
            console.log("No file selected.");
            return;
        }
        const typingDiv = showTypingAnimation();
        const formData = new FormData();
        formData.append("file", file);
        console.log("Uploading file:", file.name);
        fetch("/upload_file", {
            method: "POST",
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            removeTypingAnimation(typingDiv);
            appendMessage("Buddy", data.response, "ai");
            speakText(data.response);
            fileContent.value = data.response.includes("Topics:") ? data.response.split("Topics:")[0] : data.response;
            fileViewer.style.display = "block";
            fileUpload.value = "";
            console.log("File uploaded successfully.");
        })
        .catch(error => {
            removeTypingAnimation(typingDiv);
            appendMessage("Buddy", "Oops, couldn't process the file, buddy!", "ai");
            console.error("File upload error:", error);
        });
    });

    // File content highlighting
    fileContent.addEventListener("mouseup", () => {
        const selectedText = window.getSelection().toString();
        if (selectedText) {
            const typingDiv = showTypingAnimation();
            console.log("Highlighted text:", selectedText);
            fetch("/highlight_text", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: selectedText })
            })
            .then(response => response.json())
            .then(data => {
                removeTypingAnimation(typingDiv);
                appendMessage("Buddy", data.response, "ai");
                speakText(data.response);
                console.log("Highlighted text processed.");
            })
            .catch(error => {
                console.error("Highlight text error:", error);
            });
        }
    });

    // Message reactions
    chatBox.addEventListener("click", (e) => {
        const messageDiv = e.target.closest(".message.ai");
        if (messageDiv) {
            const reaction = prompt("Add a reaction emoji (e.g., 👍):");
            if (reaction && /[\p{Emoji_Presentation}\p{Emoji}]/u.test(reaction)) {
                const reactionSpan = document.createElement("span");
                reactionSpan.classList.add("reaction");
                reactionSpan.textContent = reaction;
                messageDiv.appendChild(reactionSpan);
                console.log("Reaction added:", reaction);
            }
        }
    });

    // Voice input with progress bar
    let recognition = null;
    voiceButton.addEventListener("click", () => {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = "en-US";
        recognition.onstart = function () {
            voiceButton.style.background = document.documentElement.getAttribute("data-theme") === "light" ? "#4a90e2" : "#334155";
            voiceProgress.style.width = "0%";
            voiceProgress.style.transition = "width 10s linear";
            voiceProgress.style.width = "100%";
            console.log("Voice recognition started.");
        };
        recognition.onresult = function (event) {
            let speechResult = event.results[0][0].transcript;
            userInput.value = speechResult;
            sendMessage(speechResult);
            voiceButton.style.background = "";
            voiceProgress.style.width = "0%";
            voiceProgress.style.transition = "none";
            console.log("Voice input received:", speechResult);
        };
        recognition.onend = function () {
            voiceButton.style.background = "";
            voiceProgress.style.width = "0%";
            voiceProgress.style.transition = "none";
            recognition = null;
            console.log("Voice recognition ended.");
        };
        recognition.start();
    });

    // Voice customization
    function speakText(text) {
        if (!window.speechSynthesis) {
            console.error("Speech synthesis not supported in this browser.");
            appendMessage("Buddy", "Sorry, text-to-speech isn't supported in your browser!", "ai");
            return;
        }
        console.log("Attempting to speak text:", text);
        const cleanText = text.replace(/[\p{Emoji_Presentation}\p{Emoji}\u{200D}\u{FE0F}]/gu, '');
        let speech = new SpeechSynthesisUtterance(cleanText);
        speech.lang = "en-US";
        speech.volume = 1;
        speech.pitch = parseFloat(voicePitch.value) || 1;
        speech.rate = parseFloat(voiceSpeed.value) || 1;
        speech.onstart = () => console.log("Speech started.");
        speech.onend = () => console.log("Speech ended.");
        speech.onerror = (e) => console.error("Speech error:", e);
        try {
            window.speechSynthesis.speak(speech);
        } catch (e) {
            console.error("Error triggering speech:", e);
            appendMessage("Buddy", "Oops, couldn't speak the response! Is your audio enabled?", "ai");
        }
    }

    // Export chat
    exportButton.addEventListener("click", () => {
        console.log("Export chat button clicked.");
        fetch("/export_chat")
        .then(response => response.json())
        .then(data => {
            const blob = new Blob([data.chat], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `chat.txt`;
            a.click();
            URL.revokeObjectURL(url);
            console.log("Chat exported successfully.");
        })
        .catch(error => {
            console.error("Export chat error:", error);
        });
    });

    // Event listeners for Enter key and Send button
    userInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage(userInput.value);
            console.log("Enter key pressed to send message.");
        }
    });

    sendButton.addEventListener("click", (event) => {
        event.preventDefault();
        sendMessage(userInput.value);
        console.log("Send button clicked.");
    });

    // Initial fetch to trigger welcome message
    fetch("/get_response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "" })
    })
    .then(response => response.json())
    .then(data => {
        appendMessage("Buddy", data.response, "ai");
        speakText(data.response);
        console.log("Welcome message received.");
    })
    .catch(error => {
        console.error("Initial fetch error:", error);
    });
});