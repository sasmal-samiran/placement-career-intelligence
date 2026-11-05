const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        let mongoUri = (process.env.MONGO_URI || "").trim();
        // Strip trailing semicolons and wrapping quotes safely
        mongoUri = mongoUri.replace(/;+$/, "").trim();
        mongoUri = mongoUri.replace(/^["']|["']$/g, "").trim();
        mongoUri = mongoUri.replace(/;+$/, "").trim();

        await mongoose.connect(mongoUri);

        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("MongoDB connection failed:");
        console.error(error.message);

        process.exit(1);
    }
};

module.exports = connectDB;