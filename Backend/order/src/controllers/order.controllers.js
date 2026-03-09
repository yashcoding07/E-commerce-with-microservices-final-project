const orderModel = require("../models/order.model");
const axios = require("axios");

async function createOrder(req, res){
    
    const user = req.user;
    const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

    try{
        const cart = await axios.get("http://localhost:3002/api/cart/", {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    res.status(200).json({message: "Order created successfully"});
    }catch(err){
        console.log("error: ", err.response.data);
        return res.status(500).json({message: "Internal server error"});
    }
}

module.exports = {
    createOrder
};