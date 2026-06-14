# 📊 JSON Data Structure Guide | Interactive Quiz Platform

This guide details how to seamlessly integrate your custom questions into the `questions.json` file. By following this schema, the JavaScript engine will automatically parse, render, and manage your quizzes without requiring any HTML modifications.

---

## 🏗️ Root Structure
The JSON file consists of an Array containing Objects. Each Object represents a complete, standalone quiz.

```json
[
  {
    "name": "Quiz Title",
    "description": "A brief description of the quiz topic.",
    "questions": [
      // Question objects will be injected here
    ]
  }
]

```

---

## 📝 Question Types & Implementation

### 1. Single Choice

Used when there is strictly one correct answer among multiple options.

```json
{
  "type": "choice",
  "question": "What is 1 + 1?",
  "question_ar": "كم ناتج 1 + 1؟",
  "options": ["1", "2", "3", "4"],
  "options_ar": ["1", "2", "3", "4"],
  "correct_answer": 1, // Zero-based index (0 = first option, 1 = second option)
  "explanation": "Because 1 plus 1 equals 2.",
  "explanation_ar": "لأن واحد زائد واحد يساوي اثنين."
}

```

### 2. True / False

A specialized binary choice. By convention, index `0` represents "True" and index `1` represents "False".

```json
{
  "type": "true_false",
  "question": "The sky is blue.",
  "question_ar": "السماء زرقاء.",
  "options": ["True", "False"],
  "options_ar": ["صحيح", "خطأ"],
  "correct_answer": 0, // 0 for True, 1 for False
  "explanation": "The sky appears blue due to Rayleigh scattering.",
  "explanation_ar": "تظهر السماء زرقاء بسبب تشتت رايلي."
}

```

### 3. Multiple Choice

Used when the question requires selecting more than one correct answer.

```json
{
  "type": "multiple_choice",
  "question": "Which of these are fruits?",
  "question_ar": "أي من هذه تعتبر فواكه؟",
  "options": ["Apple", "Carrot", "Banana", "Potato"],
  "options_ar": ["تفاح", "جزر", "موز", "بطاطس"],
  "correct_answers": [0, 2], // An array of the zero-based indices of all correct answers
  "explanation": "Apple and Banana are fruits, while the others are vegetables.",
  "explanation_ar": "التفاح والموز فواكه، بينما البقية خضروات."
}

```

---

## 💡 Core Engine Behaviors & Developer Notes:

1. **Bilingual Rendering:** Always include the suffix `_ar` keys (e.g., `question_ar`, `options_ar`) to ensure the real-time translation toggle works flawlessly within the app.
2. **Zero-Based Indexing:** The engine relies on strict array logic. The `correct_answer` or `correct_answers` properties always start counting from **0** (i.e., Option 1 = `0`, Option 2 = `1`, etc.).
3. **State Freezing:** Upon user selection, the core engine instantly freezes the DOM for that specific question and reveals the `explanation` to prevent state tampering.

**Happy Building! 🚀**

---
