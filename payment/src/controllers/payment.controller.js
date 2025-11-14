const paymentModel = require('../models/payment.model');
const axios = require('axios');
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

async function createPayment(req,res){
    try {
        const orderId = req.params.orderId;
        const userId = req.user.id;
        const token = req.cookies?.token || req.headers?.authorizarion?.split(' ')[1];

        const orderResponse = await axios.get(`http://localhost:3003/api/orders/${orderId}`,{
            headers: {
                Authorization: `Bearer ${token}` 
            }
        });

        const price = orderResponse.data.order.totalPrice;

        const razorpayOrder = await Razorpay.orders.create(price) ;

        const payment =await paymentModel.create({
            user: userId,
            order: orderId,
            price: price,
            razorpayOrderId: razorpayOrder.id
        })

        return res.status(201).json({
            message: "Payment initiated",
            payment
        });

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error",
            error
        })
    }
}


module.exports = {
    createPayment
}