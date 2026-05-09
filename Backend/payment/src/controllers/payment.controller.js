const paymentModel = require("../models/payment.model");
const axios = require("axios");

const razorpay = require("razorpay");

const razorpay = new razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});


async function createPayment(req, res) {
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

  try {
    const orderId = req.params.orderId;

    // Fetch order details from order service
    const orderResponse = await axios.get(
      "http://localhost:3003/api/orders/" + orderId,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const price = orderResponse.data.order.totalPrice;

    const order = await razorpay.orders.create(price);

    const payment = await paymentModel.create({
      orderId: orderId,
      razorpayId: order.id,
      user: req.user,
      price: {
        amount: order.amount,
        currency: order.currency
      }
    });

    return res.status(201).json({ message: "Payment initialized successfully", payment });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

async function verifyPayment(req, res) {
  const { razorpayId, paymentId, signature } = req.body;
  const secret = process.env.RAZORPAY_KEY_SECRET;

  try {
    const { validatePaymentVerification } = require("../../node_modules/razorpay/dist/utils/razorpay-utils");

    const isValid = validatePaymentVerification({
      order_id: razorpayId,
      payment_id: paymentId
    }, signature, secret);

    if(!isValid) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    const payment = await paymentModel.findOne({ razorpayId });

    if(!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    payment.paymentId = paymentId;
    payment.signature = signature;
    payment.status = "COMPLETED";

    await payment.save();

    return res.status(200).json({ message: "Payment verified successfully" });

  }catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  createPayment,
  verifyPayment
};
