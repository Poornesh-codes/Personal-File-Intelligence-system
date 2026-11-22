/**
 * Automatic Document Tagging Service
 * Extracts relevant topic tags from document content and filenames.
 */

const { callGeminiGenerate } = require("./qa.services");

/**
 * Extracts 3-6 concise, descriptive topic tags from document content.
 * @param {string} title
 * @param {string} text
 * @returns {Promise<string[]>}
 */
async function generateDocumentTags(title, text) {
  const cleanTitle = (title || "").trim();
  const cleanText = (text || "").trim();

  // If text is minimal, extract from title
  if (!cleanText || cleanText.length < 30) {
    const extRegex = /\.[a-zA-Z0-9]+$/;
    const baseName = cleanTitle.replace(extRegex, "").replace(/[_-]/g, " ").trim();
    return baseName ? [baseName] : [];
  }

  const promptText = `Extract 3 to 6 concise, relevant topic tags for the document below.
Document Title: "${cleanTitle}"
Document Excerpt:
"${cleanText.slice(0, 3000)}"

Instructions:
- Return ONLY a comma-separated list of tags (e.g., Operating Systems, Memory Management, CPU Scheduling).
- Keep each tag between 1 to 4 words.
- Do not add numbers, bullets, or extra text.`;

  try {
    const rawResult = await callGeminiGenerate(
      "You are a document categorization assistant. Return only a comma-separated list of clean topic tags.",
      promptText
    );

    const tags = rawResult
      .split(/[,;\n]/)
      .map((t) => t.replace(/^[0-9-.*•\s]+/, "").trim())
      .filter((t) => t.length > 1 && t.length < 40);

    // Deduplicate case-insensitively
    const seen = new Set();
    const uniqueTags = [];
    for (const tag of tags) {
      const lower = tag.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        uniqueTags.push(tag);
      }
    }

    return uniqueTags.slice(0, 6);
  } catch (err) {
    console.warn("AI tag generation failed, falling back to title keywords:", err.message);
    const words = cleanTitle.replace(/\.[^/.]+$/, "").split(/[\s-_]+/).filter(w => w.length > 3);
    return words.slice(0, 4);
  }
}

module.exports = {
  generateDocumentTags
};
