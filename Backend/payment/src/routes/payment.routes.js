const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const { createPayment, verifyPayment } = require("../controllers/payment.controller");

// POST /api/payment/create/:orderId
router.post(
  "/create/:orderId",
  authMiddleware.createAuthMiddleware(["user"]),
  createPayment,
);

// POST /api/payment/verify
router.post(
  "/verify",
  authMiddleware.createAuthMiddleware(["user"]),
  verifyPayment,
);

module.exports = router;
