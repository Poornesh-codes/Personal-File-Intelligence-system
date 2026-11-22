/**
 * Modular LLM Question-Answering Service
 * Grounded strictly in retrieved context chunks.
 */

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta";

// Models in order of fallback preference
const CANDIDATE_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-pro-latest"
];

/**
 * Calls Gemini generateContent with automatic retry and model fallback.
 */
async function callGeminiGenerate(systemInstruction, promptText) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in backend environment.");
  }

  let lastError = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `${GEMINI_API_URL}/models/${model}:generateContent?key=${apiKey}`;

      const payload = {
        contents: [
          {
            parts: [{ text: `${systemInstruction}\n\n${promptText}` }]
          }
        ],
        generationConfig: {
          temperature: 0.2, // Low temperature for high factual accuracy
          maxOutputTokens: 1024,
        }
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text.trim();
      }

      // If rate limited or unavailable, try next fallback candidate
      if (response.status === 429 || response.status === 503 || response.status === 404) {
        lastError = new Error(data.error?.message || `Model ${model} returned HTTP ${response.status}`);
        continue;
      }

      throw new Error(data.error?.message || `Gemini API returned status ${response.status}`);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("Failed to generate answer from all candidate models.");
}

/**
 * Answer a user question grounded STRICTLY in retrieved document chunks.
 * @param {string} question
 * @param {Array<{ document: object, chunkText: string, chunkIndex: number, relevanceScore: number }>} retrievedChunks
 * @returns {Promise<{ answer: string, sources: Array<{ documentId: string, documentName: string, chunkIndex: number, excerpt: string }> }>}
 */
async function answerQuestionWithContext(question, retrievedChunks) {
  if (!question || !question.trim()) {
    throw new Error("A valid question is required.");
  }

  // If no relevant chunks were retrieved
  if (!retrievedChunks || retrievedChunks.length === 0) {
    return {
      answer: "I could not find any relevant information in your uploaded documents to answer this question. Please ensure relevant documents have been uploaded and text extracted.",
      sources: []
    };
  }

  // Build context payload from chunks
  const formattedContext = retrievedChunks.map((chunk, index) => {
    const docName = chunk.document?.originalName || "Unknown Document";
    return `[Source ${index + 1} | File: "${docName}" | Chunk: ${chunk.chunkIndex}]:\n${chunk.chunkText}`;
  }).join("\n\n---\n\n");

  const systemInstruction = `You are FileMind, an AI document assistant that answers user questions based SOLELY and STRICTLY on the provided document excerpts.
CRITICAL RULES:
1. Ground your answer completely in the provided context below.
2. DO NOT make up facts or extrapolate beyond what is directly stated.
3. If the provided context does not contain enough information to fully or partially answer the question, explicitly state: "The uploaded documents do not contain sufficient information to answer this question."
4. Whenever referencing specific information, mention the source file name and chunk number if appropriate.`;

  const promptText = `CONTEXT FROM USER'S DOCUMENTS:\n\n${formattedContext}\n\nUSER QUESTION: ${question}\n\nANSWER:`;

  const rawAnswer = await callGeminiGenerate(systemInstruction, promptText);

  // Map sources for explicit UI citations and clickable document previews
  const sources = retrievedChunks.map(chunk => ({
    documentId: chunk.document?._id,
    documentName: chunk.document?.originalName || "Document",
    chunkIndex: chunk.chunkIndex,
    relevanceScore: chunk.relevanceScore,
    excerpt: chunk.chunkText.length > 220 ? chunk.chunkText.slice(0, 220) + "…" : chunk.chunkText
  }));

  return {
    answer: rawAnswer,
    sources
  };
}

module.exports = {
  answerQuestionWithContext,
  callGeminiGenerate
};
