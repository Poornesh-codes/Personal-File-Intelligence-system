const express = require("express");
const upload = require("../middleware/upload.middleware");
const protect = require("../middleware/auth.middleware");
const {
    uploadDocument,
    getDocuments,
    getDocumentFile,
    deleteDocument
} = require("../controllers/document.controller");
const router = express.Router();

router.post(
  "/upload",
  protect,
  upload.single("file"),
  uploadDocument
);
router.get(
    "/",
    protect,
    getDocuments
);
router.get(
    "/:id/file",
    protect,
    getDocumentFile
);
router.delete(
    "/:id",
    protect,
    deleteDocument
);
module.exports = router;