const multer = require("multer");
const path = require("path");
const fs = require("fs");

// make sure uploads folder exists
const uploadFolder = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder);
}

// disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadFolder);
  },
  filename: (req, file, cb) => {
    // keep original name
    cb(null, file.originalname);
  },
});

// filter only SVG files
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "image/svg+xml") {
    cb(null, true);
  } else {
    cb(new Error("Only SVG files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

module.exports = upload;