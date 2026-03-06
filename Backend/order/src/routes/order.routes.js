const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const { createOrder } = require("../controllers/order.controllers");

// POST /api/orders/ 
router.post("/", authMiddleware.createAuthMiddleware(["user"]), createOrder);

module.exports = router;