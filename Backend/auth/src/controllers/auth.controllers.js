const userModel = require("../models/user.model");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const redis = require("../db/redis");

async function registerUser(req, res) {
    try {
        const { username, email, password, fullName: { firstName, lastName }, role } = req.body;

        const isUserAlreadyExist = await userModel.findOne({
            $or: [
                { username },
                { email }
            ]
        });

        if (isUserAlreadyExist) {
            return res.status(409).json({ message: "Username or email already exists" });
        }

        const hashPassword = await bcryptjs.hash(password, 10);

        const user = await userModel.create({
            username,
            email,
            password: hashPassword,
            fullName: {
                firstName,
                lastName
            },
            role: role || "user"
        });

        const token = jwt.sign({
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role
        }, process.env.JWT_SECRET, {
            expiresIn: "1d"
        });

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            maxAge: 24 * 60 * 60 * 1000 // expires in 1 day
        });

        res.status(201).json({
            message: "User registered successfully",
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                role: user.role
            }
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

async function loginUser(req, res) {
    try {
        const { email, username, password } = req.body;

        const user = await userModel.findOne({
            $or: [
                { username },
                { email }
            ]
        }).select("+password");

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const isPasswordValid = await bcryptjs.compare(password, user.password || "");
        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        const token = jwt.sign({
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role
        }, process.env.JWT_SECRET, {
            expiresIn: "1d"
        });

        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            maxAge: 24 * 60 * 60 * 1000 // expires in 1 day
        });

        res.status(200).json({
            message: "User logged in successfully",
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                role: user.role
            }
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
}

async function getUser(req, res) {
    return res.status(200).json({
        message: "User fetched successfully",
        user: req.user
    });
};

async function logoutUser(req, res) {
    const token = req.cookies.token;

    if (token) {
        await redis.set(`Blacklist: ${token}`, "true", "EX", 24 * 60 * 60) // expires in 1 day
    }

    res.clearCookie("token", {
        httpOnly: true,
        secure: true,
    });
    return res.status(200).json({
        message: "User logged out successfully"
    });
};

async function getUserAddress(req, res) {
    const id = req.user.id;
    const user = await userModel.findById(id).select("address");

    if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
    };

    return res.status(200).json({
        message: "Address fetched successfully",
        address: user.address
    });
}

async function addUserAddress(req, res) {
    const id = req.user.id;
    const { street, city, state, pincode, country, isDefault } = req.body;

    const user = await userModel.findOneAndUpdate({ _id: id }, {
        $push: {
            address: {
                street,
                city,
                state,
                pincode,
                country,
                isDefault
            }
        }
    }, { new: true });

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    };

    return res.status(200).json({
        message: "Address added successfully.",
        address: user.address[user.address.length - 1]
    });
};

async function deleteUserAddress(req, res) {
    try {
        const id = req.user.id;
        const { addressId } = req.params;

        const isAddressExists = await userModel.findOne({
            _id: id,
            "address._id": addressId
        });

        if (!isAddressExists) {
            return res.status(404).json({ message: "address not found" })
        }

        const user = await userModel.findOneAndUpdate({ _id: id }, {
            $pull: {
                address: {
                    _id: addressId
                }
            }
        }, { new: true });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({
            message: "Address deleted successfully",
            address: user.address
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getUser,
    logoutUser,
    getUserAddress,
    addUserAddress,
    deleteUserAddress
};
