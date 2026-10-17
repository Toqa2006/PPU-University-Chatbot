
from flask import Flask, render_template, request, jsonify
import json
import re
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent
KNOWLEDGE_FILE = BASE_DIR / "knowledge.json"


def load_knowledge():
    with open(KNOWLEDGE_FILE, "r", encoding="utf-8") as file:
        return json.load(file)


def normalize(text):
    text = unicodedata.normalize("NFKC", text.strip().lower())

    # إزالة التشكيل والتطويل
    text = re.sub(r"[\u064B-\u065F\u0670\u0640]", "", text)

    # توحيد بعض الحروف العربية
    text = re.sub(r"[أإآٱ]", "ا", text)
    text = text.replace("ى", "ي").replace("ؤ", "و").replace("ئ", "ي")

    # حذف علامات الترقيم والمسافات الزائدة
    text = re.sub(r"[^\w\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()

    return text


def similarity(first, second):
    first = normalize(first)
    second = normalize(second)

    if not first or not second:
        return 0

    if first == second:
        return 1.0

    if first in second or second in first:
        shorter = min(len(first), len(second))
        longer = max(len(first), len(second))

        if shorter >= 4 and shorter / longer >= 0.45:
            return 0.92

    return SequenceMatcher(None, first, second).ratio()


def get_answer(message):
    data = load_knowledge()
    question = normalize(message)

    # التحية والرسائل القصيرة
    greetings = [
        "مرحبا", "اهلا", "السلام عليكم",
        "صباح الخير", "مساء الخير"
    ]

    if question in [normalize(item) for item in greetings]:
        return data["welcome"]

    best_score = 0
    best_answer = None

    # البحث عن أقرب سؤال في قاعدة المعرفة
    for faq in data["faqs"]:
        for known_question in faq["questions"]:
            score = similarity(question, known_question)

            if score > best_score:
                best_score = score
                best_answer = faq["answer"]

    # لا نجيب إذا كان التشابه ضعيفًا
    if best_answer and best_score >= 0.62:
        return best_answer

    return data["fallback"]


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    message = data.get("message", "")

    if not isinstance(message, str):
        return jsonify({
            "reply": "يرجى إرسال رسالة نصية."
        }), 400

    message = message.strip()

    if not message:
        return jsonify({
            "reply": "اكتب سؤالك أولًا، وسأحاول مساعدتك."
        }), 400

    if len(message) > 1000:
        return jsonify({
            "reply": "الرسالة طويلة جدًا. يرجى اختصار السؤال."
        }), 400

    try:
        answer = get_answer(message)

        return jsonify({
            "reply": answer
        })

    except (OSError, json.JSONDecodeError, KeyError) as error:
        app.logger.error("Knowledge base error: %s", error)

        return jsonify({
            "reply": "حدثت مشكلة في قاعدة المعلومات. يرجى المحاولة لاحقًا."
        }), 500


if __name__ == "__main__":
    app.run(debug=True)
