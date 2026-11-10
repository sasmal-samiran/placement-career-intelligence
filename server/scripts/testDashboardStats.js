const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
require("dotenv").config();
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Student = require("../models/Student");
const Academic = require("../models/Academic");
const Coding = require("../models/Coding");

const BASE_URL = "http://127.0.0.1:5000/api";

async function runTests() {
    console.log("=== STARTING DASHBOARD STATS VERIFICATION TESTS ===");
    const mongoUri = (process.env.MONGO_URI || "").replace(/[';\"]/g, "").trim();
    await mongoose.connect(mongoUri);

    // Find student with existing semesters (Satendra Kumar)
    const student = await Student.findOne({ email: "satendra@student.com" }).lean();
    if (!student) throw new Error("Test student satendra@student.com not found!");

    const token = jwt.sign(
        { id: student._id, studentId: student.studentId, email: student.email },
        process.env.JWT_SECRET || "default_secret",
        { expiresIn: "1h" }
    );
    const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    };

    // Test 1 & 2: Check latest semester SGPA and attendance for student with 6 semesters
    console.log("\n[Test 1 & 2] Fetching Dashboard stats for student with Semester 1..6...");
    const res1 = await fetch(`${BASE_URL}/dashboard`, { headers });
    const data1 = await res1.json();
    console.log("Dashboard response status:", res1.status);
    const stats1 = data1.data?.stats;
    console.log("Latest Semester:", stats1?.latestSemester);
    console.log("Latest SGPA:", stats1?.latestSgpa);
    console.log("Latest Attendance:", stats1?.latestAttendance);
    console.log("Coding Score:", stats1?.codingScore, "Has Profile:", stats1?.hasCodingProfile);

    if (stats1?.latestSemester !== "Semester 6") {
        throw new Error(`Expected latestSemester to be 'Semester 6', got '${stats1?.latestSemester}'`);
    }
    if (stats1?.latestSgpa !== 8.9) {
        throw new Error(`Expected latestSgpa to be 8.9, got ${stats1?.latestSgpa}`);
    }
    if (stats1?.latestAttendance !== 95) {
        throw new Error(`Expected latestAttendance to be 95, got ${stats1?.latestAttendance}`);
    }
    console.log("PASS: Dashboard correctly identifies Semester 6 with SGPA 8.90 and Attendance 95%.");

    // Test 3: Add Semester 7 and verify dynamic update on Dashboard
    console.log("\n[Test 3] Adding Semester 7 (SGPA: 9.25, Attendance: 97%) and verifying dynamic dashboard update...");
    const originalAcademic = await Academic.findOne({ student: student._id }).lean();
    const originalSemesters = [...(originalAcademic?.semesters || [])];

    const updatedSemesters = [
        ...originalSemesters,
        {
            semester: "Semester 7",
            sgpa: 9.25,
            credits: 22,
            attendance: 97,
            percentage: 92.5
        }
    ];

    await fetch(`${BASE_URL}/academic`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ semesters: updatedSemesters })
    });

    const res2 = await fetch(`${BASE_URL}/dashboard`, { headers });
    const data2 = await res2.json();
    const stats2 = data2.data?.stats;
    console.log("After adding Semester 7:");
    console.log("Latest Semester:", stats2?.latestSemester);
    console.log("Latest SGPA:", stats2?.latestSgpa);
    console.log("Latest Attendance:", stats2?.latestAttendance);

    if (stats2?.latestSemester !== "Semester 7" || stats2?.latestSgpa !== 9.25 || stats2?.latestAttendance !== 97) {
        throw new Error("Failed to reflect newly added Semester 7!");
    }
    console.log("PASS: Dashboard dynamically updated to Semester 7 with SGPA 9.25 and Attendance 97%.");

    // Test 4: Update attendance of latest semester (Semester 7 from 97 to 99)
    console.log("\n[Test 4] Updating Semester 7 attendance to 99%...");
    updatedSemesters[updatedSemesters.length - 1].attendance = 99;
    await fetch(`${BASE_URL}/academic`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ semesters: updatedSemesters })
    });

    const res3 = await fetch(`${BASE_URL}/dashboard`, { headers });
    const data3 = await res3.json();
    const stats3 = data3.data?.stats;
    console.log("After updating attendance to 99%:", stats3?.latestAttendance);
    if (stats3?.latestAttendance !== 99) {
        throw new Error(`Expected latestAttendance to be 99, got ${stats3?.latestAttendance}`);
    }
    console.log("PASS: Dashboard immediately reflected updated attendance.");

    // Restore original semesters for clean state
    await fetch(`${BASE_URL}/academic`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ semesters: originalSemesters })
    });
    console.log("Cleaned up: Restored original semesters.");

    // Test 5 & 6: Coding Profile Score Integration & Updates
    console.log("\n[Test 5 & 6] Testing Coding Profile Score matching & updating...");
    // Update coding profile with 2 platforms
    await fetch(`${BASE_URL}/coding`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
            profiles: [
                { platform: "LeetCode", username: "satendra", score: 80, problemsSolved: 250, contestRating: 1650, badges: 4 },
                { platform: "CodeChef", username: "satendra_cc", score: 90, problemsSolved: 120, contestRating: 1720, badges: 2 }
            ]
        })
    });

    const codingRes = await fetch(`${BASE_URL}/coding`, { headers });
    const codingData = await codingRes.json();
    const codingProfiles = codingData.data?.profiles || [];
    const expectedScore = Math.round((80 + 90) / 2); // 85

    const res4 = await fetch(`${BASE_URL}/dashboard`, { headers });
    const data4 = await res4.json();
    const stats4 = data4.data?.stats;
    console.log("Coding Profile Score:", stats4?.codingScore);
    console.log("Has Coding Profile:", stats4?.hasCodingProfile);
    console.log("Platform Count:", stats4?.codingDetails?.platformsCount);

    if (stats4?.codingScore !== expectedScore) {
        throw new Error(`Expected coding score to be ${expectedScore}, got ${stats4?.codingScore}`);
    }
    if (!stats4?.hasCodingProfile) {
        throw new Error("Expected hasCodingProfile to be true!");
    }
    console.log(`PASS: Dashboard coding score (${stats4?.codingScore}) matches Coding Profile calculation (${expectedScore}).`);

    // Clean up coding profile
    await fetch(`${BASE_URL}/coding`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ profiles: [] })
    });
    console.log("Cleaned up: Cleared test coding profile.");

    // Test 7 & 8: Empty state handling for users without records
    console.log("\n[Test 7 & 8] Testing Empty State handling for student with no records...");
    const emptyStudent = await Student.findOne({ email: "satyendra@student.com" }).lean();
    if (emptyStudent) {
        const emptyToken = jwt.sign(
            { id: emptyStudent._id, studentId: emptyStudent.studentId, email: emptyStudent.email },
            process.env.JWT_SECRET || "default_secret",
            { expiresIn: "1h" }
        );
        const emptyHeaders = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${emptyToken}`,
        };

        const emptyRes = await fetch(`${BASE_URL}/dashboard`, { headers: emptyHeaders });
        const emptyData = await emptyRes.json();
        const emptyStats = emptyData.data?.stats;

        console.log("Empty student latestSgpa:", emptyStats?.latestSgpa);
        console.log("Empty student latestAttendance:", emptyStats?.latestAttendance);
        console.log("Empty student codingScore:", emptyStats?.codingScore);
        console.log("Empty student hasCodingProfile:", emptyStats?.hasCodingProfile);

        if (emptyStats?.latestSgpa !== null) {
            throw new Error(`Expected latestSgpa to be null for empty user, got ${emptyStats?.latestSgpa}`);
        }
        if (emptyStats?.latestAttendance !== null) {
            throw new Error(`Expected latestAttendance to be null for empty user, got ${emptyStats?.latestAttendance}`);
        }
        if (emptyStats?.codingScore !== null || emptyStats?.hasCodingProfile !== false) {
            throw new Error("Expected codingScore: null and hasCodingProfile: false for empty user!");
        }
        console.log("PASS: Graceful empty states verified (null instead of misleading zero).");
    }

    console.log("\n=== ALL DASHBOARD STATS TESTS COMPLETED SUCCESSFULLY! ===");
    process.exit(0);
}

runTests().catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
