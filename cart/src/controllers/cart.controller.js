const cartModel = require('../models/cart.model');


async function addItemToCart(req, res){
    const user = req.user;
    const {productId, quantity} = req.body;
    

    try {
        const Cart = await cartModel.findOne({user: user.id});
        if(!Cart){
            const newCart = new cartModel({
                user: user.id,
                items: [{productId, quantity: Number(quantity)}]
            })
            await newCart.save();
            return res.status(200).json({
                message: "Item added to cart",
                cart: newCart
            })
        }
        const isProductIndexInCart = Cart.items.findIndex(item => item.productId.toString() === productId);
        if(isProductIndexInCart !== -1){
            Cart.items[isProductIndexInCart].quantity += Number(quantity);
        }
        else{
            Cart.items.push({productId, quantity: Number(quantity)});
        }
        await Cart.save();
        return res.status(200).json({
            message: 'Item added to cart',
            cart: Cart
        })
    } catch (error) {
        return res.status(500).json({
            message: 'Internal server error',
            error: error
        })
    }
}

async function getCart(req, res){
    const userId = req.user.id;

    try {
        const cart = await cartModel.findOne({user: userId});
        if(!cart){
            const newCart = new cartModel({
                user: userId,
                items: []
            })
            await newCart.save();
            return res.status(200).json({
                cart: newCart,
                totals: {
                    itemCount : 0,
                    totalQuantity : 0
                }

            })
        }
        const itemCount = cart.items.length;
        let totalQuantity = 0;
        cart.items.forEach(item => totalQuantity += item.quantity);
        return res.status(200).json({
            cart: cart,
            totals: {
                itemCount,
                totalQuantity
            }
        })
    } catch (error) {
        return res.status(500).json({
            message: 'Internal server error',
            error: error
        })
    }
}


module.exports = {
    addItemToCart,
    getCart
}
