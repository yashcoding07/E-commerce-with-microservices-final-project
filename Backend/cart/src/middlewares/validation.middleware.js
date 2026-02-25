const { body, param, validationResult } = require("express-validator");
const mongoose = require("mongoose");

const validateAllErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
}

const validateCartItem = [
    body("productId")
        .isString()
        .withMessage("Product ID must be a string")
        .custom((value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error("Invalid product ID");
            }
            return true;
        }),
    body("quantity")
        .isInt({ min: 1 })
        .withMessage("Quantity must be a positive integer"),
    validateAllErrors
];

const updateCartItem = [
    param("productId")
        .isString()
        .withMessage("Product ID must be a string")
        .custom((value) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
                throw new Error("Invalid product ID");
            }
            return true;
        }),
    body("quantity")
        .notEmpty()
        .withMessage("Quantity is required"),
    validateAllErrors
]

module.exports = {
    validateCartItem,
    updateCartItem
};
