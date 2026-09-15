import { useCallback, useEffect, useState } from "react";
import api from "../../api/axios";
import "./PropertyDocumentVault.css";

const DOCUMENT_CATEGORIES = [
  "Ownership Document",
  "Sale Agreement",
  "Property Tax Document",
  "Registration Document",
  "Title Document",
  "NOC",
  "Inspection Report",
  "Floor Plan",
  "Other",
];

const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function formatDate(dateString) {
  if (!dateString) return "N/A";
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

function getCategoryBadgeClass(category) {
  switch (category) {
    case "Ownership Document":
    case "Title Document":
      return "doc-badge-primary";
    case "Sale Agreement":
    case "Registration Document":
      return "doc-badge-success";
    case "NOC":
      return "doc-badge-info";
    case "Property Tax Document":
      return "doc-badge-warning";
    case "Inspection Report":
      return "doc-badge-amber";
    case "Floor Plan":
      return "doc-badge-cyan";
    default:
      return "doc-badge-neutral";
  }
}

function getFileIcon(filename, mimeType) {
  const name = (filename || "").toLowerCase();
  if (name.endsWith(".pdf") || mimeType === "application/pdf") return "📄";
  if (
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png") ||
    name.endsWith(".webp") ||
    (mimeType && mimeType.startsWith("image/"))
  ) {
    return "🖼️";
  }
  return "📁";
}

function PropertyDocumentVaultModal({ isOpen, property, onClose }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);

  // Feature #2: Expiry & Summary State
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    expiringSoon: 0,
    expired: 0,
    noExpiry: 0,
  });
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [expiryFilter, setExpiryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Upload Form State
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState("Ownership Document");
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Filter & Search State
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Deletion Confirmation State
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const propertyId = property?.id;

  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  };

  const user = getUser();
  const isAdmin = user?.role === "admin";
  const isAgent = user?.role === "agent";
  const isAssignedAgent =
    isAgent && property && Number(property.agent_id) === Number(user?.agent_id);
  const canManageVault = isAdmin || isAssignedAgent;

  const fetchDocuments = useCallback(async () => {
    if (!propertyId) return;

    try {
      setLoading(true);
      setError("");

      const response = await api.get(`/properties/${propertyId}/documents`);
      if (response.data?.success) {
        setDocuments(response.data.documents || []);
        if (response.data.summary) {
          setSummary(response.data.summary);
        }
      } else {
        setDocuments([]);
        setError(response.data?.message || "Failed to load documents.");
      }
    } catch (err) {
      console.error("Fetch Documents Error:", err);
      setDocuments([]);
      if (err.response?.status === 403) {
        setError(
          "Access Restricted: Only Administrators and the assigned Listing Agent can access this property's Document Vault."
        );
      } else if (err.response?.status === 401) {
        setError("Please login to access the Property Document Vault.");
      } else {
        setError(
          err.response?.data?.message || "Failed to load documents for this property."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    if (isOpen && propertyId && canManageVault) {
      fetchDocuments();
      setSuccessMsg("");
      setError("");
      setTitle("");
      setSelectedFile(null);
      setFileError("");
      setDeleteConfirmDoc(null);
    }
  }, [isOpen, propertyId, canManageVault, fetchDocuments]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        if (deleteConfirmDoc) {
          setDeleteConfirmDoc(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, deleteConfirmDoc, onClose]);

  const validateFile = (file) => {
    if (!file) return false;

    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setFileError(
        `Invalid file type (${ext}). Allowed formats: PDF, JPG, JPEG, PNG, WebP.`
      );
      return false;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError(
        `File is too large (${formatBytes(file.size)}). Maximum allowed size is 10 MB.`
      );
      return false;
    }

    setFileError("");
    return true;
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (validateFile(file)) {
        setSelectedFile(file);
        if (!title.trim()) {
          const rawName = file.name.replace(/\.[^/.]+$/, "");
          setTitle(rawName);
        }
      } else {
        setSelectedFile(null);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (validateFile(file)) {
        setSelectedFile(file);
        if (!title.trim()) {
          const rawName = file.name.replace(/\.[^/.]+$/, "");
          setTitle(rawName);
        }
      } else {
        setSelectedFile(null);
      }
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!title.trim()) {
      setError("Please provide a title for the document.");
      return;
    }

    if (!selectedFile) {
      setError("Please select a file to upload.");
      return;
    }

    if (issueDate && expiryDate && new Date(expiryDate) < new Date(issueDate)) {
      setError("Expiry date cannot be earlier than issue date.");
      return;
    }

    try {
      setIsUploading(true);

      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("document_type", documentType);
      formData.append("file", selectedFile);
      if (issueDate) formData.append("issue_date", issueDate);
      if (expiryDate) formData.append("expiry_date", expiryDate);

      const response = await api.post(
        `/properties/${propertyId}/documents`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data?.success) {
        setSuccessMsg(
          `Document "${title.trim()}" successfully uploaded to the vault.`
        );
        setTitle("");
        setIssueDate("");
        setExpiryDate("");
        setSelectedFile(null);
        setFileError("");
        fetchDocuments();
      } else {
        setError(response.data?.message || "Upload failed.");
      }
    } catch (err) {
      console.error("Upload Document Error:", err);
      setError(
        err.response?.data?.message || "Failed to upload document. Please try again."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      setDownloadingId(doc.id);
      setError("");

      const response = await api.get(`/documents/${doc.id}/download`, {
        responseType: "blob",
      });

      // Trigger browser download via Blob
      const blob = new Blob([response.data], {
        type: doc.mimeType || "application/octet-stream",
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", doc.originalFilename || `document-${doc.id}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Download Error:", err);
      setError(
        err.response?.data?.message || "Failed to download document from server."
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmDoc) return;

    try {
      setIsDeleting(true);
      setError("");

      const response = await api.delete(`/documents/${deleteConfirmDoc.id}`);
      if (response.data?.success) {
        setSuccessMsg(`Document "${deleteConfirmDoc.title}" deleted.`);
        setDeleteConfirmDoc(null);
        fetchDocuments();
      } else {
        setError(response.data?.message || "Failed to delete document.");
      }
    } catch (err) {
      console.error("Delete Error:", err);
      setError(
        err.response?.data?.message || "Failed to delete document. Please try again."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen || !property || !canManageVault) return null;

  // Filter & sort documents
  const filteredDocs = documents
    .filter((doc) => {
      const matchesCategory =
        categoryFilter === "all" || doc.documentType === categoryFilter;
      const matchesExpiry =
        expiryFilter === "all" || doc.expiryStatus === expiryFilter;
      const matchesSearch =
        !searchQuery.trim() ||
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.originalFilename.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesExpiry && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "expiry_soonest") {
        if (!a.expiryDate && !b.expiryDate) return 0;
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return new Date(a.expiryDate) - new Date(b.expiryDate);
      }
      if (sortBy === "oldest") {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  // Calculate vault statistics
  const totalStorage = documents.reduce((acc, d) => acc + (d.fileSize || 0), 0);
  const distinctTypes = new Set(documents.map((d) => d.documentType)).size;

  return (
    <div className="vault-modal-overlay" onClick={onClose}>
      <div
        className="vault-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="vault-modal-title"
      >
        {/* Modal Header */}
        <div className="vault-modal-header">
          <div className="vault-modal-title-wrap">
            <div className="vault-header-icon">📁</div>
            <div>
              <div className="vault-header-tags">
                <span className="vault-id-tag">Property #{property.id}</span>
                <span className="vault-type-tag">{property.property_type}</span>
                <span className="vault-badge-secure">🔒 Encrypted Vault</span>
              </div>
              <h2 id="vault-modal-title" className="vault-modal-title">
                {property.title}
              </h2>
              <p className="vault-modal-subtitle">
                {property.city ? `📍 ${property.city}` : "Prime Location"} • Document Storage & Compliance Verification
              </p>
            </div>
          </div>

          <button
            type="button"
            className="vault-close-btn"
            onClick={onClose}
            aria-label="Close Document Vault"
          >
            ×
          </button>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="vault-alert vault-alert-error">
            <span>⚠️ {error}</span>
            <button
              type="button"
              className="vault-alert-dismiss"
              onClick={() => setError("")}
            >
              ×
            </button>
          </div>
        )}

        {successMsg && (
          <div className="vault-alert vault-alert-success">
            <span>✅ {successMsg}</span>
            <button
              type="button"
              className="vault-alert-dismiss"
              onClick={() => setSuccessMsg("")}
            >
              ×
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="vault-modal-body">
          {/* Key Vault Statistics Bar */}
          <div className="vault-stats-bar">
            <div className="vault-stat-card">
              <span className="vault-stat-label">Total Documents</span>
              <span className="vault-stat-val">{documents.length}</span>
              <span className="vault-stat-sub">Archived Records</span>
            </div>
            <div className="vault-stat-card">
              <span className="vault-stat-label">Vault Storage</span>
              <span className="vault-stat-val">{formatBytes(totalStorage)}</span>
              <span className="vault-stat-sub">Total Storage Used</span>
            </div>
            <div className="vault-stat-card">
              <span className="vault-stat-label">Document Categories</span>
              <span className="vault-stat-val">{distinctTypes}</span>
              <span className="vault-stat-sub">Active Categories</span>
            </div>
            <div className="vault-stat-card">
              <span className="vault-stat-label">Access Level</span>
              <span className="vault-stat-val" style={{ fontSize: "16px", color: canManageVault ? "#16a34a" : "#64748b" }}>
                {isAdmin ? "Admin (Full)" : isAssignedAgent ? "Listing Agent" : "Restricted"}
              </span>
              <span className="vault-stat-sub">Role Permission</span>
            </div>
          </div>

          {/* Upload Section (Authorized Managers Only) */}
          {canManageVault ? (
            <div className="vault-upload-card">
              <div className="vault-upload-card-header">
                <div>
                  <h3 className="vault-section-title">Upload Property Document</h3>
                  <p className="vault-section-desc">
                    Attach title deeds, sales agreements, NOCs, inspection reports, or floor plans (PDF, JPG, PNG, WebP up to 10MB).
                  </p>
                </div>
              </div>

              <form onSubmit={handleUploadSubmit} className="vault-upload-form">
                <div className="vault-form-row">
                  <div className="vault-form-group flex-2">
                    <label htmlFor="doc-title" className="vault-label">
                      Document Title <span className="req">*</span>
                    </label>
                    <input
                      id="doc-title"
                      type="text"
                      className="vault-input"
                      placeholder="e.g. Title Deed Verification 2026"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={isUploading}
                      required
                    />
                  </div>

                  <div className="vault-form-group flex-1">
                    <label htmlFor="doc-category" className="vault-label">
                      Document Category <span className="req">*</span>
                    </label>
                    <select
                      id="doc-category"
                      className="vault-select"
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value)}
                      disabled={isUploading}
                    >
                      {DOCUMENT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Feature #2: Issue & Expiry Dates */}
                <div className="vault-form-row vault-date-row">
                  <div className="vault-form-group">
                    <label htmlFor="doc-issue-date" className="vault-label">
                      Issue Date <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 400 }}>(Optional)</span>
                    </label>
                    <input
                      type="date"
                      id="doc-issue-date"
                      className="vault-date-input"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      disabled={isUploading}
                    />
                  </div>

                  <div className="vault-form-group">
                    <label htmlFor="doc-expiry-date" className="vault-label">
                      Expiry Date <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 400 }}>(Optional - Expiry Alert)</span>
                    </label>
                    <input
                      type="date"
                      id="doc-expiry-date"
                      className="vault-date-input"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      disabled={isUploading}
                    />
                  </div>
                </div>

                {/* Dropzone */}
                <div
                  className={`vault-dropzone ${isDragOver ? "dragover" : ""} ${
                    selectedFile ? "has-file" : ""
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    id="doc-file-input"
                    className="vault-file-hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />

                  {selectedFile ? (
                    <div className="vault-file-selected">
                      <div className="vault-file-selected-icon">
                        {getFileIcon(selectedFile.name, selectedFile.type)}
                      </div>
                      <div className="vault-file-selected-info">
                        <span className="vault-file-name">{selectedFile.name}</span>
                        <span className="vault-file-size">
                          {formatBytes(selectedFile.size)} • Ready to upload
                        </span>
                      </div>
                      <button
                        type="button"
                        className="vault-file-remove-btn"
                        onClick={() => setSelectedFile(null)}
                        disabled={isUploading}
                        title="Remove selected file"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="doc-file-input" className="vault-dropzone-label">
                      <span className="vault-dropzone-icon">☁️</span>
                      <span className="vault-dropzone-title">
                        Choose a file or drag & drop here
                      </span>
                      <span className="vault-dropzone-hint">
                        PDF, JPG, PNG, or WebP up to 10MB
                      </span>
                    </label>
                  )}
                </div>

                {fileError && <p className="vault-error-hint">{fileError}</p>}

                <div className="vault-form-actions">
                  <button
                    type="submit"
                    className="vault-submit-btn"
                    disabled={isUploading || !selectedFile || !title.trim()}
                  >
                    {isUploading ? (
                      <>
                        <span className="vault-spinner"></span>
                        Uploading Document...
                      </>
                    ) : (
                      <>
                        <span>📤</span> Upload to Document Vault
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="vault-notice-card">
              <span>ℹ️</span>
              <p>
                You are viewing this Document Vault in read-only mode. Only the listing agent assigned to this property or system administrators can upload and manage documents.
              </p>
            </div>
          )}

          {/* Document Filter & List Section */}
          <div className="vault-list-section">
            <div className="vault-list-header">
              <h3 className="vault-section-title">
                Vault Repository ({filteredDocs.length})
              </h3>

              <div className="vault-filters-wrap">
                <div className="vault-search-box">
                  <span className="vault-search-icon">🔍</span>
                  <input
                    type="text"
                    className="vault-search-input"
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="vault-search-clear"
                      onClick={() => setSearchQuery("")}
                    >
                      ×
                    </button>
                  )}
                </div>

                <select
                  className="vault-filter-select"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <select
                  className="vault-filter-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="newest">Sort: Newest</option>
                  <option value="oldest">Sort: Oldest</option>
                  <option value="expiry_soonest">Sort: Expiry (Soonest)</option>
                </select>
              </div>
            </div>

            {/* Feature #2: Expiry Alert Banner */}
            {(summary.expired > 0 || summary.expiringSoon > 0) && (
              <div className={`vault-expiry-alert-banner ${summary.expired > 0 ? "has-expired" : ""}`}>
                <span>{summary.expired > 0 ? "⚠️" : "⏳"}</span>
                <span>
                  {summary.expired > 0 && <strong>{summary.expired} document(s) expired. </strong>}
                  {summary.expiringSoon > 0 && <span>{summary.expiringSoon} document(s) expiring within 30 days. </span>}
                  Please review compliance and renew necessary records.
                </span>
              </div>
            )}

            {/* Feature #2: Expiry Status Filter Strip */}
            <div className="vault-expiry-strip">
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#475569" }}>Expiry Filter:</span>
              <button
                type="button"
                className={`vault-expiry-pill ${expiryFilter === "all" ? "active-pill" : "none-pill"}`}
                onClick={() => setExpiryFilter("all")}
              >
                All ({documents.length})
              </button>
              <button
                type="button"
                className={`vault-expiry-pill ${expiryFilter === "Active" ? "active-pill" : "none-pill"}`}
                onClick={() => setExpiryFilter("Active")}
              >
                🟢 Active ({summary.active})
              </button>
              <button
                type="button"
                className={`vault-expiry-pill ${expiryFilter === "Expiring Soon" ? "expiring-pill" : "none-pill"}`}
                onClick={() => setExpiryFilter("Expiring Soon")}
              >
                ⏳ Expiring Soon ({summary.expiringSoon})
              </button>
              <button
                type="button"
                className={`vault-expiry-pill ${expiryFilter === "Expired" ? "expired-pill" : "none-pill"}`}
                onClick={() => setExpiryFilter("Expired")}
              >
                🔴 Expired ({summary.expired})
              </button>
              <button
                type="button"
                className={`vault-expiry-pill ${expiryFilter === "No Expiry" ? "active-pill" : "none-pill"}`}
                onClick={() => setExpiryFilter("No Expiry")}
              >
                ⚪ No Expiry ({summary.noExpiry})
              </button>
            </div>

            {loading ? (
              <div className="vault-loading-wrap">
                <div className="vault-spinner-lg"></div>
                <p>Loading document repository...</p>
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="vault-empty-state">
                <div className="vault-empty-icon">📁</div>
                <h4 className="vault-empty-title">
                  {documents.length === 0
                    ? "Document Vault is Empty"
                    : "No Matching Documents"}
                </h4>
                <p className="vault-empty-desc">
                  {documents.length === 0
                    ? canManageVault
                      ? "No official records or agreements have been attached yet. Use the upload panel above to attach compliance and ownership documents."
                      : "No public records are currently cataloged in this property vault."
                    : "Try selecting another category or clearing your search criteria."}
                </p>
                {categoryFilter !== "all" || expiryFilter !== "all" || searchQuery ? (
                  <button
                    type="button"
                    className="vault-reset-btn"
                    onClick={() => {
                      setCategoryFilter("all");
                      setExpiryFilter("all");
                      setSearchQuery("");
                    }}
                  >
                    Clear All Filters
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="vault-table-wrap">
                <table className="vault-table">
                  <thead>
                    <tr>
                      <th>Document</th>
                      <th>Category</th>
                      <th>Validity & Expiry</th>
                      <th>File Size</th>
                      <th>Uploaded By</th>
                      <th>Date Added</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocs.map((doc) => (
                      <tr key={doc.id}>
                        <td>
                          <div className="vault-doc-title-cell">
                            <span className="vault-file-type-icon">
                              {getFileIcon(doc.originalFilename, doc.mimeType)}
                            </span>
                            <div>
                              <span className="vault-doc-title-text">
                                {doc.title}
                              </span>
                              <span className="vault-doc-filename-sub">
                                {doc.originalFilename}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`vault-cat-pill ${getCategoryBadgeClass(
                              doc.documentType
                            )}`}
                          >
                            {doc.documentType}
                          </span>
                        </td>

                        {/* Feature #2: Validity & Expiry Status */}
                        <td>
                          <div className="vault-cell-date-info">
                            <span
                              className={`doc-expiry-badge status-${(
                                doc.expiryStatus || "no-expiry"
                              )
                                .toLowerCase()
                                .replace(/\s+/g, "-")}`}
                            >
                              {doc.expiryStatus === "Expired" && `🔴 Expired (${Math.abs(doc.daysUntilExpiry)}d ago)`}
                              {doc.expiryStatus === "Expiring Soon" && `⏳ Expiring in ${doc.daysUntilExpiry}d`}
                              {doc.expiryStatus === "Active" && `🟢 Active (${doc.daysUntilExpiry}d left)`}
                              {doc.expiryStatus === "No Expiry" && `⚪ No Expiry`}
                            </span>
                            {doc.expiryDate && (
                              <span className="vault-cell-subdate">
                                Exp: {formatDate(doc.expiryDate)}
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          <span className="vault-size-text">
                            {formatBytes(doc.fileSize)}
                          </span>
                        </td>

                        <td>
                          <div className="vault-uploader-info">
                            <span className="vault-uploader-name">
                              {doc.uploadedBy?.name || "System"}
                            </span>
                            <span className="vault-uploader-role">
                              {doc.uploadedBy?.role || "agent"}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span className="vault-date-text">
                            {formatDate(doc.createdAt)}
                          </span>
                        </td>

                        <td>
                          <div className="vault-row-actions">
                            <button
                              type="button"
                              className="vault-action-btn vault-btn-download"
                              onClick={() => handleDownload(doc)}
                              disabled={downloadingId === doc.id}
                              title="Download document file"
                            >
                              {downloadingId === doc.id ? (
                                <>
                                  <span className="vault-btn-spinner"></span>
                                  Loading...
                                </>
                              ) : (
                                <>
                                  <span>📥</span> Download
                                </>
                              )}
                            </button>

                            {canManageVault && (
                              <button
                                type="button"
                                className="vault-action-btn vault-btn-delete"
                                onClick={() => setDeleteConfirmDoc(doc)}
                                title="Delete document from vault"
                              >
                                <span>🗑️</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal Overlay */}
        {deleteConfirmDoc && (
          <div
            className="vault-confirm-overlay"
            onClick={() => setDeleteConfirmDoc(null)}
          >
            <div
              className="vault-confirm-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="vault-confirm-icon">⚠️</div>
              <h4 className="vault-confirm-title">Confirm Document Removal</h4>
              <p className="vault-confirm-desc">
                Are you sure you want to permanently delete{" "}
                <strong>"{deleteConfirmDoc.title}"</strong> (
                {deleteConfirmDoc.originalFilename}) from this property's Document Vault? This action cannot be undone.
              </p>

              <div className="vault-confirm-actions">
                <button
                  type="button"
                  className="vault-confirm-cancel"
                  onClick={() => setDeleteConfirmDoc(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="vault-confirm-delete"
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Permanently Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PropertyDocumentVaultModal;
