const orderModel = require("../models/order.model");
const axios = require("axios");

async function createOrder(req, res) {

    const user = req.user;
    const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

    try {
        const cart = await axios.get("http://localhost:3002/api/cart/", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if(cart.data.items.length === 0){
            return res.status(400).json({ message: "Cart is empty" });
        }

        // Loop through all items and check stock for each
        for (let i = 0; i < cart.data.items.length; i++) {
            const item = cart.data.items[i];
            
            // Get product details for this specific item
            const productRes = await axios.get(`http://localhost:3001/api/products/${item.product}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const product = productRes.data.product;

            if (product.stock < item.quantity) {
                return res.status(400).json({ message: `Product ${product.title || item.product} is out of stock` });
            }
        }

        const orderItems = cart.data.items.map((item) => ({
            product: item.product,
            quantity: item.quantity,
            price: {
                amount: item.priceAtAddition * item.quantity,
                currency: "INR"
            }
        }));
        
        const totalPrice = orderItems.reduce((total, item) => total + item.price.amount, 0);

        const newOrder = new orderModel({
            user: user._id || user.id,
            items: orderItems,
            totalPrice: {
                amount: totalPrice,
                currency: "INR"
            },
            status: "pending",
            shippingAddress: req.body.shippingAddress
        });

        await newOrder.save();

        res.status(201).json({ message: "Order created successfully", order: newOrder });

    } catch (err) {
        console.log("error: ", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function getMyOrders(req, res) {
    try {
        const userId = req.user._id || req.user.id;

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const orders = await orderModel.find({ user: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalOrders = await orderModel.countDocuments({ user: userId });
        const totalPages = Math.ceil(totalOrders / limit);

        res.status(200).json({
            orders,
            page,
            limit,
            totalPages,
            totalOrders
        });

    } catch(err){
        console.log("error: ", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

module.exports = {
    createOrder,
    getMyOrders,
    getOrderById
};