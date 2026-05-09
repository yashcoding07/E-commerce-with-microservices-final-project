const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, required: true },
    paymentId: { type: String, required: true },
    razorpayId: { type: String, required: true },
    signature: { type: String },
    price: {
      amount: { type: Number, required: true },
      currency: { type: String, required: true },
    },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED"],
      default: "PENDING",
    },
    user: { type: mongoose.Schema.Types.ObjectId, required: true },
  },
  { timestamps: true },
);

const paymentModel = mongoose.model("payment", paymentSchema);

module.exports = paymentModel;
