
const chunkText = (text, chunkSize = 1000, overlap = 200) => {
  if (!text || !text.trim()) {
    return [];
  }

  if (overlap < 0 || overlap >= chunkSize) {
    throw new Error("Overlap must be non-negative and smaller than chunk size");
  }

  const chunks = [];
  const cleanText = text.replace(/\s+/g, " ").trim();

  let start = 0;

  while (start < cleanText.length) {
    const end = Math.min(start + chunkSize, cleanText.length);
    const chunk = cleanText.slice(start, end).trim();

    if (chunk) {
      chunks.push(chunk);
    }

    if (end === cleanText.length) {
      break;
    }

    start += chunkSize - overlap;
  }

  return chunks;
};

module.exports = chunkText;
