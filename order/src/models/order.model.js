const mongoose = require('mongoose');


const addressSchema = new mongoose.Schema({
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String,
});

const orderSchema = new mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    items: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                required: true,
            },
            quantity: {
                type: Number,
                default: 1,
                min: 1
            },
            price: {
                amount: {
                    type: Number,
                    required: true
                },
                currency: {
                    type: String,
                    required: true,
                    enum: [ "USD", "INR" ]
                }
            }
        }
    ],
    status: {
        type: String,
        enum: [ "PENDING", "CONFIRMED", "CANCELLED", "SHIPPED", "DELIVERED" ],
    },
    totalPrice: {
        amount: {
            type: Number,
            required: true
        },
        currency: {
            type: String,
            required: true,
            enum: [ "USD", "INR" ]
        }
    },
    shippingAddress: {
        type: addressSchema,
        required: true
    },
    timeline: [{
        type: {
            type: String,
            required: true,
            enum: ["CREATED", "CONFIRMED", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"]
        },
        at: {
            type: Date,
            default: Date.now
        }
    }],
    paymentSummary: {
        subtotal: {
            amount: Number,
            currency: {
                type: String,
                enum: ["USD", "INR"]
            }
        },
        taxes: {
            amount: Number,
            currency: {
                type: String,
                enum: ["USD", "INR"]
            }
        },
        shipping: {
            amount: Number,
            currency: {
                type: String,
                enum: ["USD", "INR"]
            }
        }
    },
}, { timestamps: true });


const orderModel = mongoose.model("order", orderSchema);

module.exports = orderModel;