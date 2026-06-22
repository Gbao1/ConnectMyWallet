const multer = require("multer");
const CloudinaryStorage = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const taskStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "connectMyTask/task-photos", // Separate folder for tasks
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

const taskUpload = multer({ storage: taskStorage });

module.exports = taskUpload;