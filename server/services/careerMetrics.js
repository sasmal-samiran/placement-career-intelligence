const Academic = require("../models/Academic");
const Coding = require("../models/Coding");
const Internship = require("../models/Internship");
const Project = require("../models/Project");
const Resume = require("../models/Resume");
const Skill = require("../models/Skill");

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

exports.loadCareerMetrics = async studentId => {
    const [academic, coding, internships, projectCount, resume, skillRecord] = await Promise.all([
        Academic.findOne({ student: studentId }).lean(),
        Coding.findOne({ student: studentId }).lean(),
        Internship.countDocuments({ student: studentId, validated: true }),
        Project.countDocuments({ student: studentId, validated: true }),
        Resume.findOne({ student: studentId }).lean(),
        Skill.findOne({ student: studentId }).lean()
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
    const codingScore = boundedScore(average(profiles.map(item => Number(item.score || 0))));
    const resumeScore = boundedScore(Number(resume?.resumeScore || 0));
    const communicationSkills = skills.filter(item =>
        /communication|teamwork|presentation|leadership/i.test(`${item.name} ${item.category} ${item.cat}`)
    );
    const communicationScore = boundedScore(average(communicationSkills.map(parseSkillScore)));

    return {
        academic,
        attendance,
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
