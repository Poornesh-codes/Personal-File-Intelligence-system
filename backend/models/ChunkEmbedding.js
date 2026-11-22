const mongoose = require("mongoose");

const chunkEmbeddingSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    chunkIndex: {
      type: Number,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient user-level document vector queries
chunkEmbeddingSchema.index({ uploadedBy: 1, documentId: 1 });

module.exports = mongoose.model("ChunkEmbedding", chunkEmbeddingSchema);
