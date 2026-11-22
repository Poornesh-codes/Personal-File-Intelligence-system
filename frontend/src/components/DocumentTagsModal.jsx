import React, { useState } from "react";
import "./DocumentTagsModal.css";
import API_URL from "../services/api";

export default function DocumentTagsModal({ document, onClose, onTagsUpdated }) {
  const [tags, setTags] = useState(document.tags || []);
  const [newTagInput, setNewTagInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoTagging, setAutoTagging] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const token = localStorage.getItem("token");

  function handleAddTag(e) {
    e.preventDefault();
    const clean = newTagInput.trim();
    if (!clean) return;

    // Check duplicate case-insensitively
    if (tags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      setError("This tag is already added.");
      return;
    }

    const updated = [...tags, clean];
    setTags(updated);
    setNewTagInput("");
    setError("");
  }

  function handleRemoveTag(tagToRemove) {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  }

  async function handleSaveTags() {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_URL}/api/documents/${document._id}/tags`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ tags })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update tags.");
      }

      setSuccess("Tags saved successfully!");
      document.tags = data.tags;
      if (onTagsUpdated) {
        onTagsUpdated(document._id, data.tags);
      }
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setError(err.message || "Error saving tags.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAutoTag() {
    setAutoTagging(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_URL}/api/documents/${document._id}/tags/auto`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to auto-tag document.");
      }

      setTags(data.tags || []);
      document.tags = data.tags;
      setSuccess("Topics extracted and tags added via AI!");
      if (onTagsUpdated) {
        onTagsUpdated(document._id, data.tags);
      }
    } catch (err) {
      setError(err.message || "Could not auto-generate tags.");
    } finally {
      setAutoTagging(false);
    }
  }

  return (
    <div className="fm-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="fm-tags-modal-container" onClick={(e) => e.stopPropagation()}>
        <header className="fm-tags-header">
          <div className="fm-tags-title">
            <span className="fm-tags-badge">🏷️ Manage Tags</span>
            <div>
              <h3 title={document.originalName}>{document.originalName}</h3>
              <p>Organize, filter, and categorize your document</p>
            </div>
          </div>
          <button type="button" className="fm-btn-close" onClick={onClose} aria-label="Close Tags">
            ✕
          </button>
        </header>

        <main className="fm-tags-body">
          {error && <div className="fm-alert fm-alert-error">{error}</div>}
          {success && <div className="fm-alert fm-alert-success">{success}</div>}

          <div className="fm-tags-section">
            <div className="fm-tags-section-header">
              <label>Current Tags ({tags.length})</label>
              <button
                type="button"
                className="fm-btn-auto-tag"
                onClick={handleAutoTag}
                disabled={autoTagging}
                title="Use Gemini AI to extract topic tags automatically"
              >
                {autoTagging ? "Extracting Topics…" : "✦ Auto-Tag with AI"}
              </button>
            </div>

            <div className="fm-tags-list">
              {tags.length === 0 ? (
                <p className="fm-tags-empty">No tags assigned yet. Add some below or click "Auto-Tag with AI".</p>
              ) : (
                tags.map((tag, idx) => (
                  <span key={idx} className="fm-tag-chip">
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      aria-label={`Remove tag ${tag}`}
                      title="Remove tag"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          <form onSubmit={handleAddTag} className="fm-add-tag-form">
            <input
              type="text"
              placeholder="Add a custom tag (e.g., Computer Science, Invoices)…"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              maxLength={40}
            />
            <button type="submit" disabled={!newTagInput.trim()}>
              + Add Tag
            </button>
          </form>
        </main>

        <footer className="fm-tags-footer">
          <button type="button" className="fm-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="fm-btn-primary"
            onClick={handleSaveTags}
            disabled={loading}
          >
            {loading ? "Saving…" : "Save Tags"}
          </button>
        </footer>
      </div>
    </div>
  );
}
