const mongoose = require('mongoose');

async function connectDB(){
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Payment DB connected successfully");
    } catch (error) {
        console.error("Payment DB connection failed:", error);
    }
}

module.exports = connectDB;