const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/connectMyTask";

const connectDB = async () => {
    try {
      await mongoose.connect(MONGO_URI);
      console.log("Connected to MongoDB");
    } catch (err) {
      console.error("Failed to connect to MongoDB:", err);
      process.exit(1);
    }
  };
  
  module.exports = connectDB;
