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
            data: product
        })
        
    } catch (err) {
        console.error('Create product error', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
}

async function getProducts(req, res){
    const {searchQuery, minPrice, maxPrice, limit, skip = 0} = req.query;

    const filter = {};

    try {
        if(searchQuery){
        filter.$text = {$search : searchQuery};
    }
   if (minPrice) {
        filter[ 'price.amount' ] = { ...filter[ 'price.amount' ], $gte: Number(minPrice) }
    }

    if (maxPrice) {
        filter[ 'price.amount' ] = { ...filter[ 'price.amount' ], $lte: Number(maxPrice) }
    }

    const products = await productModel.find(filter).skip(Number(skip)).limit(Math.min(Number(limit), 20));

    return res.status(200).json({ data: products });

    } catch (error) {
        console.log('Get products error', error);
        return res.status(500).json({message : "Internal server error" });
    }
}

module.exports = {
    createProduct,
    getProducts

};
