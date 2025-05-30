from flask import Flask, render_template, request, jsonify
import openai
import os
from dotenv import load_dotenv
app = Flask(__name__)

# OpenAI API Key\
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")


# Predefined list of questions
questions = [
    "Hi! What's your name?",
    "How are you feeling today?",
    "What can I help you with?",
]

# Store current question index
current_question_index = 0

def get_openai_response(prompt):
    """Fetches a response from OpenAI's GPT model."""
    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "system", "content": "You are a helpful and friendly assistant."},
                      {"role": "user", "content": prompt}],
        )
        return response['choices'][0]['message']['content']
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
        # If all questions are asked, continue the conversation with GPT
        bot_response = get_openai_response(user_input)

    return jsonify({"response": bot_response})

if __name__ == "__main__":
    app.run(debug=True)
