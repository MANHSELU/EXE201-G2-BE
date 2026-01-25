require("dotenv").config();
const mongoose = require("mongoose");
const Role = require("./source/model/Role");
const Subject = require("./source/model/Subject");
const Room = require("./source/model/Room");
const ClassModel = require("./source/model/Class");

const createCollections = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    // Mongoose sẽ tự tạo collection khi gọi createCollection()
    await Role.createCollection();
    await Subject.createCollection();
    await Room.createCollection();
    await ClassModel.createCollection();

    console.log("✅ Đã tạo xong 4 collections: roles, subjects, rooms, classes");
    process.exit(0);
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
    process.exit(1);
  }
};

createCollections();
