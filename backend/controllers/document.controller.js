const Document = require("../models/Document");

const uploadDocument = async (req, res) => {
  try {
    // Check if a file was uploaded
    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded"
      });
    }

    const file = req.file;
//temp
    const userId = "REPLACE_WITH_USER_ID";

    const document = await Document.create({
        originalName: file.originalname,
        fileName: file.filename,
        filePath: file.path,
        fileType: file.mimetype,
        fileSize: file.size,
        uploadedBy: req.user.id
    });

    res.status(201).json({
      message: "Document uploaded successfully",
      document
    });

  } catch (error) {
    console.error("Document upload error:", error.message);

    res.status(500).json({
      message: "Server error"
    });
  }
};

module.exports = {
  uploadDocument
};