const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const postImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "post-images",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
    transformation: [{ width: 1200, crop: "limit", quality: "auto" }],
  },
});

const proofImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "proof-images",
    allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
  },
});

module.exports = { cloudinary, postImageStorage, proofImageStorage };
