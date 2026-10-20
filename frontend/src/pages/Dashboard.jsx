import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_URL from "../services/api";
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
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

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


  const loadDocuments = useCallback(async (searchTerm = "") => {
  setLoading(true);
  setError("");

  try {
    const query = searchTerm.trim()
      ? `?search=${encodeURIComponent(searchTerm.trim())}`
      : "";

    const data = await request(`${API_URL}/api/documents${query}`);
    setDocuments(Array.isArray(data.documents) ? data.documents : []);
  } catch (err) {
    setError(err.message || "Could not load your documents.");
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
      loadDocuments(search);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [token, search, loadDocuments]);


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

  async function handleOpen(fileRecord) {
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/documents/${fileRecord._id}/file`, {
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
        throw new Error(data.message || "Could not open this document.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const opened = window.open(objectUrl, "_blank", "noopener,noreferrer");
      if (!opened) {
        const link = window.document.createElement("a");
        link.href = objectUrl;
        link.download = fileRecord.originalName;
        window.document.body.appendChild(link);
        link.click();
        link.remove();
      }
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch (err) {
      setError(err.message || "Could not open this document.");
    }
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
              Keep your documents together. Intelligence features are the next step.
            </p>
          </div>
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

        <div className="fm-stats">
          <article className="fm-stat-card">
            <span className="fm-stat-icon">▤</span>
            <p>Total documents</p>
            <strong>{documents.length}</strong>
          </article>
          <article className="fm-stat-card">
            <span className="fm-stat-icon fm-stat-icon-purple">⌕</span>
            <p>Searchable files</p>
            <strong>{documents.length}</strong>
            <small>Filename search for now</small>
          </article>
          <article className="fm-stat-card">
            <span className="fm-stat-icon fm-stat-icon-green">✦</span>
            <p>AI index</p>
            <strong>Not yet</strong>
            <small>Text extraction is upcoming</small>
          </article>
        </div>

        {notice && <div className="fm-alert fm-alert-success" role="status">{notice}</div>}
        {error && <div className="fm-alert fm-alert-error" role="alert">{error}</div>}

        <section className="fm-library">
          <div className="fm-library-head">
            <div>
              <h2>Your documents</h2>
              <p>Files uploaded to your FileMind workspace</p>
            </div>
            <label className="fm-search">
              <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Search filenames and content…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search filenames and document contents"
            />
            </label>
          </div>

          {loading ? (
            <div className="fm-empty"><span className="fm-spinner" />Loading documents…</div>
          ) : documents.length === 0 ? (
            <div className="fm-empty">
              <div className="fm-empty-icon">▤</div>
              <h3>{search ? "No matching documents" : "Your library is empty"}</h3>
              <p>{search ? "Try another word or phrase from from a doc" : "Upload a PDF, DOCX or TXT file to get started."}</p>
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
                      <span>{formatBytes(fileRecord.fileSize)} · Uploaded {formatDate(fileRecord.createdAt)}</span>
                    </div>
                    <span className="fm-file-status">Stored</span>
                    <div className="fm-file-actions">
                      <button type="button" onClick={() => handleOpen(fileRecord)}>Open</button>
                      <button type="button" className="fm-delete-button" onClick={() => handleDelete(fileRecord)}>Delete</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <p className="fm-next-note">
          <strong>Next milestone:</strong> extract document text, then add content search and grounded AI answers.
        </p>
      </section>
    </main>
  );
}

export default Dashboard;
