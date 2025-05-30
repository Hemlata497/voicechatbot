document.addEventListener("DOMContentLoaded", function () {
    const chatBox = document.getElementById("chat-box");
    const userInput = document.getElementById("user-input");
    const sendButton = document.getElementById("send-button");
    const voiceButton = document.getElementById("voice-button");

    // Function to send user message to the Flask backend
    function sendMessage(message) {
        if (message.trim() === "") return;

        // Append user message to the chat window
        appendMessage("You", message, "user");
        userInput.value = "";

        fetch("/get_response", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: message })
        })
        .then(response => response.json())
        .then(data => {
            // Append bot message to the chat window
            appendMessage("AI Assistant", data.response, "ai");
            speakText(data.response);
        })
        .catch(error => console.error("Error:", error));
    }

    // Function for quick reply buttons
    window.sendQuickReply = function(message) {
        sendMessage(message);
    };

    // Function to append messages to the chat window
    function appendMessage(sender, message, senderClass) {
        let messageDiv = document.createElement("div");
        messageDiv.classList.add("message", senderClass);
        messageDiv.innerHTML = `<strong>${sender}:</strong> ${message}`;
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // Function for speech synthesis (Bot reads response aloud)
    function speakText(text) {
        let speech = new SpeechSynthesisUtterance(text);
        speech.lang = "en-US";
        speech.volume = 1;
        speech.pitch = 1;
        speech.rate = 1;
        window.speechSynthesis.speak(speech);
    }

    // Function for voice input (Speech-to-Text)
    function voiceInput() {
        let recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = "en-US";

        recognition.onstart = function () {
            console.log("Listening...");
            voiceButton.style.background = "#1e40af"; // Visual feedback
        };

        recognition.onresult = function (event) {
            let speechResult = event.results[0][0].transcript;
            userInput.value = speechResult;
            sendMessage(speechResult);
            voiceButton.style.background = "#3b82f6";
        };

        recognition.onend = function () {
            voiceButton.style.background = "#3b82f6";
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

    // Display welcome message
    appendMessage("AI Assistant", "Hello! How can I assist you today?", "ai");
});