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
        console.log(cartResponse.data);

        const products = await Promise.all(cartResponse.data.cart.items.map(async (item) => {

            return (await axios.get(`http://localhost:3001/api/products/${item.productId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })).data.data

        }))
        console.log(products);

        let priceAmount = 0;

        const orderItems = cartResponse.data.cart.items.map((item, index) => {


            const product = products.find(p => p._id === item.productId)

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

        const order = await orderModel.create({
            user: user.id,
            items: orderItems,
            status: "PENDING",
            totalPrice: {
                amount: priceAmount,
                currency: "INR" // assuming all products are in USD for simplicity
            },
            shippingAddress: {
                street: shippingAddress.street,
                city: shippingAddress.city,
                state: shippingAddress.state,
                zip: shippingAddress.pincode,
                country: shippingAddress.country,
            }
        })

        res.status(201).json({ order })

    } catch (err) {
        res.status(500).json({ message: "Internal server error", error: err.message })
    }

}



module.exports = {
    createOrder,
}