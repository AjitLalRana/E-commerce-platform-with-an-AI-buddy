const mongoose = require('mongoose');
const productModel = require('../models/product.model');
const { uploadImage } = require('../services/imagekit.service');


// Accepts multipart/form-data with fields: title, description, priceAmount, priceCurrency, images[] (files)
async function createProduct(req, res) {
    try {
        const { title, description, priceAmount, priceCurrency = 'INR',stock } = req.body;
        const seller = req.user.id;
        const images = await Promise.all((req.files || []).map((file) => {
            return uploadImage({ buffer: file.buffer });
        }))

        const product = await productModel.create({
            title,
            description,
            price: {
                amount: Number(priceAmount),
                currency: priceCurrency
            },
            seller,
            stock : Number(stock) || 0,
            images
        })
        return res.status(201).json({
            message: "Product created successfully",
            data: product
        })

    } catch (err) {
        console.error('Create product error', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getProducts(req, res) {
    const { searchQuery, minPrice, maxPrice, limit, skip = 0 } = req.query;

    const filter = {};

    try {
        if (searchQuery) {
            filter.$text = { $search: searchQuery };
        }
        if (minPrice) {
            filter['price.amount'] = { ...filter['price.amount'], $gte: Number(minPrice) }
        }

        if (maxPrice) {
            filter['price.amount'] = { ...filter['price.amount'], $lte: Number(maxPrice) }
        }

        const products = await productModel.find(filter).skip(Number(skip)).limit(Math.min(Number(limit), 20));

        return res.status(200).json({ data: products });

    } catch (error) {
        console.log('Get products error', error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function getProductById(req, res) {
    const { id } = req.params;
    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid product id" });
        }
        const product = await productModel.findById(id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        return res.status(200).json({
            message: "Product fetched successfully",
            data: product
        })

    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error });
    }
}


async function deleteProductById(req, res) {
    const { id } = req.params;
    const user = req.user;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid product id" });
    }

    const product = await productModel.findById(id);

    if (!product) {
        return res.status(404).json({ message: "Product not found" });
    }

    if (user.role == 'admin' || product.seller.toString() == user.id) {
        await productModel.findByIdAndDelete(id);
        return res.status(200).json({ message: "Product deleted successfully" });
    }

    return res.status(403).json({
        message: "You are not authorized to delete this product"
    })

}


async function getProductsBySeller(req, res) {
    const seller = req.user;
    const { skip = 0, limit = 20 } = req.query;
    try {

        const products = await productModel.find({ seller: seller.id }).skip(Number(skip)).limit(Math.min(Number(limit, 20)));
        if (!products) { return res.status(404).json({ message: "No product found for this seller" }) };
        return res.status(200).json({
            message: "Products fetched successfully",
            data: products
        })
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error });
    }

}


async function updateProductById(req, res) {

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid product id' });
    }

    const product = await productModel.findOne({
        _id: id,
    })


    if (!product) {
        return res.status(404).json({ message: 'Product not found' });
    }

    if (product.seller.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden: You can only update your own products' });
    }

    const allowedUpdates = ['title', 'description', 'price','stock'];
    for (const key of Object.keys(req.body)) {
        if (allowedUpdates.includes(key)) {
            if (key === 'price' && typeof req.body.price === 'object') {
                if (req.body.price.amount !== undefined) {
                    product.price.amount = Number(req.body.price.amount);
                }
                if (req.body.price.currency !== undefined) {
                    product.price.currency = req.body.price.currency;
                }
            } else {
                product[key] = req.body[key];
            }

        }
    }
    await product.save();
    return res.status(200).json({ message: 'Product updated', product });
}






module.exports = {
    createProduct,
    getProducts,
    getProductById,
    deleteProductById,
    getProductsBySeller,
    updateProductById

};
