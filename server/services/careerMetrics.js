const Academic = require("../models/Academic");
const Coding = require("../models/Coding");
const Internship = require("../models/Internship");
const Project = require("../models/Project");
const Resume = require("../models/Resume");
const Skill = require("../models/Skill");
const Attendance = require("../models/Attendance");

const average = values => values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : 0;

const boundedScore = value => Math.max(0, Math.min(100, Math.round(value)));

const calculateWeightedCgpa = (semesters = []) => {
    const valid = semesters.filter(s => Number(s.sgpa || 0) > 0);
    if (!valid.length) return 0;
    const totalCredits = valid.reduce((sum, s) => sum + Number(s.credits || 0), 0);
    if (totalCredits > 0) {
        const weightedSum = valid.reduce((sum, s) => sum + (Number(s.sgpa || 0) * Number(s.credits || 0)), 0);
        return Number((weightedSum / totalCredits).toFixed(2));
    }
    return Number((valid.reduce((sum, s) => sum + Number(s.sgpa || 0), 0) / valid.length).toFixed(2));
};

/**
 * Extracts a numeric sequence number from semester strings like
 * "Semester 6", "sem 1", "3rd Sem", "4", "Sem-5", etc.
 */
const parseSemesterNumber = (semStr, fallbackIndex = 0) => {
    if (!semStr) return fallbackIndex;
    const match = String(semStr).match(/\d+/);
    return match ? parseInt(match[0], 10) : fallbackIndex;
};

/**
 * Identifies the latest semester based on the semester number/sequence.
 */
const findLatestSemester = (semesters = []) => {
    if (!Array.isArray(semesters) || semesters.length === 0) return null;

    const valid = semesters.filter(s => s && s.semester && String(s.semester).trim());
    if (!valid.length) return null;

    // Sort ascending by extracted numeric semester sequence
    const sorted = [...valid].sort((a, b) => {
        const numA = parseSemesterNumber(a.semester, 0);
        const numB = parseSemesterNumber(b.semester, 0);
        return numA - numB;
    });

    const latest = sorted[sorted.length - 1];
    const semNum = parseSemesterNumber(latest.semester, 0);

    return {
        semester: latest.semester,
        semesterNumber: semNum > 0 ? semNum : null,
        sgpa: typeof latest.sgpa === "number" && !isNaN(latest.sgpa) ? Number(latest.sgpa) : null,
        attendance: typeof latest.attendance === "number" && !isNaN(latest.attendance) ? Number(latest.attendance) : null,
        credits: Number(latest.credits || 0),
        percentage: Number(latest.percentage || 0)
    };
};

/**
 * Reusable coding score and statistics calculation matching Coding Profile module
 */
const calculateCodingMetrics = (profiles = []) => {
    if (!Array.isArray(profiles) || profiles.length === 0) {
        return {
            score: null,
            hasProfile: false,
            totalProblems: 0,
            contestRating: 0,
            totalBadges: 0,
            platformsCount: 0
        };
    }

    const totalProblems = profiles.reduce((sum, item) => sum + Number(item.problemsSolved || 0), 0);
    const contestRating = profiles.reduce((sum, item) => sum + Number(item.contestRating || 0), 0);
    const totalBadges = profiles.reduce((sum, item) => sum + Number(item.badges || 0), 0);
    const avgScore = profiles.reduce((sum, item) => sum + Number(item.score || 0), 0) / profiles.length;
    const score = Math.min(100, Math.max(0, Math.round(avgScore)));

    return {
        score,
        hasProfile: true,
        totalProblems,
        contestRating,
        totalBadges,
        platformsCount: profiles.length
    };
};

exports.loadCareerMetrics = async studentId => {
    const [academic, coding, internships, projectCount, resume, skillRecord, attendanceDoc] = await Promise.all([
        Academic.findOne({ student: studentId }).lean(),
        Coding.findOne({ student: studentId }).lean(),
        Internship.countDocuments({ student: studentId, validated: true }),
        Project.countDocuments({ student: studentId, validated: true }),
        Resume.findOne({ student: studentId }).lean(),
        Skill.findOne({ student: studentId }).lean(),
        Attendance.findOne({ student: studentId }).lean()
    ]);

    const semesters = academic?.semesters || [];
    const skills = skillRecord?.skills || [];
    const profiles = coding?.profiles || [];
    const cgpa = academic?.cgpa ?? calculateWeightedCgpa(semesters);
    const averageAttendance = academic?.averageAttendance ?? 0;
    const academicScore = boundedScore(cgpa * 10);

    const parseSkillScore = item => {
        if (typeof item.score === "number" && !isNaN(item.score) && item.score > 0) return item.score;
        if (typeof item.level === "number" && !isNaN(item.level)) return item.level;
        const lvl = String(item.level || "").toLowerCase();
        if (lvl === "proficient" || lvl === "advanced") return 85;
        if (lvl === "intermediate") return 65;
        return 45;
    };

    const skillsScore = boundedScore(average(skills.map(parseSkillScore)));
    const projectScore = projectCount ? boundedScore(40 + projectCount * 15) : 0;

    // Unified Coding Metrics & Score
    const codingMetrics = calculateCodingMetrics(profiles);
    const codingScore = codingMetrics.score !== null ? codingMetrics.score : 0;

    const resumeScore = boundedScore(Number(resume?.resumeScore || 0));
    const communicationSkills = skills.filter(item =>
        /communication|teamwork|presentation|leadership/i.test(`${item.name} ${item.category} ${item.cat}`)
    );
    const communicationScore = boundedScore(average(communicationSkills.map(parseSkillScore)));

    // Latest Semester determination
    const latestSemester = findLatestSemester(semesters);

    return {
        academic,
        attendance: attendanceDoc,
        coding,
        internships,
        projectCount,
        resume,
        skillRecord,
        semesters,
        skills,
        profiles,
        cgpa,
        averageAttendance,
        attendanceScore: averageAttendance,
        codingScore,
        codingMetrics,
        latestSemester,
        readinessScore: 0,
        factors: [
            { name: "Academic performance", score: academicScore },
            { name: "Technical skills", score: skillsScore },
            { name: "Projects", score: projectScore },
            { name: "Coding profile", score: codingScore },
            { name: "Resume quality", score: resumeScore },
            { name: "Communication", score: communicationScore }
        ]
    };
};

exports.findLatestSemester = findLatestSemester;
exports.calculateCodingMetrics = calculateCodingMetrics;
exports.parseSemesterNumber = parseSemesterNumber;
