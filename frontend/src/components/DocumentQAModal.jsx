import React, { useState } from "react";
import "./DocumentQAModal.css";
import API_URL from "../services/api";

export default function DocumentQAModal({ documents = [], onClose, onPreviewDoc }) {
  const [question, setQuestion] = useState("");
  const [selectedDocId, setSelectedDocId] = useState("");
  const [conversation, setConversation] = useState([]);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  async function handleSubmit(e) {
    e.preventDefault();
    const cleanQuestion = question.trim();
    if (!cleanQuestion || asking) return;

    setError("");
    setAsking(true);
    setQuestion("");

    const newQueryItem = {
      type: "user",
      text: cleanQuestion,
      timestamp: new Date()
    };

    setConversation((prev) => [...prev, newQueryItem]);

    try {
      const response = await fetch(`${API_URL}/api/documents/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          question: cleanQuestion,
          documentId: selectedDocId || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to generate answer.");
      }

      const answerItem = {
        type: "ai",
        answer: data.answer,
        sources: data.sources || [],
        timestamp: new Date()
      };

      setConversation((prev) => [...prev, answerItem]);
    } catch (err) {
      setError(err.message || "Could not retrieve answer from AI service.");
      const errorItem = {
        type: "ai-error",
        text: err.message || "An error occurred while answering your question.",
        timestamp: new Date()
      };
      setConversation((prev) => [...prev, errorItem]);
    } finally {
      setAsking(false);
    }
  }

  function handleOpenSource(source) {
    if (!source.documentId) return;
    const foundDoc = documents.find((d) => d._id === source.documentId);
    if (foundDoc && onPreviewDoc) {
      onPreviewDoc(foundDoc);
    }
  }

  return (
    <div className="fm-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="fm-qa-modal-container" onClick={(e) => e.stopPropagation()}>
        <header className="fm-qa-modal-header">
          <div className="fm-qa-header-title">
            <span className="fm-qa-icon">✦</span>
            <div>
              <h3>AI Document Assistant</h3>
              <p>Ask questions grounded directly in your uploaded notes and files</p>
            </div>
          </div>
          <button type="button" className="fm-btn-close" onClick={onClose} aria-label="Close Assistant">
            ✕
          </button>
        </header>

        <div className="fm-qa-filter-bar">
          <label htmlFor="fm-qa-doc-select">Scope:</label>
          <select
            id="fm-qa-doc-select"
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
          >
            <option value="">All uploaded documents ({documents.length})</option>
            {documents.map((d) => (
              <option key={d._id} value={d._id}>
                {d.originalName}
              </option>
            ))}
          </select>
        </div>

        <main className="fm-qa-messages-area">
          {conversation.length === 0 ? (
            <div className="fm-qa-welcome-prompt">
              <span className="fm-qa-welcome-icon">💬</span>
              <h4>Ask anything about your documents</h4>
              <p>
                FileMind retrieves the most relevant chunks from your files and synthesizes a direct answer with transparent source citations.
              </p>
              <div className="fm-qa-suggestions">
                <button
                  type="button"
                  onClick={() => setQuestion("What are the main concepts covered in my documents?")}
                >
                  "What are the main concepts covered in my documents?"
                </button>
                <button
                  type="button"
                  onClick={() => setQuestion("Summarize the key takeaways from my notes.")}
                >
                  "Summarize the key takeaways from my notes."
                </button>
              </div>
            </div>
          ) : (
            <div className="fm-qa-chat-list">
              {conversation.map((msg, index) => (
                <div key={index} className={`fm-qa-bubble fm-qa-${msg.type}`}>
                  {msg.type === "user" ? (
                    <div className="fm-qa-user-text">{msg.text}</div>
                  ) : msg.type === "ai-error" ? (
                    <div className="fm-qa-error-text">⚠️ {msg.text}</div>
                  ) : (
                    <div className="fm-qa-ai-content">
                      <div className="fm-qa-answer-text">{msg.answer}</div>
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="fm-qa-sources-section">
                          <strong>Sources:</strong>
                          <div className="fm-qa-source-tags">
                            {msg.sources.map((src, sIdx) => (
                              <button
                                key={sIdx}
                                type="button"
                                className="fm-qa-source-pill"
                                onClick={() => handleOpenSource(src)}
                                title={`Click to preview: ${src.excerpt}`}
                              >
                                <span className="fm-qa-src-file">📄 {src.documentName}</span>
                                <span className="fm-qa-src-chunk">Chunk {src.chunkIndex + 1}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {asking && (
                <div className="fm-qa-bubble fm-qa-ai fm-qa-typing">
                  <span className="fm-spinner" />
                  <span>Reading document chunks & formulating grounded answer…</span>
                </div>
              )}
            </div>
          )}
        </main>

        {error && <div className="fm-alert fm-alert-error fm-qa-alert">{error}</div>}

        <footer className="fm-qa-footer">
          <form onSubmit={handleSubmit} className="fm-qa-input-form">
            <input
              type="text"
              placeholder="Ask a question about your files…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={asking}
              autoFocus
            />
            <button
              type="submit"
              disabled={asking || !question.trim()}
              className="fm-qa-send-btn"
            >
              {asking ? "Thinking…" : "Ask"}
            </button>
          </form>
        </footer>
      </div>
    </div>
  );
}
