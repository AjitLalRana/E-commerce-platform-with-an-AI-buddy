const { promises } = require("supertest/lib/test");
const orderModel = require("../models/order.model")
const axios = require("axios")



async function createOrder(req, res) {

    const user = req.user;
    const token = req.cookies?.token || req.headers?.authorization?.split(' ')[ 1 ];
    const { shippingAddress} = req.body;

    try {

        // fetch user cart from cart service
        const cartResponse = await axios.get(`http://localhost:3002/api/cart`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
        

        const products = await Promise.all(cartResponse.data.cart.items.map(async (item) => {

            return (await axios.get(`http://localhost:3001/api/products/${item.productId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })).data.data;

        }))
        

        let priceAmount = 0;

        const orderItems = cartResponse.data.cart.items.map((item, index) => {
            const product = products.find(p => p._id.toString() === item.productId.toString());
            // if not in stock, does not allow order creation

            if (product.stock < item.quantity) {
                throw new Error(`Product ${product.title} is out of stock or insufficient stock`)
            }

            const itemTotal = product.price.amount * item.quantity;
            priceAmount += itemTotal;

            return {
                product: item.productId,
                quantity: item.quantity,
                price: {
                    amount: itemTotal,
                    currency: product.price.currency
                }
            }
        })

        const timeline = [{
            type: 'CREATED',
            at: new Date()
        }]

        const order = await orderModel.create({
            user: user.id,
            items: orderItems,
            status: "PENDING",
            totalPrice: {
                amount: priceAmount,
                currency: "INR" // assuming all products are in INR for simplicity
            },
            shippingAddress: {
                street: shippingAddress.street,
                city: shippingAddress.city,
                state: shippingAddress.state,
                zip: shippingAddress.pincode,
                country: shippingAddress.country,
            },
            timeline : timeline
        })

        res.status(201).json({ order })

    } catch (err) {
        res.status(500).json({ message: "Internal server error", error: err.message })
    }

}

async function getMyOrders(req, res){
    const userId = req.user.id;
    const {page,limit,skip} = req.query;
    try {
        const orders = await orderModel.find({user: userId}).skip(parseInt(skip) || 0).limit(parseInt(limit) || 20);
        
        if(orders.length < 0){
           res.status(404).json({message: "Not found"});
        }
        const totalOrders = await orderModel.countDocuments({user: userId});

        res.status(200).json({
            orders,
            meta: {
                totalOrders,
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20
            }
        })
    } catch (error) {
        res.status(500).json({ message: "Internal server error", error: error.message })
    }
}

async function getOrderById(req, res){
    const userId = req.user.id;
    const orderId = req.params.id;

    try {
        const order = await orderModel.findOne({_id: orderId, user: userId});
        if(!order){
            return res.status(404).json({message: "Order not found"});
        }
        
        

        // Ensure payment summary exists (for older orders)
        if (!order.paymentSummary) {
            order.paymentSummary = {
                subtotal: {
                    amount: order.totalPrice.amount,
                    currency: order.totalPrice.currency
                },
                taxes: {
                    amount: 0,
                    currency: order.totalPrice.currency
                },
                shipping: {
                    amount: 0,
                    currency: order.totalPrice.currency
                }
            };
            await order.save();
        }

        res.status(200).json({
            order
        });
    } catch (error) {
        res.status(500).json({ message: "Internal server error", error: error.message })
    }
}

async function cancelOrderById(req, res){
    const userId = req.user.id;
    const orderId = req.params.id;

    try {
        const order = await orderModel.findOne({_id: orderId});
        if(!order){
            return res.status(404).json({message: "Order not found"});
        }
        if(order.user.toString() !== userId){
            return res.status(403).json({message: "Forbidden: You can only cancel your own orders"});
        }

        // only pending orders can be cancelled
        if(order.status !== 'PENDING'){
            return res.status(409).json({message: "Order cannot be cancelled"});
        }
        order.status = 'CANCELLED';
        order.timeline.push({
            type: 'CANCELLED',
            at: new Date()
        })
        await order.save();
        res.status(200).json({message: "Order cancelled successfully",order});

    } catch (error) {
        res.status(500).json({ message: "Internal server error", error: error.message })
    }
}


async function updateOrderAddress(req, res) {
    const user = req.user;
    const orderId = req.params.id;

    try {
        const order = await orderModel.findById(orderId)

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (order.user.toString() !== user.id) {
            return res.status(403).json({ message: "Forbidden: You do not have access to this order" });
        }

        // only PENDING orders can have address updated
        if (order.status !== "PENDING") {
            return res.status(409).json({ message: "Order address cannot be updated at this stage" });
        }

        order.shippingAddress = {
            street: req.body.shippingAddress.street,
            city: req.body.shippingAddress.city,
            state: req.body.shippingAddress.state,
            zip: req.body.shippingAddress.pincode,
            country: req.body.shippingAddress.country,
        };

        await order.save();

        res.status(200).json({ order });
    } catch (err) {
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
}



module.exports = {
    createOrder,
    getMyOrders,
    getOrderById,
    cancelOrderById,
    updateOrderAddress
}