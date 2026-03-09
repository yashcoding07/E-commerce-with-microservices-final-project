const express = require("express");
const router = express.Router();
const multer = require("multer");
const { createAuthMiddleware } = require("../middlewares/product.middleware");
const { productValidator } = require("../validators/product.validator");
const { createProduct, getAllProducts, getProductByID, updateProduct, deleteProduct, getSellerProducts } = require("../controllers/product.controllers");

const upload = multer({ storage: multer.memoryStorage() });

// POST /api/products/
router.post("/",
    createAuthMiddleware(["admin", "seller"]),
    upload.array("images", 5),
    productValidator,
    createProduct
);

// GET /api/products/
router.get("/", getAllProducts);

// GET /api/products/seller
router.get("/seller", createAuthMiddleware(["seller"]), getSellerProducts);

// PATCH /api/products/:id
router.patch("/:id", createAuthMiddleware(["seller"]), updateProduct);

// DELETE /api/products/:id
router.delete("/:id", createAuthMiddleware(["seller"]), deleteProduct);

// GET /api/products/:id
router.get("/:id", getProductByID);

module.exports = router;