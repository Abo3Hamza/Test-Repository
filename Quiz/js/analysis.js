// Site-wide analysis script — aggregates basic metrics and writes to Firestore
// Expose `runSiteAnalysis` immediately but perform runtime checks so this
// script can be loaded before Firebase is initialized.
window.runSiteAnalysis = async function runSiteAnalysis() {
  try {
    if (
      typeof firebase === "undefined" ||
      typeof firebase.firestore === "undefined"
    ) {
      throw new Error("Firebase SDK not available yet.");
    }

    if (!firebase.apps || firebase.apps.length === 0) {
      throw new Error("Firebase app not initialized yet.");
    }

    const db = firebase.firestore();
    // collect basic stats
    // Only read public quizzes to comply with security rules
    const quizzesSnap = await db
      .collection("quizzes")
      .where("isPublic", "==", true)
      .get();
    const totalQuizzes = quizzesSnap.size;
    let totalQuestions = 0;
    quizzesSnap.docs.forEach((d) => {
      const data = d.data();
      if (Array.isArray(data.questions))
        totalQuestions += data.questions.length;
    });
    const avgQuestions = totalQuizzes === 0 ? 0 : totalQuestions / totalQuizzes;

    // read measurementId from global config if present
    const measurementId =
      (typeof firebaseConfig !== "undefined" && firebaseConfig.measurementId) ||
      null;

    await db.collection("analysis").add({
      totalQuizzes,
      totalQuestions,
      avgQuestions,
      measurementId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

  } catch (err) {
    console.error("Site analysis failed:", err);
    try {
      alert("Site analysis failed: " + (err.message || err));
    } catch (e) {}
  }
};
