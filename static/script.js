document.addEventListener("DOMContentLoaded", function () {
    const chatBox = document.getElementById("chat-box");
    const userInput = document.getElementById("user-input");
    const sendButton = document.getElementById("send-button");
    const voiceButton = document.getElementById("voice-button");

    // Function to send user message to the Flask backend
    function sendMessage() {
        let message = userInput.value.trim();
        if (message === "") return;

        // Append user message to the chat window
        appendMessage("User", message, "user");
        userInput.value = "";

        fetch("/get_response", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: message })
        })
        .then(response => response.json())
        .then(data => {
            // Append bot message to the chat window
            appendMessage("Bot", data.response, "ai");
            speakText(data.response);
        })
        .catch(error => console.error("Error:", error));
    }

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
        window.speechSynthesis.speak(speech);
    }

    // Function for voice input (Speech-to-Text)
    function voiceInput() {
        let recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = "en-US";

        recognition.onstart = function () {
            console.log("Listening...");
        };

        recognition.onresult = function (event) {
            let speechResult = event.results[0][0].transcript;
            userInput.value = speechResult;
            sendMessage();
        };

        recognition.start();
    }

    // Event listeners for sending messages & voice input
    sendButton.addEventListener("click", sendMessage);
    voiceButton.addEventListener("click", voiceInput);

    // Add an event listener for the Enter key press
    userInput.addEventListener("keydown", function(event) {
        if (event.key === "Enter") {
            event.preventDefault();  // Prevents the default action (form submission, etc.)
            sendMessage();
        }
    });
});
