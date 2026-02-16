const express = require("express");
const app = express();
const productRoutes = require("./Routes/products.routes");
const cookieParser = require("cookie-parser");

app.use(express.json());
app.use(cookieParser());

app.use("/api/products", productRoutes);

module.exports = app;