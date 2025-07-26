const mongoose = require('mongoose');
const MONGODB_URI = process.env.MONGODB_URI

/**
 * Connects to MongoDB using Mongoose.
 */
const connectMongoDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("✅ MongoDB connected...");
    } catch (error) {
        console.error("❌ MongoDB connection error:", error);
        process.exit(1);
    }
};


// Create model
module.exports = connectMongoDB;