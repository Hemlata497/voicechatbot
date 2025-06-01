from flask import Flask, render_template, request, jsonify
import google.generativeai as genai
import os
from dotenv import load_dotenv

app = Flask(__name__)

# Gemini API Key
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Predefined list of questions
questions = [
    "Hi! What's your name?",
    "How are you feeling today?",
    "What can I help you with?",
]

# Store current question index
current_question_index = 0

def get_gemini_response(prompt):
    """Fetches a response from Google's Gemini model."""
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')  # Adjust model name as needed
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Error: {e}")
        return "I'm having trouble generating a response right now. Please try again later."

@app.route("/")
def home():
    """Renders the chatbot interface."""
    return render_template("index.html")

@app.route("/get_response", methods=["POST"])
def get_response():
    """Handles user input and returns the bot's response."""
    global current_question_index
    user_input = request.json.get("message")

    # Handle bot asking questions
    if current_question_index < len(questions):
        bot_response = questions[current_question_index]
        current_question_index += 1
    else:
        # If all questions are asked, continue the conversation with Gemini
        bot_response = get_gemini_response(user_input)

    return jsonify({"response": bot_response})

if __name__ == "__main__":
    app.run(debug=True)