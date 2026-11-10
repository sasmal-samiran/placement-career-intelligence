const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Student = require("../models/Student");

const createToken = (student) => {

    return jwt.sign(
        {
            id: student._id,
            studentId: student.studentId,
            email: student.email
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );
};


// REGISTER

exports.register = async (req, res) => {

    try {

        const {
            name,
            email,
            studentId,
            password,
            phone,
            dob,
            branch,
            department,
            university,
            collegeTier,
            currentYear
        } = req.body;

        const selectedBranch = branch || department;

        if (
            !name ||
            !email ||
            !studentId ||
            !password ||
            !dob ||
            !selectedBranch ||
            !university ||
            !collegeTier ||
            !currentYear
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Name, email, student ID, password, date of birth, branch, university, college tier, and study year are required"
            });
        }

        const dateStr = String(dob).slice(0, 10);
        const parsedDob = new Date(`${dateStr}T00:00:00.000Z`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || Number.isNaN(parsedDob.getTime()) || parsedDob > new Date()) {
            return res.status(400).json({
                success: false,
                message: "Date of birth must be a valid date in YYYY-MM-DD format and cannot be in the future"
            });
        }

        const parsedTier = Number(collegeTier);
        if (![1, 2, 3].includes(parsedTier)) {
            return res.status(400).json({
                success: false,
                message: "College tier must be 1, 2, or 3"
            });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                success: false,
                message: "Server authentication is not configured"
            });
        }


        const existingStudent =
            await Student.findOne({
                $or: [
                    {
                        email:
                            email.toLowerCase()
                    },
                    {
                        studentId
                    }
                ]
            });


        if (existingStudent) {

            return res.status(409).json({
                success: false,
                message:
                    "Email or Student ID already exists"
            });
        }


        const hashedPassword =
            await bcrypt.hash(password, 12);


        const student =
            await Student.create({

                name,

                email:
                    email.toLowerCase(),

                studentId,

                password:
                    hashedPassword,

                phone: phone || "",

                dob: parsedDob,

                branch: selectedBranch,

                department: selectedBranch,

                university,

                collegeTier: parsedTier,

                currentYear: String(currentYear)

            });


        const token =
            createToken(student);


        res.status(201).json({

            success: true,

            message:
                "Registration successful",

            token,

            user: {

                id: student._id,

                studentId:
                    student.studentId,

                name:
                    student.name,

                email:
                    student.email

            }

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message:
                "Registration failed"

        });
    }
};


// LOGIN

exports.login = async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;


        const student =
            await Student
                .findOne({
                    email:
                        email.toLowerCase()
                })
                .select("+password");


        if (!student) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email or password"

            });
        }


        const valid =
            await bcrypt.compare(
                password,
                student.password
            );


        if (!valid) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email or password"

            });
        }


        const token =
            createToken(student);


        res.json({

            success: true,

            message:
                "Login successful",

            token,

            user: {

                id: student._id,

                studentId:
                    student.studentId,

                name:
                    student.name,

                email:
                    student.email

            }

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message:
                "Login failed"

        });
    }
};


// CURRENT USER

exports.me = async (req, res) => {

    try {

        const student =
            await Student
                .findById(req.user.id)
                .select("-password");


        if (!student) {

            return res.status(404).json({

                success: false,

                message:
                    "Student not found"

            });
        }


        res.json({

            success: true,

            data: student

        });

    } catch (error) {

        res.status(500).json({

            success: false,

            message:
                "Could not load user"

        });
    }
};