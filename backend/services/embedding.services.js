/**
 * Modular Embedding Service
 * Easily plug in Google Gemini, OpenAI, or other providers without rewriting application code.
 */

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta";
const EMBEDDING_MODEL = "models/gemini-embedding-001";

/**
 * Calculates cosine similarity between two equal-length numerical vectors.
 * Returns a value between -1 and 1 (typically 0 to 1 for normalized embeddings).
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Generates an embedding for a single text string.
 * @param {string} text
 * @returns {Promise<number[]>}
 */
async function generateEmbedding(text) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in backend environment.");
  }

  if (!text || !text.trim()) {
    throw new Error("Cannot generate embedding for empty text.");
  }

  const url = `${GEMINI_API_URL}/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      content: {
        parts: [{ text: text.slice(0, 8000) }] // Ensure safe character limit
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Failed to generate embedding from Gemini API.");
  }

  if (!data.embedding?.values) {
    throw new Error("No embedding values returned by Gemini API.");
  }

  return data.embedding.values;
}

/**
 * Generates embeddings for an array of text chunks in batches.
 * @param {string[]} chunks
 * @param {number} batchSize
 * @returns {Promise<Array<number[]>>}
 */
async function generateBatchEmbeddings(chunks, batchSize = 10) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in backend environment.");
  }

  if (!Array.isArray(chunks) || chunks.length === 0) {
    return [];
  }

  const allEmbeddings = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const chunkBatch = chunks.slice(i, i + batchSize);

    const requests = chunkBatch.map((text) => ({
      model: EMBEDDING_MODEL,
      content: {
        parts: [{ text: (text || "").slice(0, 8000) }]
      }
    }));

    const url = `${GEMINI_API_URL}/${EMBEDDING_MODEL}:batchEmbedContents?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requests })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Failed to generate batch embeddings from Gemini API.");
    }

    if (!Array.isArray(data.embeddings)) {
      throw new Error("Invalid batch embedding response from Gemini API.");
    }

    for (const item of data.embeddings) {
      allEmbeddings.push(item.values);
    }
  }

  return allEmbeddings;
}

module.exports = {
  generateEmbedding,
  generateBatchEmbeddings,
  cosineSimilarity,
};
