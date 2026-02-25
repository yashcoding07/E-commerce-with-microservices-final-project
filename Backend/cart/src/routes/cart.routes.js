const express = require('express');
const router = express.Router();
const { createAuthMiddleware } = require("../middlewares/auth.middleware");
const { validateCartItem, updateCartItem } = require("../middlewares/validation.middleware");
const { addToCart, updateItemInCart, clearCart, getCart, removeCartItem } = require("../controllers/cart.controllers");

// POST /api/cart/items
// Add an item to the cart
router.post("/items", validateCartItem, createAuthMiddleware(["user"]), addToCart);

// PATCH /api/cart/items/:productId
// Update an item in the cart
router.patch("/items/:productId", updateCartItem, createAuthMiddleware(["user"]), updateItemInCart);

// DELETE /api/cart/
router.delete("/", createAuthMiddleware(["user"]), clearCart);

// GET /api/cart/
router.get("/", createAuthMiddleware(["user"]), getCart);

// DELETE /api/cart/items/:productId
// Remove an item from the cart
router.delete("/items/:productId", createAuthMiddleware(["user"]), removeCartItem);

module.exports = router;
