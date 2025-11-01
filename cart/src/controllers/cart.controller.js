const { default: mongoose } = require('mongoose');
const cartModel = require('../models/cart.model');
const axios = require('axios');


async function addItemToCart(req, res) {
    const user = req.user;
    const { productId, quantity } = req.body;
    const token = req.cookies?.token || req.headers?.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    if (quantity <= 0) {
        return res.status(400).json({ message: 'Quantity must be greater than 0' });
    }

    try {
        const { data: product } = await axios.get(
            `http://localhost:3001/api/products/${productId}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        if (quantity > product.data.stock) {
            return res.status(400).json({
                message: 'Requested quantity exceeds available stock',
            });
        }

        let Cart = await cartModel.findOne({ user: user.id });

        if (!Cart) {
            Cart = new cartModel({
                user: user.id,
                items: [{ productId, quantity: Number(quantity) }],
            });
            await Cart.save();
            return res.status(200).json({
                message: 'Item added to cart',
                cart: Cart,
            });
        }

        const itemIndex = Cart.items.findIndex(
            (item) => item.productId.toString() === productId.toString()
        );

        if (itemIndex !== -1) {
            if (product.data.stock < Cart.items[itemIndex].quantity + Number(quantity)) {
                return res.status(400).json({
                    message: 'Requested quantity exceeds available stock',
                });
            }
            Cart.items[itemIndex].quantity += Number(quantity);
        } else {
            Cart.items.push({ productId, quantity: Number(quantity) });
        }

        await Cart.save();

        const updatedCart = await cartModel.findById(Cart._id);
        return res.status(200).json({
            message: 'Item added to cart',
            cart: updatedCart,
        });
    } catch (error) {
        console.error('Add to cart error:', error.message);
        return res.status(500).json({
            message: 'Internal server error',
            error: error.message,
        });
    }
}

async function getCart(req, res) {
    const userId = req.user.id;

    try {
        const cart = await cartModel.findOne({ user: userId });
        if (!cart) {
            const newCart = new cartModel({
                user: userId,
                items: []
            })
            await newCart.save();
            return res.status(200).json({
                cart: newCart,
                totals: {
                    itemCount: 0,
                    totalQuantity: 0
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


async function updateItemQuantity(req, res) {
    const { productId } = req.params;
    const { quantity } = req.body;
    const user = req.user;

    const token = req.cookies?.token || req.headers?.authorization?.split(' ')[1];

    // 🔒 Token check
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    // ⚙️ Quantity validation
    if (quantity <= 0) {
        return res.status(400).json({ message: 'Quantity must be greater than 0' });
    }

    try {
        // 🧾 Get product details from product service
        const { data: product } = await axios.get(
            `http://localhost:3001/api/products/${productId}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // 🧮 Check stock availability
        if (quantity > product.data.stock) {
            return res.status(400).json({
                message: 'Requested quantity exceeds available stock',
            });
        }

        // 🛒 Find user’s cart
        const cart = await cartModel.findOne({ user: user.id });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        // 🔍 Check if product exists in cart
        const itemIndex = cart.items.findIndex(
            (item) => item.productId.toString() === productId.toString()
        );

        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Item not found in cart' });
        }

        // ⚡ Validate stock for updated quantity
        if (product.data.stock < cart.items[itemIndex].quantity + Number(quantity)) {
            return res.status(400).json({
                message: 'Requested quantity exceeds available stock',
            });
        }

        // 🧠 Update item quantity
        cart.items[itemIndex].quantity = Number(quantity);
        await cart.save();

        const updatedCart = await cartModel.findById(cart._id);

        return res.status(200).json({
            message: 'Item quantity updated successfully',
            cart: updatedCart,
        });
    } catch (error) {
        console.error('Update item quantity error:', error.message);
        return res.status(500).json({
            message: 'Internal server error',
            error: error.message,
        });
    }
}


async function deleteItemFromCart(req, res) {
    const { productId } = req.params;
    const userId = req.user.id;
    try {
        const cart = await cartModel.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({ message: "cart not found" });
        }
        const productIndex = cart.items.findIndex(item => item.productId.toString() === productId);
        if (productIndex < 0) {
            return res.status(404).json({ message: "Item not found" });
        }
        cart.items.splice(productIndex, 1);
        await cart.save();
        return res.status(200).json({ message: "Item deleted from cart", cart });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error });
    }
}






module.exports = {
    addItemToCart,
    getCart,
    updateItemQuantity,
    deleteItemFromCart
}
