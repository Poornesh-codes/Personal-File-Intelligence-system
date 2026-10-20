const path = require("path");

const Document = require("../models/Document");
const extractText = require("../services/textExtraction.services");
const chunkText = require("../services/textChunking.services");

/* 
   UPLOAD DOCUMENT
*/

const uploadDocument = async (req, res) => {

    try {

        if (!req.file) {
            return res.status(400).json({
                message: "No file uploaded"
            });
        }

        const file = req.file;
        const extractedText = await extractText(file.path);
        const chunks = chunkText(extractedText);

        const document = await Document.create({

            originalName: file.originalname,

            fileName: file.filename,

            filePath: file.path,

            fileType: file.mimetype,

            fileSize: file.size,

            uploadedBy: req.user.id,
            extractedText,
            chunks

        });


        res.status(201).json({

            message: "Document uploaded successfully",

            document

        });


    } catch (error) {

        console.error(
            "Document upload error:",
            error.message
        );

        res.status(500).json({
            message: "Server error"
        });

    }

};



/* 
   GET USER DOCUMENTS
 */


const getDocuments = async (req, res) => {
  try {
    const search = (req.query.search || "").trim();

    // Only search the logged-in user's documents.
    const filter = {
      uploadedBy: req.user.id
    };

    if (search) {
      // Treat search input as plain text, not a regex pattern.
      const escapedSearch = search.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const searchRegex = new RegExp(escapedSearch, "i");

      filter.$or = [
        { originalName: searchRegex },
        { extractedText: searchRegex },
        { chunks: searchRegex }
      ];
    }

    const documents = await Document.find(filter)
      .sort({ createdAt: -1 });

    res.status(200).json({ documents });
  } catch (error) {
    console.error("Get documents error:", error.message);

    res.status(500).json({
      message: "Server error"
    });
  }
};








/* 
   GET DOCUMENT FILE
 */

const getDocumentFile = async (req, res) => {

    try {

        /*
         * Find the document by:
         * 1. Document ID
         * 2. Logged-in user's ID
         *
         * This prevents users from accessing
         * another user's files.
         */

        const document =
            await Document.findOne({

                _id: req.params.id,

                uploadedBy: req.user.id

            });


        if (!document) {

            return res.status(404).json({
                message: "Document not found"
            });

        }


        /*
         * Convert the stored path into
         * an absolute path.
         */

        const filePath =
            path.resolve(document.filePath);


        /*
         * Send the actual file.
         */

        res.sendFile(filePath);


    } catch (error) {

        console.error(
            "Get document file error:",
            error.message
        );

        res.status(500).json({
            message: "Server error"
        });

    }

};


const deleteDocument = async (req, res) => {

    try {

        const document =
            await Document.findOne({
                _id: req.params.id,
                uploadedBy: req.user.id
            });


        if (!document) {

            return res.status(404).json({
                message: "Document not found"
            });

        }


        // Delete the actual file
        const fs = require("fs");

        if (fs.existsSync(document.filePath)) {
            fs.unlinkSync(document.filePath);
        }


        // Delete database record
        await Document.deleteOne({
            _id: document._id
        });


        res.status(200).json({
            message: "Document deleted successfully"
        });


    } catch (error) {

        console.error(
            "Delete document error:",
            error.message
        );

        res.status(500).json({
            message: "Server error"
        });

    }

};


module.exports = {
    uploadDocument,
    getDocuments,
    getDocumentFile,
    deleteDocument

};