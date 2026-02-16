const express = require("express");
const router = express.Router();
const multer = require("multer");
const { createAuthMiddleware } = require("../middlewares/product.middleware");
const { productValidator } = require("../validators/product.validator");
const { createProduct } = require("../controllers/product.controllers");

const upload = multer({ storage: multer.memoryStorage() });

router.post("/", 
    createAuthMiddleware(["admin", "seller"]), 
    upload.array("images", 5), 
    productValidator, 
    createProduct
);

module.exports = router;