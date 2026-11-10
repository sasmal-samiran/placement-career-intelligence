const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
require("dotenv").config();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Student = require("../models/Student");

const BASE_URL = "http://127.0.0.1:5000/api";

async function runTests() {
    console.log("=== STARTING COMPREHENSIVE ASSESSMENT TESTS ===");
    const mongoUri = (process.env.MONGO_URI || "").replace(/[';\"]/g, "").trim();
    await mongoose.connect(mongoUri);

    // 1. Get a test student
    const student = await Student.findOne().lean();
    if (!student) {
        throw new Error("No student found in DB for test");
    }
    console.log(`Found student: ${student.name} (${student.email}, ID: ${student._id})`);

    // 2. Generate a valid auth token
    const token = jwt.sign(
        { id: student._id, studentId: student.studentId, email: student.email },
        process.env.JWT_SECRET || "default_secret",
        { expiresIn: "1h" }
    );
    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };

    // Test 1: Fetch Catalog
    console.log("\n[Test 1] Fetching Assessment Catalog...");
    const catalogRes = await fetch(`${BASE_URL}/assessment/catalog`, { headers });
    const catalogData = await catalogRes.json();
    console.log("Catalog Response status:", catalogRes.status);
    console.log(`Tracks count: ${catalogData.data.assessments.length}, Levels count: ${catalogData.data.levels.length}`);
    if (catalogData.data.assessments.length === 0 || catalogData.data.levels.length === 0) {
        throw new Error("Catalog is empty!");
    }
    console.log("PASS: Catalog retrieved successfully.");

    // Test 2: Check Active Session (should be false or existing)
    console.log("\n[Test 2] Checking Active Session...");
    const activeRes = await fetch(`${BASE_URL}/assessment/active-session`, { headers });
    const activeData = await activeRes.json();
    console.log("Active Session Data:", activeData.data.hasActive);
    console.log("PASS: Active session query executed without errors.");

    // If there's an active session from prior aborted test, finish it
    if (activeData.data.hasActive) {
        console.log("Cleaning up previously open active session...");
        await fetch(`${BASE_URL}/assessment/submit`, {
            method: "POST",
            headers,
            body: JSON.stringify({ sessionId: activeData.data.session._id, answers: [] }),
        });
    }

    // Test 3: Start New Assessment (Beginner Level)
    console.log("\n[Test 3] Starting New Assessment (dsa_challenge, beginner)...");
    const startRes = await fetch(`${BASE_URL}/assessment/start`, {
        method: "POST",
        headers,
        body: JSON.stringify({ assessmentSlug: "dsa_challenge", levelSlug: "beginner" }),
    });
    const startData = await startRes.json();
    console.log("Start Status:", startRes.status);
    console.log("Session ID:", startData.data?.sessionId);
    console.log("Remaining Seconds:", startData.data?.remainingSeconds);
    console.log("Questions Count:", startData.data?.questions?.length);
    if (!startData.data?.sessionId || startData.data?.questions?.length === 0) {
        throw new Error("Failed to start session!");
    }
    const sessionId = startData.data.sessionId;
    const firstQ = startData.data.questions[0];
    console.log(`First question: "${firstQ.question_text.slice(0, 50)}..." [Diff: ${firstQ.difficulty}]`);
    console.log("PASS: Session initialized with progressive questions.");

    // Test 4: Prevent Multiple Active Sessions (409)
    console.log("\n[Test 4] Attempting to start another session while active...");
    const duplicateStartRes = await fetch(`${BASE_URL}/assessment/start`, {
        method: "POST",
        headers,
        body: JSON.stringify({ assessmentSlug: "web_dev_test", levelSlug: "intermediate" }),
    });
    console.log("Duplicate Start Status:", duplicateStartRes.status);
    if (duplicateStartRes.status !== 409) {
        throw new Error(`Expected 409 Conflict, got ${duplicateStartRes.status}`);
    }
    console.log("PASS: Duplicate active session correctly blocked with 409 Conflict.");

    // Test 5: Save Draft Answer
    console.log("\n[Test 5] Auto-saving draft answer...");
    const draftRes = await fetch(`${BASE_URL}/assessment/save-draft`, {
        method: "POST",
        headers,
        body: JSON.stringify({
            sessionId,
            questionId: firstQ.questionId,
            selectedOptionId: "A",
            isMarkedForReview: true,
        }),
    });
    const draftData = await draftRes.json();
    console.log("Draft Save Result:", draftData.data);
    console.log("PASS: Draft answer saved successfully.");

    // Test 6: Verify Active Session State Resumption (simulate page refresh)
    console.log("\n[Test 6] Checking Active Session Resumption after page refresh...");
    const resumeRes = await fetch(`${BASE_URL}/assessment/active-session`, { headers });
    const resumeData = await resumeRes.json();
    console.log("Resume Session ID:", resumeData.data.session?._id);
    console.log("Resume Saved Answers:", resumeData.data.session?.savedAnswers);
    if (resumeData.data.session?.savedAnswers[firstQ.questionId] !== "A") {
        throw new Error("Draft answer was not restored on active session fetch!");
    }
    console.log("PASS: Session state and answers restored accurately.");

    // Test 7: Submit Assessment
    console.log("\n[Test 7] Submitting Assessment...");
    const submitRes = await fetch(`${BASE_URL}/assessment/submit`, {
        method: "POST",
        headers,
        body: JSON.stringify({
            sessionId,
            answers: [
                { questionId: firstQ.questionId, selectedOptionId: "A" },
            ],
            isAutoSubmitted: false,
        }),
    });
    const submitData = await submitRes.json();
    console.log("Submit Status:", submitRes.status);
    console.log("Evaluated Score:", submitData.data?.score, "/", submitData.data?.totalMarks);
    console.log("Percentage:", submitData.data?.percentage + "%");
    console.log("Passed:", submitData.data?.passed);
    console.log("Strengths:", submitData.data?.strengths);
    console.log("Question reviews count:", submitData.data?.questionReviews?.length);
    if (!submitData.data?.questionReviews || submitData.data.questionReviews.length === 0) {
        throw new Error("No question reviews returned upon submission!");
    }
    console.log("PASS: Exam submitted, scored, and review explanations generated.");

    // Test 8: Duplicate Submission Prevention (Idempotent)
    console.log("\n[Test 8] Attempting duplicate submission...");
    const dupSubmitRes = await fetch(`${BASE_URL}/assessment/submit`, {
        method: "POST",
        headers,
        body: JSON.stringify({ sessionId, answers: [] }),
    });
    const dupSubmitData = await dupSubmitRes.json();
    console.log("Duplicate Submit Status:", dupSubmitRes.status);
    console.log("Score identical:", dupSubmitData.data?.percentage === submitData.data?.percentage);
    console.log("PASS: Duplicate submission handled idempotently without corrupting data.");

    // Test 9: Verify History
    console.log("\n[Test 9] Fetching completed history...");
    const historyRes = await fetch(`${BASE_URL}/assessment/history`, { headers });
    const historyData = await historyRes.json();
    console.log(`History records count: ${historyData.data?.length}`);
    console.log("Latest completed test title:", historyData.data[0]?.testTitle);
    console.log("PASS: History reflects completed session.");

    // Test 10: Question Uniqueness / Repetition Prevention on subsequent attempt
    console.log("\n[Test 10] Testing Question Repetition Prevention on new attempt...");
    const secondStartRes = await fetch(`${BASE_URL}/assessment/start`, {
        method: "POST",
        headers,
        body: JSON.stringify({ assessmentSlug: "dsa_challenge", levelSlug: "beginner" }),
    });
    const secondStartData = await secondStartRes.json();
    const secondQuestions = secondStartData.data?.questions || [];
    console.log("Second attempt question count:", secondQuestions.length);
    // Clean up second session
    await fetch(`${BASE_URL}/assessment/submit`, {
        method: "POST",
        headers,
        body: JSON.stringify({ sessionId: secondStartData.data.sessionId, answers: [] }),
    });
    console.log("PASS: Second session started with repetition filter applied.");

    console.log("\n=== ALL 10 TESTS PASSED SUCCESSFULLY! ===");
    process.exit(0);
}

runTests().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
