import React, { useState, useEffect } from "react";
import "./DocumentPreviewModal.css";
import API_URL from "../services/api";

function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value) {
  if (!value) return "Date unavailable";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fileKind(fileType = "", name = "") {
  const lowerName = name.toLowerCase();
  if (fileType.includes("pdf") || lowerName.endsWith(".pdf")) return "PDF";
  if (fileType.includes("word") || lowerName.endsWith(".docx")) return "DOCX";
  if (fileType.includes("text") || lowerName.endsWith(".txt")) return "TXT";
  return "FILE";
}

export default function DocumentPreviewModal({ document, onClose, onDownload }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [textContent, setTextContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [previewError, setPreviewError] = useState("");

  const kind = fileKind(document.fileType, document.originalName);
  const token = localStorage.getItem("token");

  useEffect(() => {
    let active = true;
    let createdUrl = null;

    async function fetchPreview() {
      setLoading(true);
      setPreviewError("");

      try {
        const response = await fetch(`${API_URL}/api/documents/${document._id}/file`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("Failed to load document content.");
        }

        if (kind === "PDF") {
          const blob = await response.blob();
          if (active) {
            createdUrl = URL.createObjectURL(blob);
            setBlobUrl(createdUrl);
          }
        } else if (kind === "TXT") {
          const text = await response.text();
          if (active) {
            setTextContent(text);
          }
        } else if (kind === "DOCX") {
          // If extracted text exists, display it as document text preview
          if (document.extractedText && document.extractedText.trim().length > 0) {
            setTextContent(document.extractedText);
          } else {
            const blob = await response.blob();
            if (active) {
              createdUrl = URL.createObjectURL(blob);
              setBlobUrl(createdUrl);
            }
          }
        }
      } catch (err) {
        if (active) {
          setPreviewError(err.message || "Failed to load document preview.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchPreview();

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [document, kind, token]);

  // Handle ESC key to close modal
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fm-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="fm-modal-container" onClick={(e) => e.stopPropagation()}>
        <header className="fm-modal-header">
          <div className="fm-modal-title-area">
            <span className={`fm-file-type fm-file-type-${kind.toLowerCase()}`}>{kind}</span>
            <div className="fm-modal-info">
              <h3 title={document.originalName}>{document.originalName}</h3>
              <div className="fm-modal-meta">
                <span>{formatBytes(document.fileSize)}</span>
                <span>•</span>
                <span>{document.fileType || "application/octet-stream"}</span>
                <span>•</span>
                <span>Uploaded {formatDate(document.createdAt)}</span>
              </div>
            </div>
          </div>
          <div className="fm-modal-actions">
            <button
              type="button"
              className="fm-btn-download"
              onClick={() => onDownload(document)}
              title="Download Document"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>Download</span>
            </button>
            <button
              type="button"
              className="fm-btn-close"
              onClick={onClose}
              aria-label="Close Preview"
            >
              ✕
            </button>
          </div>
        </header>

        <main className="fm-modal-body">
          {loading ? (
            <div className="fm-modal-loading">
              <span className="fm-spinner" />
              <span>Loading preview…</span>
            </div>
          ) : previewError ? (
            <div className="fm-modal-error">
              <p>{previewError}</p>
              <button type="button" className="fm-btn-download" onClick={() => onDownload(document)}>
                Download File Instead
              </button>
            </div>
          ) : kind === "PDF" && blobUrl ? (
            <iframe
              src={blobUrl}
              title={`Preview of ${document.originalName}`}
              className="fm-pdf-frame"
            />
          ) : kind === "TXT" ? (
            <div className="fm-txt-viewer">
              <pre>{textContent || "(Empty file)"}</pre>
            </div>
          ) : kind === "DOCX" ? (
            <div className="fm-docx-viewer">
              <div className="fm-docx-banner">
                <span>Showing extracted text content from Word document</span>
                <button type="button" className="fm-link-btn" onClick={() => onDownload(document)}>
                  Download original .docx
                </button>
              </div>
              <div className="fm-txt-viewer">
                <pre>{textContent || document.extractedText || "No text could be extracted from this document."}</pre>
              </div>
            </div>
          ) : (
            <div className="fm-unsupported-preview">
              <p>Direct preview is not available for this file type.</p>
              <button type="button" className="fm-btn-download" onClick={() => onDownload(document)}>
                Download {document.originalName}
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
