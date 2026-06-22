// middlewares/upload.js
const multer = require("multer");
const CloudinaryStorage = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "connectMyTask/messages",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

const messageUpload = multer({ storage });

module.exports = messageUpload;
