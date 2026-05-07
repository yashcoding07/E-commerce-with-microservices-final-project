const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const { createOrder, getMyOrders, getOrderById, cancelOrderById, updateShippingAddress} = require("../controllers/order.controllers");
const { createOrderValidation } = require("../middlewares/validate.middleware");

// POST /api/orders/ 
router.post("/", authMiddleware.createAuthMiddleware(["user"]), createOrderValidation, createOrder);

// GET /api/orders/me
router.get("/me", authMiddleware.createAuthMiddleware(["user"]), getMyOrders);

// GET /api/orders/:id
router.get("/:id", authMiddleware.createAuthMiddleware(["user", "admin"]), getOrderById);

// POST /api/orders/:id/cancel
router.post("/:id/cancel", authMiddleware.createAuthMiddleware(["user"]), cancelOrderById);

// PATCH /api/orders/:id/address
router.patch("/:id/address", authMiddleware.createAuthMiddleware(["user"]), createOrderValidation, updateShippingAddress);

module.exports = router;