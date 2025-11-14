const express = require('express');
const connectDB = require('./src/db/db');
const app = require('./src/app');

connectDB();
app.listen(3004, ()=>{
    console.log("Payment server is running on port 3004");
})