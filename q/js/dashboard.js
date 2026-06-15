const firebaseConfig = {
  apiKey: "AIzaSyD1T2YkT0bJ3-6xrqzGRafObRuln6ajYpg",
  authDomain: "interactive-quiz-platfor-1a676.firebaseapp.com",
  projectId: "interactive-quiz-platfor-1a676",
};

if (typeof firebase !== "undefined" && firebase.apps.length === 0) firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let myQuizzes = [];
let editingQuizId = null;
let builderQuestions = [];
let dragSourceIndex = null;

const elements = {
  dashUserAvatar: document.getElementById("dashUserAvatar"),
  dashUserName: document.getElementById("dashUserName"),
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

function setStatus(message, type = "") {
  elements.builderStatus.textContent = message;
  elements.builderStatus.className = "status " + type;
}

window.openAiModal = () => { document.getElementById("aiModal").style.display = "flex"; };
window.closeAiModal = () => { document.getElementById("aiModal").style.display = "none"; };
window.copyAiPrompt = () => { navigator.clipboard.writeText(document.getElementById("aiPromptText").innerText); alert("Prompt Copied!"); };

function getPrimaryLanguage() { return elements.quizPrimaryLanguage.value; }
function getSecondaryLanguage() { return getPrimaryLanguage() === "ar" ? "en" : "ar"; }
function isTranslationEnabled() { return elements.enableTranslation.checked; }

function padArray(values, length) {
  const nextValues = Array.isArray(values) ? values.slice(0, length) : [];
  while (nextValues.length < length) nextValues.push("");
  return nextValues;
}

function syncQuestionOptionArrays(q) {
  const len = Math.max(2, (q.options||[]).length, (q.options_ar||[]).length);
  q.options = padArray(q.options, q.type==="true_false"?2:len);
  q.options_ar = padArray(q.options_ar, q.type==="true_false"?2:len);
  if (q.type === "multiple_choice") q.correct_answers = (q.correct_answers||[]).map(Number).filter(n=>n>=0&&n<q.options.length);
  else q.correct_answer = Math.min(Math.max(Number(q.correct_answer)||0, 0), q.options.length-1);
  return q;
}

function syncJsonTextarea() { elements.jsonRawInput.value = JSON.stringify(builderQuestions, null, 2); }

function clearInlineError(el) { el.classList.remove("input-error"); const n = el.nextElementSibling; if(n && n.classList.contains("error-hint")) n.remove(); }
function clearAllInlineErrors() { document.querySelectorAll(".input-error").forEach(clearInlineError); }
function showInlineError(el, msg) {
  clearInlineError(el); el.classList.add("input-error");
  const h = document.createElement("span"); h.className = "error-hint"; h.textContent = msg;
  el.insertAdjacentElement("afterend", h); el.scrollIntoView({ behavior: "smooth", block: "center" }); el.focus();
}

function getQuestionCard(idx) { return document.querySelector(`.question-card[data-index="${idx}"]`); }
function getQuestionField(idx, field, lang, optIdx=null) {
  const card = getQuestionCard(idx); if(!card) return null;
  return optIdx!==null ? card.querySelector(`[data-field="${field}"][data-lang="${lang}"][data-option-index="${optIdx}"]`) : card.querySelector(`[data-field="${field}"][data-lang="${lang}"]`);
}

function ensureMyQuizzesToolbar() {
  if (document.getElementById("myQuizzesToolbar")) return;
  const section = elements.myQuizList.parentElement;
  const tb = document.createElement("div"); tb.id = "myQuizzesToolbar"; tb.style = "display:flex; gap:10px; margin:10px 0 14px;";
  const btn = document.createElement("button"); btn.className="btn-primary"; btn.textContent="🔗 Share My Profile";
  btn.onclick = () => { navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname.replace('dashboard.html','index.html')}?userId=${currentUser.uid}`); alert("Profile Link Copied!"); };
  tb.appendChild(btn); section.insertBefore(tb, elements.myQuizList);
}

function createQuestionTemplate(type) {
  return {
    type, question: "", question_ar: "",
    options: type==="true_false"?["True","False"]:["","","",""],
    options_ar: type==="true_false"?["صح","خطأ"]:["","","",""],
    correct_answer: 0, correct_answers: [], explanation: "", explanation_ar: "", image: ""
  };
}

function normalizeQuestion(q) {
  const t = q.type || "choice";
  const n = { ...createQuestionTemplate(t), ...q, type: t };
  return syncQuestionOptionArrays(n);
}

elements.jsonRawInput.addEventListener("input", e => {
  try {
    const p = JSON.parse(e.target.value);
    builderQuestions = (Array.isArray(p) ? p : p.questions || []).map(normalizeQuestion);
    renderQuestionBuilder(); syncJsonTextarea(); setStatus("JSON loaded.", "success");
  } catch(err) {}
});

function renderMyQuizzes() {
  ensureMyQuizzesToolbar();
  elements.myQuizList.innerHTML = myQuizzes.length===0 ? '<div class="empty-note">No quizzes yet. Create one!</div>' : myQuizzes.map(q => `
    <article class="my-quiz-card">
      <h3>${q.name}</h3>
      <div class="my-quiz-meta">Questions: ${q.questions.length} | Public: ${q.isPublic?'Yes':'No'}</div>
      <div class="card-actions">
        <button class="btn-secondary" data-action="edit" data-id="${q.id}">Edit</button>
        <button class="btn-back" data-action="delete" data-id="${q.id}">Delete</button>
        <button class="btn-primary" data-action="share" data-id="${q.id}">Share Quiz</button>
      </div>
    </article>`).join('');
}

function renderQuestionBuilder() {
  elements.questionBuilderList.replaceChildren();
  if (builderQuestions.length === 0) return elements.questionBuilderList.innerHTML = '<div class="empty-note">No questions. Add one.</div>';
  
  const pL = getPrimaryLanguage(), sL = getSecondaryLanguage(), trans = isTranslationEnabled();
  
  builderQuestions.forEach((q, i) => {
    const card = document.createElement("div"); card.className = "question-card"; card.dataset.index = i; card.draggable = true;
    card.innerHTML = `
      <div class="question-card-header">
        <div><strong>Q${i+1} (${q.type})</strong></div>
        <button class="btn-back" data-action="remove-question" data-index="${i}">Remove</button>
      </div>
      <div class="question-card-body">
        <div class="question-block">
          <div class="form-grid">
            <div class="field"><label>Q (${pL})</label><textarea data-field="question" data-lang="${pL}" data-index="${i}">${pL==='ar'?q.question_ar:q.question}</textarea></div>
            <div class="field ${!trans?'hidden':''}"><label>Q (${sL})</label><textarea data-field="question" data-lang="${sL}" data-index="${i}">${sL==='ar'?q.question_ar:q.question}</textarea></div>
            <div class="field"><label>Explanation (${pL})</label><textarea data-field="explanation" data-lang="${pL}" data-index="${i}">${pL==='ar'?q.explanation_ar:q.explanation}</textarea></div>
            <div class="field ${!trans?'hidden':''}"><label>Explanation (${sL})</label><textarea data-field="explanation" data-lang="${sL}" data-index="${i}">${sL==='ar'?q.explanation_ar:q.explanation}</textarea></div>
          </div>
          <div class="field full"><label>Image URL</label><input type="text" data-field="image" data-index="${i}" value="${q.image||''}"></div>
        </div>
        <div class="question-block">
          <div class="question-card-header"><strong>Options</strong>${q.type!=='true_false'&&q.options.length<10?`<button class="btn-secondary" data-action="add-option" data-index="${i}">+ Add Option</button>`:''}</div>
          <div class="option-list">
            ${q.options.map((_, oIdx) => {
              const isC = q.type==='multiple_choice'?q.correct_answers.includes(oIdx):q.correct_answer===oIdx;
              return `<div class="option-row ${isC?'correct-selected':''}">
                <input type="${q.type==='multiple_choice'?'checkbox':'radio'}" name="c_${i}" class="option-marker" data-field="correct" data-index="${i}" data-option-index="${oIdx}" ${isC?'checked':''}>
                <div class="field"><input type="text" data-field="option" data-lang="${pL}" data-index="${i}" data-option-index="${oIdx}" value="${pL==='ar'?q.options_ar[oIdx]:q.options[oIdx]}"></div>
                <div class="field ${!trans?'hidden':''}"><input type="text" data-field="option" data-lang="${sL}" data-index="${i}" data-option-index="${oIdx}" value="${sL==='ar'?q.options_ar[oIdx]:q.options[oIdx]}"></div>
                ${q.type!=='true_false'?`<button class="option-remove-btn" data-action="remove-option" data-index="${i}" data-option-index="${oIdx}">🗑️</button>`:''}
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>
    `;
    card.addEventListener("dragstart", e=>{dragSourceIndex=i; e.dataTransfer.setData("text/plain", i);});
    card.addEventListener("dragover", e=>e.preventDefault());
    card.addEventListener("drop", e=>{e.preventDefault(); const trg=i; const src=Number(e.dataTransfer.getData("text/plain")); if(src!==trg){builderQuestions.splice(trg,0,builderQuestions.splice(src,1)[0]); renderQuestionBuilder(); syncJsonTextarea();}});
    elements.questionBuilderList.appendChild(card);
  });
}

elements.questionBuilderList.addEventListener("input", e => {
  clearInlineError(e.target);
  const t = e.target, i = Number(t.dataset.index), o = Number(t.dataset.optionIndex), f = t.dataset.field, l = t.dataset.lang, q = builderQuestions[i];
  if(!q) return;
  if(f==="correct") {
    if(q.type==="multiple_choice"){
      q.correct_answers = Array.from(document.querySelectorAll(`input[name="c_${i}"]:checked`)).map(cb=>Number(cb.dataset.optionIndex));
    } else q.correct_answer = o;
    renderQuestionBuilder(); syncJsonTextarea(); return;
  }
  if(f==="option"){ (l==='ar'?q.options_ar:q.options)[o] = t.value; syncJsonTextarea(); return; }
  if(f==="question") q[l==='ar'?'question_ar':'question'] = t.value;
  else if(f==="explanation") q[l==='ar'?'explanation_ar':'explanation'] = t.value;
  else q[f] = t.value;
  syncJsonTextarea();
});

elements.questionBuilderList.addEventListener("click", e => {
  const btn = e.target.closest("button"); if(!btn) return;
  const i = Number(btn.dataset.index), q = builderQuestions[i];
  if(btn.dataset.action==="remove-question"){ builderQuestions.splice(i,1); renderQuestionBuilder(); syncJsonTextarea(); }
  else if(btn.dataset.action==="add-option"){ q.options.push(""); q.options_ar.push(""); syncQuestionOptionArrays(q); renderQuestionBuilder(); syncJsonTextarea(); }
  else if(btn.dataset.action==="remove-option"){
    if(q.options.length<=2) return alert("Minimum 2 options");
    const o = Number(btn.dataset.optionIndex); q.options.splice(o,1); q.options_ar.splice(o,1);
    if(q.type==="multiple_choice") q.correct_answers=q.correct_answers.filter(x=>x!==o).map(x=>x>o?x-1:x); else if(q.correct_answer===o) q.correct_answer=0; else if(q.correct_answer>o) q.correct_answer--;
    renderQuestionBuilder(); syncJsonTextarea();
  }
});

[elements.quizPrimaryLanguage, elements.enableTranslation].forEach(el => el.addEventListener("change", renderQuestionBuilder));
elements.addQuestionBtn.addEventListener("click", () => { builderQuestions.push(createQuestionTemplate(elements.newQuestionType.value)); renderQuestionBuilder(); syncJsonTextarea(); });
elements.resetBuilderBtn.addEventListener("click", () => { editingQuizId=null; builderQuestions=[]; elements.quizForm.reset(); renderQuestionBuilder(); syncJsonTextarea(); elements.saveQuizBtn.textContent="💾 Save Quiz"; });

elements.saveQuizBtn.addEventListener("click", async () => {
  clearAllInlineErrors();
  if(!elements.quizName.value.trim()) return showInlineError(elements.quizName, "Name required");
  if(builderQuestions.length===0) return alert("Add at least 1 question");
  
  const trans = isTranslationEnabled(), pL = getPrimaryLanguage();
  for(let i=0; i<builderQuestions.length; i++){
    const q=builderQuestions[i], c=getQuestionCard(i);
    if(!q[pL==='ar'?'question_ar':'question'].trim()) return showInlineError(getQuestionField(i,'question',pL)||c, "Required");
    if(trans && !q[pL==='ar'?'question':'question_ar'].trim()) return showInlineError(getQuestionField(i,'question',pL==='ar'?'en':'ar')||c, "Translation required");
    
    if(trans && (q.explanation.trim() || q.explanation_ar.trim())){
      if(!q.explanation.trim()) return showInlineError(getQuestionField(i,'explanation','en')||c, "Required since AR is filled");
      if(!q.explanation_ar.trim()) return showInlineError(getQuestionField(i,'explanation','ar')||c, "Required since EN is filled");
    }
  }

  const payload = {
    name: elements.quizName.value.trim(), description: elements.quizDescription.value.trim(),
    primaryLanguage: pL, enableTranslation: trans, isPublic: elements.isPublic.checked,
    ttlDays: Number(document.querySelector('input[name="ttlDays"]:checked')?.value||3),
    userId: currentUser.uid, questions: builderQuestions, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    if(editingQuizId) await db.collection("quizzes").doc(editingQuizId).update(payload);
    else await db.collection("quizzes").add(payload);
    elements.resetBuilderBtn.click(); loadMyQuizzes();
  } catch(err) { alert(err.message); }
});

elements.myQuizList.addEventListener("click", e => {
  const btn = e.target.closest("button"); if(!btn) return;
  const id = btn.dataset.id, q = myQuizzes.find(x=>x.id===id);
  if(btn.dataset.action==="share"){ navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname.replace('dashboard.html','index.html')}?quizId=${id}`); alert("Quiz Link Copied!"); }
  else if(btn.dataset.action==="delete"){ if(confirm("Delete permanently?")) db.collection("quizzes").doc(id).delete().then(loadMyQuizzes); }
  else if(btn.dataset.action==="edit"){
    editingQuizId = id; elements.quizName.value = q.name; elements.quizDescription.value = q.description;
    elements.quizPrimaryLanguage.value = q.primaryLanguage||'en'; elements.enableTranslation.checked = q.enableTranslation!==false;
    elements.isPublic.checked = q.isPublic; builderQuestions = q.questions.map(normalizeQuestion);
    elements.saveQuizBtn.textContent = "💾 Update Quiz"; renderQuestionBuilder(); syncJsonTextarea();
  }
});

async function loadMyQuizzes() {
  const snap = await db.collection("quizzes").where("userId", "==", currentUser.uid).get();
  myQuizzes = snap.docs.map(d=>({id:d.id, ...d.data()})); renderMyQuizzes();
}

auth.onAuthStateChanged(u => {
  if(!u) window.location.href="index.html";
  else { currentUser=u; elements.dashUserAvatar.src=u.photoURL; elements.dashUserName.textContent=u.displayName; loadMyQuizzes(); }
});