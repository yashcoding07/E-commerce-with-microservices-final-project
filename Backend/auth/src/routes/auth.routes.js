const express = require("express");
const { registerUserValidations, loginUserValidations, addUserAddressValidations } = require("../middlewares/validate.middleware");
const { registerUser, loginUser, getUser, logoutUser, getUserAddress, addUserAddress, deleteUserAddress } = require("../controllers/auth.controllers");
const authMiddleware = require("../middlewares/auth.middleware");
const router = express.Router();

router.post("/register", registerUserValidations, registerUser);
router.post("/login", loginUserValidations, loginUser);
router.get("/me", authMiddleware, getUser);
router.get("/logout", logoutUser);
router.get("/user/me/address", authMiddleware, getUserAddress);
router.post("/user/me/address", authMiddleware, addUserAddressValidations, addUserAddress);
router.delete("/user/me/address/:addressId", authMiddleware, deleteUserAddress);

module.exports = router;