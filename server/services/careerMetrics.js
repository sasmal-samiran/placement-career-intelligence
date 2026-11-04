const Academic = require("../models/Academic");
const Attendance = require("../models/Attendance");
const Coding = require("../models/Coding");
const Internship = require("../models/Internship");
const Project = require("../models/Project");
const Resume = require("../models/Resume");
const Skill = require("../models/Skill");

const average = values => values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : 0;

const boundedScore = value => Math.max(0, Math.min(100, Math.round(value)));

exports.loadCareerMetrics = async studentId => {
    const [academic, attendance, coding, internships, projectCount, resume, skillRecord] = await Promise.all([
        Academic.findOne({ student: studentId }).lean(),
        Attendance.findOne({ student: studentId }).lean(),
        Coding.findOne({ student: studentId }).lean(),
        Internship.countDocuments({ student: studentId }),
        Project.countDocuments({ student: studentId }),
        Resume.findOne({ student: studentId }).lean(),
        Skill.findOne({ student: studentId }).lean()
    ]);

    const semesters = academic?.semesters || [];
    const skills = skillRecord?.skills || [];
    const profiles = coding?.profiles || [];
    const academicScore = boundedScore(average(semesters.map(item => Number(item.sgpa || 0))) * 10);
    const attendanceValues = [
        ...(attendance?.subjects || []).map(item => Number(item.percentage || 0)),
        ...(!attendance?.subjects?.length ? semesters.map(item => Number(item.attendance || 0)) : [])
    ];
    const attendanceScore = boundedScore(average(attendanceValues));
    const skillsScore = boundedScore(average(skills.map(item => Number(item.level || 0))));
    const projectScore = projectCount ? boundedScore(40 + projectCount * 15) : 0;
    const codingScore = boundedScore(average(profiles.map(item => Number(item.score || 0))));
    const resumeScore = boundedScore(Number(resume?.resumeScore || 0));
    const communicationSkills = skills.filter(item =>
        /communication|teamwork|presentation|leadership/i.test(`${item.name} ${item.category} ${item.cat}`)
    );
    const communicationScore = boundedScore(average(communicationSkills.map(item => Number(item.level || 0))));
    const availableScores = [academicScore, skillsScore, projectScore, codingScore, resumeScore]
        .filter(score => score > 0);

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
        cgpa: Number(average(semesters.map(item => Number(item.sgpa || 0))).toFixed(2)),
        attendanceScore,
        codingScore,
        readinessScore: boundedScore(average(availableScores)),
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