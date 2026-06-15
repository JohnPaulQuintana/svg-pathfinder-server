const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// Ensure uploads folder exists
const uploadFolder = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadFolder);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      crypto.randomBytes(8).toString("hex") +
      "-" +
      Date.now() +
      ".svg";

    cb(null, uniqueName);
  },
});

// SVG validation
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (
    file.mimetype === "image/svg+xml" &&
    ext === ".svg"
  ) {
    return cb(null, true);
  }

  return cb(new Error("Only SVG files are allowed"), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 500 * 1024, // 500 KB
    files: 1,
  },
});

module.exports = upload;