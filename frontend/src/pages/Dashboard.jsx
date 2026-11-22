import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_URL from "../services/api";
import DocumentPreviewModal from "../components/DocumentPreviewModal";
import DocumentQAModal from "../components/DocumentQAModal";
import DocumentSummaryModal from "../components/DocumentSummaryModal";
import DocumentTagsModal from "../components/DocumentTagsModal";
import "./Dashboard.css";

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
  });
}

function fileKind(fileType = "", name = "") {
  const lowerName = name.toLowerCase();
  if (fileType.includes("pdf") || lowerName.endsWith(".pdf")) return "PDF";
  if (fileType.includes("word") || lowerName.endsWith(".docx")) return "DOCX";
  if (fileType.includes("text") || lowerName.endsWith(".txt")) return "TXT";
  return "FILE";
}

function Dashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [searchMode, setSearchMode] = useState("keyword"); // "keyword" or "semantic"
  const [semanticResults, setSemanticResults] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [previewDoc, setPreviewDoc] = useState(null);
  const [summaryDoc, setSummaryDoc] = useState(null);
  const [tagsDoc, setTagsDoc] = useState(null);
  const [selectedTag, setSelectedTag] = useState("");
  const [isQaOpen, setIsQaOpen] = useState(false);

  const allUserTags = useMemo(() => {
    const counts = {};
    for (const doc of documents) {
      if (Array.isArray(doc.tags)) {
        for (const t of doc.tags) {
          counts[t] = (counts[t] || 0) + 1;
        }
      }
    }
    return Object.keys(counts).map(name => ({ name, count: counts[name] })).sort((a, b) => b.count - a.count);
  }, [documents]);
  // "With extracted text" means the backend ran text extraction on upload.
  const withExtractedText = useMemo(
    () => documents.filter((d) => d.extractedText && d.extractedText.trim().length > 0).length,
    [documents]
  );

  const request = useCallback(async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/login", { replace: true });
      throw new Error("Your session expired. Please sign in again.");
    }
    if (!response.ok) throw new Error(data.message || "Request failed");
    return data;
  }, [navigate, token]);


  const loadDocuments = useCallback(async (searchTerm = "", mode = "keyword", tagFilter = "") => {
    setLoading(true);
    setError("");

    try {
      if (mode === "semantic" && searchTerm.trim()) {
        const data = await request(`${API_URL}/api/documents/semantic-search?q=${encodeURIComponent(searchTerm.trim())}`);
        setSemanticResults(Array.isArray(data.results) ? data.results : []);
      } else {
        setSemanticResults(null);
        const params = new URLSearchParams();
        if (searchTerm.trim()) params.append("search", searchTerm.trim());
        if (tagFilter.trim()) params.append("tag", tagFilter.trim());
        const query = params.toString() ? `?${params.toString()}` : "";

        const data = await request(`${API_URL}/api/documents${query}`);
        setDocuments(Array.isArray(data.documents) ? data.documents : []);
      }
    } catch (err) {
      setError(err.message || "Could not complete search.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    if (!token) {
      navigate("/login", { replace: true });
    }
  }, [token, navigate]);

  useEffect(() => {
    if (!token) return;

    const timer = window.setTimeout(() => {
      loadDocuments(search, searchMode, selectedTag);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [token, search, searchMode, selectedTag, loadDocuments]);


  async function handleUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx", "txt"].includes(extension)) {
      setError("Please upload a PDF, DOCX or TXT file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    setError("");
    setNotice("");
    try {
      const data = await request(`${API_URL}/api/documents/upload`, {
        method: "POST",
        body: formData,
      });
      setNotice(data.message || "Document uploaded.");
      await loadDocuments();
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(fileRecord) {
    const confirmed = window.confirm(
      `Delete "${fileRecord.originalName}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    setError("");
    setNotice("");
    try {
      const data = await request(`${API_URL}/api/documents/${fileRecord._id}`, {
        method: "DELETE",
      });
      setDocuments((current) => current.filter((item) => item._id !== fileRecord._id));
      setNotice(data.message || "Document deleted.");
    } catch (err) {
      setError(err.message || "Could not delete document.");
    }
  }

  async function handleDownload(fileRecord) {
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/documents/${fileRecord._id}/file?download=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
        return;
      }
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Could not download this document.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = objectUrl;
      link.download = fileRecord.originalName;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch (err) {
      setError(err.message || "Could not download this document.");
    }
  }

  function handlePreview(fileRecord) {
    setPreviewDoc(fileRecord);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }

  if (!token) return null;

  return (
    <main className="fm-dashboard">
      <header className="fm-topbar">
        <div className="fm-brand">
          <span className="fm-brand-mark">F</span>
          <span>FileMind</span>
        </div>
        <div className="fm-account">
          <span className="fm-avatar">
            {(user.name || user.email || "U").slice(0, 1).toUpperCase()}
          </span>
          <span className="fm-account-name">{user.name || user.email || "Your account"}</span>
          <button className="fm-logout" type="button" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <section className="fm-content">
        <div className="fm-welcome">
          <div>
            <p className="fm-eyebrow">YOUR PERSONAL KNOWLEDGE SPACE</p>
            <h1>Good to see you{user.name ? `, ${user.name.split(" ")[0]}` : ""}.</h1>
            <p className="fm-subtitle">
              Upload, search, and explore your personal documents. Text extraction and keyword search are active.
            </p>
          </div>
          <div className="fm-welcome-actions">
            <button
              type="button"
              className="fm-ask-ai-btn"
              onClick={() => setIsQaOpen(true)}
              title="Ask AI questions about your documents"
            >
              <span className="fm-ai-star">✦</span>
              <span>Ask Document AI</span>
            </button>
            <label className={`fm-upload-button ${uploading ? "is-disabled" : ""}`}>
              <span>{uploading ? "Uploading…" : "+ Upload document"}</span>
              <input
                type="file"
                accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        <div className="fm-stats">
          <article className="fm-stat-card">
            <span className="fm-stat-icon">▤</span>
            <p>Total documents</p>
            <strong>{documents.length}</strong>
          </article>
          <article className="fm-stat-card">
            <span className="fm-stat-icon fm-stat-icon-purple">⌕</span>
            <p>Content-searchable</p>
            <strong>{withExtractedText}</strong>
            <small>Keyword search across full text</small>
          </article>
          <article className="fm-stat-card">
            <span className="fm-stat-icon fm-stat-icon-green">✦</span>
            <p>AI-ready index</p>
            <strong>{withExtractedText > 0 ? withExtractedText : "—"}</strong>
            <small>Semantic vector search active</small>
          </article>
        </div>

        {notice && <div className="fm-alert fm-alert-success" role="status">{notice}</div>}
        {error && <div className="fm-alert fm-alert-error" role="alert">{error}</div>}

        <section className="fm-library">
          <div className="fm-library-head">
            <div>
              <h2>{searchMode === "semantic" && search.trim() ? "Semantic Search Results" : "Your documents"}</h2>
              <p>
                {searchMode === "semantic" && search.trim()
                  ? "Ranked by semantic meaning & conceptual relevance"
                  : "Files uploaded to your FileMind workspace"}
              </p>
            </div>
            <div className="fm-search-bar-container">
              <div className="fm-search-mode-toggle" role="radiogroup" aria-label="Search Mode">
                <button
                  type="button"
                  className={`fm-toggle-btn ${searchMode === "keyword" ? "is-active" : ""}`}
                  onClick={() => setSearchMode("keyword")}
                  title="Search by exact keywords across filename & content"
                >
                  Keyword
                </button>
                <button
                  type="button"
                  className={`fm-toggle-btn ${searchMode === "semantic" ? "is-active" : ""}`}
                  onClick={() => setSearchMode("semantic")}
                  title="Search by concept & meaning via Gemini embeddings"
                >
                  ✦ Semantic
                </button>
              </div>
              <label className="fm-search">
                <span aria-hidden="true">{searchMode === "semantic" ? "✦" : "⌕"}</span>
                <input
                  type="search"
                  placeholder={
                    searchMode === "semantic"
                      ? "Search by meaning (e.g., 'concept of memory management')…"
                      : "Search filenames and content…"
                  }
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  aria-label="Search documents"
                />
              </label>
            </div>
          </div>

          {allUserTags.length > 0 && (
            <div className="fm-tag-filter-bar">
              <span className="fm-filter-label">Filter by tag:</span>
              <button
                type="button"
                className={`fm-filter-chip ${selectedTag === "" ? "is-active" : ""}`}
                onClick={() => setSelectedTag("")}
              >
                All ({documents.length})
              </button>
              {allUserTags.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  className={`fm-filter-chip ${selectedTag === t.name ? "is-active" : ""}`}
                  onClick={() => setSelectedTag(selectedTag === t.name ? "" : t.name)}
                >
                  #{t.name} ({t.count})
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div className="fm-empty"><span className="fm-spinner" />Searching documents…</div>
          ) : searchMode === "semantic" && search.trim() && Array.isArray(semanticResults) ? (
            semanticResults.length === 0 ? (
              <div className="fm-empty">
                <div className="fm-empty-icon">✦</div>
                <h3>No relevant semantic matches found</h3>
                <p>Try rephrasing your search query or switch to Keyword mode.</p>
              </div>
            ) : (
              <div className="fm-document-list">
                {semanticResults.map((result, idx) => {
                  const doc = result.document;
                  const kind = fileKind(doc.fileType, doc.originalName);
                  const relevancePercent = Math.round(result.relevanceScore * 100);

                  return (
                    <article className="fm-document-row fm-semantic-row" key={`${doc._id}-${result.chunkIndex || idx}`}>
                      <div className={`fm-file-type fm-file-type-${kind.toLowerCase()}`}>{kind}</div>
                      <div className="fm-file-main">
                        <div className="fm-semantic-header">
                          <strong title={doc.originalName}>{doc.originalName}</strong>
                          <span className="fm-relevance-pill" title="Cosine similarity score">
                            {result.isFallback ? "Keyword Match" : `${relevancePercent}% Match`}
                          </span>
                        </div>
                        {result.chunkText && (
                          <p className="fm-semantic-excerpt">
                            "{result.chunkText}"
                          </p>
                        )}
                        <span>{formatBytes(doc.fileSize)} · Uploaded {formatDate(doc.createdAt)}</span>
                      </div>
                      <div className="fm-file-actions">
                        <button type="button" onClick={() => handlePreview(doc)}>Preview</button>
                        <button type="button" onClick={() => setSummaryDoc(doc)} title="Summarize document via AI">Summary</button>
                        <button type="button" onClick={() => handleDownload(doc)}>Download</button>
                        <button type="button" className="fm-delete-button" onClick={() => handleDelete(doc)}>Delete</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )
          ) : documents.length === 0 ? (
            <div className="fm-empty">
              <div className="fm-empty-icon">▤</div>
              <h3>{search ? "No matching documents" : "Your library is empty"}</h3>
              <p>{search ? "Try another word or phrase from a document" : "Upload a PDF, DOCX or TXT file to get started."}</p>
            </div>
          ) : (
            <div className="fm-document-list">
              {documents.map((fileRecord) => {
                const kind = fileKind(fileRecord.fileType, fileRecord.originalName);
                return (
                  <article className="fm-document-row" key={fileRecord._id}>
                    <div className={`fm-file-type fm-file-type-${kind.toLowerCase()}`}>{kind}</div>
                    <div className="fm-file-main">
                      <strong title={fileRecord.originalName}>{fileRecord.originalName}</strong>
                      {fileRecord.tags && fileRecord.tags.length > 0 && (
                        <div className="fm-file-tags-preview">
                          {fileRecord.tags.slice(0, 3).map((t, idx) => (
                            <span key={idx} className="fm-inline-tag" onClick={(e) => { e.stopPropagation(); setSelectedTag(t); }}>
                              #{t}
                            </span>
                          ))}
                          {fileRecord.tags.length > 3 && (
                            <span className="fm-inline-tag-more">+{fileRecord.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                      <span>{formatBytes(fileRecord.fileSize)} · Uploaded {formatDate(fileRecord.createdAt)}</span>
                    </div>
                    <span className="fm-file-status">
                      {fileRecord.extractedText && fileRecord.extractedText.trim().length > 0
                        ? "Text extracted"
                        : "Stored"}
                    </span>
                    <div className="fm-file-actions">
                      <button type="button" onClick={() => handlePreview(fileRecord)}>Preview</button>
                      <button type="button" onClick={() => setSummaryDoc(fileRecord)} title="Summarize document via AI">Summary</button>
                      <button type="button" onClick={() => setTagsDoc(fileRecord)} title="Manage document tags">
                        Tags {fileRecord.tags?.length > 0 ? `(${fileRecord.tags.length})` : ""}
                      </button>
                      <button type="button" onClick={() => handleDownload(fileRecord)}>Download</button>
                      <button type="button" className="fm-delete-button" onClick={() => handleDelete(fileRecord)}>Delete</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <p className="fm-next-note">
          <strong>Search modes:</strong> Use <strong>Keyword</strong> for exact term matching or <strong>Semantic</strong> to find documents by conceptual meaning via AI embeddings.
        </p>

        {previewDoc && (
          <DocumentPreviewModal
            document={previewDoc}
            onClose={() => setPreviewDoc(null)}
            onDownload={handleDownload}
          />
        )}

        {summaryDoc && (
          <DocumentSummaryModal
            document={summaryDoc}
            onClose={() => setSummaryDoc(null)}
            onOpenPreview={(doc) => {
              setSummaryDoc(null);
              setPreviewDoc(doc);
            }}
          />
        )}

        {tagsDoc && (
          <DocumentTagsModal
            document={tagsDoc}
            onClose={() => setTagsDoc(null)}
            onTagsUpdated={(docId, newTags) => {
              setDocuments((prev) =>
                prev.map((d) => (d._id === docId ? { ...d, tags: newTags } : d))
              );
            }}
          />
        )}

        {isQaOpen && (
          <DocumentQAModal
            documents={documents}
            onClose={() => setIsQaOpen(false)}
            onPreviewDoc={(doc) => {
              setIsQaOpen(false);
              setPreviewDoc(doc);
            }}
          />
        )}
      </section>
    </main>
  );
}

export default Dashboard;
