const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const { createOrder, getMyOrders, getOrderById } = require("../controllers/order.controllers");
const { createOrderValidation } = require("../middlewares/validate.middleware");

// POST /api/orders/ 
router.post("/", authMiddleware.createAuthMiddleware(["user"]), createOrderValidation, createOrder);

// GET /api/orders/me
router.get("/me", authMiddleware.createAuthMiddleware(["user"]), getMyOrders);

// GET /api/orders/:id
router.get("/:id", authMiddleware.createAuthMiddleware(["user", "admin"]), getOrderById);

module.exports = router;