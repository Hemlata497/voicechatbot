from flask import Flask, render_template, request, jsonify
import google.generativeai as genai
import os
from dotenv import load_dotenv
import PyPDF2
from docx import Document
import pytesseract
from PIL import Image
from werkzeug.utils import secure_filename
import logging

app = Flask(__name__)

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Gemini API Key
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# File upload configuration
UPLOAD_FOLDER = 'Uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize chat history and user state
def initialize_session():
    """Initialize or reset session variables."""
    return {
        "chat_history": [],
        "current_file_content": "",
        "welcome_message_sent": False
    }

# Store session state
session_state = initialize_session()

def allowed_file(filename):
    """Allow all file types."""
    return True

def extract_file_content(filepath, filename):
    """Extract content from various file types."""
    try:
        ext = os.path.splitext(filename)[1].lower()
        if ext == '.pdf':
            with open(filepath, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                text = ""
                for page in reader.pages:
                    text += page.extract_text() or ""
                return text
        elif ext == '.txt':
            with open(filepath, 'r', encoding='utf-8') as file:
                return file.read()
        elif ext == '.docx':
            doc = Document(filepath)
            return '\n'.join([para.text for para in doc.paragraphs])
        elif ext in ['.jpg', '.jpeg', '.png']:
            return pytesseract.image_to_string(Image.open(filepath))
        else:
            return None  # Unsupported file type
    except Exception as e:
        logger.error(f"Error extracting content from {filename}: {e}")
        return None

def tag_file_topics(file_content):
    """Tag file content with subjects using Gemini."""
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"Identify the main topics or subjects in this text (e.g., Cyber Security, Math). Return a list of up to 3 topics: {file_content[:2000]}"
        response = model.generate_content(prompt)
        topics = response.text.split(",")[:3]
        return [t.strip() for t in topics]
    except Exception as e:
        logger.error(f"Error tagging file topics: {e}")
        return ["General"]

def get_gemini_response(user_input, history, file_content=""):
    """Fetches a response from Google's Gemini model."""
    try:
        model = genai.GenerativeModel(
            model_name='gemini-1.5-flash',
            system_instruction="You're a friendly AI buddy helping students. Keep it casual and supportive. Use chat history and file content (if any) for context-aware responses. For files, offer summaries or answers based on the content. Avoid emojis."
        )
        messages = []
        if file_content:
            messages.append({"role": "assistant", "parts": ["File content for context: " + file_content[:2000]]})
        for msg in history:
            role = "user" if msg["sender"] == "You" else "assistant"
            messages.append({"role": role, "parts": [msg["message"]]})
        messages.append({"role": "user", "parts": [user_input]})
        
        response = model.generate_content(messages)
        response_text = response.text
        suggestions = []
        if "Suggestions:" in response_text:
            response_parts = response_text.split("Suggestions:")
            response_text = response_parts[0].strip()
            suggestions = [s.strip() for s in response_parts[1].split(",") if s.strip()]
        return {"response": response_text, "suggestions": suggestions}
    except Exception as e:
        logger.error(f"Error in Gemini response: {e}")
        return {"response": "Whoops, I'm having a bit of a brain freeze! Wanna try again?", "suggestions": []}

@app.route("/")
def home():
    """Renders the chatbot interface and resets session."""
    global session_state
    session_state = initialize_session()
    return render_template("index.html")

@app.route("/get_response", methods=["POST"])
def get_response():
    """Handles user input and returns the bot's response."""
    global session_state
    user_input = request.json.get("message", "").strip()

    logger.debug(f"Received user input: {user_input}")

    if not user_input:
        return jsonify({"response": "Please type a message, buddy!", "suggestions": []})

    session_state["chat_history"].append({"sender": "You", "message": user_input})

    if not session_state["welcome_message_sent"]:
        session_state["welcome_message_sent"] = True
        bot_response = "Hello! I'm here to help. What's on your mind?"
        session_state["chat_history"].append({"sender": "Buddy", "message": bot_response})
        return jsonify({"response": bot_response, "suggestions": []})

    response_data = get_gemini_response(user_input, session_state["chat_history"], session_state["current_file_content"])

    session_state["chat_history"].append({"sender": "Buddy", "message": response_data["response"]})

    if len(session_state["chat_history"]) > 20:
        session_state["chat_history"] = session_state["chat_history"][-20:]

    return jsonify(response_data)

@app.route("/upload_file", methods=["POST"])
def upload_file():
    """Handles file uploads."""
    global session_state
    if 'file' not in request.files:
        return jsonify({"response": "No file uploaded, buddy! Try again.", "suggestions": []})
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"response": "No file selected, buddy! Pick a file.", "suggestions": []})

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        session_state["current_file_content"] = extract_file_content(filepath, filename)
        if session_state["current_file_content"]:
            response_data = get_gemini_response("Summarize the uploaded file.", session_state["chat_history"], session_state["current_file_content"])
            topics = tag_file_topics(session_state["current_file_content"])
            response_data["response"] += f" Topics: {', '.join(topics)}"
            session_state["chat_history"].append({"sender": "Buddy", "message": response_data["response"]})
            return jsonify(response_data)
        else:
            response_data = {"response": f"Uploaded {filename}, but I can't extract content from this file type, buddy!", "suggestions": []}
            session_state["chat_history"].append({"sender": "Buddy", "message": response_data["response"]})
            return jsonify(response_data)
    return jsonify({"response": "Invalid file, buddy!", "suggestions": []})

@app.route("/export_chat", methods=["GET"])
def export_chat():
    """Exports chat history as text."""
    global session_state
    chat_text = "\n".join([f"{msg['sender']}: {msg['message']}" for msg in session_state["chat_history"]])
    return jsonify({"chat": chat_text})

@app.route("/highlight_text", methods=["POST"])
def highlight_text():
    """Processes highlighted file text."""
    global session_state
    highlighted_text = request.json.get("text")
    if not highlighted_text:
        return jsonify({"response": "No text highlighted, buddy! Try again.", "suggestions": []})
    response_data = get_gemini_response(f"Explain this highlighted text: {highlighted_text}", session_state["chat_history"], session_state["current_file_content"])
    session_state["chat_history"].append({"sender": "Buddy", "message": response_data["response"]})
    return jsonify(response_data)

if __name__ == "__main__":
    app.run(debug=True)