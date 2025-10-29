const app = require('./src/app');
const connectDB = require('./src/db/db')
require('dotenv').config();

connectDB();


app.listen(3002, ()=>{
    console.log("Cart service is running on port 3002");
});