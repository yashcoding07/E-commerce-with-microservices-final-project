const orderModel = require("../models/order.model");
const axios = require("axios");
const mongoose = require("mongoose");

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

async function getOrderById(req, res) {
    const user = req.user;
    const orderId = req.params.id;

    try{
        if(!mongoose.Types.ObjectId.isValid(orderId)){
            return res.status(400).json({ message: "Invalid order ID" });
        }

        const order = await orderModel.findById(orderId);

        if(!order){
            return res.status(404).json({ message: "Order not found" });
        }

        if(order.user.toString() !== user.id){
            return res.status(403).json({ message: "Forbidden: you do not have access to this order." });
        }

        res.status(200).json({ order: {
            _id: order._id,
            user: order.user,
            items: order.items,
            totalPrice: order.totalPrice,
            status: order.status,
            shippingAddress: order.shippingAddress,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt
        } });

    } catch(err){
        console.log("error: ", err);
        return res.status(500).json({ message: "Internal server error" });
    }
}

async function cancelOrderById(req, res) {
    const user = req.user;
    const orderId = req.params.id;

    try{
        if(!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ message: "Invalid order ID" });
        }

        const order = await orderModel.findById(orderId);

        if(!order) {
            return res.status(404).json( { message: "Order not found" });
        }

        if(order.user.toString() !== user.id) {
            return res.status(403).json({ message: "Forbidden: you do not have access to this order." });
        }
       
        if(order.status === "pending") {
            order.status = "cancelled";
            await order.save();
            return res.status(200).json({ message: "Order cancelled successfully", order });
        }

        if(order.status === "confirmed") {
            order.status = "cancelled";
            await order.save();
            return res.status(200).json({ message: "Order cancelled successfully", order });
        }

        if(order.status === "shipped") {
            return res.status(400).json({ message: "Cannot cancel an order that has been shipped" });
        }

        if(order.status === "delivered") {
            return res.status(400).json({ message: "Cannot cancel an order that has been delivered" });
        }

        if(order.status === "cancelled"){
            return res.status(400).json({ message: "Order is already cancelled" });
        }
    }catch(err){
        console.log("error: ", err);
        res.status(500).json({"Message": "Internal server error"});
    }
};

async function updateShippingAddress(req, res) {
    const user = req.user;
    const orderId = req.params.id;

    try{

        if(!mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({ message: "Invalid order ID"});
        }

        const order = await orderModel.findById(orderId);

        if(!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if(!order.shippingAddress) {
            return res.status(400).json({ message: "Order does not have a shipping address to update" });
        }

        if(!req.body.shippingAddress) {
            return res.status(400).json({ message: "Shipping address is required" });
        }

        if(order.user.toString() !== user.id) {
            return res.status(403).json({ message: "Forbidden: you do not have access to this order." });
        }

        if(order.status === "pending") {
            order.shippingAddress = req.body.shippingAddress;
            await order.save();
            return res.status(200).json({ message: "Shipping address updated successfully", order });
        }

        if(order.status === "confirmed") {
            return res.status(400).json({ message: "Cannot update address for an order that has been confirmed (paid)" });
        }

        if(order.status === "shipped") {
            return res.status(400).json({ message: "Cannot update address for an order that has been shipped" });
        }

        if(order.status === "delivered") {
            return res.status(400).json({ message: "Cannot update address for an order that has been delivered" });
        }

        if(order.status === "cancelled") {
            return res.status(400).json({ message: "Cannot update address for an order that has been cancelled" });
        }
    }catch(err){
        console.log("error: ", err);
        res.status(500).json({ message: "Internal server error" });
    }
}


module.exports = {
    createOrder,
    getMyOrders,
    getOrderById,
    cancelOrderById,
    updateShippingAddress
};