const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

const extractText = async (filePath) => {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".pdf") {
    const buffer = fs.readFileSync(filePath);
    const result = await pdfParse(buffer);
    return result.text;
  }

  if (extension === ".docx") {
    const result = await mammoth.extractRawText({
      path: filePath
    });
    return result.value;
  }

  if (extension === ".txt") {
    return fs.readFileSync(filePath, "utf8");
  }

  throw new Error("Unsupported file type");
};

module.exports = extractText;