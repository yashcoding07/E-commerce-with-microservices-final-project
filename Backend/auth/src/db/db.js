const mongoose = require("mongoose");

async function connectDb(){
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("connected to db");
    } catch (error) {
        console.log("Error connecting to database: ", error);
    }
};

module.exports = connectDb;