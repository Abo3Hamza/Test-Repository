const themes = [
  { name: "🔵 Blue Purple", primary: "#667eea", secondary: "#764ba2" },
  { name: "🔴 Red Orange", primary: "#f44336", secondary: "#ff9800" },
  { name: "🟢 Green Cyan", primary: "#4caf50", secondary: "#00bcd4" },
  { name: "💗 Pink Purple", primary: "#e91e63", secondary: "#9c27b0" },
  { name: "🔷 Sky Blue", primary: "#2196f3", secondary: "#00bcd4" },
  { name: "🖤 Dark - Black", primary: "#1a1a1a", secondary: "#2d2d2d" },
  { name: "🌑 Dark - Grey", primary: "#2c3e50", secondary: "#34495e" },
];

let quizzes = [];
let currentQuiz = null;
let currentQuestionIndex = 0;
let answers = {};
let submitted = {};
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

const firebaseConfig = {
  apiKey: "AIzaSyD1T2YkT0bJ3-6xrqzGRafObRuln6ajYpg",
  authDomain: "interactive-quiz-platfor-1a676.firebaseapp.com",
  projectId: "interactive-quiz-platfor-1a676",
};

if (typeof firebase !== "undefined" && firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
}
const auth = typeof firebase !== "undefined" ? firebase.auth() : null;
const db = typeof firebase !== "undefined" ? firebase.firestore() : null;

function getQuizIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("quizId")?.trim() || null;
}
function getUserIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("userId")?.trim() || null;
}
function hasRouteParams() {
  return Boolean(getQuizIdFromUrl() || getUserIdFromUrl());
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
    userAvatar.src = user.photoURL || "https://www.gravatar.com/avatar/?d=mp";
    userName.textContent = user.displayName || user.email || "User";
  } else {
    loggedOutView.style.display = "flex";
    loggedInView.style.display = "none";
  }
}

async function loginWithGoogle() {
  if (!auth) return;
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try { await auth.signInWithPopup(provider); } catch (error) { console.error(error); }
}

async function logoutUser() {
  if (!auth) return;
  try { await auth.signOut(); window.location.reload(); } catch (error) { console.error(error); }
}
window.logoutUser = logoutUser;

async function deleteUserAccount() {
    if (!auth || !auth.currentUser) return;
    const confirmDelete = confirm("⚠️ Are you sure? This will delete your account and ALL your quizzes permanently.");
    if (!confirmDelete) return;

    try {
        const snapshot = await db.collection("quizzes").where("userId", "==", auth.currentUser.uid).get();
        const batch = db.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
        await auth.currentUser.delete();
        window.location.reload();
    } catch (error) {
        alert("Error deleting account. You may need to sign in again first.");
    }
}
window.deleteUserAccount = deleteUserAccount;

async function loadQuizzes() {
  if (!db) return;
  try {
    const quizId = getQuizIdFromUrl();
    const userId = getUserIdFromUrl();

    if (!quizId && !userId) {
      landingMode = true;
      quizzes = [];
      feedMessage = null;
      initializeApp();
      return;
    }

    landingMode = false;
    if (quizId) {
      const doc = await db.collection("quizzes").doc(quizId).get();
      if (!doc.exists) {
        feedMessage = { title: "Quiz Not Found", message: "This quiz doesn't exist or is private." };
        initializeApp(); return;
      }
      const data = doc.data();
      if (!data.isPublic && (!currentUser || currentUser.uid !== data.userId)) {
        feedMessage = { title: "Private Quiz", message: "This quiz is private." };
        initializeApp(); return;
      }
      quizzes = [{ id: doc.id, ...data }];
      feedMessage = null;
      initializeApp();
      return;
    }

    const snapshot = await db.collection("quizzes").where("userId", "==", userId).where("isPublic", "==", true).get();
    quizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(q => Array.isArray(q.questions));
    feedMessage = null;
    initializeApp();
  } catch (error) {
    feedMessage = { title: "Quiz Not Found or Private", message: "This quiz either does not exist, was deleted, or is set to private." };
    initializeApp();
  }
}

function initializeApp() {
  if (!appInitialized) { loadTheme(); displayThemeOptions(); appInitialized = true; }
  displayQuizzes();
}

function displayThemeOptions() {
  const container = document.getElementById("themeList");
  container.innerHTML = "";
  themes.forEach((theme, index) => {
    const div = document.createElement("div");
    div.className = "theme-item";
    div.textContent = theme.name;
    div.onclick = () => { applyTheme(index); document.getElementById("themeMenu").classList.remove("show"); };
    container.appendChild(div);
  });
}
function toggleThemeMenu() { document.getElementById("themeMenu").classList.toggle("show"); }
window.toggleThemeMenu = toggleThemeMenu;

function applyTheme(index) {
  document.documentElement.style.setProperty("--primary", themes[index].primary);
  document.documentElement.style.setProperty("--secondary", themes[index].secondary);
  localStorage.setItem("selectedTheme", index);
}
function loadTheme() { applyTheme(parseInt(localStorage.getItem("selectedTheme") || "0")); }

function displayQuizzes() {
  const grid = document.getElementById("quizzesGrid");
  const emptyState = document.getElementById("emptyState");
  grid.innerHTML = "";
  
  if (landingMode) {
    grid.style.display = "none";
    emptyState.style.display = "block";
    emptyState.innerHTML = `<h2>Welcome to Pro Quiz Master</h2><p>Sign in to create, manage, and share interactive quizzes seamlessly.</p>`;
    return;
  }

  grid.style.display = "grid";
  if (feedMessage) {
    emptyState.style.display = "block";
    emptyState.innerHTML = `<h2>${feedMessage.title}</h2><p>${feedMessage.message}</p>`;
    return;
  }

  if (quizzes.length === 0) {
    emptyState.style.display = "block";
    emptyState.innerHTML = `<h2>📚 No Quizzes Found</h2><p>Please wait, new quizzes will be added soon.</p>`;
    return;
  }
  emptyState.style.display = "none";

  quizzes.forEach((quiz, index) => {
    const card = document.createElement("div");
    card.className = "quiz-card";
    card.innerHTML = `
      <h3>${quiz.name || "Untitled Quiz"}</h3>
      <p>${quiz.description || "Interactive Quiz"}</p>
      <div class="quiz-info"><span class="question-count">${quiz.questions.length} Questions</span></div>
      <div style="margin-bottom: 15px;">
        <div class="timer-option"><input type="radio" name="timer_${index}" value="none" id="timer_none_${index}" checked><label for="timer_none_${index}">No Timer</label></div>
        <div class="timer-option"><input type="radio" name="timer_${index}" value="ascending" id="timer_asc_${index}"><label for="timer_asc_${index}">Stopwatch</label></div>
        <div class="timer-option"><input type="radio" name="timer_${index}" value="descending" id="timer_desc_${index}"><label for="timer_desc_${index}">Countdown</label>
            <div class="timer-config" id="timer_config_${index}"><label>Minutes:</label><input type="number" min="1" max="120" value="10" id="timer_value_${index}"></div>
        </div>
      </div>
      <button class="btn-primary" style="width: 100%;" onclick="startQuiz(${index})">Start Quiz</button>
    `;
    grid.appendChild(card);
    
    card.querySelector(`#timer_desc_${index}`).addEventListener('change', () => card.querySelector(`#timer_config_${index}`).classList.add('show'));
    card.querySelector(`#timer_none_${index}`).addEventListener('change', () => card.querySelector(`#timer_config_${index}`).classList.remove('show'));
    card.querySelector(`#timer_asc_${index}`).addEventListener('change', () => card.querySelector(`#timer_config_${index}`).classList.remove('show'));
  });
}

function startQuiz(index) {
  currentQuiz = quizzes[index];
  currentQuestionIndex = 0; answers = {}; submitted = {}; skipped = new Set();
  correctCount = 0; incorrectCount = 0; timeExpired = false;

  const timerRadios = document.getElementsByName(`timer_${index}`);
  timerMode = "none";
  timerRadios.forEach(radio => { if(radio.checked) timerMode = radio.value; });
  if (timerMode === "descending") timerDuration = parseInt(document.getElementById(`timer_value_${index}`).value) * 60;

  startTime = Date.now(); timerStartTime = Date.now();
  document.getElementById("homePage").style.display = "none";
  document.getElementById("quizPage").style.display = "block";
  document.getElementById("resultsPage").style.display = "none";
  document.getElementById("quizTitle").textContent = currentQuiz.name;

  if (timerMode === "none") document.getElementById("timer").classList.add("hidden");
  else { document.getElementById("timer").classList.remove("hidden"); startTimer(); }

  const primLang = currentQuiz.primaryLanguage || "en";
  const enableTrans = currentQuiz.enableTranslation !== false;
  isTranslated = (primLang === "ar");
  document.getElementById("question-content").dir = isTranslated ? "rtl" : "ltr";
  
  if (!enableTrans) {
      document.getElementById("translateBtn").style.display = "none";
      document.getElementById("langSwitchContainer").style.display = "none";
  } else {
      document.getElementById("translateBtn").style.display = "inline-block";
      document.getElementById("langSwitchContainer").style.display = "flex";
      document.getElementById("langToggle").checked = isTranslated;
  }

  initProgressBar(currentQuiz.questions.length);
  updateProgressSegment(0, "current");
  displayQuestion();
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    let display = "";
    const elapsed = Math.floor((Date.now() - timerStartTime) / 1000);
    if (timerMode === "ascending") {
      display = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
    } else if (timerMode === "descending") {
      const remaining = timerDuration - elapsed;
      if (remaining <= 0) { clearInterval(timerInterval); markRemainingAsSkipped(); showResults(); return; }
      display = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
    }
    document.getElementById("timer").textContent = display;
  }, 1000);
}

function markRemainingAsSkipped() {
  for (let i = currentQuestionIndex; i < currentQuiz.questions.length; i++) if (!skipped.has(i) && !submitted[i]) skipped.add(i);
}

function initProgressBar(totalQuestions) {
  const track = document.getElementById("progressTrack");
  track.innerHTML = "";
  for (let i = 0; i < totalQuestions; i++) {
    const segment = document.createElement("div");
    segment.className = "progress-segment";
    segment.id = `prog-seg-${i}`;
    segment.style.cursor = "pointer";
    segment.onclick = () => jumpToQuestion(i);
    track.appendChild(segment);
  }
}

function updateProgressSegment(index, status) {
  const segment = document.getElementById(`prog-seg-${index}`);
  if (segment) {
    segment.classList.remove("current", "correct", "wrong", "skipped");
    if (status) segment.classList.add(status);
  }
}

function jumpToQuestion(targetIndex) {
  if (targetIndex === currentQuestionIndex) return;
  if (!submitted[currentQuestionIndex] && !skipped.has(currentQuestionIndex)) {
    skipped.add(currentQuestionIndex);
    updateProgressSegment(currentQuestionIndex, "skipped");
  }
  updateProgressSegment(currentQuestionIndex, "");
  currentQuestionIndex = targetIndex;
  if (!submitted[currentQuestionIndex] && !skipped.has(currentQuestionIndex)) {
    updateProgressSegment(currentQuestionIndex, "current");
  }
  displayQuestion();
}

function displayQuestion() {
  const question = currentQuiz.questions[currentQuestionIndex];
  document.getElementById("questionNumber").textContent = `Question ${currentQuestionIndex + 1}`;
  document.getElementById("questionType").textContent = question.type.replace('_', ' ').toUpperCase();
  document.getElementById("questionText").textContent = (isTranslated && question.question_ar) ? question.question_ar : question.question;

  const qImg = document.getElementById("questionImage");
  if (question.image) { qImg.src = question.image; qImg.style.display = "block"; } else qImg.style.display = "none";

  const isAns = submitted[currentQuestionIndex] === true;
  document.getElementById("submitBtn").style.display = (question.type === "multiple_choice" && !isAns) ? "inline-block" : "none";
  
  const fb = document.getElementById("feedback");
  if (!isAns) { fb.replaceChildren(); fb.classList.remove("show", "correct", "incorrect"); }

  const optsContainer = document.getElementById("optionsContainer");
  optsContainer.replaceChildren();
  const options = (isTranslated && question.options_ar) ? question.options_ar : question.options;

  options.forEach((opt, idx) => {
    const div = document.createElement("div"); div.className = "option";
    if (isAns) div.classList.add("disabled");

    const input = document.createElement("input");
    input.type = question.type === "multiple_choice" ? "checkbox" : "radio";
    input.name = `q_${currentQuestionIndex}`; input.value = idx; input.disabled = isAns;

    if (question.type === "multiple_choice") {
      if (answers[currentQuestionIndex] && answers[currentQuestionIndex].includes(idx)) { input.checked = true; div.classList.add("selected"); }
    } else {
      if (answers[currentQuestionIndex] === idx) { input.checked = true; div.classList.add("selected"); }
    }

    if (isAns) {
      if (checkIfCorrect(idx)) div.classList.add("correct");
      else if (answers[currentQuestionIndex] === idx || (Array.isArray(answers[currentQuestionIndex]) && answers[currentQuestionIndex].includes(idx))) div.classList.add("incorrect");
    }

    input.onchange = () => {
      if (isAns) return;
      if (question.type === "multiple_choice") {
        answers[currentQuestionIndex] = Array.from(document.querySelectorAll(`input[name="q_${currentQuestionIndex}"]:checked`)).map(cb => parseInt(cb.value));
        document.querySelectorAll(`input[name="q_${currentQuestionIndex}"]`).forEach(inp => inp.parentElement.classList.toggle("selected", inp.checked));
      } else {
        document.querySelectorAll(`input[name="q_${currentQuestionIndex}"]`).forEach(inp => inp.parentElement.classList.remove("selected"));
        div.classList.add("selected");
        answers[currentQuestionIndex] = idx;
        submitted[currentQuestionIndex] = true; skipped.delete(currentQuestionIndex);
        if (checkIfCorrect(idx)) { correctCount++; updateProgressSegment(currentQuestionIndex, "correct"); div.classList.add("correct"); }
        else { incorrectCount++; updateProgressSegment(currentQuestionIndex, "wrong"); div.classList.add("incorrect"); }
        document.querySelectorAll(`input[name="q_${currentQuestionIndex}"]`).forEach(inp => inp.disabled = true);
        showFeedback();
      }
    };
    const label = document.createElement("label"); label.textContent = opt;
    div.append(input, label); optsContainer.appendChild(div);
  });

  if (isAns) showFeedback();
  document.getElementById("prevBtn").disabled = currentQuestionIndex === 0;
}

function checkIfCorrect(idx) {
  const q = currentQuiz.questions[currentQuestionIndex];
  return q.type === "multiple_choice" ? q.correct_answers.includes(idx) : q.correct_answer === idx;
}

function toggleTranslate() {
  isTranslated = !isTranslated;
  document.getElementById("question-content").dir = isTranslated ? "rtl" : "ltr";
  if (document.getElementById("quizPage").style.display === "block") {
    document.getElementById("langToggle").checked = isTranslated;
    displayQuestion();
    if(submitted[currentQuestionIndex]) showFeedback();
  } else ShowWrongAndSkipped();
}
window.toggleTranslate = toggleTranslate;

function showFeedback() {
  if (answers[currentQuestionIndex] === undefined) return;
  const q = currentQuiz.questions[currentQuestionIndex];
  const fb = document.getElementById("feedback");
  const isC = q.type === "multiple_choice" ? JSON.stringify(answers[currentQuestionIndex].sort()) === JSON.stringify(q.correct_answers.sort()) : answers[currentQuestionIndex] === q.correct_answer;
  
  fb.replaceChildren(); fb.className = "feedback show " + (isC ? "correct" : "incorrect");
  const exp = isTranslated ? q.explanation_ar : q.explanation;
  
  const title = document.createElement("div"); title.className = "feedback-title";
  title.textContent = isC ? (isTranslated ? "✓ إجابة صحيحة" : "✓ Correct Answer") : (isTranslated ? "✗ إجابة خاطئة" : "✗ Incorrect Answer");
  
  const text = document.createElement("div"); text.className = "feedback-text";
  if(!isC) {
    const cOpts = isTranslated ? q.options_ar : q.options;
    const cText = q.type === "multiple_choice" ? q.correct_answers.map(i=>cOpts[i]).join(" & ") : cOpts[q.correct_answer];
    text.innerHTML = `<strong>${isTranslated ? 'الإجابة الصحيحة' : 'Correct Answer'}:</strong> ${cText}<br>`;
  }
  if(exp) text.innerHTML += `<strong>${isTranslated ? 'الشرح' : 'Explanation'}:</strong> ${exp}`;
  
  fb.append(title, text);
}

function submitAnswer() {
  const q = currentQuiz.questions[currentQuestionIndex];
  if (!answers[currentQuestionIndex] || answers[currentQuestionIndex].length === 0) return alert(isTranslated ? "اختر إجابة واحدة على الأقل" : "Select at least one answer");
  submitted[currentQuestionIndex] = true; skipped.delete(currentQuestionIndex);
  document.getElementById("submitBtn").style.display = "none";
  document.querySelectorAll(`input[name="q_${currentQuestionIndex}"]`).forEach(inp => inp.disabled = true);
  
  const isC = JSON.stringify(answers[currentQuestionIndex].sort()) === JSON.stringify(q.correct_answers.sort());
  if (isC) { correctCount++; updateProgressSegment(currentQuestionIndex, "correct"); }
  else { incorrectCount++; updateProgressSegment(currentQuestionIndex, "wrong"); }
  displayQuestion(); // re-renders to highlight options
}
window.submitAnswer = submitAnswer;

function nextQuestion() {
  if (!submitted[currentQuestionIndex] && !skipped.has(currentQuestionIndex)) {
    skipped.add(currentQuestionIndex); updateProgressSegment(currentQuestionIndex, "skipped");
  }
  if (currentQuestionIndex < currentQuiz.questions.length - 1) jumpToQuestion(currentQuestionIndex + 1);
  else showResults();
}
window.nextQuestion = nextQuestion;
window.previousQuestion = () => { if (currentQuestionIndex > 0) jumpToQuestion(currentQuestionIndex - 1); };

function showResults() {
  clearInterval(timerInterval);
  document.getElementById("quizPage").style.display = "none";
  document.getElementById("resultsPage").style.display = "block";
  document.getElementById("finalScore").textContent = correctCount;
  document.getElementById("finalPercentage").textContent = `${Math.round((correctCount / currentQuiz.questions.length) * 100)}%`;
  document.getElementById("finalCorrect").textContent = correctCount;
  document.getElementById("finalIncorrect").textContent = incorrectCount;
  document.getElementById("finalSkipped").textContent = skipped.size;
  
  const timeContainer = document.getElementById("timeContainer");
  if (timerMode === "none") timeContainer.style.display = "none";
  else {
    timeContainer.style.display = "block";
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById("totalTime").textContent = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  }
  ShowWrongAndSkipped();
}

function ShowWrongAndSkipped() {
  const wList = document.getElementById("wrongAnswersList"); wList.replaceChildren();
  const sList = document.getElementById("skippedAnswersList"); sList.replaceChildren();
  
  currentQuiz.questions.forEach((q, i) => {
    const isC = submitted[i] && (q.type === "multiple_choice" ? JSON.stringify(answers[i].sort()) === JSON.stringify(q.correct_answers.sort()) : answers[i] === q.correct_answer);
    if(submitted[i] && isC) return;
    
    const div = document.createElement("div");
    div.className = submitted[i] ? "answer-item" : "skipped-item";
    div.dir = isTranslated ? "rtl" : "ltr";
    
    const opts = isTranslated ? q.options_ar : q.options;
    const cText = q.type === "multiple_choice" ? q.correct_answers.map(idx=>opts[idx]).join(" & ") : opts[q.correct_answer];
    let uText = "";
    if(submitted[i]) uText = q.type === "multiple_choice" ? answers[i].map(idx=>opts[idx]).join(" & ") : opts[answers[i]];
    
    div.innerHTML = `
      <div class="question"><strong>${i+1}. ${isTranslated && q.question_ar ? q.question_ar : q.question}</strong></div>
      ${q.image ? `<img src="${q.image}" class="question-image" style="max-width:100%; margin-top:10px;">` : ''}
      ${submitted[i] ? `<div class="your-answer"><strong>${isTranslated?'إجابتك':'Your Answer'}:</strong> ${uText}</div>` : ''}
      <div class="correct-answer"><strong>${isTranslated?'الإجابة الصحيحة':'Correct Answer'}:</strong> ${cText}</div>
      <div class="explanation"><strong>${isTranslated?'الشرح':'Explanation'}:</strong> ${(isTranslated?q.explanation_ar:q.explanation)||''}</div>
    `;
    if(submitted[i]) wList.appendChild(div); else sList.appendChild(div);
  });
  
  document.getElementById("wrongAnswersContainer").style.display = wList.children.length > 0 ? "block" : "none";
  document.getElementById("skippedAnswersContainer").style.display = sList.children.length > 0 ? "block" : "none";
  const showDls = wList.children.length > 0 || sList.children.length > 0;
  document.getElementById("downloadPdfBtn").style.display = showDls ? "inline-block" : "none";
  document.getElementById("langSwitchContainer").style.display = showDls && currentQuiz.enableTranslation !== false ? "flex" : "none";
}

function downloadErrorsPDF() {
  const btn = document.getElementById("downloadPdfBtn");
  const originalText = btn.innerHTML; btn.innerHTML = "⏳ Preparing..."; btn.disabled = true;
  const wContent = document.getElementById("wrongAnswersList").innerHTML;
  const sContent = document.getElementById("skippedAnswersList").innerHTML;
  const dir = isTranslated ? "rtl" : "ltr";
  
  const reportHTML = `
    <div class="print-container" dir="${dir}">
      <div class="header"><h1>${isTranslated?'تقرير الأخطاء':'Mistakes Report'}</h1><h2>${currentQuiz.name}</h2></div>
      ${wContent ? `<div class="section-title error-title">${isTranslated?'❌ إجابات خاطئة':'❌ Incorrect Answers'}</div><div class="cards-wrapper wrong-wrapper">${wContent}</div>` : ''}
      ${sContent ? `<div class="section-title skip-title">${isTranslated?'⚠️ أسئلة متخطاة':'⚠️ Skipped Questions'}</div><div class="cards-wrapper skip-wrapper">${sContent}</div>` : ''}
    </div>
    <style>
      body { font-family: sans-serif; background: white; padding: 20px; }
      .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom:20px; }
      .section-title { font-size: 18px; font-weight: bold; margin: 20px 0 10px; border-bottom: 2px solid #ccc; padding-bottom:5px; }
      .error-title { color: #cf1322; border-color: #cf1322; } .skip-title { color: #faad14; border-color: #faad14; }
      .cards-wrapper > div { border: 1px solid #e0e0e0; border-radius: 8px; padding: 15px; background: #f9f9f9; margin-bottom:10px; border-left: 5px solid #ccc; }
      .wrong-wrapper > div { border-left-color: #cf1322; background: #fff1f0; } .skip-wrapper > div { border-left-color: #faad14; background: #fffbe6; }
      .your-answer { color: #cf1322; } .correct-answer { color: #389e0d; }
    </style>
  `;
  try { printJS({ printable: reportHTML, type: "raw-html", documentTitle: `Result_${currentQuiz.name}` }); } 
  catch (e) { alert("Error generating PDF"); } 
  finally { btn.innerHTML = originalText; btn.disabled = false; }
}
window.downloadErrorsPDF = downloadErrorsPDF;

function retakeQuiz() { startQuiz(quizzes.indexOf(currentQuiz)); }
window.retakeQuiz = retakeQuiz;

function goHome() {
  clearInterval(timerInterval);
  document.getElementById("homePage").style.display = "flex";
  document.getElementById("quizPage").style.display = "none";
  document.getElementById("resultsPage").style.display = "none";
  currentQuiz = null;
}
window.goHome = goHome;

window.onload = function () {
  landingMode = !hasRouteParams();
  initializeApp();
  if (auth) {
    auth.onAuthStateChanged((user) => {
      currentUser = user || null;
      updateAuthUI(currentUser);
      clearFeedMessage();
      loadQuizzes();
    });
  }
};