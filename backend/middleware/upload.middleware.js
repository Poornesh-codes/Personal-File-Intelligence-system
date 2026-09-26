const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },

  filename: function (req, file, cb) {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1E9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,

  fileFilter: function (req, file, cb) {
    const allowedExtensions = [
      ".pdf",
      ".docx",
      ".txt"
    ];

    const extension =
      path.extname(file.originalname).toLowerCase();

    if (allowedExtensions.includes(extension)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, DOCX and TXT files are allowed"));
    }
  }
});

module.exports = upload;