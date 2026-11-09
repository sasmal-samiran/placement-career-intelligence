const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fileUpload = require("express-fileupload");

const connectDB =
    require("./db/connection");


const app =
    express();


// ---------------- DATABASE ----------------

connectDB();


// ---------------- MIDDLEWARE ----------------

app.use(
    cors({
        origin:
            process.env.CLIENT_URL ||
            "http://localhost:5173",

        credentials: true
    })
);


app.use(
    express.json({
        limit: "5mb"
    })
);


app.use(
    express.urlencoded({
        extended: true
    })
);


app.use(
    fileUpload()
);


// ---------------- STATIC FILES ----------------

app.use(
    "/uploads",
    express.static(
        path.join(
            __dirname,
            "uploads"
        )
    )
);


// ---------------- ROUTES ----------------

app.use(
    "/api/auth",
    require("./routes/auth")
);


app.use(
    "/api/students",
    require("./routes/students")
);


app.use(
    "/api/academic",
    require("./routes/academic")
);

app.use(
    "/api/skills",
    require("./routes/skills")
);


app.use(
    "/api/projects",
    require("./routes/projects")
);


app.use(
    "/api/internships",
    require("./routes/internships")
);


app.use(
    "/api/certifications",
    require("./routes/certifications")
);


app.use(
    "/api/coding",
    require("./routes/coding")
);


app.use(
    "/api/resume",
    require("./routes/resume")
);


app.use(
    "/api/dashboard",
    require("./routes/dashboard")
);


app.use(
    "/api/placement",
    require("./routes/placement")
);


app.use(
    "/api/mentor",
    require("./routes/mentor")
);


// ---------------- HOME ----------------

app.get(
    "/",
    (req, res) => {

        res.json({

            success: true,

            message:
                "Career Pilot Server is Running"

        });

    }
);


// ---------------- HEALTH CHECK ----------------

app.get(
    "/api/health",
    (req, res) => {

        res.json({

            success: true,

            message:
                "Career Pilot API is working"

        });

    }
);


// ---------------- 404 ----------------

app.use(
    (req, res) => {

        res.status(404).json({

            success: false,

            message:
                "Route not found"

        });

    }
);


app.use(
    (error, req, res, next) => {

        console.error(error);

        const status = error.code === 11000
            ? 409
            : error.name === "ValidationError" || error.name === "CastError"
                ? 400
                : error.status || 500;

        res.status(status).json({
            success: false,
            message: status >= 500
                ? "Internal server error"
                : error.code === 11000
                    ? "A record with this value already exists"
                    : error.message
        });
    }
);


// ---------------- SERVER ----------------

const PORT =
    parseInt(process.env.PORT, 10) || 5000;


app.listen(
    PORT,
    () => {

        console.log(
            `Career Pilot server running on http://localhost:${PORT}`
        );

    }
);