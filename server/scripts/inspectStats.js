const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
require("dotenv").config();
const mongoose = require("mongoose");
const Student = require("../models/Student");
const Academic = require("../models/Academic");
const Coding = require("../models/Coding");
const Attendance = require("../models/Attendance");

async function inspect() {
    const mongoUri = (process.env.MONGO_URI || "").replace(/[';\"]/g, "").trim();
    await mongoose.connect(mongoUri);

    const students = await Student.find().limit(5).lean();
    console.log(`Inspecting ${students.length} students:`);

    for (const s of students) {
        const [ac, cd, att] = await Promise.all([
            Academic.findOne({ student: s._id }).lean(),
            Coding.findOne({ student: s._id }).lean(),
            Attendance.findOne({ student: s._id }).lean(),
        ]);
        console.log(`- ${s.name} (${s._id}):`);
        console.log(`  Semesters:`, ac ? ac.semesters.map(x => ({ sem: x.semester, sgpa: x.sgpa, att: x.attendance })) : "None");
        console.log(`  Coding Profiles:`, cd ? cd.profiles.map(p => ({ platform: p.platform, score: p.score })) : "None");
        console.log(`  Attendance Subjects:`, att ? att.subjects.length : "None");
    }
    process.exit(0);
}

inspect().catch(err => {
    console.error(err);
    process.exit(1);
});
