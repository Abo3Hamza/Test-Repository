const firebaseConfig = {
  apiKey: "AIzaSyD1T2YkT0bJ3-6xrqzGRafObRuln6ajYpg",
  authDomain: "interactive-quiz-platfor-1a676.firebaseapp.com",
  projectId: "interactive-quiz-platfor-1a676",
  storageBucket: "interactive-quiz-platfor-1a676.firebasestorage.app",
  messagingSenderId: "192993714442",
  appId: "1:192993714442:web:528534562bceff2e391af3",
  measurementId: "G-2KRYYZY7NR",
};

if (typeof firebase !== "undefined" && firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
}

const themes = [
  { name: "🔵 أزرق بنفسجي", primary: "#667eea", secondary: "#764ba2" },
  { name: "🔴 أحمر برتقالي", primary: "#f44336", secondary: "#ff9800" },
  { name: "🟢 أخضر سماوي", primary: "#4caf50", secondary: "#00bcd4" },
  { name: "💗 وردي بنفسجي", primary: "#e91e63", secondary: "#9c27b0" },
  { name: "🔷 أزرق سماوي", primary: "#2196f3", secondary: "#00bcd4" },
  { name: "🟠 برتقالي أحمر", primary: "#ff6f00", secondary: "#d32f2f" },
  { name: "🌲 أخضر داكن", primary: "#1b5e20", secondary: "#388e3c" },
  { name: "💜 بنفسجي فاتح", primary: "#7b1fa2", secondary: "#c2185b" },
  { name: "🌊 أزرق داكن", primary: "#0d47a1", secondary: "#1565c0" },
  { name: "🏝️ تركواز", primary: "#00796b", secondary: "#00897b" },
  { name: "✨ ذهبي", primary: "#f57f17", secondary: "#ff6f00" },
  { name: "🌙 رمادي أزرق", primary: "#455a64", secondary: "#546e7a" },
  { name: "🖤 Dark - أسود", primary: "#1a1a1a", secondary: "#2d2d2d" },
  { name: "🌑 Dark - رمادي", primary: "#2c3e50", secondary: "#34495e" },
  { name: "🌃 Dark - أزرق داكن", primary: "#1e3a5f", secondary: "#2c5aa0" },
];

function displayThemeOptions() {
  const container = document.getElementById("themeList");
  if (!container) return;

  container.replaceChildren();

  const savedTheme = localStorage.getItem("selectedTheme") || "0";

  themes.forEach((theme, index) => {
    const div = document.createElement("div");
    div.className = "theme-item";
    div.textContent = theme.name;
    div.addEventListener("click", () => {
      applyTheme(index);
      closeThemeMenu();
    });

    if (parseInt(savedTheme, 10) === index) {
      div.classList.add("active");
    }

    container.appendChild(div);
  });
}

function applyTheme(index) {
  const theme = themes[index];
  document.documentElement.style.setProperty("--primary", theme.primary);
  document.documentElement.style.setProperty("--secondary", theme.secondary);
  localStorage.setItem("selectedTheme", String(index));
  displayThemeOptions();
}

function loadTheme() {
  const savedTheme = localStorage.getItem("selectedTheme") || "0";
  applyTheme(parseInt(savedTheme, 10));
}

function toggleThemeMenu() {
  const menu = document.getElementById("themeMenu");
  if (menu) {
    menu.classList.toggle("show");
  }
}

function closeThemeMenu() {
  const menu = document.getElementById("themeMenu");
  if (menu) {
    menu.classList.remove("show");
  }
}

document.addEventListener("click", (event) => {
  const menu = document.getElementById("themeMenu");
  const button = document.querySelector(".theme-toggle-btn");
  if (
    menu &&
    button &&
    !menu.contains(event.target) &&
    !button.contains(event.target)
  ) {
    closeThemeMenu();
  }
});

// Settings modal handlers (dashboard)
function openSettingsModal() {
  const overlay = document.getElementById("settingsModalOverlay");
  if (!overlay) return;
  displayThemeOptions();
  overlay.style.display = "flex";
}

function closeSettingsModal() {
  const overlay = document.getElementById("settingsModalOverlay");
  if (!overlay) return;
  overlay.style.display = "none";
}

function saveSettings() {
  try {
    const checked = document.querySelector('input[name="globalTimer"]:checked');
    timerMode = checked ? checked.value : "none";
    const minutesEl = document.getElementById("globalTimerValue");
    const minutes = minutesEl ? parseInt(minutesEl.value, 10) || 10 : 10;
    timerDuration = minutes * 60;
  } catch (e) {
    console.warn("saveSettings failed:", e);
  }
  closeSettingsModal();
}

const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let myQuizzes = [];
let editingQuizId = null;
let builderQuestions = [];
let dragSourceIndex = null;
let shareToastTimer = null;

const elements = {
  dashUserAvatar: document.getElementById("dashUserAvatar"),
  dashUserName: document.getElementById("dashUserName"),
  // Prompt 1: logoutBtn and deleteAccountBtn removed from dashboard.html
  myQuizList: document.getElementById("myQuizList"),
  quizName: document.getElementById("quizName"),
  quizDescription: document.getElementById("quizDescription"),
  quizPrimaryLanguage: document.getElementById("quizPrimaryLanguage"),
  enableTranslation: document.getElementById("enableTranslation"),
  isPublic: document.getElementById("isPublic"),
  jsonRawInput: document.getElementById("json-raw-input"),
  newQuestionType: document.getElementById("newQuestionType"),
  addQuestionBtn: document.getElementById("addQuestionBtn"),
  saveQuizBtn: document.getElementById("saveQuizBtn"),
  resetBuilderBtn: document.getElementById("resetBuilderBtn"),
  questionBuilderList: document.getElementById("questionBuilderList"),
  builderStatus: document.getElementById("builderStatus"),
  quizForm: document.getElementById("quizForm"),
};

// Validation config
const MAX_LENGTHS = {
  quizName: 200,
  quizDescription: 500,
  question: 1000,
  option: 500,
};

function updateSaveAddState() {
  const anyCharErrors = document.querySelectorAll(".char-error").length > 0;
  if (elements.saveQuizBtn) elements.saveQuizBtn.disabled = anyCharErrors;
  if (elements.addQuestionBtn)
    elements.addQuestionBtn.disabled =
      anyCharErrors || builderQuestions.length >= 200;
}

function clearCharErrorFor(el) {
  if (!el) return;
  el.classList.remove("input-error");
  const next = el.nextElementSibling;
  if (next && next.classList && next.classList.contains("char-error"))
    next.remove();
}

function showCharErrorFor(el, length, max) {
  if (!el) return;
  el.classList.add("input-error");
  clearCharErrorFor(el);
  const hint = document.createElement("small");
  hint.className = "char-error";
  hint.style.color = "var(--danger)";
  hint.style.display = "block";
  hint.style.marginTop = "6px";
  hint.textContent = `${length} / ${max} characters`;
  el.insertAdjacentElement("afterend", hint);
  try {
    el.focus();
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  } catch (e) {}
}

function getMaxForInput(input) {
  if (!input || !input.dataset) return null;
  const field = input.dataset.field;
  if (
    field === "question" ||
    field === "question_ar" ||
    field === "explanation" ||
    field === "explanation_ar"
  )
    return MAX_LENGTHS.question;
  if (field === "option") return MAX_LENGTHS.option;
  if (
    input.id === "quizName" ||
    (input.dataset.field === undefined && input.id === "quizName")
  )
    return MAX_LENGTHS.quizName;
  if (
    input.id === "quizDescription" ||
    (input.dataset.field === undefined && input.id === "quizDescription")
  )
    return MAX_LENGTHS.quizDescription;
  return null;
}

function validateInputElement(input) {
  if (!input) return;
  const max = getMaxForInput(input) || null;
  if (!max) return; // nothing to validate here
  const length = String(input.value || "").length;
  if (length > max) {
    showCharErrorFor(input, length, max);
  } else {
    clearCharErrorFor(input);
  }
  updateSaveAddState();
}

// Fullscreen / toggle controls
const dashboardShell = document.querySelector(".dashboard-shell");
const createPanel = document.querySelectorAll(".layout-grid .panel")[0];
const myQuizzesPanel = document.querySelectorAll(".layout-grid .panel")[1];

function setStatus(message, type = "") {
  elements.builderStatus.textContent = message;
  elements.builderStatus.className = "status";
  if (type) {
    elements.builderStatus.classList.add(type);
  }
}

// Show a friendly alert and dashboard status for errors
function showFriendlyDashboardError(message) {
  try {
    alert(message);
  } catch (e) {}
  try {
    setStatus(message, "error");
  } catch (e) {}
}

function handleFirestoreError(error, defaultMessage) {
  console.warn("Firestore error:", error);
  const code = error && (error.code || error?.message || "");
  if (
    code === "resource-exhausted" ||
    code === "quota-exceeded" ||
    (typeof code === "string" && code.includes("quota")) ||
    code === "unavailable" ||
    code === "deadline-exceeded"
  ) {
    showFriendlyDashboardError(
      "The server is experiencing heavy load. Please try again later.",
    );
  } else if (code === "permission-denied") {
    showFriendlyDashboardError("Permission denied. Please check your access.");
  } else {
    showFriendlyDashboardError(
      defaultMessage || "An unexpected error occurred.",
    );
  }
}

function sanitizeImageUrl(url) {
  if (!url) return "";
  try {
    const u = new URL(String(url), window.location.href);
    if (u.protocol === "http:" || u.protocol === "https:") return u.href;
  } catch (e) {}
  return "";
}

function getPrimaryLanguage() {
  return elements.quizPrimaryLanguage?.value === "en" ? "en" : "ar";
}

function getSecondaryLanguage() {
  return getPrimaryLanguage() === "ar" ? "en" : "ar";
}

function isTranslationEnabled() {
  return Boolean(elements.enableTranslation?.checked);
}

function getLanguageLabel(languageCode) {
  return languageCode === "ar" ? "Arabic" : "English";
}

function padArray(values, length) {
  const nextValues = Array.isArray(values) ? values.slice(0, length) : [];
  while (nextValues.length < length) {
    nextValues.push("");
  }
  return nextValues;
}

function syncQuestionOptionArrays(question) {
  const optionLength = Math.max(
    2,
    Array.isArray(question.options) ? question.options.length : 0,
    Array.isArray(question.options_ar) ? question.options_ar.length : 0,
  );

  question.options = padArray(question.options, optionLength);
  question.options_ar = padArray(question.options_ar, optionLength);

  if (question.type === "true_false") {
    question.options = padArray(question.options, 2);
    question.options_ar = padArray(question.options_ar, 2);
  }

  if (question.type === "multiple_choice") {
    question.correct_answers = Array.isArray(question.correct_answers)
      ? question.correct_answers
          .map((n) => Number(n))
          .filter(
            (n) => Number.isInteger(n) && n >= 0 && n < question.options.length,
          )
      : [];
  } else {
    const safeCorrect = Number(question.correct_answer);
    question.correct_answer = Number.isInteger(safeCorrect)
      ? Math.min(
          Math.max(safeCorrect, 0),
          Math.max(question.options.length - 1, 0),
        )
      : 0;
  }

  return question;
}

function syncJsonTextarea() {
  if (!elements.jsonRawInput) return;
  elements.jsonRawInput.value = JSON.stringify(builderQuestions, null, 2);
}

function clearInlineError(element) {
  if (!element) return;
  element.classList.remove("input-error");
  const nextElement = element.nextElementSibling;
  if (nextElement && nextElement.classList.contains("error-hint")) {
    nextElement.remove();
  }
}

function clearAllInlineErrors() {
  document.querySelectorAll(".input-error").forEach((element) => {
    clearInlineError(element);
  });
  document.querySelectorAll(".error-hint").forEach((hint) => hint.remove());
}

function showInlineError(element, message) {
  if (!element) return;

  clearInlineError(element);
  element.classList.add("input-error");

  const hint = document.createElement("span");
  hint.className = "error-hint";
  hint.textContent = message;

  element.insertAdjacentElement("afterend", hint);

  if (typeof element.scrollIntoView === "function") {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  if (typeof element.focus === "function") {
    element.focus();
  }
}

function getQuestionCard(index) {
  return document.querySelector(`.question-card[data-index="${index}"]`);
}

function getQuestionField(index, field, lang, optionIndex) {
  const card = getQuestionCard(index);
  if (!card) return null;

  if (field === "option") {
    return card.querySelector(
      `[data-field="option"][data-lang="${lang}"][data-option-index="${optionIndex}"]`,
    );
  }

  return card.querySelector(`[data-field="${field}"][data-lang="${lang}"]`);
}

function buildShareBaseUrl() {
  return `${window.location.origin}${window.location.pathname.replace(
    "dashboard.html",
    "index.html",
  )}`;
}

function showShareToast(message) {
  const status = document.getElementById("myQuizShareStatus");
  if (!status) return;

  status.textContent = message;
  status.style.opacity = "1";
  status.style.transform = "translateY(0)";

  if (shareToastTimer) {
    clearTimeout(shareToastTimer);
  }

  shareToastTimer = setTimeout(() => {
    status.style.opacity = "0";
    status.style.transform = "translateY(-4px)";
  }, 1600);
}

async function copyToClipboard(text) {
  await navigator.clipboard.writeText(text);
  showShareToast("Copied!");
}

function ensureMyQuizzesToolbar() {
  const section = elements.myQuizList.parentElement;
  if (!section) return;

  let toolbar = document.getElementById("myQuizzesToolbar");
  if (!toolbar) {
    toolbar = document.createElement("div");
    toolbar.id = "myQuizzesToolbar";
    toolbar.style.display = "flex";
    toolbar.style.gap = "10px";
    toolbar.style.alignItems = "center";
    toolbar.style.margin = "10px 0 14px";

    const shareProfileBtn = document.createElement("button");
    shareProfileBtn.id = "shareProfileBtn";
    shareProfileBtn.className = "btn-primary";
    shareProfileBtn.type = "button";
    shareProfileBtn.textContent = "Share My Profile";
    shareProfileBtn.addEventListener("click", async () => {
      if (!currentUser) return;
      const shareUrl = `${buildShareBaseUrl()}?userId=${currentUser.uid}`;
      try {
        await copyToClipboard(shareUrl);
      } catch (error) {
        console.error("Copy profile share link failed:", error);
        showShareToast("Copy failed");
      }
    });

    const status = document.createElement("div");
    status.id = "myQuizShareStatus";
    status.textContent = "";
    status.style.borderRadius = "999px";
    status.style.background = "rgba(0,0,0,0.06)";
    status.style.color = "var(--primary)";
    status.style.fontWeight = "700";
    status.style.fontSize = "0.9rem";
    status.style.opacity = "0";
    status.style.transition = "opacity 0.2s ease, transform 0.2s ease";
    status.style.transform = "translateY(-4px)";

    toolbar.appendChild(shareProfileBtn);
    toolbar.appendChild(status);
    section.insertBefore(toolbar, elements.myQuizList);
  }

  const profileBtn = document.getElementById("shareProfileBtn");
  if (profileBtn) {
    profileBtn.disabled = !currentUser;
  }
}

function getSelectedTtlDays() {
  const selected = document.querySelector('input[name="ttlDays"]:checked');
  return Number(selected ? selected.value : 3);
}

function createQuestionTemplate(type) {
  if (type === "true_false") {
    return {
      type: "true_false",
      question: "",
      question_ar: "",
      options: ["True", "False"],
      options_ar: ["صح", "خطأ"],
      correct_answer: 0,
      explanation: "",
      explanation_ar: "",
      image: "",
    };
  }

  if (type === "multiple_choice") {
    return {
      type: "multiple_choice",
      question: "",
      question_ar: "",
      options: ["", "", "", ""],
      options_ar: ["", "", "", ""],
      correct_answers: [],
      explanation: "",
      explanation_ar: "",
      image: "",
    };
  }

  return {
    type: "choice",
    question: "",
    question_ar: "",
    options: ["", ""],
    options_ar: ["", ""],
    correct_answer: 0,
    explanation: "",
    explanation_ar: "",
    image: "",
  };
}

function normalizeQuestion(question) {
  const qType = question.type || "choice";
  const normalized = {
    ...createQuestionTemplate(qType),
    ...question,
    type: qType,
    options: Array.isArray(question.options)
      ? question.options
      : createQuestionTemplate(qType).options,
    options_ar: Array.isArray(question.options_ar)
      ? question.options_ar
      : createQuestionTemplate(qType).options_ar,
  };

  syncQuestionOptionArrays(normalized);

  if (qType === "multiple_choice") {
    normalized.correct_answers = Array.isArray(question.correct_answers)
      ? question.correct_answers
          .map((n) => Number(n))
          .filter((n) => Number.isInteger(n))
      : [];
  } else {
    normalized.correct_answer = Number.isInteger(
      Number(question.correct_answer),
    )
      ? Number(question.correct_answer)
      : 0;
  }

  return normalized;
}

function parseRawJsonToBuilder(rawText) {
  const text = rawText.trim();
  if (!text) {
    setStatus("Ready.");
    return;
  }

  try {
    const parsed = JSON.parse(text);
    let nextQuestions = [];

    if (Array.isArray(parsed)) {
      nextQuestions = parsed;
    } else if (parsed && Array.isArray(parsed.questions)) {
      nextQuestions = parsed.questions;

      if (typeof parsed.name === "string")
        elements.quizName.value = parsed.name;
      if (typeof parsed.description === "string")
        elements.quizDescription.value = parsed.description;
      if (parsed.primaryLanguage === "en" || parsed.primaryLanguage === "ar") {
        elements.quizPrimaryLanguage.value = parsed.primaryLanguage;
      }
      if (typeof parsed.enableTranslation === "boolean") {
        elements.enableTranslation.checked = parsed.enableTranslation;
      }
      if (typeof parsed.isPublic === "boolean")
        elements.isPublic.checked = parsed.isPublic;

      if (parsed.ttlDays && [3, 7, 30].includes(Number(parsed.ttlDays))) {
        const ttlRadio = document.querySelector(
          `input[name="ttlDays"][value="${Number(parsed.ttlDays)}"]`,
        );
        if (ttlRadio) ttlRadio.checked = true;
      }
    } else {
      throw new Error("Raw JSON must be an array or object with questions[]");
    }

    // Defensive: do NOT spread or directly trust parsed objects (prototype pollution risk).
    // Only accept explicit, whitelisted question fields and coerce types.
    const MAX_QUESTIONS = 200;
    if (!Array.isArray(nextQuestions)) nextQuestions = [];
    if (nextQuestions.length > MAX_QUESTIONS) {
      setStatus(
        `JSON contains too many questions (max ${MAX_QUESTIONS}).`,
        "error",
      );
      return;
    }

    builderQuestions = nextQuestions.map((q) => {
      const safe = {
        type: typeof q?.type === "string" ? q.type : "choice",
        question: typeof q?.question === "string" ? q.question : "",
        question_ar: typeof q?.question_ar === "string" ? q.question_ar : "",
        options: Array.isArray(q?.options)
          ? q.options.map((v) => String(v || ""))
          : [],
        options_ar: Array.isArray(q?.options_ar)
          ? q.options_ar.map((v) => String(v || ""))
          : [],
        correct_answers: Array.isArray(q?.correct_answers)
          ? q.correct_answers.map((n) => Number(n)).filter(Number.isInteger)
          : [],
        correct_answer: Number.isInteger(Number(q?.correct_answer))
          ? Number(q.correct_answer)
          : 0,
        explanation: typeof q?.explanation === "string" ? q.explanation : "",
        explanation_ar:
          typeof q?.explanation_ar === "string" ? q.explanation_ar : "",
        image: typeof q?.image === "string" ? q.image : "",
      };

      return normalizeQuestion(safe);
    });
    renderQuestionBuilder();
    syncJsonTextarea();
    setStatus("Raw JSON parsed and builder populated.", "success");
  } catch (error) {
    console.error("JSON parse error:", error);
    setStatus("Invalid JSON: please fix the format and try again.", "error");
  }
}

function renderMyQuizzes() {
  ensureMyQuizzesToolbar();
  elements.myQuizList.replaceChildren();

  if (myQuizzes.length === 0) {
    const note = document.createElement("div");
    note.className = "empty-note";
    note.textContent = "No quizzes yet. Create your first quiz.";
    elements.myQuizList.appendChild(note);
    return;
  }

  myQuizzes.forEach((quiz) => {
    const card = document.createElement("article");
    card.className = "my-quiz-card";

    const questionCount = Array.isArray(quiz.questions)
      ? quiz.questions.length
      : 0;
    const ttl = quiz.ttlDays ? `${quiz.ttlDays}d` : "n/a";

    const title = document.createElement("h3");
    title.textContent = quiz.name || "Untitled Quiz";

    const meta = document.createElement("div");
    meta.className = "my-quiz-meta";
    // Build inline elements: question count badge + download button
    const qCountSpan = document.createElement("span");
    qCountSpan.className = "question-count";
    qCountSpan.textContent = `${questionCount} أسئلة`;

    const inlineRight = document.createElement("div");
    inlineRight.style.display = "flex";
    inlineRight.style.alignItems = "center";
    inlineRight.style.gap = "8px";

    meta.appendChild(qCountSpan);
    meta.appendChild(inlineRight);

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const editButton = document.createElement("button");
    editButton.className = "btn-secondary";
    editButton.type = "button";
    editButton.dataset.action = "edit";
    editButton.dataset.id = quiz.id;
    editButton.textContent = "Edit";

    const deleteButton = document.createElement("button");
    deleteButton.className = "btn-back";
    deleteButton.type = "button";
    deleteButton.dataset.action = "delete";
    deleteButton.dataset.id = quiz.id;
    deleteButton.textContent = "Delete";

    const shareButton = document.createElement("button");
    shareButton.className = "btn-primary";
    shareButton.type = "button";
    shareButton.dataset.action = "share-quiz";
    shareButton.dataset.id = quiz.id;
    shareButton.textContent = "Share Quiz";

    actions.appendChild(editButton);
    actions.appendChild(deleteButton);
    actions.appendChild(shareButton);

    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(actions);

    elements.myQuizList.appendChild(card);
  });
}

function applyBuilderLanguageVisibility() {
  const translationEnabled = isTranslationEnabled();
  const secondaryLanguage = getSecondaryLanguage();

  document.querySelectorAll("[data-lang]").forEach((node) => {
    const nodeLanguage = node.dataset.lang;
    const shouldHide =
      !translationEnabled && nodeLanguage === secondaryLanguage;
    node.classList.toggle("hidden", shouldHide);
  });
}

function isQuestionCorrectOption(question, optionIndex) {
  if (question.type === "multiple_choice") {
    return Array.isArray(question.correct_answers)
      ? question.correct_answers.includes(optionIndex)
      : false;
  }

  return Number(question.correct_answer) === optionIndex;
}

function createLanguageField({
  labelText,
  value,
  field,
  lang,
  index,
  optionIndex = null,
  rows = 2,
  multiline = true,
  placeholder = "",
}) {
  const wrapper = document.createElement("div");
  wrapper.className = "field secondary-field";
  wrapper.dataset.lang = lang;

  const label = document.createElement("label");
  label.textContent = labelText;
  wrapper.appendChild(label);

  const input = multiline
    ? document.createElement("textarea")
    : document.createElement("input");
  if (multiline) {
    input.rows = rows;
  } else {
    input.type = "text";
  }
  input.value = value || "";
  input.placeholder = placeholder;
  input.dataset.field = field;
  input.dataset.lang = lang;
  input.dataset.index = String(index);
  if (optionIndex !== null) {
    input.dataset.optionIndex = String(optionIndex);
  }
  // Attach real-time validation listeners for character limits
  const onInputValidate = (e) => validateInputElement(e.target || input);
  input.addEventListener("input", onInputValidate);
  input.addEventListener("paste", (e) => {
    // small timeout to allow pasted content
    setTimeout(() => validateInputElement(input), 10);
  });

  wrapper.appendChild(input);
  return wrapper;
}

function createOptionRow(question, questionIndex, optionIndex) {
  const primaryLanguage = getPrimaryLanguage();
  const secondaryLanguage = getSecondaryLanguage();
  const row = document.createElement("div");
  row.className = "option-row";
  row.dataset.optionIndex = String(optionIndex);

  if (isQuestionCorrectOption(question, optionIndex)) {
    row.classList.add("correct-selected");
  }

  const markerWrap = document.createElement("div");
  const marker = document.createElement("input");
  marker.type = question.type === "multiple_choice" ? "checkbox" : "radio";
  marker.name = `correct_${questionIndex}`;
  marker.dataset.field = "correct";
  marker.dataset.index = String(questionIndex);
  marker.dataset.optionIndex = String(optionIndex);
  marker.checked = isQuestionCorrectOption(question, optionIndex);
  marker.className = "option-marker";
  markerWrap.appendChild(marker);

  const primaryWrap = createLanguageField({
    labelText: `${getLanguageLabel(primaryLanguage)} Option`,
    value:
      question[primaryLanguage === "ar" ? "options_ar" : "options"][
        optionIndex
      ],
    field: "option",
    lang: primaryLanguage,
    index: questionIndex,
    optionIndex,
    rows: 1,
    multiline: false,
    placeholder: `Option ${optionIndex + 1}`,
  });
  primaryWrap.classList.add("option-lang-primary");
  const primaryInput = primaryWrap.querySelector("input, textarea");
  if (primaryInput) {
    primaryInput.dataset.optionIndex = String(optionIndex);
  }

  const secondaryWrap = createLanguageField({
    labelText: `${getLanguageLabel(secondaryLanguage)} Option`,
    value:
      question[secondaryLanguage === "ar" ? "options_ar" : "options"][
        optionIndex
      ],
    field: "option",
    lang: secondaryLanguage,
    index: questionIndex,
    optionIndex,
    rows: 1,
    multiline: false,
    placeholder: `Option ${optionIndex + 1}`,
  });
  secondaryWrap.classList.add("option-lang-secondary");
  const secondaryInput = secondaryWrap.querySelector("input, textarea");
  if (secondaryInput) {
    secondaryInput.dataset.optionIndex = String(optionIndex);
  }

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "option-remove-btn";
  removeButton.dataset.action = "remove-option";
  removeButton.dataset.index = String(questionIndex);
  removeButton.dataset.optionIndex = String(optionIndex);
  removeButton.textContent = "🗑️";
  removeButton.disabled = (question.options || []).length <= 2;

  row.appendChild(markerWrap);
  row.appendChild(primaryWrap);
  row.appendChild(secondaryWrap);
  if (question.type !== "true_false") {
    row.appendChild(removeButton);
  }

  return row;
}

function renderQuestionBuilder() {
  elements.questionBuilderList.replaceChildren();

  if (builderQuestions.length === 0) {
    const note = document.createElement("div");
    note.className = "empty-note";
    note.textContent = "No questions yet. Add one from the selector above.";
    elements.questionBuilderList.appendChild(note);
    applyBuilderLanguageVisibility();
    return;
  }

  const primaryLanguage = getPrimaryLanguage();
  const secondaryLanguage = getSecondaryLanguage();

  builderQuestions.forEach((question, index) => {
    syncQuestionOptionArrays(question);

    const card = document.createElement("div");
    card.className = "question-card";
    card.draggable = true;
    card.dataset.index = String(index);

    const header = document.createElement("div");
    header.className = "question-card-header";

    const titleWrap = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = `Question ${index + 1} (${question.type})`;
    const subtitle = document.createElement("div");
    subtitle.className = "question-subtitle";
    subtitle.textContent = `${getLanguageLabel(primaryLanguage)} is primary · ${getLanguageLabel(secondaryLanguage)} is secondary`;
    titleWrap.appendChild(title);
    titleWrap.appendChild(subtitle);

    const headerActions = document.createElement("div");
    headerActions.className = "inline-actions";
    const removeQuestionButton = document.createElement("button");
    removeQuestionButton.className = "btn-back";
    removeQuestionButton.type = "button";
    removeQuestionButton.dataset.action = "remove-question";
    removeQuestionButton.dataset.index = String(index);
    removeQuestionButton.textContent = "Remove";
    headerActions.appendChild(removeQuestionButton);

    header.appendChild(titleWrap);
    header.appendChild(headerActions);

    const body = document.createElement("div");
    body.className = "question-card-body";

    const questionBlock = document.createElement("div");
    questionBlock.className = "question-block";
    questionBlock.dataset.index = String(index);

    const questionFields = document.createElement("div");
    questionFields.className = "form-grid";

    questionFields.appendChild(
      createLanguageField({
        labelText: `Question (${getLanguageLabel(primaryLanguage)})`,
        value:
          primaryLanguage === "ar" ? question.question_ar : question.question,
        field: primaryLanguage === "ar" ? "question_ar" : "question",
        lang: primaryLanguage,
        index,
        rows: 2,
        multiline: true,
        placeholder: "Enter the question text",
      }),
    );

    questionFields.appendChild(
      createLanguageField({
        labelText: `Question (${getLanguageLabel(secondaryLanguage)})`,
        value:
          secondaryLanguage === "ar" ? question.question_ar : question.question,
        field: secondaryLanguage === "ar" ? "question_ar" : "question",
        lang: secondaryLanguage,
        index,
        rows: 2,
        multiline: true,
        placeholder: "Enter the translated question",
      }),
    );

    questionFields.appendChild(
      createLanguageField({
        labelText: `Explanation (${getLanguageLabel(primaryLanguage)})`,
        value:
          primaryLanguage === "ar"
            ? question.explanation_ar
            : question.explanation,
        field: primaryLanguage === "ar" ? "explanation_ar" : "explanation",
        lang: primaryLanguage,
        index,
        rows: 2,
        multiline: true,
        placeholder: "Explanation for the answer",
      }),
    );

    questionFields.appendChild(
      createLanguageField({
        labelText: `Explanation (${getLanguageLabel(secondaryLanguage)})`,
        value:
          secondaryLanguage === "ar"
            ? question.explanation_ar
            : question.explanation,
        field: secondaryLanguage === "ar" ? "explanation_ar" : "explanation",
        lang: secondaryLanguage,
        index,
        rows: 2,
        multiline: true,
        placeholder: "Translated explanation",
      }),
    );

    const imageField = document.createElement("div");
    imageField.className = "field full";
    const imageLabel = document.createElement("label");
    imageLabel.textContent = "Image URL (optional)";
    const imageInput = document.createElement("input");
    imageInput.type = "text";
    imageInput.value = question.image || "";
    imageInput.dataset.field = "image";
    imageInput.dataset.index = String(index);
    imageField.appendChild(imageLabel);
    imageField.appendChild(imageInput);

    const optionsSection = document.createElement("div");
    optionsSection.className = "question-block";

    const optionsHeader = document.createElement("div");
    optionsHeader.className = "question-card-header";

    const optionsTitleWrap = document.createElement("div");
    const optionsTitle = document.createElement("strong");
    optionsTitle.textContent = "Options";
    const optionsSubtitle = document.createElement("div");
    optionsSubtitle.className = "question-subtitle";
    optionsSubtitle.textContent =
      question.type === "multiple_choice"
        ? "Select one or more correct answers"
        : "Select a single correct answer";
    optionsTitleWrap.appendChild(optionsTitle);
    optionsTitleWrap.appendChild(optionsSubtitle);

    const optionControls = document.createElement("div");
    optionControls.className = "option-list-controls";

    if (question.type !== "true_false") {
      const addOptionButton = document.createElement("button");
      addOptionButton.type = "button";
      addOptionButton.className = "btn-secondary";
      addOptionButton.dataset.action = "add-option";
      addOptionButton.dataset.index = String(index);
      addOptionButton.textContent = "+ Add Option";
      addOptionButton.disabled = (question.options || []).length >= 10;
      optionControls.appendChild(addOptionButton);
    }

    optionsHeader.appendChild(optionsTitleWrap);
    optionsHeader.appendChild(optionControls);

    const optionList = document.createElement("div");
    optionList.className = "option-list";

    for (
      let optionIndex = 0;
      optionIndex < question.options.length;
      optionIndex += 1
    ) {
      optionList.appendChild(createOptionRow(question, index, optionIndex));
    }

    optionsSection.appendChild(optionsHeader);
    optionsSection.appendChild(optionList);

    questionBlock.appendChild(questionFields);
    questionBlock.appendChild(imageField);
    questionBlock.appendChild(optionsSection);
    body.appendChild(questionBlock);

    card.appendChild(header);
    card.appendChild(body);

    card.addEventListener("dragstart", onQuestionDragStart);
    card.addEventListener("dragover", onQuestionDragOver);
    card.addEventListener("drop", onQuestionDrop);
    card.addEventListener("dragend", onQuestionDragEnd);

    elements.questionBuilderList.appendChild(card);
  });

  applyBuilderLanguageVisibility();
  syncJsonTextarea();
  // Run validation on existing inputs to update UI state
  elements.questionBuilderList
    .querySelectorAll("input, textarea")
    .forEach((inp) => {
      validateInputElement(inp);
    });
  updateSaveAddState();
}

function onQuestionDragStart(event) {
  const card = event.currentTarget;
  dragSourceIndex = Number(card.dataset.index);
  card.classList.add("dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", String(dragSourceIndex));
}

function onQuestionDragOver(event) {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
}

function onQuestionDrop(event) {
  event.preventDefault();
  const targetIndex = Number(event.currentTarget.dataset.index);
  const sourceFromData = Number(event.dataTransfer.getData("text/plain"));
  const sourceIndex = Number.isInteger(sourceFromData)
    ? sourceFromData
    : dragSourceIndex;

  if (
    !Number.isInteger(sourceIndex) ||
    !Number.isInteger(targetIndex) ||
    sourceIndex === targetIndex
  ) {
    return;
  }

  const moved = builderQuestions.splice(sourceIndex, 1)[0];
  builderQuestions.splice(targetIndex, 0, moved);
  renderQuestionBuilder();
  setStatus("Question order updated.", "success");
  syncJsonTextarea();
}

function onQuestionDragEnd(event) {
  event.currentTarget.classList.remove("dragging");
  dragSourceIndex = null;
}

function resetBuilder() {
  const confirmReset = window.confirm(
    "Reset the builder? Unsaved changes will be lost.",
  );
  if (!confirmReset) return;
  editingQuizId = null;
  builderQuestions = [];
  elements.quizName.value = "";
  elements.quizDescription.value = "";
  elements.quizPrimaryLanguage.value = "ar";
  elements.enableTranslation.checked = true;
  elements.isPublic.checked = false;
  elements.jsonRawInput.value = "";
  const defaultTtl = document.querySelector('input[name="ttlDays"][value="3"]');
  if (defaultTtl) defaultTtl.checked = true;
  elements.saveQuizBtn.textContent = "Save Quiz";
  renderQuestionBuilder();
  setStatus("Builder reset.");
  syncJsonTextarea();
}

function sanitizeQuestionsForSave() {
  return builderQuestions.map((q) => {
    const normalized = normalizeQuestion(q);
    normalized.options = (normalized.options || []).map((v) =>
      String(v || "").trim(),
    );
    normalized.options_ar = (normalized.options_ar || []).map((v) =>
      String(v || "").trim(),
    );

    // Sanitize image URLs: only allow http(s). Drop anything else.
    if (typeof normalized.image === "string" && normalized.image.trim()) {
      try {
        const u = new URL(normalized.image, window.location.href);
        if (u.protocol !== "http:" && u.protocol !== "https:") {
          normalized.image = "";
        } else {
          normalized.image = u.href;
        }
      } catch (e) {
        normalized.image = "";
      }
    } else {
      normalized.image = "";
    }

    if (normalized.type === "multiple_choice") {
      normalized.correct_answers = (normalized.correct_answers || [])
        .map((n) => Number(n))
        .filter(
          (n) => Number.isInteger(n) && n >= 0 && n < normalized.options.length,
        );
    } else {
      normalized.correct_answer = Number(normalized.correct_answer || 0);
      if (
        normalized.correct_answer < 0 ||
        normalized.correct_answer >= normalized.options.length
      ) {
        normalized.correct_answer = 0;
      }
    }

    return normalized;
  });
}

async function saveQuiz() {
  clearAllInlineErrors();

  if (!currentUser) {
    return;
  }

  const name = elements.quizName.value.trim();
  if (!name) {
    showInlineError(elements.quizName, "Quiz name is required.");
    return;
  }
  // Enforce reasonable length limits
  if (name.length > 200) {
    showInlineError(
      elements.quizName,
      "Quiz name must be 200 characters or fewer.",
    );
    return;
  }

  if (builderQuestions.length === 0) {
    showInlineError(
      elements.questionBuilderList,
      "Add at least one question before saving.",
    );
    return;
  }

  // Enforce maximum number of questions
  if (builderQuestions.length > 200) {
    setStatus(
      `Quiz has too many questions: ${builderQuestions.length} / 200`,
      "error",
    );
    return;
  }

  const translationEnabled = isTranslationEnabled();
  const primaryLanguage = getPrimaryLanguage();

  const ttlDays = getSelectedTtlDays();
  const expireAt = firebase.firestore.Timestamp.fromDate(
    new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000),
  );

  for (
    let questionIndex = 0;
    questionIndex < builderQuestions.length;
    questionIndex += 1
  ) {
    const question = builderQuestions[questionIndex];
    const card = getQuestionCard(questionIndex);

    const primaryQuestionField = getQuestionField(
      questionIndex,
      "question",
      primaryLanguage,
    );
    const arabicQuestionField = getQuestionField(
      questionIndex,
      "question",
      "ar",
    );

    const questionText = String(question.question || "").trim();
    const questionArText = String(question.question_ar || "").trim();

    if (!questionText) {
      showInlineError(
        primaryQuestionField || card,
        "Question text is required.",
      );
      return;
    }

    if (translationEnabled && !questionArText) {
      showInlineError(
        arabicQuestionField || primaryQuestionField || card,
        "Arabic translation is required.",
      );
      return;
    }

    if (question.type !== "true_false") {
      if (!Array.isArray(question.options) || question.options.length < 2) {
        showInlineError(
          getQuestionField(questionIndex, "option", primaryLanguage, 0) || card,
          "At least 2 options are required.",
        );
        return;
      }
    }

    if (translationEnabled) {
      const emptyArabicOptionIndex = (question.options_ar || []).findIndex(
        (value) => !String(value || "").trim(),
      );

      if (emptyArabicOptionIndex !== -1) {
        showInlineError(
          getQuestionField(
            questionIndex,
            "option",
            "ar",
            emptyArabicOptionIndex,
          ) || card,
          "Arabic option text is required for every option.",
        );
        return;
      }
    }

    if (question.type === "multiple_choice") {
      if (
        !Array.isArray(question.correct_answers) ||
        question.correct_answers.length === 0
      ) {
        showInlineError(
          getQuestionField(questionIndex, "correct", primaryLanguage, 0) ||
            card,
          "Select at least one correct answer.",
        );
        return;
      }

      const invalidSelection = question.correct_answers.some(
        (selectedIndex) =>
          !Number.isInteger(selectedIndex) ||
          selectedIndex < 0 ||
          selectedIndex >= question.options.length,
      );

      if (invalidSelection) {
        showInlineError(
          getQuestionField(questionIndex, "correct", primaryLanguage, 0) ||
            card,
          "Select a valid correct answer.",
        );
        return;
      }
    } else {
      if (
        !Number.isInteger(question.correct_answer) ||
        question.correct_answer < 0 ||
        question.correct_answer >= question.options.length
      ) {
        showInlineError(
          getQuestionField(questionIndex, "correct", primaryLanguage, 0) ||
            card,
          "Select a valid correct answer.",
        );
        return;
      }
    }

    // ===== Prompt 3: Explanation cross-language validation =====
    if (translationEnabled) {
      const explanationPrimary = String(
        primaryLanguage === "ar"
          ? question.explanation_ar || ""
          : question.explanation || "",
      ).trim();
      const explanationSecondary = String(
        secondaryLanguage === "ar"
          ? question.explanation_ar || ""
          : question.explanation || "",
      ).trim();

      const hasPrimary = explanationPrimary.length > 0;
      const hasSecondary = explanationSecondary.length > 0;

      // If one explanation is filled, the other becomes required
      if (hasPrimary && !hasSecondary) {
        showInlineError(
          getQuestionField(questionIndex, "explanation", secondaryLanguage) ||
            card,
          `Explanation (${getLanguageLabel(secondaryLanguage)}) is required when the other language has content.`,
        );
        return;
      }
      if (!hasPrimary && hasSecondary) {
        showInlineError(
          getQuestionField(questionIndex, "explanation", primaryLanguage) ||
            card,
          `Explanation (${getLanguageLabel(primaryLanguage)}) is required when the other language has content.`,
        );
        return;
      }
    }

    // Validate text lengths for question and options (on Save only)
    const qText = String(question.question || "").trim();
    const qTextAr = String(question.question_ar || "").trim();
    if (qText.length > 1000) {
      setStatus(
        `Question ${questionIndex + 1} is too long: ${qText.length} / 1000 characters`,
        "error",
      );
      return;
    }
    if (qTextAr.length > 1000) {
      setStatus(
        `Question ${questionIndex + 1} (Arabic) is too long: ${qTextAr.length} / 1000 characters`,
        "error",
      );
      return;
    }

    const opts = Array.isArray(question.options) ? question.options : [];
    const optsAr = Array.isArray(question.options_ar)
      ? question.options_ar
      : [];
    for (let oi = 0; oi < opts.length; oi += 1) {
      const oText = String(opts[oi] || "").trim();
      if (oText.length > 500) {
        setStatus(
          `Question ${questionIndex + 1} option ${oi + 1} is too long: ${oText.length} / 500 characters`,
          "error",
        );
        return;
      }
    }
    for (let oi = 0; oi < optsAr.length; oi += 1) {
      const oText = String(optsAr[oi] || "").trim();
      if (oText.length > 500) {
        setStatus(
          `Question ${questionIndex + 1} Arabic option ${oi + 1} is too long: ${oText.length} / 500 characters`,
          "error",
        );
        return;
      }
    }
  }

  // Validate description length
  const description = (elements.quizDescription.value || "").trim();
  if (description.length > 500) {
    setStatus(
      `Description is too long: ${description.length} / 500 characters`,
      "error",
    );
    return;
  }

  const payload = {
    name,
    description,
    primaryLanguage: getPrimaryLanguage(),
    enableTranslation: isTranslationEnabled(),
    isPublic: elements.isPublic.checked,
    ttlDays,
    expireAt,
    userId: auth.currentUser.uid,
    questions: sanitizeQuestionsForSave(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };

  // Payload size safety check (approximate UTF-8 bytes)
  try {
    const json = JSON.stringify(payload);
    const byteSize =
      typeof TextEncoder !== "undefined"
        ? new TextEncoder().encode(json).length
        : new Blob([json]).size;
    const MAX_BYTES = 950 * 1024; // 950 KB safe threshold
    if (byteSize > MAX_BYTES) {
      setStatus(
        "Quiz is too large to save. Please reduce text length or remove some questions.",
        "error",
      );
      return;
    }
  } catch (e) {
    console.warn("Failed to compute payload size", e);
  }

  try {
    if (editingQuizId) {
      const confirmUpdate = window.confirm(
        "Update this quiz with the changes?",
      );
      if (!confirmUpdate) return;
      await db.collection("quizzes").doc(editingQuizId).update(payload);
      setStatus("Quiz updated successfully.", "success");
    } else {
      await db.collection("quizzes").add({
        ...payload,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      setStatus("Quiz created successfully.", "success");
    }

    await loadMyQuizzes();
    resetBuilder();
  } catch (error) {
    handleFirestoreError(error, "Failed to save quiz. Please try again later.");
  }
}

async function deleteQuiz(quizId) {
  if (!currentUser) return;

  const confirmDelete = window.confirm("Delete this quiz permanently?");
  if (!confirmDelete) return;

  try {
    await db.collection("quizzes").doc(quizId).delete();
    setStatus("Quiz deleted.", "success");
    await loadMyQuizzes();

    if (editingQuizId === quizId) {
      resetBuilder();
    }
  } catch (error) {
    handleFirestoreError(
      error,
      `Delete failed: ${error.message || "Unable to delete quiz."}`,
    );
  }
}

function editQuiz(quizId) {
  const quiz = myQuizzes.find((item) => item.id === quizId);
  if (!quiz) return;

  editingQuizId = quiz.id;
  elements.quizName.value = quiz.name || "";
  elements.quizDescription.value = quiz.description || "";
  elements.quizPrimaryLanguage.value =
    quiz.primaryLanguage === "en" ? "en" : "ar";
  elements.enableTranslation.checked =
    typeof quiz.enableTranslation === "boolean" ? quiz.enableTranslation : true;
  elements.isPublic.checked = Boolean(quiz.isPublic);

  const ttlDays = [3, 7, 30].includes(Number(quiz.ttlDays))
    ? Number(quiz.ttlDays)
    : 3;
  const ttlRadio = document.querySelector(
    `input[name="ttlDays"][value="${ttlDays}"]`,
  );
  if (ttlRadio) ttlRadio.checked = true;

  builderQuestions = (Array.isArray(quiz.questions) ? quiz.questions : []).map(
    normalizeQuestion,
  );
  elements.saveQuizBtn.textContent = "Update Quiz";
  renderQuestionBuilder();
  setStatus("Quiz loaded into editor.", "success");
  syncJsonTextarea();
}

async function loadMyQuizzes() {
  // Strict: only run when `currentUser` is set by auth.onAuthStateChanged
  if (!currentUser) {
    console.log("loadMyQuizzes: currentUser is null — skipping fetch.");
    elements.myQuizList.replaceChildren();
    const msg = document.createElement("div");
    msg.style.textAlign = "center";
    msg.style.padding = "30px";
    msg.style.color = "#666";
    msg.style.gridColumn = "1 / -1";
    msg.textContent =
      "You haven't created any quizzes yet. Use the builder on the left to create your first quiz!";
    elements.myQuizList.appendChild(msg);
    myQuizzes = [];
    return;
  }

  try {
    console.log("loadMyQuizzes: querying quizzes for userId=", currentUser.uid);
    const snapshot = await db
      .collection("quizzes")
      .where("userId", "==", currentUser.uid)
      .get();

    console.log("loadMyQuizzes: fetched", snapshot ? snapshot.size : 0, "docs");

    if (!snapshot || snapshot.empty) {
      elements.myQuizList.replaceChildren();
      const emptyMsg = document.createElement("div");
      emptyMsg.style.textAlign = "center";
      emptyMsg.style.padding = "30px";
      emptyMsg.style.color = "#666";
      emptyMsg.style.gridColumn = "1 / -1";
      emptyMsg.textContent =
        "You haven't created any quizzes yet. Use the builder on the left to create your first quiz!";
      elements.myQuizList.appendChild(emptyMsg);
      myQuizzes = [];
      return;
    }

    myQuizzes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    renderMyQuizzes();
  } catch (error) {
    handleFirestoreError(
      error,
      `Load failed: ${error.message || "Unable to load your quizzes."}`,
    );
  }
}

function updateUserHeader(user) {
  if (elements.dashUserAvatar) {
    try {
      const safe = sanitizeImageUrl(user && user.photoURL ? user.photoURL : "");
      elements.dashUserAvatar.src =
        safe || "https://www.gravatar.com/avatar/?d=mp";
    } catch (e) {
      console.warn("Failed to set avatar src", e);
    }
  }
  if (elements.dashUserName) {
    elements.dashUserName.textContent =
      user && (user.displayName || user.email)
        ? user.displayName || user.email
        : "User";
  }
}

// Analysis: create a simple analysis document in Firestore for a quiz
async function analyzeQuiz(quizId) {
  if (!currentUser || !db) return;
  const confirmAnalysis = window.confirm(
    "Run analysis for this quiz? This will create an analysis record.",
  );
  if (!confirmAnalysis) return;
  try {
    await db.collection("analysis").add({
      quizId,
      userId: currentUser.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      status: "queued",
    });
    setStatus("Analysis task queued.", "success");
  } catch (error) {
    handleFirestoreError(error, "Analysis failed to start.");
  }
}

function handleBuilderInput(event) {
  const target = event.target;
  const index = Number(target.dataset.index);
  const field = target.dataset.field;
  const optionIndex = Number(target.dataset.optionIndex);
  const lang = target.dataset.lang;

  if (
    field === "correct" &&
    Number.isInteger(index) &&
    builderQuestions[index]
  ) {
    const question = builderQuestions[index];
    if (question.type === "multiple_choice") {
      const selected = Array.isArray(question.correct_answers)
        ? question.correct_answers.slice()
        : [];

      if (target.checked && !selected.includes(optionIndex)) {
        selected.push(optionIndex);
      }

      if (!target.checked) {
        const selectedIndex = selected.indexOf(optionIndex);
        if (selectedIndex !== -1) {
          selected.splice(selectedIndex, 1);
        }
      }

      question.correct_answers = selected.sort((a, b) => a - b);
    } else if (target.checked) {
      question.correct_answer = optionIndex;
    }

    renderQuestionBuilder();
    syncJsonTextarea();
    return;
  }

  if (
    target.id === "quizPrimaryLanguage" ||
    target.id === "enableTranslation"
  ) {
    applyBuilderLanguageVisibility();
    renderQuestionBuilder();
    syncJsonTextarea();
    return;
  }

  if (!Number.isInteger(index) || !field || !builderQuestions[index]) {
    return;
  }

  const question = builderQuestions[index];

  if (field === "question") {
    if (lang === "ar") {
      question.question_ar = target.value;
    } else {
      question.question = target.value;
    }
    syncJsonTextarea();
    return;
  }

  if (field === "explanation") {
    if (lang === "ar") {
      question.explanation_ar = target.value;
    } else {
      question.explanation = target.value;
    }
    syncJsonTextarea();
    return;
  }

  if (field === "option") {
    const questionKey = lang === "ar" ? "options_ar" : "options";
    const currentArray = Array.isArray(question[questionKey])
      ? question[questionKey].slice()
      : [];

    while (currentArray.length <= optionIndex) {
      currentArray.push("");
    }

    currentArray[optionIndex] = target.value;
    question[questionKey] = currentArray;
    syncQuestionOptionArrays(question);
    syncJsonTextarea();
    return;
  }

  question[field] = target.value;
  syncJsonTextarea();
}

function registerEventHandlers() {
  // Prompt 1: Logout and Delete Account moved to index.html
  // elements.logoutBtn and elements.deleteAccountBtn are no longer in dashboard.html

  // Prompt 3: AI Modal functions
  const aiModalTrigger = document.querySelector(".ai-prompt-trigger");
  if (aiModalTrigger) {
    aiModalTrigger.addEventListener("click", (e) => {
      e.preventDefault();
      openAiModal();
    });
  }

  elements.addQuestionBtn?.addEventListener("click", () => {
    if (builderQuestions.length >= 200) {
      setStatus(
        `Cannot add more questions: ${builderQuestions.length} / 200`,
        "error",
      );
      return;
    }
    const type = elements.newQuestionType.value;
    builderQuestions.push(createQuestionTemplate(type));
    renderQuestionBuilder();
    syncJsonTextarea();
    setStatus(`Added ${type} question.`);
  });

  elements.resetBuilderBtn?.addEventListener("click", resetBuilder);
  elements.saveQuizBtn?.addEventListener("click", saveQuiz);

  // Real-time validation for top-level fields
  if (elements.quizName) {
    elements.quizName.addEventListener("input", (e) =>
      validateInputElement(e.target),
    );
    elements.quizName.addEventListener("paste", (e) =>
      setTimeout(() => validateInputElement(elements.quizName), 10),
    );
  }
  if (elements.quizDescription) {
    elements.quizDescription.addEventListener("input", (e) =>
      validateInputElement(e.target),
    );
    elements.quizDescription.addEventListener("paste", (e) =>
      setTimeout(() => validateInputElement(elements.quizDescription), 10),
    );
  }

  elements.quizPrimaryLanguage?.addEventListener("change", () => {
    applyBuilderLanguageVisibility();
    renderQuestionBuilder();
  });

  elements.enableTranslation?.addEventListener("change", () => {
    applyBuilderLanguageVisibility();
    renderQuestionBuilder();
  });

  // Prompt 3: Ensure newQuestionType properly updates internal state
  elements.newQuestionType?.addEventListener("change", () => {
    // Visual feedback: update add button text based on selected type
    const selectedType = elements.newQuestionType.value;
    const typeLabels = {
      choice: "Add Question",
      true_false: "Add True/False",
      multiple_choice: "Add Multi-Select",
    };
    if (elements.addQuestionBtn) {
      elements.addQuestionBtn.textContent =
        typeLabels[selectedType] || "Add Question";
    }
  });

  elements.jsonRawInput?.addEventListener("input", (event) => {
    const text = event.target.value.trim();
    if (!text) {
      return;
    }

    try {
      JSON.parse(text);
      parseRawJsonToBuilder(event.target.value);
    } catch (error) {
      // Ignore invalid JSON while the user is still typing.
    }
  });

  const clearInlineErrorOnInput = (event) => {
    const target = event.target;
    if (!target || !target.classList) return;

    if (target.classList.contains("input-error")) {
      clearInlineError(target);
    } else {
      const nextElement = target.nextElementSibling;
      if (nextElement && nextElement.classList.contains("error-hint")) {
        nextElement.remove();
      }
    }
  };

  elements.quizForm?.addEventListener("input", clearInlineErrorOnInput);
  elements.quizForm?.addEventListener("change", clearInlineErrorOnInput);
  elements.questionBuilderList?.addEventListener(
    "input",
    clearInlineErrorOnInput,
  );
  elements.questionBuilderList?.addEventListener(
    "change",
    clearInlineErrorOnInput,
  );

  elements.questionBuilderList?.addEventListener("input", handleBuilderInput);
  elements.questionBuilderList?.addEventListener("change", handleBuilderInput);

  elements.questionBuilderList?.addEventListener("click", (event) => {
    const button = event.target.closest(
      'button[data-action="remove-question"]',
    );
    if (!button) return;

    const index = Number(button.dataset.index);
    if (!Number.isInteger(index)) return;

    builderQuestions.splice(index, 1);
    renderQuestionBuilder();
    syncJsonTextarea();
    setStatus("Question removed.");
  });

  elements.questionBuilderList?.addEventListener("click", (event) => {
    const addButton = event.target.closest('button[data-action="add-option"]');
    const removeOptionButton = event.target.closest(
      'button[data-action="remove-option"]',
    );

    if (addButton) {
      const questionIndex = Number(addButton.dataset.index);
      const question = builderQuestions[questionIndex];
      if (!question) return;

      if (question.type === "true_false") {
        return;
      }

      if ((question.options || []).length >= 10) {
        setStatus("Maximum of 10 options reached.", "error");
        return;
      }

      question.options = Array.isArray(question.options)
        ? question.options.slice()
        : [];
      question.options_ar = Array.isArray(question.options_ar)
        ? question.options_ar.slice()
        : [];
      question.options.push("");
      question.options_ar.push("");
      syncQuestionOptionArrays(question);
      renderQuestionBuilder();
      syncJsonTextarea();
      setStatus("Option added.", "success");
      return;
    }

    if (removeOptionButton) {
      const questionIndex = Number(removeOptionButton.dataset.index);
      const optionIndex = Number(removeOptionButton.dataset.optionIndex);
      const question = builderQuestions[questionIndex];
      if (!question) return;

      if ((question.options || []).length <= 2) {
        setStatus("Each question needs at least 2 options.", "error");
        return;
      }

      question.options.splice(optionIndex, 1);
      question.options_ar.splice(optionIndex, 1);

      if (question.type === "multiple_choice") {
        question.correct_answers = (question.correct_answers || [])
          .filter((selectedIndex) => selectedIndex !== optionIndex)
          .map((selectedIndex) =>
            selectedIndex > optionIndex ? selectedIndex - 1 : selectedIndex,
          );
      } else if (Number(question.correct_answer) === optionIndex) {
        question.correct_answer = 0;
      } else if (Number(question.correct_answer) > optionIndex) {
        question.correct_answer -= 1;
      }

      syncQuestionOptionArrays(question);
      renderQuestionBuilder();
      syncJsonTextarea();
      setStatus("Option removed.", "success");
    }
  });

  elements.myQuizList?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    const quizId = button.dataset.id;

    if (action === "edit") {
      editQuiz(quizId);
    } else if (action === "delete") {
      deleteQuiz(quizId);
    } else if (action === "share-quiz") {
      const shareUrl = `${buildShareBaseUrl()}?quizId=${quizId}`;
      copyToClipboard(shareUrl).catch((error) => {
        console.error("Copy quiz share link failed:", error);
        showShareToast("Copy failed");
      });
    }
  });

  // Wire up nav buttons
  document
    .getElementById("toggleMyQuizzesBtn")
    ?.addEventListener("click", () => {
      const panel = document.getElementById("myQuizzesPanel");
      if (panel) {
        panel.style.display = panel.style.display === "none" ? "block" : "none";
        // adjust grid when hidden
        if (panel.style.display === "none") {
          document.querySelector(".layout-grid").style.gridTemplateColumns =
            "1fr";
        } else {
          document.querySelector(".layout-grid").style.gridTemplateColumns =
            "1fr 360px";
        }
      }
    });

  // Start automatic site analysis if analysis module is available.
  if (typeof window.runSiteAnalysis === "function") {
    try {
      // Run once on dashboard load
      window.runSiteAnalysis();
      // Repeat periodically (every 5 minutes)
      setInterval(
        () => {
          try {
            window.runSiteAnalysis();
          } catch (e) {
            console.warn("Periodic analysis failed:", e);
          }
        },
        5 * 60 * 1000,
      );
    } catch (e) {
      console.warn("Automatic analysis failed to start:", e);
    }
  }
}

// ===== Prompt 3: AI Prompt Modal =====
function openAiModal() {
  const overlay = document.getElementById("aiModalOverlay");
  if (overlay) {
    overlay.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
}

function closeAiModal() {
  const overlay = document.getElementById("aiModalOverlay");
  if (overlay) {
    overlay.style.display = "none";
    document.body.style.overflow = "";
  }
}

async function copyAiPrompt() {
  const codeBlock = document.getElementById("aiPromptCode");
  if (!codeBlock) return;

  const promptText = codeBlock.textContent;
  try {
    await navigator.clipboard.writeText(promptText);
    const btn = document.querySelector(".ai-modal-footer .btn-primary");
    const originalText = btn ? btn.textContent : "";
    if (btn) {
      btn.textContent = "✅ Copied!";
      setTimeout(() => {
        btn.textContent = originalText;
      }, 1600);
    }
  } catch (error) {
    console.error("Copy failed:", error);
    alert("Copy failed. Please select and copy manually.");
  }
}

// Close modal on overlay click
document.addEventListener("click", (e) => {
  const overlay = document.getElementById("aiModalOverlay");
  if (overlay && e.target === overlay) {
    closeAiModal();
  }
});

// Close modal on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeAiModal();
  }
});

function initDashboard() {
  registerEventHandlers();
  loadTheme();
  displayThemeOptions();

  const settingsBtn = document.getElementById("settingsBtn");
  if (settingsBtn) settingsBtn.addEventListener("click", openSettingsModal);

  // Validate top-level fields initially
  if (elements.quizName) validateInputElement(elements.quizName);
  if (elements.quizDescription) validateInputElement(elements.quizDescription);

  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    currentUser = user;
    updateUserHeader(user);
    await loadMyQuizzes();
    setStatus("Authenticated. You can manage your quizzes now.", "success");
  });
}

initDashboard();
