const productModel = require("../models/products.model");
const { uploadImage } = require("../services/imagekit.service");

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

async function getAllProducts(req, res) {
    try {
        const { q, minprice, maxprice, skip = 0, limit = 20 } = req.query;

        const filter = {};

        if (q) {
            filter.$text = { $search: q };
        }

        if (minprice) {
            filter['price.amount'] = { ...filter['price.amount'], $gte: Number(minprice) };
        }

        if (maxprice) {
            filter['price.amount'] = { ...filter['price.amount'], $lte: Number(maxprice) };
        }

        const products = await productModel.find(filter).skip(Number(skip)).limit(Math.min(Number(limit), 20));
        return res.status(200).json({ data: products });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function getProductByID(req, res) {
    try {
        const { id } = req.params;

        const product = await productModel.findById(id);

        if (!product) {
            return res.status(404).json({ message: "product not found." });
        };

        return res.status(200).json({ product: product });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function updateProduct(req, res) {
    try {
        const { id } = req.params;
        const seller = req.user.id;

        const product = await productModel.findById(id);

        if (!product) {
            return res.status(404).json({ message: "product not found." });
        }

        if (product.seller.toString() !== seller) {
            return res.status(403).json({ message: "You are not authorized to update this product." });
        }

        const { title, description, priceAmount, priceCurrency } = req.body;

        if (title) {
            product.title = title;
        }

        if (description) {
            product.description = description;
        }

        if (priceAmount) {
            product.price.amount = Number(priceAmount);
        }

        if (priceCurrency) {
            product.price.currency = priceCurrency;
        }

        await product.save();
        return res.status(200).json({ message: "Product updated successfully", product });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function deleteProduct(req, res) {
    try {

        const { id } = req.params;

        const product = await productModel.findById(id);

        if (!product) {
            return res.status(404).json({ message: "product not found." });
        }

        if (product.seller.toString() !== req.user.id) {
            return res.status(403).json({ message: "You are not authorized to delete this product." });
        }

        await productModel.findOneAndDelete(id);

        return res.status(200).json({ message: "Product deleted successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function getSellerProducts(req, res) {
    try{
        const seller = req.user;
        const {skip = 0, limit = 20} = req.query;

        if(!seller){
            return res.status(401).json({message: "Unauthorized"});
        }

        if(seller.role !== "seller"){
            return res.status(403).json({message: "Forbidden"});
        }

        const products = await productModel.find({seller: seller.id}).skip(Number(skip)).limit(Math.min(Number(limit), 20));

        return res.status(200).json({data: products});
    }catch(error){
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
}

module.exports = {
    createProduct,
    getAllProducts,
    getProductByID,
    updateProduct,
    deleteProduct,
    getSellerProducts
}
