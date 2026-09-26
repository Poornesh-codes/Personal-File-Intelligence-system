const express = require("express");
const upload = require("../middleware/upload.middleware");
const protect = require("../middleware/auth.middleware");
const {
  uploadDocument
} = require("../controllers/document.controller");

const router = express.Router();

router.post(
  "/upload",
  protect,
  upload.single("file"),
  uploadDocument
);

module.exports = router;