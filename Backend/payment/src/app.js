const cookieParser = require("cookie-parser");
const express = require("express");
const paymentRouter = require("./routes/payment.routes");

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/api/payment", paymentRouter);

module.exports = app;
