const mongoose = require('mongoose');

async function connectDB(){
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log("connected to cart database");
    } catch (error) {
        console.error("Error connecting to cart database", error);
    }
   
}

module.exports = connectDB;