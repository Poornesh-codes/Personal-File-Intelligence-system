import React, { useState, useEffect } from "react";
import "./DocumentSummaryModal.css";
import API_URL from "../services/api";

function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentSummaryModal({ document, onClose, onOpenPreview }) {
  const [summary, setSummary] = useState(document.summary || "");
  const [loading, setLoading] = useState(!document.summary);
  const [isCached, setIsCached] = useState(!!document.summary);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    let active = true;

    async function fetchSummary(forceRefresh = false) {
      if (document.summary && !forceRefresh) {
        setSummary(document.summary);
        setIsCached(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const query = forceRefresh ? "?refresh=true" : "";
        const response = await fetch(`${API_URL}/api/documents/${document._id}/summary${query}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to generate summary.");
        }

        if (active) {
          setSummary(data.summary);
          setIsCached(data.cached);
          document.summary = data.summary; // update in-memory object
        }
      } catch (err) {
        if (active) {
          setError(err.message || "Could not generate summary.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchSummary();

    return () => {
      active = false;
    };
  }, [document, token]);

  return (
    <div className="fm-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="fm-summary-modal-container" onClick={(e) => e.stopPropagation()}>
        <header className="fm-summary-header">
          <div className="fm-summary-title-area">
            <span className="fm-summary-badge">📝 Summary</span>
            <div>
              <h3 title={document.originalName}>{document.originalName}</h3>
              <p>
                {formatBytes(document.fileSize)} • {document.chunks?.length || 0} chunks extracted
                {isCached && <span className="fm-cached-badge">Cached</span>}
              </p>
            </div>
          </div>
          <button type="button" className="fm-btn-close" onClick={onClose} aria-label="Close Summary">
            ✕
          </button>
        </header>

        <main className="fm-summary-body">
          {loading ? (
            <div className="fm-summary-loading">
              <span className="fm-spinner" />
              <h4>Generating Intelligent Summary…</h4>
              <p>Reading extracted text chunks and synthesizing key takeaways via Gemini AI</p>
            </div>
          ) : error ? (
            <div className="fm-summary-error">
              <span className="fm-error-icon">⚠️</span>
              <p>{error}</p>
              <button
                type="button"
                className="fm-btn-retry"
                onClick={() => {
                  setError("");
                  setLoading(true);
                  fetch(`${API_URL}/api/documents/${document._id}/summary?refresh=true`, {
                    headers: { Authorization: `Bearer ${token}` }
                  })
                    .then((res) => res.json())
                    .then((data) => {
                      if (data.summary) {
                        setSummary(data.summary);
                        document.summary = data.summary;
                      } else {
                        setError(data.message || "Failed to generate summary");
                      }
                    })
                    .catch((e) => setError(e.message))
                    .finally(() => setLoading(false));
                }}
              >
                Retry Summarization
              </button>
            </div>
          ) : (
            <div className="fm-summary-content">
              <div className="fm-summary-markdown">
                {summary.split("\n\n").map((paragraph, pIdx) => {
                  if (paragraph.startsWith("- ") || paragraph.startsWith("* ")) {
                    const items = paragraph.split("\n").filter((l) => l.trim().length > 0);
                    return (
                      <ul key={pIdx}>
                        {items.map((it, iIdx) => (
                          <li key={iIdx}>{it.replace(/^[-*]\s+/, "")}</li>
                        ))}
                      </ul>
                    );
                  }
                  return <p key={pIdx}>{paragraph}</p>;
                })}
              </div>
            </div>
          )}
        </main>

        <footer className="fm-summary-footer">
          <div className="fm-summary-footer-left">
            {onOpenPreview && (
              <button
                type="button"
                className="fm-btn-secondary"
                onClick={() => onOpenPreview(document)}
              >
                Preview Full Document
              </button>
            )}
          </div>
          <button
            type="button"
            className="fm-btn-secondary"
            disabled={loading}
            onClick={() => {
              setLoading(true);
              setError("");
              fetch(`${API_URL}/api/documents/${document._id}/summary?refresh=true`, {
                headers: { Authorization: `Bearer ${token}` }
              })
                .then((res) => res.json())
                .then((data) => {
                  if (data.summary) {
                    setSummary(data.summary);
                    setIsCached(false);
                    document.summary = data.summary;
                  } else {
                    setError(data.message || "Failed to regenerate");
                  }
                })
                .catch((e) => setError(e.message))
                .finally(() => setLoading(false));
            }}
            title="Re-run summarization using AI"
          >
            {loading ? "Regenerating…" : "🔄 Regenerate"}
          </button>
        </footer>
      </div>
    </div>
  );
}
