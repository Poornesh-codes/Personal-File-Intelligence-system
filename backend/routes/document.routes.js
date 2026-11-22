const express = require("express");
const upload = require("../middleware/upload.middleware");
const protect = require("../middleware/auth.middleware");
const {
    uploadDocument,
    getDocuments,
    getDocumentFile,
    deleteDocument,
    semanticSearch,
    askQuestion,
    getDocumentSummary,
    updateDocumentTags,
    autoTagDocument,
    getUserTags
} = require("../controllers/document.controller");
const router = express.Router();

router.post(
  "/upload",
  protect,
  upload.single("file"),
  uploadDocument
);
router.post(
  "/ask",
  protect,
  askQuestion
);
router.get(
    "/tags",
    protect,
    getUserTags
);
router.get(
    "/",
    protect,
    getDocuments
);
router.get(
    "/semantic-search",
    protect,
    semanticSearch
);
router.get(
    "/:id/summary",
    protect,
    getDocumentSummary
);
router.post(
    "/:id/tags/auto",
    protect,
    autoTagDocument
);
router.put(
    "/:id/tags",
    protect,
    updateDocumentTags
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