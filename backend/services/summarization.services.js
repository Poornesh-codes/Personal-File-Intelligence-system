/**
 * Document Summarization Service
 * Supports short and long documents using chunk-based map-reduce summarization.
 */

const { callGeminiGenerate } = require("./qa.services");

/**
 * Summarizes document text.
 * - Handles insufficient text gracefully.
 * - For short documents (<= 2 chunks), generates a direct concise summary.
 * - For long documents (> 2 chunks), summarizes chunks in batches and synthesizes into a cohesive final summary.
 *
 * @param {string} fullText
 * @param {string[]} chunks
 * @returns {Promise<string>}
 */
async function summarizeDocument(fullText, chunks = []) {
  const cleanText = (fullText || "").trim();

  if (!cleanText || cleanText.length < 50) {
    throw new Error("Document does not contain sufficient text for meaningful summarization.");
  }

  const systemInstruction = `You are FileMind's Document Summarizer.
Your goal is to provide a clear, accurate, and structured summary of the document.
Format your output with:
- **Overview**: A high-level 2-3 sentence synopsis.
- **Key Takeaways**: Bullet points highlighting core concepts, facts, or decisions.
- **Conclusion**: A 1-2 sentence concluding synthesis if applicable.
Do not invent facts outside the text.`;

  // Short document: direct summarization
  if (!chunks || chunks.length <= 2) {
    const textToSummarize = cleanText.slice(0, 6000);
    const prompt = `Please summarize the following document:\n\n${textToSummarize}`;
    return await callGeminiGenerate(systemInstruction, prompt);
  }

  // Long document: Map-Reduce processing
  // Step 1: Map - summarize chunk groups (take up to 6 representative chunks across document)
  const step = Math.max(1, Math.floor(chunks.length / 6));
  const selectedChunks = [];
  for (let i = 0; i < chunks.length && selectedChunks.length < 6; i += step) {
    selectedChunks.push(chunks[i]);
  }

  const chunkSummaries = [];
  for (let idx = 0; idx < selectedChunks.length; idx++) {
    const chunkPrompt = `Summarize the key information from this section in 2-3 concise sentences:\n\n${selectedChunks[idx]}`;
    try {
      const partSummary = await callGeminiGenerate(
        "You are an assistant summarizing a document section concisely. Keep it under 50 words.",
        chunkPrompt
      );
      chunkSummaries.push(`Section ${idx + 1}: ${partSummary}`);
    } catch (chunkErr) {
      console.warn(`Summarizing section ${idx + 1} skipped:`, chunkErr.message);
    }
  }

  if (chunkSummaries.length === 0) {
    // Fallback: summarize the first 5000 characters directly
    const prompt = `Please summarize the following document:\n\n${cleanText.slice(0, 5000)}`;
    return await callGeminiGenerate(systemInstruction, prompt);
  }

  // Step 2: Reduce - synthesize the sectional summaries into the final structured summary
  const finalPrompt = `Below are summaries of the key sections of a multi-page document:\n\n${chunkSummaries.join("\n\n")}\n\nPlease synthesize these sections into one cohesive, well-structured document summary.`;
  return await callGeminiGenerate(systemInstruction, finalPrompt);
}

module.exports = {
  summarizeDocument
};
