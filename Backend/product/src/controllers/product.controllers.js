const productModel = require("../models/products.model");
const {uploadImage} = require("../services/imagekit.service");

async function createProduct(req, res) {
    try {
        const { title, description, priceAmount, priceCurrency } = req.body;
        const seller = req.user.id;

        const price = {
            amount: Number(priceAmount),
            currency: priceCurrency,
        };

        const images = await Promise.all((req.files || []).map(file => uploadImage({ buffer: file.buffer })));

        const product = await productModel.create({
            title,
            description,
            price,
            image: images,
            seller,
        });

        return res.status(201).json({ message: "Product created successfully", product });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }

}

module.exports = {
    createProduct,
}