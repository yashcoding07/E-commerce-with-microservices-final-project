const { body, validationResult } = require("express-validator");

const respondWithValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array() });
    }
    next();
}

const registerUserValidations = [
    body("username")
        .isString()
        .isLength({ min: 3 })
        .notEmpty()
        .withMessage("Username must be at least 3 characters long"),
    body("email")
        .isEmail()
        .notEmpty()
        .withMessage("Please enter a valid email address"),
    body("password")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters long"),
    body('fullName.firstName')
        .isString()
        .notEmpty()
        .withMessage("Please enter a valid first name"),
    body('fullName.lastName')
        .isString()
        .notEmpty()
        .withMessage("Please enter a valid last name"),
    respondWithValidationErrors
]

const loginUserValidations = [
    body("email")
        .isEmail()
        .optional()
        .withMessage("Please enter a valid email address"),
    body("username")
        .isString()
        .optional()
        .withMessage("Please enter a valid username"),
    body("password")
        .notEmpty()
        .withMessage("Password is required")
        .bail()
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters long"),
    respondWithValidationErrors
]

const addUserAddressValidations = [
    body('street')
        .isString()
        .withMessage('Street must be a string')
        .notEmpty()
        .withMessage('Street is required'),
    body('city')
        .isString()
        .withMessage('City must be a string')
        .notEmpty()
        .withMessage('City is required'),
    body('state')
        .isString()
        .withMessage('State must be a string')
        .notEmpty()
        .withMessage('State is required'),
    body('pincode')
        .isString()
        .withMessage('Pincode must be a string')
        .notEmpty()
        .withMessage('Pincode is required')
        .bail()
        .matches(/^\d{4,}$/)
        .withMessage('Pincode must be at least 4 digits'),
    body('country')
        .isString()
        .withMessage('Country must be a string')
        .notEmpty()
        .withMessage('Country is required'),
    body('isDefault')
        .optional()
        .isBoolean()
        .withMessage('isDefault must be a boolean'),
    respondWithValidationErrors
]

module.exports = {
    registerUserValidations,
    loginUserValidations,
    addUserAddressValidations
}