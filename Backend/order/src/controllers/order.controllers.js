const orderModel = require("../models/order.model");
const axios = require("axios");

async function createOrder(req, res){
    
    try{
        const user = req.user;
        const Cookie = req.cookies?.token || req.headers.authorization?.split(" ")[1];
        const cart = await axios.get("http://localhost:3002/api/cart/", {
        headers: {
            Cookie: `token=${Cookie}`
        }
    });
        console.log(cart);
    }catch(err){
        return res.status(500).json(
            {
                message: "Internal server error"
            }
        );
    }
}

module.exports = {
    createOrder
};