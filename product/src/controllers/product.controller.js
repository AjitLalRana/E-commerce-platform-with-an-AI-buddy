const productModel = require('../models/product.model');
const { uploadImage } = require('../services/imagekit.service');


// Accepts multipart/form-data with fields: title, description, priceAmount, priceCurrency, images[] (files)
async function createProduct(req, res) {
    try {
        const {title,description,priceAmount,priceCurrency = 'INR'} = req.body;
        const seller = req.user.id;
        const images =await Promise.all((req.files || []).map((file)=>{
            return uploadImage({buffer:file.buffer});
        }))

        const product = await productModel.create({
            title,
            description,
            price: {
                amount : Number(priceAmount),
                currency: priceCurrency
            },
            seller,
            images
        })
        return res.status(201).json({
            message: "Product created successfully",
            product
        })
        
    } catch (err) {
        console.error('Create product error', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

module.exports = { createProduct };
