const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const { createOrder } = require("../controllers/order.controllers");
const { createOrderValidation } = require("../middlewares/validate.middleware");

// POST /api/orders/ 
router.post("/", authMiddleware.createAuthMiddleware(["user"]), createOrderValidation, createOrder);

module.exports = router;