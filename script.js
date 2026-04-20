
        import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
        import { getDatabase, ref, set, onValue, update, push, runTransaction } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js";

        // حط الـ Config بتاعك هنا
    const firebaseConfig = {
         apiKey: "AIzaSyC7ovcq2UUgk9iY5r_kOdN1k38sIwmLJz4",
         authDomain: "competitionapp-14dd2.firebaseapp.com",
         databaseURL: "https://competitionapp-14dd2-default-rtdb.firebaseio.com/",
         projectId: "competitionapp-14dd2",
         storageBucket: "competitionapp-14dd2.firebasestorage.app",
         messagingSenderId: "111940102162",
         appId: "1:111940102162:web:a74ee801c6fa371b0c10cb"
    };

        const app = initializeApp(firebaseConfig);
        const db = getDatabase(app);

        let myName, currentRoom, isOwner = false, timerInterval;

        // إنشاء غرفة
        window.createRoom = function() {
            myName = document.getElementById('username').value;
            const max = parseInt(document.getElementById('maxPlayers').value) || 5;
            const qTime = parseInt(document.getElementById('questionTime').value) || 15;
            if(!myName) return alert("الاسم مطلوب");

            currentRoom = Math.random().toString(36).substring(2, 7).toUpperCase();
            isOwner = true;

            set(ref(db, 'rooms/' + currentRoom), {
                owner: myName,
                maxPlayers: max,
                timeLimit: qTime,
                gameStarted: false,
                currentQuestion: "في انتظار السؤال الأول...",
                buzzerLocked: true,
                pressedBy: "",
                timer: 0,
                showWinner: false
            });
            
            enterRoom();
        };

        // انضمام لغرفة
        window.joinRoom = function() {
        myName = document.getElementById('username').value;
        currentRoom = document.getElementById('roomInput').value.toUpperCase();
        if(!myName || !currentRoom) return alert("بيانات ناقصة");

    const roomRef = ref(db, 'rooms/' + currentRoom);
    onValue(roomRef, (snap) => {
        const data = snap.val();
        if(!data) return alert("الغرفة غير موجودة");
        
        // 1. فحص هل اللاعب موجود مسبقاً (استخدام ?. يمنع الـ Error لو players مش موجودة)
        const isAlreadyIn = data.players?.[myName]; 
        const playersCount = data.players ? Object.keys(data.players).length : 0;

        // 2. منع الدخول لو المسابقة بدأت
        if (data.gameStarted && !isAlreadyIn) {
            console.log("Access Denied: Game Started");
            alert("المسابقة بدأت بالفعل، لا يمكن الدخول!");
            return; 
        }

        // 3. منع الدخول لو الغرفة ممتلئة
        if(playersCount >= data.maxPlayers && !isAlreadyIn) {
            console.log("Access Denied: Room Full");
            alert("الغرفة ممتلئة!");
            return;
        }

        // 4. إضافة اللاعب الجديد فقط
        if(!isAlreadyIn) {
            update(ref(db, `rooms/${currentRoom}/players/${myName}`), { score: 0 });
        }
        
        enterRoom();
    }, { onlyOnce: true });
};
        function enterRoom() {
            document.getElementById('setup-area').classList.add('hidden');
            document.getElementById('room-area').classList.remove('hidden');
            document.getElementById('displayCode').innerText = "ROOM: " + currentRoom;

            if(isOwner) {
                document.getElementById('admin-panel').classList.remove('hidden');
                document.getElementById('participant-view').classList.add('hidden');
            }

            // الاستماع اللحظي (النسخة المطورة بالألوان والذكاء التلقائي)
            onValue(ref(db, 'rooms/' + currentRoom), (snap) => {
                const data = snap.val();
                if(!data) return;

                if(data.showWinner) return renderWinner(data.players);

                const qDisplay = document.getElementById('questionDisplay');
                qDisplay.innerText = data.currentQuestion;

                // --- منطق تغيير الألوان بناءً على النص ---
                if (data.currentQuestion.includes("✅")) {
                    qDisplay.style.color = "#22c55e"; // أخضر نجاح
                } else if (data.currentQuestion.includes("❌")) {
                    qDisplay.style.color = "#ef4444"; // أحمر فشل
                } else {
                    qDisplay.style.color = "white";    // أبيض للسؤال العادي
                }

                document.getElementById('timerDisplay').innerText = data.timer > 0 ? data.timer + "s" : "⌛";
                
                // --- فحص تلقائي: هل الجميع فشل في الإجابة؟ ---
                const totalPlayers = data.players ? Object.keys(data.players).length : 0;
                const totalAttempts = data.attempts ? Object.keys(data.attempts).length : 0;

                // لو الكل حاول ومحدش جاوب صح (والزرار لسه متاح في الداتابيز)
                if (totalAttempts >= totalPlayers && totalPlayers > 0 && !data.buzzerLocked && !data.currentQuestion.includes("✅")) {
                    if (!data.currentQuestion.includes("❌")) { 
                        update(ref(db, 'rooms/' + currentRoom), {
                            currentQuestion: "❌ لم يستطع أحد الإجابة بشكل صحيح! استعد للسؤال القادم..",
                            buzzerLocked: true
                        });
                    }
                }

                // --- تحديث حالة الزر والرسائل التوضيحية ---
                const btn = document.getElementById('buzzBtn');
                btn.disabled = data.buzzerLocked;

                if(data.buzzerLocked && data.pressedBy) {
                    document.getElementById('statusMsg').innerText = "🚨 ضغط: " + data.pressedBy;
                    if(isOwner) {
                        document.getElementById('judge-actions').classList.remove('hidden');
                        document.getElementById('whoPressed').innerText = "المجيب: " + data.pressedBy;
                    }
                } else {
                    document.getElementById('statusMsg').innerText = "أسرع بالضغط!";
                    document.getElementById('judge-actions').classList.add('hidden');
                }

                renderLeaderboard(data.players);
            });
        }

        window.sendQuestion = function() {

        document.getElementById('questionDisplay').style.color = "white";
        const q = document.getElementById('newQuestion').value;
        const roomRef = ref(db, 'rooms/' + currentRoom);
    
    update(roomRef, {
        currentQuestion: q,
        buzzerLocked: false,
        pressedBy: "",
        attempts: {}, // نُصفر قائمة المحاولات مع كل سؤال جديد
        gameStarted: true,
        timer: parseInt(document.getElementById('questionTime').value) || 15
    });
            // بدء التايمر
            onValue(ref(db, 'rooms/' + currentRoom + '/timeLimit'), (s) => {
                let timeLeft = s.val();
                clearInterval(timerInterval);
                timerInterval = setInterval(() => {
                    timeLeft--;
                    update(ref(db, 'rooms/' + currentRoom), { timer: timeLeft });
                    if(timeLeft <= 0) {
                        clearInterval(timerInterval);
                        update(ref(db, 'rooms/' + currentRoom), { buzzerLocked: true, timer: 0 });
                    }
                }, 1000);
            }, {onlyOnce: true});
        };
window.pressBuzzer = function() {
    const roomRef = ref(db, 'rooms/' + currentRoom);
    
    // أولاً نفتح الداتابيز نشوف هل العضو ده ضغط قبل كدة؟
    onValue(ref(db, `rooms/${currentRoom}/attempts/${myName}`), (snap) => {
        if(snap.val()) {
            alert("لقد استخدمت محاولتك في هذا السؤال بالفعل!");
            return;
        }

        // لو ملمسوش، ينفذ عملية الضغط ويقفل الزرار
        runTransaction(roomRef, (currentData) => {
            if (currentData && currentData.buzzerLocked === false) {
                currentData.buzzerLocked = true;
                currentData.pressedBy = myName;
                
                // نسجل إنه استهلك محاولته
                if(!currentData.attempts) currentData.attempts = {};
                currentData.attempts[myName] = true; 
                
                currentData.timer = 0;
            }
            return currentData;
        });
    }, { onlyOnce: true });
};

window.givePoints = function(pts) {
    onValue(ref(db, 'rooms/' + currentRoom + '/pressedBy'), (s) => {
        const user = s.val();
        if(!user) return;

        // تحديث السكور
        const scoreRef = ref(db, `rooms/${currentRoom}/players/${user}/score`);
        runTransaction(scoreRef, (current) => (current || 0) + pts);

        const roomRef = ref(db, 'rooms/' + currentRoom);
        if (pts > 0) {
            // لو الإجابة صح (+10): اقفل الزرار تماماً لحد السؤال الجاي
            update(roomRef, { 
        currentQuestion: "✅ انتهى السؤال بإجابة صحيحة! جاري تجهيز السؤال القادم... 🏆",
        buzzerLocked: true ,
pressedBy: ""
    });
        } else {
            // لو غلط (-5) أو تصفير: افتح الزرار للباقي
            update(roomRef, { buzzerLocked: false, pressedBy: "" });
        }
    }, {onlyOnce: true});
};

        window.resetBuzzer = function() {
            update(ref(db, 'rooms/' + currentRoom), { buzzerLocked: false, pressedBy: "", timer: 0 });
            clearInterval(timerInterval);
        };

        function renderLeaderboard(players) {
            const board = document.getElementById('leaderboard');
            board.innerHTML = "";
            if(!players) return;
            Object.entries(players).sort((a,b) => b[1].score - a[1].score).forEach(([name, data]) => {
                board.innerHTML += `<div class="flex justify-between bg-slate-800 p-2 rounded-lg border-l-4 border-blue-500">
                    <span>${name}</span><span class="font-bold text-emerald-400">${data.score}</span>
                </div>`;
            });
        }

        window.showWinner = function() {
            update(ref(db, 'rooms/' + currentRoom), { showWinner: true });
        };

        function renderWinner(players) {
            document.getElementById('room-area').classList.add('hidden');
            document.getElementById('winner-screen').classList.remove('hidden');
            const winner = Object.entries(players).sort((a,b) => b[1].score - a[1].score)[0];
            document.getElementById('winnerName').innerText = winner[0] + " 🎉";
            document.body.style.background = "linear-gradient(to bottom, #1e1b4b, #4338ca)";
        }
    