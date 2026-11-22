const path = require("path");
const fs = require("fs");

const Document = require("../models/Document");
const ChunkEmbedding = require("../models/ChunkEmbedding");
const extractText = require("../services/textExtraction.services");
const chunkText = require("../services/textChunking.services");
const {
    generateEmbedding,
    generateBatchEmbeddings,
    cosineSimilarity
} = require("../services/embedding.services");
const { answerQuestionWithContext } = require("../services/qa.services");
const { summarizeDocument } = require("../services/summarization.services");
const { generateDocumentTags } = require("../services/tagging.services");

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
        let extractedText = "";
        let chunks = [];

        try {
            extractedText = await extractText(file.path);
            chunks = chunkText(extractedText);
        } catch (extractErr) {
            console.warn("Text extraction warning:", extractErr.message);
        }

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

        // Generate automatic tags if text is extracted
        if (extractedText && extractedText.trim().length > 0 && process.env.GEMINI_API_KEY) {
            try {
                const autoTags = await generateDocumentTags(document.originalName, extractedText);
                if (autoTags.length > 0) {
                    document.tags = autoTags;
                    await document.save();
                }
            } catch (tagErr) {
                console.warn("Auto tagging failed during upload:", tagErr.message);
            }
        }

        // Generate and store chunk embeddings for semantic search (if chunks exist and GEMINI_API_KEY is present)
        if (chunks.length > 0 && process.env.GEMINI_API_KEY) {
            try {
                const embeddings = await generateBatchEmbeddings(chunks);
                const chunkEmbeddingDocs = chunks.map((chunk, index) => ({
                    documentId: document._id,
                    uploadedBy: req.user.id,
                    chunkIndex: index,
                    text: chunk,
                    embedding: embeddings[index] || []
                })).filter(doc => doc.embedding && doc.embedding.length > 0);

                if (chunkEmbeddingDocs.length > 0) {
                    await ChunkEmbedding.insertMany(chunkEmbeddingDocs);
                }
            } catch (embedError) {
                console.error("Chunk embedding generation failed during upload (non-fatal):", embedError.message);
            }
        }

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

/* 
   GET USER DOCUMENTS
*/

const getDocuments = async (req, res) => {
  try {
    const search = (req.query.search || "").trim();
    const tag = (req.query.tag || "").trim();

    // Only search the logged-in user's documents.
    const filter = {
      uploadedBy: req.user.id
    };

    if (tag) {
      filter.tags = tag;
    }

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
        { chunks: searchRegex },
        { tags: searchRegex }
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
   SEMANTIC SEARCH DOCUMENTS
*/

const semanticSearch = async (req, res) => {
    try {
        const query = (req.query.q || req.query.query || "").trim();
        if (!query) {
            return res.status(400).json({ message: "Search query is required" });
        }

        // Check if user has any documents
        const userDocs = await Document.find({ uploadedBy: req.user.id });
        if (userDocs.length === 0) {
            return res.status(200).json({ results: [], query, mode: "semantic" });
        }

        const userDocMap = new Map();
        userDocs.forEach(d => userDocMap.set(d._id.toString(), d));

        // Ensure embeddings exist; if any user document has chunks but no ChunkEmbedding records, generate them on-the-fly
        const existingCount = await ChunkEmbedding.countDocuments({ uploadedBy: req.user.id });
        if (existingCount === 0 && process.env.GEMINI_API_KEY) {
            for (const doc of userDocs) {
                if (doc.chunks && doc.chunks.length > 0) {
                    try {
                        const embeddings = await generateBatchEmbeddings(doc.chunks);
                        const docsToInsert = doc.chunks.map((txt, idx) => ({
                            documentId: doc._id,
                            uploadedBy: req.user.id,
                            chunkIndex: idx,
                            text: txt,
                            embedding: embeddings[idx] || []
                        })).filter(d => d.embedding && d.embedding.length > 0);

                        if (docsToInsert.length > 0) {
                            await ChunkEmbedding.insertMany(docsToInsert);
                        }
                    } catch (syncErr) {
                        console.error("Backfilling embeddings failed for doc:", doc.originalName, syncErr.message);
                    }
                }
            }
        }

        // Generate query embedding
        let queryEmbedding;
        try {
            queryEmbedding = await generateEmbedding(query);
        } catch (apiError) {
            console.warn("Semantic embedding generation failed, falling back to keyword search:", apiError.message);
            // Fallback to keyword matching across user documents
            const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const regex = new RegExp(escaped, "i");
            const fallbackMatches = userDocs.filter(d => 
                regex.test(d.originalName) || regex.test(d.extractedText || "")
            ).map(d => ({
                document: d,
                chunkText: (d.chunks && d.chunks.find(c => regex.test(c))) || (d.extractedText ? d.extractedText.slice(0, 300) : ""),
                relevanceScore: 0.5,
                chunkIndex: 0,
                isFallback: true
            }));
            return res.status(200).json({ results: fallbackMatches, query, mode: "keyword_fallback" });
        }

        // Retrieve stored chunk embeddings for this user only
        const storedChunks = await ChunkEmbedding.find({ uploadedBy: req.user.id });
        if (storedChunks.length === 0) {
            return res.status(200).json({ results: [], query, mode: "semantic" });
        }

        // Calculate cosine similarity scores
        const scoredChunks = [];
        for (const chunk of storedChunks) {
            const score = cosineSimilarity(queryEmbedding, chunk.embedding);
            // Only keep chunks with positive similarity threshold
            if (score > 0.25) {
                const doc = userDocMap.get(chunk.documentId.toString());
                if (doc) {
                    scoredChunks.push({
                        document: doc,
                        chunkText: chunk.text,
                        chunkIndex: chunk.chunkIndex,
                        relevanceScore: Math.round(score * 100) / 100 // Normalized score
                    });
                }
            }
        }

        // Sort descending by relevance score
        scoredChunks.sort((a, b) => b.relevanceScore - a.relevanceScore);

        // Deduplicate or group by document while keeping the top matching excerpt
        const topResults = scoredChunks.slice(0, 10);

        res.status(200).json({
            results: topResults,
            query,
            mode: "semantic"
        });
    } catch (error) {
        console.error("Semantic search error:", error.message);
        res.status(500).json({ message: "Server error during semantic search" });
    }
};

/* 
   GET DOCUMENT FILE
*/

const getDocumentFile = async (req, res) => {
    try {
        const document = await Document.findOne({
            _id: req.params.id,
            uploadedBy: req.user.id
        });

        if (!document) {
            return res.status(404).json({
                message: "Document not found"
            });
        }

        const filePath = path.resolve(document.filePath);

        // Explicitly set Content-Type header if known so browser previews render appropriately
        if (document.fileType) {
            res.setHeader("Content-Type", document.fileType);
        }

        // Check if download is requested via query param
        if (req.query.download === "true") {
            return res.download(filePath, document.originalName);
        }

        // Inline preview delivery
        res.setHeader(
            "Content-Disposition",
            `inline; filename="${encodeURIComponent(document.originalName)}"`
        );

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
        const document = await Document.findOne({
            _id: req.params.id,
            uploadedBy: req.user.id
        });

        if (!document) {
            return res.status(404).json({
                message: "Document not found"
            });
        }

        // Delete the actual file
        if (fs.existsSync(document.filePath)) {
            fs.unlinkSync(document.filePath);
        }

        // Delete database record and associated chunk embeddings
        await Promise.all([
            Document.deleteOne({ _id: document._id }),
            ChunkEmbedding.deleteMany({ documentId: document._id })
        ]);

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

/* 
   ASK QUESTION (AI Q&A with grounded sources)
*/

const askQuestion = async (req, res) => {
    try {
        const question = (req.body.question || "").trim();
        const documentId = req.body.documentId || null; // Optional: restrict Q&A to a specific document

        if (!question) {
            return res.status(400).json({ message: "Question is required" });
        }

        // Verify user documents
        const filter = { uploadedBy: req.user.id };
        if (documentId) {
            filter._id = documentId;
        }

        const userDocs = await Document.find(filter);
        if (userDocs.length === 0) {
            return res.status(200).json({
                answer: "You have not uploaded any documents yet. Please upload documents first so I can answer your questions.",
                sources: []
            });
        }

        const userDocMap = new Map();
        userDocs.forEach(d => userDocMap.set(d._id.toString(), d));

        // Generate embedding for the question
        let queryEmbedding;
        try {
            queryEmbedding = await generateEmbedding(question);
        } catch (embErr) {
            console.warn("Question embedding failed, fallback to keyword matching:", embErr.message);
        }

        let relevantChunks = [];

        if (queryEmbedding) {
            // Find stored chunks for this user (and specific document if requested)
            const chunkFilter = { uploadedBy: req.user.id };
            if (documentId) {
                chunkFilter.documentId = documentId;
            }

            const storedChunks = await ChunkEmbedding.find(chunkFilter);

            if (storedChunks.length > 0) {
                const scored = [];
                for (const chunk of storedChunks) {
                    const score = cosineSimilarity(queryEmbedding, chunk.embedding);
                    if (score > 0.20) {
                        const doc = userDocMap.get(chunk.documentId.toString());
                        if (doc) {
                            scored.push({
                                document: doc,
                                chunkText: chunk.text,
                                chunkIndex: chunk.chunkIndex,
                                relevanceScore: Math.round(score * 100) / 100
                            });
                        }
                    }
                }
                scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
                relevantChunks = scored.slice(0, 5); // Take top 5 most relevant chunks as grounded context
            }
        }

        // Keyword fallback if no vector chunks matched
        if (relevantChunks.length === 0) {
            const words = question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
            for (const doc of userDocs) {
                if (doc.chunks && doc.chunks.length > 0) {
                    for (let i = 0; i < doc.chunks.length; i++) {
                        const chunk = doc.chunks[i];
                        const lowerChunk = chunk.toLowerCase();
                        const matchCount = words.filter(w => lowerChunk.includes(w)).length;
                        if (matchCount > 0) {
                            relevantChunks.push({
                                document: doc,
                                chunkText: chunk,
                                chunkIndex: i,
                                relevanceScore: Math.min(0.5, matchCount * 0.1)
                            });
                        }
                    }
                }
            }
            relevantChunks.sort((a, b) => b.relevanceScore - a.relevanceScore);
            relevantChunks = relevantChunks.slice(0, 4);
        }

        // Pass retrieved context to Gemini
        const result = await answerQuestionWithContext(question, relevantChunks);

        res.status(200).json(result);
    } catch (error) {
        console.error("Ask question error:", error.message);
        res.status(500).json({ message: error.message || "Failed to process question." });
    }
};

/* 
   SUMMARIZE DOCUMENT
*/

const getDocumentSummary = async (req, res) => {
    try {
        const document = await Document.findOne({
            _id: req.params.id,
            uploadedBy: req.user.id
        });

        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        // Return cached summary if already generated and refresh isn't forced
        if (document.summary && req.query.refresh !== "true") {
            return res.status(200).json({
                summary: document.summary,
                cached: true,
                documentId: document._id
            });
        }

        if (!document.extractedText || document.extractedText.trim().length < 50) {
            return res.status(400).json({
                message: "Document does not have sufficient extracted text to generate a summary."
            });
        }

        const summary = await summarizeDocument(document.extractedText, document.chunks || []);

        // Persist summary in MongoDB to avoid repeat API usage
        document.summary = summary;
        await document.save();

        res.status(200).json({
            summary,
            cached: false,
            documentId: document._id
        });
    } catch (error) {
        console.error("Document summarization error:", error.message);
        res.status(500).json({ message: error.message || "Failed to generate document summary." });
    }
};

/* 
   TAG MANAGEMENT
*/

// Update/Add/Remove tags for a document
const updateDocumentTags = async (req, res) => {
    try {
        const { tags } = req.body;
        if (!Array.isArray(tags)) {
            return res.status(400).json({ message: "Tags must be an array of strings" });
        }

        const document = await Document.findOne({
            _id: req.params.id,
            uploadedBy: req.user.id
        });

        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        // Clean & deduplicate tags
        const cleanTags = [];
        const seen = new Set();
        for (const t of tags) {
            const trimmed = String(t || "").trim();
            if (trimmed && !seen.has(trimmed.toLowerCase())) {
                seen.add(trimmed.toLowerCase());
                cleanTags.push(trimmed);
            }
        }

        document.tags = cleanTags;
        await document.save();

        res.status(200).json({
            message: "Tags updated successfully",
            tags: document.tags,
            documentId: document._id
        });
    } catch (error) {
        console.error("Update document tags error:", error.message);
        res.status(500).json({ message: "Server error updating tags" });
    }
};

// Generate tags on demand via AI
const autoTagDocument = async (req, res) => {
    try {
        const document = await Document.findOne({
            _id: req.params.id,
            uploadedBy: req.user.id
        });

        if (!document) {
            return res.status(404).json({ message: "Document not found" });
        }

        const tags = await generateDocumentTags(document.originalName, document.extractedText || "");

        // Merge with existing tags avoiding duplicates
        const seen = new Set((document.tags || []).map(t => t.toLowerCase()));
        const merged = [...(document.tags || [])];
        for (const t of tags) {
            if (!seen.has(t.toLowerCase())) {
                seen.add(t.toLowerCase());
                merged.push(t);
            }
        }

        document.tags = merged;
        await document.save();

        res.status(200).json({
            message: "Document tagged successfully",
            tags: document.tags,
            documentId: document._id
        });
    } catch (error) {
        console.error("Auto tag document error:", error.message);
        res.status(500).json({ message: "Server error generating tags" });
    }
};

// Get all unique tags for the logged-in user
const getUserTags = async (req, res) => {
    try {
        const docs = await Document.find({ uploadedBy: req.user.id }, "tags");
        const tagCounts = {};

        for (const doc of docs) {
            if (Array.isArray(doc.tags)) {
                for (const t of doc.tags) {
                    tagCounts[t] = (tagCounts[t] || 0) + 1;
                }
            }
        }

        const uniqueTags = Object.keys(tagCounts).map(name => ({
            name,
            count: tagCounts[name]
        })).sort((a, b) => b.count - a.count);

        res.status(200).json({ tags: uniqueTags });
    } catch (error) {
        console.error("Get user tags error:", error.message);
        res.status(500).json({ message: "Server error getting tags" });
    }
};

module.exports = {
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
};
