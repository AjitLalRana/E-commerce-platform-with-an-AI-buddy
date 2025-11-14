const express = require('express');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const paymentRoutes = require('./routes'); 

dotenv.config();

const app = express();
app.use(express.json());
app.use(cookieParser());

// Sample route for payment processing
app.use('/api/payments', paymentRoutes);



module.exports = app;