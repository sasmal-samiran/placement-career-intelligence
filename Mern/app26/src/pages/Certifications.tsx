import { useEffect, useState, FormEvent } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import api from '../services/api';

type CertificationItem = {
  _id?: string;
  name: string;
  issuer?: string;
  issueDate?: string;
  year?: string;
  certificate?: string;
  validated?: boolean;
};

export default function Certifications() {
  const [certs, setCerts] = useState<CertificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [issuer, setIssuer] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [year, setYear] = useState('');
  const [certificateUrl, setCertificateUrl] = useState('');
  const [certFile, setCertFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning'>('success');

  const showToast = (msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
  };

  const formatDocUrl = (url?: string) => {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim().replace(/^[<(\['"]+|[>)\],.'"]+$/g, '');
    if (!trimmed) return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    if (trimmed.startsWith('/')) {
      const serverBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
      return `${serverBase}${trimmed}`;
    }
    return `https://${trimmed}`;
  };

  const fetchCerts = async () => {
    try {
      const response = await api.get('/certifications');
      const list = Array.isArray(response.data?.data) ? response.data.data : [];
      setCerts(list);
    } catch (error) {
      console.warn('Certification data unavailable', error);
      showToast('Could not load certifications from database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCerts();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setIssuer('');
    setIssueDate('');
    setYear('');
    setCertificateUrl('');
    setCertFile(null);
    setShowModal(true);
  };

  const openEditModal = (cert: CertificationItem) => {
    setEditingId(cert._id || null);
    setName(cert.name || '');
    setIssuer(cert.issuer || '');
    setIssueDate(cert.issueDate || '');
    setYear(cert.year || '');
    setCertificateUrl(cert.certificate || '');
    setCertFile(null);
    setShowModal(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast('Please provide a certification name.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('issuer', issuer.trim());
      formData.append('issueDate', issueDate.trim());
      formData.append('year', year.trim());

      if (certFile) {
        formData.append('certificate', certFile);
      } else if (certificateUrl) {
        formData.append('certificate', certificateUrl);
      }

      if (editingId) {
        await api.put(`/certifications/${editingId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showToast('Certification updated successfully!', 'success');
      } else {
        await api.post('/certifications', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showToast('Certification added successfully!', 'success');
      }

      setShowModal(false);
      await fetchCerts();
    } catch (error: any) {
      console.error('Could not save certification', error);
      showToast(error?.response?.data?.message || 'Failed to save certification.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id?: string, certName?: string) => {
    if (!id) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete this certification: "${certName || 'Certification'}"?`
    );
    if (!confirmDelete) return;

    setDeletingId(id);
    try {
      await api.delete(`/certifications/${id}`);
      showToast('Certification deleted successfully.', 'success');
      setCerts((prev) => prev.filter((item) => item._id !== id));
    } catch (error: any) {
      console.error('Could not delete certification', error);
      showToast(error?.response?.data?.message || 'Failed to delete certification.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <Layout title="Certifications" subtitle="Loading your certifications...">
        <div className="panel-card text-center py-5">
          <div className="spinner-border text-primary mb-2" role="status" />
          <p className="text-muted mb-0">Loading certifications from database...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Certifications" subtitle="Collect verified proof of your learning and skills.">
      <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage('')} />

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="fw-bold mb-1">Your Certifications</h5>
          <small className="text-muted">Verified certificates and credentials</small>
        </div>
        <button
          type="button"
          className="primary-btn small"
          onClick={openAddModal}
        >
          <i className="bi bi-plus-lg me-1" /> Add certification
        </button>
      </div>

      <div className="row g-4">
        {certs.map((cert, i) => {
          const docUrl = cert.certificate ? formatDocUrl(cert.certificate) : '';
          const isValidated = typeof cert.validated === 'boolean'
            ? cert.validated
            : Boolean(docUrl);

          return (
            <div className="col-md-6 col-xl-4" key={cert._id || `${cert.name}-${i}`}>
              <div className="certificate-card d-flex flex-column h-100">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="cert-ribbon">
                    <i className="bi bi-award-fill" />
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    {isValidated ? (
                      <span
                        className="badge bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center px-2 py-1"
                        style={{ fontSize: '11px' }}
                      >
                        <i className="bi bi-patch-check-fill me-1" />
                        Verified
                      </span>
                    ) : (
                      <span
                        className="badge bg-warning-subtle text-warning border border-warning-subtle d-inline-flex align-items-center px-2 py-1"
                        style={{ fontSize: '11px' }}
                        title="Upload a certificate document to get verified"
                      >
                        <i className="bi bi-shield-exclamation me-1" />
                        Unverified
                      </span>
                    )}

                    <button
                      type="button"
                      className="table-icon text-primary p-1 border-0 bg-transparent"
                      title="Edit certification"
                      onClick={() => openEditModal(cert)}
                    >
                      <i className="bi bi-pencil" style={{ fontSize: '13px' }} />
                    </button>

                    <button
                      type="button"
                      className="table-icon text-danger p-1 border-0 bg-transparent"
                      title="Delete certification"
                      disabled={deletingId === cert._id}
                      onClick={() => handleDelete(cert._id, cert.name)}
                    >
                      {deletingId === cert._id ? (
                        <span className="spinner-border spinner-border-sm text-danger" role="status" />
                      ) : (
                        <i className="bi bi-trash3" style={{ fontSize: '13px' }} />
                      )}
                    </button>
                  </div>
                </div>

                <h5 className="mb-1 text-truncate" title={cert.name}>{cert.name}</h5>
                <p className="mb-1 text-dark fw-medium">{cert.issuer || 'Issuer not specified'}</p>
                <small className="text-muted d-block mb-3">
                  {[cert.issueDate, cert.year].filter(Boolean).join(' • ') || 'Issue date not specified'}
                </small>

                <div className="mt-auto pt-2">
                  {docUrl ? (
                    <a
                      href={docUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-sm btn-outline-primary w-100 d-inline-flex align-items-center justify-content-center fw-semibold text-nowrap"
                      style={{ padding: '7px 12px', fontSize: '12px' }}
                      title={`Open certificate: ${docUrl}`}
                    >
                      <i className="bi bi-file-earmark-check me-1" /> View Certificate
                    </a>
                  ) : (
                    <span
                      className="btn btn-sm btn-outline-secondary disabled opacity-50 w-100 d-inline-flex align-items-center justify-content-center text-nowrap"
                      style={{ padding: '7px 12px', fontSize: '12px' }}
                      title="No certificate file uploaded"
                    >
                      <i className="bi bi-award me-1" /> No Certificate
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Certificate Card */}
        <div className="col-md-6 col-xl-4">
          <button
            type="button"
            className="add-certificate w-100 h-100 border-dashed"
            onClick={openAddModal}
            style={{ minHeight: '220px', cursor: 'pointer' }}
          >
            <i className="bi bi-plus-lg" />
            <strong>Add certification</strong>
            <span>Upload a new certificate</span>
          </button>
        </div>
      </div>

      {/* Add / Edit Certification Modal */}
      <Modal
        show={showModal}
        title={editingId ? 'Edit Certification' : 'Add Certification'}
        onClose={() => setShowModal(false)}
      >
        <form onSubmit={handleSave}>
          <div className="mb-3">
            <label className="form-label fw-semibold small">Certification Name *</label>
            <input
              type="text"
              className="form-control modern-input"
              placeholder="e.g. AWS Certified Solutions Architect, Google Cloud Associate"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold small">Issuer / Organization</label>
            <input
              type="text"
              className="form-control modern-input"
              placeholder="e.g. Amazon Web Services, Coursera, Google"
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
            />
          </div>

          <div className="row g-2 mb-3">
            <div className="col-6">
              <label className="form-label fw-semibold small">Issue Date</label>
              <input
                type="date"
                className="form-control modern-input"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
            <div className="col-6">
              <label className="form-label fw-semibold small">Year</label>
              <input
                type="text"
                className="form-control modern-input"
                placeholder="e.g. 2024"
                value={year}
                onChange={(e) => setYear(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="form-label fw-semibold small">
              Certificate File <span className="text-muted fw-normal">(.pdf, .png, .jpg, .docx)</span>
            </label>
            <input
              type="file"
              className="form-control modern-input"
              accept=".pdf,.png,.jpg,.jpeg,.docx,.doc"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setCertFile(e.target.files[0]);
                }
              }}
            />
            {certificateUrl && !certFile && (
              <div className="mt-2 d-flex align-items-center gap-2 small">
                <span className="text-muted">Uploaded:</span>
                <a
                  href={formatDocUrl(certificateUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-decoration-none fw-medium text-info"
                >
                  <i className="bi bi-file-earmark-arrow-down me-1" />
                  View current certificate
                </a>
              </div>
            )}
            {certFile && (
              <div className="mt-2 d-flex align-items-center gap-2 small text-success">
                <i className="bi bi-check2-circle" />
                <span>Selected: <strong>{certFile.name}</strong> ({(certFile.size / 1024).toFixed(1)} KB)</span>
                <button
                  type="button"
                  className="btn btn-link text-danger p-0 ms-1 small"
                  onClick={() => setCertFile(null)}
                  style={{ fontSize: '12px' }}
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="primary-btn w-100 justify-content-center py-2"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" />
                Saving...
              </>
            ) : (
              <>
                <i className="bi bi-check-circle me-1" />
                {editingId ? 'Update Certification' : 'Save Certification'}
              </>
            )}
          </button>
        </form>
      </Modal>
    </Layout>
  );
}
