const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const orderRoutes = require("./routes/order.routes");

app.use(express.json());
app.use(cookieParser());

app.use("/api/orders", orderRoutes);

module.exports = app;