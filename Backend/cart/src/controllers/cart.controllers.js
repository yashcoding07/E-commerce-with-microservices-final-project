const cartModel = require("../models/cart.model");
const { getProductsByIds } = require("../services/product.service");

async function addToCart(req, res) {
    try {
        const { productId, quantity } = req.body;
        const user = req.user;

        if (!productId || !quantity) {
            return res.status(400).json({ message: "Bad request" })
        }

        if (!user || (!user._id && !user.id)) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        const userId = user._id || user.id;

        let cart = await cartModel.findOne({ user: userId });

        if (!cart) {
            cart = new cartModel({
                user: userId,
                items: [{ product: productId, quantity }]
            });
            await cart.save();
            return res.status(200).json({
                message: "Item added to cart successfully",
                items: cart.items
            });
        }

        const existingItem = cart.items.find((item) => item.product.toString() === productId);

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.items.push({ product: productId, quantity });
        }

        await cart.save();
        return res.status(200).json({
            message: "Item added to cart successfully",
            items: cart.items
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error", error });
    }
}

async function updateItemInCart(req, res) {
    try {
        const { productId } = req.params;
        const { quantity } = req.body;
        const userId = req.user.id;

        if (!productId || quantity === undefined || quantity === null) {
            return res.status(400).json({ message: "Bad request" })
        }

        const cart = await cartModel.findOne({ user: userId })

        if (!cart) {
            return res.status(404).json({ message: "Cart not found" })
        }

        const existingItem = cart.items.find((item) => item.product.toString() === productId);

        if (!existingItem) {
            return res.status(404).json({ message: "Item not found in cart" })
        }

        if (quantity <= 0) {
            cart.items = cart.items.filter((item) => item.product.toString() !== productId);
        } else {
            existingItem.quantity = quantity;
        }

        await cart.save();

        const totalAmount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

        return res.status(200).json({
            message: "Item updated in cart successfully",
            items: cart.items,
            totalAmount
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error", error });
    }
}

async function clearCart(req, res) {
    try {
        const userId = req.user.id;
        const cart = await cartModel.findOne({ user: userId });

        if (!cart) {
            return res.status(200).json({
                message: "Cart is already empty."
            });
        };

        if (cart.items.length > 0) {
            cart.items = [];
            await cart.save();
            return res.status(200).json({
                message: "Cart cleared successfully",
                cart
            });
        }
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error", error });
    }
}

async function getCart(req, res) {
    try {
        const userId = req.user.id;
        const cart = await cartModel.findOne({ user: userId });

        if (!cart || cart.items.length === 0) {
            return res.status(200).json({ items: [], totalAmount: 0 })
        }

        const productIds = cart.items.map((item) => item.product);
        const products = await getProductsByIds(productIds);

        const cartItems = cart.items.map((item) => {
            const product = products.find((product) => product && product._id && product._id.toString() === item.product.toString());
            
            if (!product) {
                return null;
            }

            return {
                product: item.product,
                quantity: item.quantity,
                priceAtAddition: product.price.amount
            }
        }).filter(item => item !== null);

        const totalAmount = cartItems.reduce((sum, item) => sum + item.quantity * item.priceAtAddition, 0);

        return res.status(200).json({
            message: "Cart fetched successfully",
            items: cartItems,
            totalAmount
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error", error });
    }
}

async function removeCartItem(req, res) {
    const { productId } = req.params;
    const userId = req.user.id;

    if (!productId) {
        return res.status(400).json({ message: "Bad request" });
    }

    let cart = await cartModel.findOne({ user: userId });

    if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
    }

    let item = cart.items.find((item) => item.product.toString() === productId);

    if (!item) {
        return res.status(404).json({ message: "Item not found in cart" });
    }

    cart.items = cart.items.filter((item) => item.product.toString() !== productId);
    await cart.save();

    return res.status(200).json({
        message: "Item removed from cart successfully",
        cart
    });

}

module.exports = {
    addToCart,
    updateItemInCart,
    clearCart,
    getCart,
    removeCartItem
}
