// ===== الثيمات المتاحة =====
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

// ===== المتغيرات الرئيسية =====
let quizzes = [];
let currentQuiz = null;
let currentQuestionIndex = 0;
let answers = {}; // تتبع إجابات المستخدم
let submitted = {}; // تتبع الأسئلة التي تم تقديم إجاباتها
let skipped = new Set();
let correctCount = 0;
let incorrectCount = 0;
let startTime = null;
let timerInterval = null;
let isTranslated = false;
let timerMode = "none";
let timerDuration = 0;
let timerStartTime = null;
let timeExpired = false;
let currentUser = null;
let appInitialized = false;
let feedMessage = null;
let landingMode = false;

// ===== Firebase إعداد =====
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

const auth = typeof firebase !== "undefined" ? firebase.auth() : null;
const db = typeof firebase !== "undefined" ? firebase.firestore() : null;

function getQuizIdFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const quizId = params.get("quizId");
    return quizId && quizId.trim() ? quizId.trim() : null;
  } catch (error) {
    return null;
  }
}

function getUserIdFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get("userId");
    return userId && userId.trim() ? userId.trim() : null;
  } catch (error) {
    return null;
  }
}

function hasRouteParams() {
  return Boolean(getQuizIdFromUrl() || getUserIdFromUrl());
}

function setFeedMessage(title, message) {
  feedMessage = {
    title,
    message,
  };
}

function clearFeedMessage() {
  feedMessage = null;
}

function showFriendlyGlobalError(message) {
  try {
    alert(message);
  } catch (e) {}
  try {
    setFeedMessage("Error", message);
  } catch (e) {}
}

function handleFirestoreErrorGlobal(error, defaultMessage) {
  console.warn("Firestore error:", error);
  const code = error && (error.code || error?.message || "");
  if (
    code === "resource-exhausted" ||
    code === "quota-exceeded" ||
    (typeof code === "string" && code.includes("quota")) ||
    code === "unavailable" ||
    code === "deadline-exceeded"
  ) {
    showFriendlyGlobalError(
      "The server is experiencing heavy load. Please try again later.",
    );
  } else if (code === "permission-denied") {
    showFriendlyGlobalError("Permission denied. Please check your access.");
  } else {
    showFriendlyGlobalError(defaultMessage || "An unexpected error occurred.");
  }
}

function updateAuthUI(user) {
  const loggedOutView = document.getElementById("loggedOutView");
  const loggedInView = document.getElementById("loggedInView");
  const userAvatar = document.getElementById("userAvatar");
  const userName = document.getElementById("userName");

  if (!loggedOutView || !loggedInView || !userAvatar || !userName) return;

  if (user) {
    loggedOutView.style.display = "none";
    loggedInView.style.display = "flex";
    userAvatar.src =
      sanitizeImageUrl(user.photoURL) ||
      "https://www.gravatar.com/avatar/?d=mp";
    userName.textContent = user.displayName || user.email || "User";
  } else {
    loggedOutView.style.display = "flex";
    loggedInView.style.display = "none";
    userAvatar.src = "";
    userName.textContent = "";
  }
}

async function loginWithGoogle() {
  if (!auth) {
    console.error("Firebase Auth is not initialized.");
    return;
  }

  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    await auth.signInWithPopup(provider);
  } catch (error) {
    console.error("خطأ في تسجيل الدخول عبر جوجل:", error);
    handleFirestoreErrorGlobal(error, "Failed to sign in. Please try again.");
  }
}

async function logoutUser() {
  if (!auth) {
    console.error("Firebase Auth is not initialized.");
    return;
  }

  try {
    await auth.signOut();
  } catch (error) {
    console.error("خطأ في تسجيل الخروج:", error);
    handleFirestoreErrorGlobal(error, "Failed to sign out. Please try again.");
  }
}

// ===== Prompt 1: Delete Account (moved from dashboard.js) =====
async function deleteAccountAndQuizzes() {
  if (!auth || !db) {
    throw new Error("Firebase is not initialized.");
  }
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No authenticated user found.");
  }

  const snapshot = await db
    .collection("quizzes")
    .where("userId", "==", user.uid)
    .get();

  await Promise.all(snapshot.docs.map((doc) => doc.ref.delete()));
  await user.delete();
}

function deleteAccount() {
  const confirmDelete = window.confirm(
    "Are you sure? This will permanently delete your account and ALL your quizzes. This action cannot be undone.",
  );
  if (!confirmDelete) return;

  deleteAccountAndQuizzes()
    .then(() => {
      window.location.reload();
    })
    .catch((error) => {
      if (error && error.code === "auth/requires-recent-login") {
        alert("Please sign in again before deleting the account.");
        return;
      }
      handleFirestoreErrorGlobal(
        error,
        "Failed to delete account: " + (error.message || "Unknown error"),
      );
    });
}

// ===== Prompt 1: User Dropdown Toggle =====
function toggleUserDropdown() {
  const menu = document.getElementById("userDropdownMenu");
  if (menu) {
    menu.classList.toggle("show");
  }
}

function closeUserDropdown() {
  const menu = document.getElementById("userDropdownMenu");
  if (menu) {
    menu.classList.remove("show");
  }
}

document.addEventListener("click", (e) => {
  const dropdown = document.getElementById("userDropdown");
  if (dropdown && !dropdown.contains(e.target)) {
    closeUserDropdown();
  }
});

// ===== تحميل البيانات =====
async function loadQuizzes() {
  if (!db) {
    quizzes = [];
    setFeedMessage("Access Unavailable", "Firestore is not initialized.");
    landingMode = false;
    initializeApp();
    return;
  }

  try {
    const quizId = getQuizIdFromUrl();
    const userId = getUserIdFromUrl();

    if (!quizId && !userId) {
      // If user is signed in, show their quizzes (public + own). Otherwise show landing welcome.
      if (currentUser) {
        landingMode = false;
        try {
          const [publicSnap, mySnap] = await Promise.all([
            db.collection("quizzes").where("isPublic", "==", true).get(),
            db
              .collection("quizzes")
              .where("userId", "==", currentUser.uid)
              .get(),
          ]);

          const map = new Map();
          publicSnap.docs.concat(mySnap.docs).forEach((doc) => {
            map.set(doc.id, { id: doc.id, ...doc.data() });
          });

          quizzes = Array.from(map.values()).filter((q) =>
            Array.isArray(q.questions),
          );
          initializeApp();
          return;
        } catch (err) {
          console.warn("Error loading landing quizzes:", err);
          quizzes = [];
          landingMode = true;
          clearFeedMessage();
          initializeApp();
          return;
        }
      }

      landingMode = true;
      quizzes = [];
      clearFeedMessage();
      initializeApp();
      return;
    }

    landingMode = false;

    if (quizId) {
      const doc = await db.collection("quizzes").doc(quizId).get();

      if (!doc.exists) {
        quizzes = [];
        setFeedMessage(
          "Quiz Not Found or Private",
          "This quiz either does not exist, was deleted by its creator, or is set to private.",
        );
        initializeApp();
        return;
      }

      const data = doc.data() || {};
      if (!Array.isArray(data.questions)) {
        quizzes = [];
        setFeedMessage(
          "Quiz Unavailable",
          "This quiz is missing required question data.",
        );
        initializeApp();
        return;
      }

      const ownerUid = data.userId || null;
      const isPublic = data.isPublic === true;
      const isOwner = Boolean(
        currentUser && ownerUid && currentUser.uid === ownerUid,
      );

      if (!isPublic && !isOwner) {
        quizzes = [];
        setFeedMessage(
          "Access Denied / Private Quiz",
          "This quiz is private and cannot be opened from this account.",
        );
        initializeApp();
        return;
      }

      clearFeedMessage();
      quizzes = [{ id: doc.id, ...data }];
      initializeApp();
      return;
    }

    clearFeedMessage();

    const snapshot = await db
      .collection("quizzes")
      .where("userId", "==", userId)
      .where("isPublic", "==", true)
      .get();

    quizzes = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((quiz) => Array.isArray(quiz.questions));
    initializeApp();
  } catch (error) {
    quizzes = [];
    if (
      error &&
      (error.code === "permission-denied" || error.code === "not-found")
    ) {
      setFeedMessage(
        "Quiz Not Found or Private",
        "This quiz either does not exist, was deleted by its creator, or is set to private.",
      );
    } else {
      handleFirestoreErrorGlobal(error, "Unable to load quizzes right now.");
      console.warn("خطأ في تحميل الكويزات:", error);
    }
    initializeApp();
  }
}

function initializeApp() {
  if (!appInitialized) {
    loadTheme();
    displayThemeOptions();
    appInitialized = true;
  }
  displayQuizzes();
}

// ===== نظام الثيمات =====
function displayThemeOptions() {
  const container = document.getElementById("themeList");
  container.innerHTML = "";

  themes.forEach((theme, index) => {
    const div = document.createElement("div");
    div.className = "theme-item";
    div.textContent = theme.name;
    div.onclick = () => {
      applyTheme(index);
      closeThemeMenu();
    };

    const savedTheme = localStorage.getItem("selectedTheme") || "0";
    if (parseInt(savedTheme) === index) {
      div.classList.add("active");
    }

    container.appendChild(div);
  });
}

function toggleThemeMenu() {
  const menu = document.getElementById("themeMenu");
  menu.classList.toggle("show");
}

function closeThemeMenu() {
  document.getElementById("themeMenu").classList.remove("show");
}

document.addEventListener("click", (e) => {
  const menu = document.getElementById("themeMenu");
  const btn = document.querySelector(".theme-toggle-btn");
  if (!menu.contains(e.target) && !btn.contains(e.target)) {
    closeThemeMenu();
  }
});

function applyTheme(index) {
  const theme = themes[index];
  document.documentElement.style.setProperty("--primary", theme.primary);
  document.documentElement.style.setProperty("--secondary", theme.secondary);
  localStorage.setItem("selectedTheme", index);
  displayThemeOptions();
}

function loadTheme() {
  const savedTheme = localStorage.getItem("selectedTheme") || "0";
  applyTheme(parseInt(savedTheme));
}

// ===== عرض الكويزات =====
function displayQuizzes() {
  const grid = document.getElementById("quizzesGrid");
  const emptyState = document.getElementById("emptyState");
  grid.innerHTML = "";

  let emptyTitle = emptyState.querySelector("h2");
  let emptyMessage = emptyState.querySelector("p");

  if (!emptyTitle) {
    emptyTitle = document.createElement("h2");
    emptyState.appendChild(emptyTitle);
  }

  if (!emptyMessage) {
    emptyMessage = document.createElement("p");
    emptyState.appendChild(emptyMessage);
  }

  if (landingMode) {
    grid.style.display = "none";
    emptyState.style.display = "block";
    emptyState.replaceChildren();

    const title = document.createElement("h2");
    title.textContent = "Welcome to the Quiz Platform";

    const description = document.createElement("p");
    description.textContent =
      "Sign in to manage your quizzes, create new content, and share public quizzes with a direct link.";

    const cta = document.createElement("button");
    cta.className = "btn-primary";
    cta.style.marginTop = "16px";
    cta.textContent = "Sign in with Google";
    cta.addEventListener("click", loginWithGoogle);

    emptyState.appendChild(title);
    emptyState.appendChild(description);
    emptyState.appendChild(cta);
    return;
  }

  grid.style.display = "grid";

  if (feedMessage) {
    emptyTitle.textContent = feedMessage.title;
    emptyMessage.textContent = feedMessage.message;
    emptyState.style.display = "block";
    return;
  }

  if (quizzes.length === 0) {
    emptyTitle.textContent = "📚 لا توجد كويزات متاحة حالياً";
    emptyMessage.textContent = "يرجى الانتظار قريباً سيتم إضافة كويزات جديدة";
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  quizzes.forEach((quiz, index) => {
    const card = document.createElement("div");
    card.className = "quiz-card";

    const questionCount = quiz.questions.length;

    const title = document.createElement("h3");
    title.dir = "ltr";
    title.textContent = quiz.name || quiz.name_ar || "Untitled Quiz";

    const description = document.createElement("p");
    description.dir = "ltr";
    description.textContent = quiz.description || "كويز تفاعلي";

    const info = document.createElement("div");
    info.className = "quiz-info";

    const questionCountSpan = document.createElement("span");
    questionCountSpan.className = "question-count";
    questionCountSpan.textContent = `${questionCount} أسئلة`;
    info.appendChild(questionCountSpan);

    const startButton = document.createElement("button");
    startButton.className = "btn-primary";
    startButton.style.width = "100%";
    startButton.textContent = "ابدأ الكويز";
    startButton.addEventListener("click", () => startQuiz(index));

    card.appendChild(title);
    card.appendChild(description);
    card.appendChild(info);
    card.appendChild(startButton);

    grid.appendChild(card);
  });
}

// ===== بدء الكويز =====
function startQuiz(index) {
  currentQuiz = quizzes[index];
  currentQuestionIndex = 0;
  answers = {};
  submitted = {};
  skipped = new Set();
  correctCount = 0;
  incorrectCount = 0;
  timeExpired = false;

  // Use global timer controls (moved to navbar)
  function getGlobalTimerMode() {
    const checked = document.querySelector('input[name="globalTimer"]:checked');
    return checked ? checked.value : "none";
  }

  timerMode = getGlobalTimerMode();
  if (timerMode === "descending") {
    const minutesEl = document.getElementById("globalTimerValue");
    const minutes = minutesEl ? parseInt(minutesEl.value, 10) || 10 : 10;
    timerDuration = minutes * 60;
  }

  startTime = Date.now();
  timerStartTime = Date.now();

  document.getElementById("homePage").style.display = "none";
  document.getElementById("quizPage").style.display = "block";
  document.getElementById("resultsPage").style.display = "none";

  // Hide global top navbar while taking quiz
  const topNavbar = document.getElementById("topNavbar");
  if (topNavbar) topNavbar.style.display = "none";

  document.getElementById("quizTitle").textContent = currentQuiz.name;

  // إخفاء المؤقت إذا كان بدون وقت
  const timerElement = document.getElementById("timer");
  if (timerMode === "none") {
    timerElement.classList.add("hidden");
  } else {
    timerElement.classList.remove("hidden");
    startTimer();
  }

  initProgressBar(currentQuiz.questions.length);
  updateProgressSegment(-1, ""); // تلوين الحالي بالازرق

  // ===== Prompt 2: Monolingual vs Bilingual Detection =====
  const quizEnableTranslation = currentQuiz.enableTranslation !== false; // default true
  const quizPrimaryLanguage = currentQuiz.primaryLanguage || "en";

  const translateBtn = document.getElementById("translateBtn");
  const langSwitchContainer = document.getElementById("langSwitchContainer");

  if (!quizEnableTranslation) {
    // Hide translation UI completely
    translateBtn.style.display = "none";
    if (langSwitchContainer) langSwitchContainer.style.display = "none";

    // Force the correct language automatically without triggering side effects
    if (quizPrimaryLanguage === "ar") {
      isTranslated = true;
    } else {
      isTranslated = false;
    }
    document.getElementById("question-content").dir = isTranslated
      ? "rtl"
      : "ltr";
  } else {
    // Translation enabled - show toggle, reset to English default
    translateBtn.style.display = "inline-block";
    if (langSwitchContainer) langSwitchContainer.style.display = "block";
    isTranslated = false;
    document.getElementById("question-content").dir = "ltr";
  }

  displayQuestion();
}

// ===== نظام المؤقت =====
function startTimer() {
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    let display = "";

    if (timerMode === "ascending") {
      const elapsed = Math.floor((Date.now() - timerStartTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      display = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    } else if (timerMode === "descending") {
      const elapsed = Math.floor((Date.now() - timerStartTime) / 1000);
      const remaining = timerDuration - elapsed;

      if (remaining <= 0) {
        clearInterval(timerInterval);
        timeExpired = true;
        markRemainingAsSkipped();
        showResults();
        return;
      }

      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      display = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    document.getElementById("timer").textContent = display;
  }, 1000);
}

function markRemainingAsSkipped() {
  for (let i = currentQuestionIndex; i < currentQuiz.questions.length; i++) {
    if (!skipped.has(i)) {
      skipped.add(i);
    }
  }
}

function initProgressBar(totalQuestions) {
  const track = document.getElementById("progressTrack");
  track.innerHTML = ""; // تنظيف القديم

  for (let i = totalQuestions - 1; i >= 0; i--) {
    const segment = document.createElement("div");
    segment.className = "progress-segment";
    segment.id = `prog-seg-${i}`; // ID مميز لكل قطعة
    segment.style.cursor = "pointer";
    segment.title = `Question ${i + 1}`;
    segment.addEventListener("click", () => jumpToQuestion(i));
    track.appendChild(segment);
  }
}

// ===== Prompt 2: Jump to Question via Progress Bar =====
function jumpToQuestion(targetIndex) {
  if (targetIndex === currentQuestionIndex) return;
  if (targetIndex < 0 || targetIndex >= currentQuiz.questions.length) return;

  // If current question is not submitted, mark it as skipped
  if (!submitted[currentQuestionIndex] && !skipped.has(currentQuestionIndex)) {
    skipped.add(currentQuestionIndex);
    updateProgressSegment(currentQuestionIndex, "skipped");
  }

  currentQuestionIndex = targetIndex;
  displayQuestion();
}

function updateProgressSegment(index, status) {
  const segment = document.getElementById(`prog-seg-${index}`);
  if (segment) {
    // Prompt 2: Strict CSS class validation - remove ALL state classes first
    segment.classList.remove("current", "correct", "wrong", "skipped");
    if (
      status === "current" ||
      status === "correct" ||
      status === "wrong" ||
      status === "skipped"
    ) {
      segment.classList.add(status);
    }
  }

  // تمييز السؤال التالي (اختياري) - only if it has no state yet
  const nextSegment = document.getElementById(`prog-seg-${index + 1}`);
  if (nextSegment) {
    const hasState =
      nextSegment.classList.contains("correct") ||
      nextSegment.classList.contains("wrong") ||
      nextSegment.classList.contains("skipped");
    if (!hasState) {
      nextSegment.classList.add("current");
    }
  }
}

// ===== عرض السؤال =====
function displayQuestion() {
  const question = currentQuiz.questions[currentQuestionIndex];

  document.getElementById("questionNumber").textContent =
    `السؤال ${currentQuestionIndex + 1}`;

  let typeText = "";
  if (question.type === "true_false") typeText = "صح / خطأ";
  else if (question.type === "choice") typeText = "اختيار واحد";
  else if (question.type === "multiple_choice") typeText = "اختيارات متعددة";

  document.getElementById("questionType").textContent = typeText;

  // عرض السؤال
  let questionText =
    isTranslated && question.question_ar
      ? question.question_ar
      : question.question;
  document.getElementById("questionText").textContent = questionText;

  // عرض الصورة إذا وجدت
  const questionImage = document.getElementById("questionImage");
  const safeImg = sanitizeImageUrl(question.image || "");
  if (safeImg) {
    questionImage.src = safeImg;
    questionImage.style.display = "block";
  } else {
    questionImage.src = "";
    questionImage.style.display = "none";
  }

  // إظهار/إخفاء زر التأكيد
  const submitBtn = document.getElementById("submitBtn");

  const isAnswered = submitted[currentQuestionIndex] === true;

  if (question.type === "multiple_choice" && !isAnswered) {
    submitBtn.style.display = "inline-block";
  } else {
    submitBtn.style.display = "none";
  }

  // إخفاء الملاحظات إذا لم يكن السؤال محلول
  const feedbackElement = document.getElementById("feedback");

  if (!isAnswered) {
    feedbackElement.replaceChildren();
    feedbackElement.classList.remove("show", "correct", "incorrect");
  }

  // عرض الخيارات
  const optionsContainer = document.getElementById("optionsContainer");
  optionsContainer.replaceChildren();

  const groupName = `question_${currentQuestionIndex}`;
  let options =
    isTranslated && question.options_ar
      ? question.options_ar
      : question.options;

  options.forEach((option, idx) => {
    const div = document.createElement("div");
    div.className = "option";

    if (isAnswered) {
      div.classList.add("disabled");
    }

    const id = `option_${currentQuestionIndex}_${idx}`;
    const inputType =
      question.type === "multiple_choice" ? "checkbox" : "radio";
    const input = document.createElement("input");
    input.type = inputType;
    input.name = groupName;
    input.value = idx;
    input.id = id;
    input.disabled = isAnswered;

    if (question.type === "multiple_choice") {
      if (
        answers[currentQuestionIndex] &&
        answers[currentQuestionIndex].includes(idx)
      ) {
        input.checked = true;
        div.classList.add("selected");
      }
    } else {
      if (answers[currentQuestionIndex] === idx) {
        input.checked = true;
        div.classList.add("selected");
      }
    }

    // تطبيق ألوان التصحيح إذا تم الإجابة
    if (isAnswered) {
      const isCorrect = checkIfCorrect(idx);
      if (isCorrect) {
        div.classList.add("correct");
      } else if (
        answers[currentQuestionIndex] === idx ||
        (Array.isArray(answers[currentQuestionIndex]) &&
          answers[currentQuestionIndex].includes(idx))
      ) {
        div.classList.add("incorrect");
      }
    }

    input.onchange = () => {
      if (isAnswered) return;

      if (question.type === "multiple_choice") {
        const checkboxes = document.querySelectorAll(
          `input[name="${groupName}"]:checked`,
        );
        answers[currentQuestionIndex] = Array.from(checkboxes).map((cb) =>
          parseInt(cb.value),
        );
        updateOptionSelection(groupName);

        // لا تقم بتقديم الإجابة فوراً في حالة الاختيارات المتعددة
      } else {
        document
          .querySelectorAll(`input[name="${groupName}"]`)
          .forEach((inp) => {
            inp.parentElement.classList.remove("selected");
          });
        div.classList.add("selected");
        answers[currentQuestionIndex] = idx;

        if (question.type !== "multiple_choice") {
          submitted[currentQuestionIndex] = true;
          skipped.delete(currentQuestionIndex);
          // طبق اللون الصحيح فوراً
          const isCorrect = checkIfCorrect(idx);
          if (isCorrect) {
            div.classList.add("correct");
            correctCount++;
            updateProgressSegment(currentQuestionIndex, "correct");
          } else {
            div.classList.add("incorrect");
            incorrectCount++;
            updateProgressSegment(currentQuestionIndex, "wrong");
            // تمييز الإجابة الصحيحة
            const correctIdx = question.correct_answer;
            const correctOption = document.getElementById(
              `option_${currentQuestionIndex}_${correctIdx}`,
            );
            if (correctOption) {
              correctOption.parentElement.classList.add("correct");
            }
          }
          // تجميد فوري
          freezeQuestion();
          showFeedback();
        }
      }
    };

    const label = document.createElement("label");
    label.htmlFor = id;
    label.textContent = option;

    div.appendChild(input);
    div.appendChild(label);
    optionsContainer.appendChild(div);
  });

  // إظهار الملاحظات إذا كان السؤال محلول
  if (isAnswered) {
    feedbackElement.classList.add("show");
    showFeedback();
  } else {
    feedbackElement.classList.remove("show");
  }

  updateButtonStates();
}

function freezeQuestion() {
  const groupName = `question_${currentQuestionIndex}`;
  const inputs = document.querySelectorAll(`input[name="${groupName}"]`);
  inputs.forEach((input) => {
    input.disabled = true;
    input.parentElement.classList.add("disabled");
  });
}

function checkIfCorrect(optionIdx) {
  const question = currentQuiz.questions[currentQuestionIndex];
  if (question.type === "multiple_choice") {
    return question.correct_answers.includes(optionIdx);
  } else {
    return question.correct_answer === optionIdx;
  }
}

function updateOptionSelection(groupName) {
  document.querySelectorAll(`input[name="${groupName}"]`).forEach((inp) => {
    inp.parentElement.classList.toggle("selected", inp.checked);
  });
}

// ===== الترجمة =====
function toggleTranslate() {
  isTranslated = !isTranslated;

  document.getElementById("question-content").dir = isTranslated
    ? "rtl"
    : "ltr";

  if (document.getElementById("quizPage").style.display === "block") {
    document.getElementById("langToggle").checked = isTranslated;
    displayQuestion();
    // Prompt 2: Only show feedback if current question is already submitted
    if (submitted[currentQuestionIndex] === true) {
      showFeedback();
    }
  } else {
    ShowWrongAndSkipped();
  }
}

// ===== عرض الملاحظات =====
function showFeedback() {
  if (answers[currentQuestionIndex] === undefined) return;
  const question = currentQuiz.questions[currentQuestionIndex];
  const feedback = document.getElementById("feedback");
  const userAnswer = answers[currentQuestionIndex];

  let isCorrect = false;

  if (question.type === "multiple_choice") {
    isCorrect =
      JSON.stringify(userAnswer.sort((a, b) => a - b)) ===
      JSON.stringify(question.correct_answers.sort((a, b) => a - b));
  } else {
    isCorrect = userAnswer === question.correct_answer;
  }

  const IncorrectAnswerText = isTranslated ? "إجابة خاطئة" : "Incorrect Answer";
  const CorrectAnswerText = isTranslated ? "الإجابة الصحيحة" : "Correct Answer";
  const ExplanationText = isTranslated ? "الشرح" : "Explanation";

  feedback.replaceChildren();

  if (isCorrect) {
    feedback.className = "feedback show correct";
    const explanation =
      isTranslated && question.explanation_ar
        ? question.explanation_ar
        : question.explanation;
    const title = document.createElement("div");
    title.className = "feedback-title";
    title.textContent = `✓ ${CorrectAnswerText}`;
    const text = document.createElement("div");
    text.className = "feedback-text";
    text.textContent = explanation || "";
    feedback.appendChild(title);
    feedback.appendChild(text);
  } else {
    let correctAnswerText = "";
    const correctOptions =
      isTranslated && question.options_ar
        ? question.options_ar
        : question.options;

    if (question.type === "multiple_choice") {
      correctAnswerText = question.correct_answers
        .map((idx) => correctOptions[idx])
        .join(" & ");
    } else {
      correctAnswerText = correctOptions[question.correct_answer];
    }

    feedback.className = "feedback show incorrect";
    const explanation =
      isTranslated && question.explanation_ar
        ? question.explanation_ar
        : question.explanation;
    const title = document.createElement("div");
    title.className = "feedback-title";
    title.textContent = `✗ ${IncorrectAnswerText}`;

    const text = document.createElement("div");
    text.className = "feedback-text";

    const correctLine = document.createElement("div");
    const correctStrong = document.createElement("strong");
    correctStrong.textContent = `${CorrectAnswerText}: `;
    correctLine.appendChild(correctStrong);
    correctLine.appendChild(document.createTextNode(correctAnswerText));

    const explanationLine = document.createElement("div");
    const explanationStrong = document.createElement("strong");
    explanationStrong.textContent = `${ExplanationText}: `;
    explanationLine.appendChild(explanationStrong);
    explanationLine.appendChild(document.createTextNode(explanation || ""));

    text.appendChild(correctLine);
    text.appendChild(explanationLine);
    feedback.appendChild(title);
    feedback.appendChild(text);
  }

  updateButtonStates();
}

// ===== تقديم الإجابة (للاختيارات المتعددة) =====
function submitAnswer() {
  const question = currentQuiz.questions[currentQuestionIndex];
  const userAnswer = answers[currentQuestionIndex];

  if (!userAnswer || userAnswer.length === 0) {
    const options = document.getElementById("optionsContainer");
    // وميض ينير ويختفي بنفس لون الثيم الحالي حول الخيارات
    options.classList.add("no-answer");
    // اظهار نص الرحاء اختيار إجابة واحدة على الأقل لفترة قصيرة
    const warningText = document.createElement("div");
    warningText.textContent = isTranslated
      ? "الرجاء اختيار إجابة واحدة على الأقل"
      : "Please select at least one answer";
    warningText.classList.add("warning-text");
    options.appendChild(warningText);

    setTimeout(() => {
      options.classList.remove("no-answer");
      options.removeChild(warningText);
    }, 2000);
    return;
  }

  submitted[currentQuestionIndex] = true;
  skipped.delete(currentQuestionIndex);
  submitBtn.style.display = "none";

  // تجميد فوري
  freezeQuestion();

  const isCorrect =
    JSON.stringify(userAnswer.sort((a, b) => a - b)) ===
    JSON.stringify(question.correct_answers.sort((a, b) => a - b));

  if (isCorrect) {
    correctCount++;
    updateProgressSegment(currentQuestionIndex, "correct");
  } else {
    incorrectCount++;
    updateProgressSegment(currentQuestionIndex, "wrong");
  }

  // تطبيق ألوان التصحيح
  document.querySelectorAll(".option").forEach((div, idx) => {
    const input = div.querySelector("input");
    const optionIdx = parseInt(input.value);
    const isOptionCorrect = checkIfCorrect(optionIdx);
    if (isOptionCorrect) {
      div.classList.add("correct");
    } else if (userAnswer.includes(optionIdx)) {
      div.classList.add("incorrect");
    }
  });

  showFeedback();
}

// ===== التنقل بين الأسئلة =====
function nextQuestion() {
  const question = currentQuiz.questions[currentQuestionIndex];

  // التحقق من وجود إجابة
  if (!submitted[currentQuestionIndex] && !skipped.has(currentQuestionIndex)) {
    // إذا لم يكن هناك إجابة، اعتبره متخطى
    skipped.add(currentQuestionIndex);
    updateProgressSegment(currentQuestionIndex, "skipped");
  }

  if (currentQuestionIndex < currentQuiz.questions.length - 1) {
    currentQuestionIndex++;
    displayQuestion();
  } else {
    showResults();
  }
}

function previousQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    displayQuestion();
  }
}

function updateButtonStates() {
  document.getElementById("prevBtn").disabled = currentQuestionIndex === 0;
  document.getElementById("nextBtn").disabled = false;
}

// ===== عرض النتائج =====
function showResults() {
  clearInterval(timerInterval);

  // Recompute authoritative scores from `answers` (do not trust mutable client counters)
  recomputeScores();
  const totalQuestions = currentQuiz.questions.length;
  // Compute skipped count authoritatively: unanswered questions
  let skippedCount = 0;
  for (let i = 0; i < totalQuestions; i++) {
    const q = currentQuiz.questions[i];
    const ans = answers[i];
    if (q.type === "multiple_choice") {
      if (!Array.isArray(ans) || ans.length === 0) skippedCount++;
    } else {
      if (ans === undefined) skippedCount++;
    }
  }
  const percentage = Math.round((correctCount / totalQuestions) * 100);

  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  document.getElementById("quizPage").style.display = "none";
  document.getElementById("resultsPage").style.display = "block";
  const topNavbar = document.getElementById("topNavbar");
  if (topNavbar) topNavbar.style.display = "none";

  document.getElementById("finalScore").textContent = correctCount;
  document.getElementById("finalPercentage").textContent = `${percentage}%`;
  document.getElementById("finalCorrect").textContent = correctCount;
  document.getElementById("finalIncorrect").textContent = incorrectCount;
  document.getElementById("finalSkipped").textContent = skippedCount;

  // حذف الاخطاء السابقة
  document.getElementById("wrongAnswersList").innerHTML = "";
  document.getElementById("wrongAnswersContainer").style.display = "none";
  document.getElementById("skippedAnswersList").innerHTML = "";
  document.getElementById("skippedAnswersContainer").style.display = "none";

  // إظهار/إخفاء الوقت حسب نوع المؤقت
  const timeContainer = document.getElementById("timeContainer");
  if (timerMode === "none") {
    timeContainer.style.display = "none";
  } else {
    timeContainer.style.display = "block";
    document.getElementById("totalTime").textContent =
      `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  // عرض الأخطاء في الصفحة
  ShowWrongAndSkipped();

  const downloadBtn = document.getElementById("downloadPdfBtn");
  const langSwitchContainer = document.getElementById("langSwitchContainer");
  const IsFoundWrongAnswers =
    document.getElementById("wrongAnswersList").children.length > 0;
  const IsFoundSkippedAnswers =
    document.getElementById("skippedAnswersList").children.length > 0;
  // Prompt 2: Hide lang switch for monolingual quizzes
  const quizEnableTranslation = currentQuiz
    ? currentQuiz.enableTranslation !== false
    : true;

  downloadBtn.style.display = "none";
  langSwitchContainer.style.display = "none";

  if (IsFoundWrongAnswers || IsFoundSkippedAnswers) {
    downloadBtn.style.display = "inline-block";
    if (quizEnableTranslation) {
      langSwitchContainer.style.display = "block";
    }
  }
}

function ShowWrongAndSkipped() {
  const wrongAnswers = [];
  const skippedAnswers = [];

  // الأسئلة الخاطئة
  Object.keys(answers).forEach((index) => {
    const idx = Number(index);
    const question = currentQuiz.questions[idx];
    if (!question) return;

    const userAnswer = answers[idx];
    // Treat unanswered values as skipped (do not include as wrong)
    if (question.type === "multiple_choice") {
      if (!Array.isArray(userAnswer) || userAnswer.length === 0) return;
      var isCorrect =
        JSON.stringify(userAnswer.slice().sort((a, b) => a - b)) ===
        JSON.stringify(question.correct_answers.slice().sort((a, b) => a - b));
    } else {
      if (userAnswer === undefined) return;
      var isCorrect = Number(userAnswer) === Number(question.correct_answer);
    }

    if (!isCorrect) {
      let correctAnswerText = "";
      if (question.type === "multiple_choice") {
        correctAnswerText =
          isTranslated && question.options_ar
            ? question.correct_answers
                .map((idx) => question.options_ar[idx])
                .join(" & ")
            : question.correct_answers
                .map((idx) => question.options[idx])
                .join(" & ");
      } else {
        correctAnswerText =
          isTranslated && question.options_ar
            ? question.options_ar[question.correct_answer]
            : question.options[question.correct_answer];
      }

      let qImage = question.image || "";

      wrongAnswers.push({
        question:
          isTranslated && question.question_ar
            ? question.question_ar
            : question.question,
        image: qImage,
        userAnswer:
          question.type === "multiple_choice"
            ? (userAnswer || [])
                .map((aidx) =>
                  isTranslated && question.options_ar
                    ? question.options_ar[aidx]
                    : question.options[aidx],
                )
                .join(" & ")
            : isTranslated && question.options_ar
              ? question.options_ar[userAnswer]
              : question.options[userAnswer],
        correctAnswer: correctAnswerText,
        explanation:
          isTranslated && question.explanation_ar
            ? question.explanation_ar
            : question.explanation,
        index: idx,
      });
    }
  });

  // Build skipped list from unanswered questions (excluding wrong answers)
  const wrongIndices = new Set(wrongAnswers.map((w) => w.index));
  for (let i = 0; i < currentQuiz.questions.length; i++) {
    if (wrongIndices.has(i)) continue;
    const question = currentQuiz.questions[i];
    if (!question) continue;

    const userAnswer = answers[i];
    let isUnanswered = false;
    if (question.type === "multiple_choice") {
      if (!Array.isArray(userAnswer) || userAnswer.length === 0)
        isUnanswered = true;
    } else {
      if (userAnswer === undefined) isUnanswered = true;
    }

    if (!isUnanswered) continue;

    let correctAnswerText = "";
    if (question.type === "multiple_choice") {
      correctAnswerText =
        isTranslated && question.options_ar
          ? question.correct_answers
              .map((idx) => question.options_ar[idx])
              .join(" & ")
          : question.correct_answers
              .map((idx) => question.options[idx])
              .join(" & ");
    } else {
      correctAnswerText =
        isTranslated && question.options_ar
          ? question.options_ar[question.correct_answer]
          : question.options[question.correct_answer];
    }

    skippedAnswers.push({
      question:
        isTranslated && question.question_ar
          ? question.question_ar
          : question.question,
      correctAnswer: correctAnswerText,
      explanation:
        isTranslated && question.explanation_ar
          ? question.explanation_ar
          : question.explanation,
      image: question.image || "",
    });
  }

  const YourWrongAnswersText = isTranslated ? "إجاباتك" : "Your Answer";
  const TheCorrectAnswerText = isTranslated
    ? "الإجابة الصحيحة"
    : "Correct Answer";
  const TheExplanationText = isTranslated ? "الشرح" : "Explanation";

  if (wrongAnswers.length > 0) {
    document.getElementById("wrongAnswersContainer").style.display = "block";
    const list = document.getElementById("wrongAnswersList");
    list.dir = isTranslated ? "rtl" : "ltr";
    list.style.textAlign = isTranslated ? "right" : "left";
    list.replaceChildren();

    wrongAnswers.forEach((item, idx) => {
      const div = document.createElement("div");
      div.className = "answer-item";

      const questionLine = document.createElement("div");
      questionLine.className = "question";
      const questionStrong = document.createElement("strong");
      questionStrong.textContent = `${idx + 1}. ${item.question}`;
      questionLine.appendChild(questionStrong);
      div.appendChild(questionLine);

      if (item.image) {
        const safe = sanitizeImageUrl(item.image);
        if (safe) {
          const img = document.createElement("img");
          img.src = safe;
          img.className = "question-image";
          img.alt = "Question Image";
          img.style.maxWidth = "100%";
          img.style.marginTop = "10px";
          div.appendChild(img);
        }
        // if image not safe, skip image but continue rendering the item
      }

      const yourAnswerLine = document.createElement("div");
      yourAnswerLine.className = "your-answer";
      const yourAnswerStrong = document.createElement("strong");
      yourAnswerStrong.textContent = `${YourWrongAnswersText}: `;
      yourAnswerLine.appendChild(yourAnswerStrong);
      yourAnswerLine.appendChild(
        document.createTextNode(item.userAnswer || ""),
      );

      const correctAnswerLine = document.createElement("div");
      correctAnswerLine.className = "correct-answer";
      const correctAnswerStrong = document.createElement("strong");
      correctAnswerStrong.textContent = `${TheCorrectAnswerText}: `;
      correctAnswerLine.appendChild(correctAnswerStrong);
      correctAnswerLine.appendChild(
        document.createTextNode(item.correctAnswer || ""),
      );

      const explanationLine = document.createElement("div");
      explanationLine.className = "explanation";
      const explanationStrong = document.createElement("strong");
      explanationStrong.textContent = `${TheExplanationText}: `;
      explanationLine.appendChild(explanationStrong);
      explanationLine.appendChild(
        document.createTextNode(item.explanation || ""),
      );

      div.appendChild(yourAnswerLine);
      div.appendChild(correctAnswerLine);
      div.appendChild(explanationLine);
      list.appendChild(div);
    });
  }

  if (skippedAnswers.length > 0) {
    document.getElementById("skippedAnswersContainer").style.display = "block";
    const list = document.getElementById("skippedAnswersList");
    list.dir = isTranslated ? "rtl" : "ltr";
    list.style.textAlign = isTranslated ? "right" : "left";
    list.replaceChildren();

    skippedAnswers.forEach((item, idx) => {
      const div = document.createElement("div");
      div.className = "skipped-item";

      const questionLine = document.createElement("div");
      questionLine.className = "question";
      const questionStrong = document.createElement("strong");
      questionStrong.textContent = `${idx + 1}. ${item.question}`;
      questionLine.appendChild(questionStrong);
      div.appendChild(questionLine);

      if (item.image) {
        const safe = sanitizeImageUrl(item.image);
        if (safe) {
          const img = document.createElement("img");
          img.src = safe;
          img.className = "question-image";
          img.alt = "Question Image";
          img.style.maxWidth = "100%";
          img.style.marginTop = "10px";
          div.appendChild(img);
        }
        // continue rendering item even if image unsafe
      }

      const correctAnswerLine = document.createElement("div");
      correctAnswerLine.className = "correct-answer";
      const correctAnswerStrong = document.createElement("strong");
      correctAnswerStrong.textContent = `${TheCorrectAnswerText}: `;
      correctAnswerLine.appendChild(correctAnswerStrong);
      correctAnswerLine.appendChild(
        document.createTextNode(item.correctAnswer || ""),
      );

      const explanationLine = document.createElement("div");
      explanationLine.className = "explanation";
      const explanationStrong = document.createElement("strong");
      explanationStrong.textContent = `${TheExplanationText}: `;
      explanationLine.appendChild(explanationStrong);
      explanationLine.appendChild(
        document.createTextNode(item.explanation || ""),
      );

      div.appendChild(correctAnswerLine);
      div.appendChild(explanationLine);
      list.appendChild(div);
    });
  }
}

// ===== Security helpers =====
function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeImageUrl(url) {
  if (!url) return "";
  try {
    const u = new URL(String(url), window.location.href);
    if (u.protocol === "http:" || u.protocol === "https:") return u.href;
  } catch (e) {}
  return "";
}

function buildReportData() {
  const wrongAnswers = [];
  const skippedAnswers = [];

  // Recompute from authoritative data structures (currentQuiz, answers, skipped)
  if (!currentQuiz || !Array.isArray(currentQuiz.questions)) {
    return { wrongAnswers: [], skippedAnswers: [] };
  }

  Object.keys(answers).forEach((indexStr) => {
    const index = Number(indexStr);
    const question = currentQuiz.questions[index];
    if (!question) return;

    let isCorrect = false;
    const userAnswer = answers[index];
    if (question.type === "multiple_choice") {
      // Treat empty arrays as unanswered (skipped), not incorrect
      if (!Array.isArray(userAnswer) || userAnswer.length === 0) return;
      isCorrect =
        JSON.stringify(userAnswer.slice().sort((a, b) => a - b)) ===
        JSON.stringify(
          (question.correct_answers || []).slice().sort((a, b) => a - b),
        );
    } else {
      // For single-choice, undefined means unanswered
      if (userAnswer === undefined) return;
      isCorrect = Number(userAnswer) === Number(question.correct_answer);
    }

    if (!isCorrect) {
      const correctOptions =
        question.type === "multiple_choice"
          ? (question.correct_answers || [])
              .map((idx) => question.options?.[idx])
              .join(" & ")
          : question.options?.[question.correct_answer];

      wrongAnswers.push({
        question:
          isTranslated && question.question_ar
            ? question.question_ar
            : question.question,
        image: sanitizeImageUrl(question.image || ""),
        userAnswer:
          question.type === "multiple_choice"
            ? (userAnswer || [])
                .map((idx) =>
                  isTranslated && question.options_ar
                    ? question.options_ar[idx]
                    : question.options[idx],
                )
                .join(" & ")
            : (isTranslated && question.options_ar
                ? question.options_ar[userAnswer]
                : question.options[userAnswer]) || "",
        correctAnswer: correctOptions || "",
        explanation:
          isTranslated && question.explanation_ar
            ? question.explanation_ar
            : question.explanation || "",
        index: index,
      });
    }
  });

  // Build skipped answers by scanning all questions and excluding wrong ones
  const wrongIndices = new Set(wrongAnswers.map((w) => w.index));
  for (let i = 0; i < currentQuiz.questions.length; i++) {
    if (wrongIndices.has(i)) continue;
    const question = currentQuiz.questions[i];
    if (!question) continue;

    const userAnswer = answers[i];
    let isUnanswered = false;
    if (question.type === "multiple_choice") {
      if (!Array.isArray(userAnswer) || userAnswer.length === 0)
        isUnanswered = true;
    } else {
      if (userAnswer === undefined) isUnanswered = true;
    }
    if (!isUnanswered) continue;

    const correctOptions =
      question.type === "multiple_choice"
        ? (question.correct_answers || [])
            .map((idx) => question.options?.[idx])
            .join(" & ")
        : question.options?.[question.correct_answer];

    skippedAnswers.push({
      question:
        isTranslated && question.question_ar
          ? question.question_ar
          : question.question,
      correctAnswer: correctOptions || "",
      explanation:
        isTranslated && question.explanation_ar
          ? question.explanation_ar
          : question.explanation || "",
      image: sanitizeImageUrl(question.image || ""),
    });
  }

  return { wrongAnswers, skippedAnswers };
}

function recomputeScores() {
  if (!currentQuiz || !Array.isArray(currentQuiz.questions)) {
    correctCount = 0;
    incorrectCount = 0;
    return;
  }
  let c = 0;
  let ic = 0;
  for (let i = 0; i < currentQuiz.questions.length; i++) {
    const q = currentQuiz.questions[i];
    const ans = answers[i];
    // Treat undefined or empty multiple-choice arrays as unanswered (skip)
    if (q.type === "multiple_choice") {
      if (!Array.isArray(ans) || ans.length === 0) continue;
    } else {
      if (ans === undefined) continue;
    }
    let isCorrect = false;
    if (q.type === "multiple_choice") {
      isCorrect =
        JSON.stringify(ans.slice().sort((a, b) => a - b)) ===
        JSON.stringify((q.correct_answers || []).slice().sort((a, b) => a - b));
    } else {
      isCorrect = Number(ans) === Number(q.correct_answer);
    }
    if (isCorrect) c++;
    else ic++;
  }
  correctCount = c;
  incorrectCount = ic;
}

async function downloadErrorsPDF() {
  const btn = document.getElementById("downloadPdfBtn");
  const originalText = btn ? btn.innerHTML : "";
  if (btn) {
    btn.innerHTML = "⏳ جاري التجهيز...";
    btn.disabled = true;
  }

  // 1. تجميع المحتوى
  const wrongContent =
    document.getElementById("wrongAnswersList")?.innerHTML || "";
  const skippedContent =
    document.getElementById("skippedAnswersList")?.innerHTML || "";

  if (!wrongContent && !skippedContent) {
    alert("لا توجد أخطاء لطباعتها!");
    if (btn) {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
    return;
  }

  const percentage = Math.round(
    (correctCount / currentQuiz.questions.length) * 100,
  );
  const direction = isTranslated ? "rtl" : "ltr";

  // 2. تجهيز الـ HTML والـ CSS (هنا سر التنسيق)
  const reportHTML = `
                <div class="print-container" dir="${direction}">
                    <div class="header">
                        <h1>تقرير مراجعه الاخطاء</h1>
                        <h2>${currentQuiz.name}</h2>
                        <div class="score-box">
                            النتيجة: <span style="color: ${correctCount >= currentQuiz.questions.length / 2 ? "green" : "#cf1322"}">
                            ${correctCount} من ${currentQuiz.questions.length} (${percentage}%)
                            </span>
                        </div>
                    </div>

                    ${
                      wrongContent
                        ? `
                        <div class="section-title error-title" dir="rtl">
                            ❌ إجابات خاطئة
                        </div>
                        <div class="cards-wrapper wrong-wrapper">
                            ${wrongContent}
                        </div>
                    `
                        : ""
                    }

                    ${
                      skippedContent
                        ? `
                        <div class="section-title skip-title" dir="rtl">
                            ⚠️ أسئلة تم تخطيها
                        </div>
                        <div class="cards-wrapper skip-wrapper">
                            ${skippedContent}
                        </div>
                    `
                        : ""
                    }
                </div>

                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap');
                    
                    /* إجبار المتصفح على طباعة الألوان */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        box-sizing: border-box;
                    }

                    body {
                        font-family: 'Cairo', sans-serif;
                        margin: 0;
                        padding: 20px;
                        background: white;
                    }

                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 2px solid #eee;
                        padding-bottom: 20px;
                    }
                    .header h1 { 
                        margin: 0 0 10px 0; 
                        color: ${getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#070707"}; 
                        font-size: 24px; 
                    }
                    .header h2 { margin: 0 0 10px 0; color: #666; font-size: 18px; }
                    .score-box { font-size: 20px; font-weight: bold; }

                    .section-title {
                        font-size: 18px;
                        font-weight: bold;
                        margin: 30px 0 15px 0;
                        padding-bottom: 5px;
                        border-bottom: 2px solid #ccc;
                    }
                    .error-title { color: #cf1322; border-color: #cf1322; }
                    .skip-title { color: #faad14; border-color: #faad14; }

                    /* تنسيق الكروت */
                    .cards-wrapper {
                        display: flex;
                        flex-direction: column;
                        gap: 15px;
                    }

                    /* استهداف الكروت بناءً على الكلاسات الموجودة في HTML موقعك */
                    /* افترضت أن الكارت واخد كلاس generic، لكن هنا هنسق أي div جوه الرابر */
                    .cards-wrapper > div {
                        border: 1px solid #e0e0e0;
                        border-radius: 8px;
                        padding: 15px;
                        background-color: #f9f9f9; /* لون خلفية خفيف */
                        page-break-inside: avoid; /* ممنوع قص الكارت نصين */
                        position: relative;
                        
                        /* البوردر الجانبي الملون */
                        border-right: 5px solid #ccc; 
                    }

                    /* تخصيص لون البوردر الجانبي والخلفية للأخطاء */
                    .wrong-wrapper > div {
                        border-right-color: #cf1322;
                        background-color: #fff1f0;
                    }

                    /* تخصيص لون البوردر الجانبي والخلفية للتخطي */
                    .skip-wrapper > div {
                        border-right-color: #faad14;
                        background-color: #fffbe6;
                    }

                    /* تنسيق النصوص داخل الكارت */
                    .question {
                        font-weight: bold;
                        font-size: 16px;
                        margin-bottom: 10px;
                        color: #222;
                    }
                    
                    .your-answer { color: #cf1322; font-weight: bold; display: block; margin-top: 5px; }
                    .correct-answer { color: #389e0d; font-weight: bold; display: block; margin-top: 5px; }
                    .explanation { 
                        margin-top: 10px; 
                        padding: 10px; 
                        background: rgba(0,0,0,0.05); 
                        border-radius: 5px; 
                        font-size: 14px; 
                        color: #555;
                    }

                    /* تنسيق الصور */
                    img {
                        max-width: 100%;
                        height: auto;
                        max-height: 250px;
                        display: block;
                        margin: 10px auto;
                        border-radius: 5px;
                    }
                </style>
            `;

  // 3. الطباعة
  try {
    printJS({
      printable: reportHTML, // بنبعت الـ HTML كله كنص
      type: "raw-html", // نوع الطباعة: كود HTML خام
      documentTitle: `Result_${currentQuiz.name}`,
    });
  } catch (error) {
    console.error(error);
    alert("حدث خطأ، تأكد من اتصال الطابعة أو حاول مرة أخرى");
  } finally {
    if (btn) {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }
}

// ===== إعادة المحاولة =====
function retakeQuiz() {
  const index = quizzes.indexOf(currentQuiz);
  startQuiz(index);
}

// ===== العودة للرئيسية =====
function goHome() {
  clearInterval(timerInterval);
  document.getElementById("homePage").style.display = "flex";
  document.getElementById("quizPage").style.display = "none";
  document.getElementById("resultsPage").style.display = "none";
  currentQuiz = null;
  const topNavbar = document.getElementById("topNavbar");
  if (topNavbar) topNavbar.style.display = "flex";
}

// تحميل البيانات عند بدء التطبيق
window.onload = function () {
  landingMode = !hasRouteParams();
  initializeApp();

  if (auth) {
    auth.onAuthStateChanged((user) => {
      currentUser = user || null;
      updateAuthUI(currentUser);
      clearFeedMessage();
      // Prompt 1: User stays on home page after login
      // Must manually click "Manage My Quizzes" to go to dashboard
      loadQuizzes();
    });
  } else {
    updateAuthUI(null);
    loadQuizzes();
  }
};
