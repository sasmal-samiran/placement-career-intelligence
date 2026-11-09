import { useEffect, useState, FormEvent } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import api from '../services/api';

type InternshipItem = {
  _id?: string;
  company: string;
  role: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  date?: string;
  status?: string;
  certificate?: string;
  validated?: boolean;
  skills?: string[];
};

export default function Internships() {
  const [items, setItems] = useState<InternshipItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('Completed');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
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

  const fetchInternships = async () => {
    try {
      const response = await api.get('/internships');
      const list = Array.isArray(response.data?.data) ? response.data.data : [];
      setItems(list);
    } catch (error) {
      console.warn('Internships unavailable', error);
      showToast('Could not load internships from database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInternships();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setCompany('');
    setRole('');
    setStatus('Completed');
    setStartDate('');
    setEndDate('');
    setDescription('');
    setCertificateUrl('');
    setCertFile(null);
    setShowModal(true);
  };

  const openEditModal = (item: InternshipItem) => {
    setEditingId(item._id || null);
    setCompany(item.company || '');
    setRole(item.role || '');
    setStatus(item.status || 'Completed');
    setStartDate(item.startDate ? String(item.startDate).slice(0, 10) : '');
    setEndDate(item.endDate ? String(item.endDate).slice(0, 10) : '');
    setDescription(item.description || '');
    setCertificateUrl(item.certificate || '');
    setCertFile(null);
    setShowModal(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();

    if (!company.trim() || !role.trim()) {
      showToast('Please provide both company name and role.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('company', company.trim());
      formData.append('role', role.trim());
      formData.append('status', status);
      formData.append('startDate', startDate.trim());
      formData.append('endDate', endDate.trim());
      formData.append('description', description.trim());

      if (certFile) {
        formData.append('certificate', certFile);
      } else if (certificateUrl) {
        formData.append('certificate', certificateUrl);
      }

      if (editingId) {
        await api.put(`/internships/${editingId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showToast('Internship updated successfully!', 'success');
      } else {
        await api.post('/internships', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showToast('Internship added successfully!', 'success');
      }

      setShowModal(false);
      await fetchInternships();
    } catch (error: any) {
      console.error('Could not save internship', error);
      showToast(error?.response?.data?.message || 'Failed to save internship.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id?: string, compName?: string, roleName?: string) => {
    if (!id) return;

    const confirmDelete = window.confirm(
      `Are you sure you want to delete this internship: ${roleName || 'Role'} at ${compName || 'Company'}?`
    );
    if (!confirmDelete) return;

    setDeletingId(id);
    try {
      await api.delete(`/internships/${id}`);
      showToast('Internship deleted successfully.', 'success');
      setItems((prev) => prev.filter((item) => item._id !== id));
    } catch (error: any) {
      console.error('Could not delete internship', error);
      showToast(error?.response?.data?.message || 'Failed to delete internship.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <Layout title="Internships" subtitle="Loading your internship experience...">
        <div className="panel-card text-center py-5">
          <div className="spinner-border text-primary mb-2" role="status" />
          <p className="text-muted mb-0">Loading internships from database...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Internships" subtitle="Keep your practical experience ready for recruiters.">
      <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage('')} />

      <div className="panel-card">
        <div className="panel-head">
          <div>
            <h5>Experience</h5>
            <small>Internships and industry exposure</small>
          </div>
          <button
            type="button"
            className="primary-btn small"
            onClick={openAddModal}
          >
            <i className="bi bi-plus-lg me-1" /> Add internship
          </button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-5">
            <div
              className="rounded-circle bg-light d-inline-flex align-items-center justify-content-center mb-3"
              style={{ width: '60px', height: '60px', fontSize: '24px' }}
            >
              <i className="bi bi-building text-muted" />
            </div>
            <h6 className="fw-semibold mb-1">No internship experience added yet</h6>
            <p className="text-muted small mb-3">
              Add your practical industry experience and internships to showcase your skills to recruiters.
            </p>
            <button
              type="button"
              className="primary-btn small"
              onClick={openAddModal}
            >
              <i className="bi bi-plus-lg me-1" /> Add First Internship
            </button>
          </div>
        ) : (
          <div className="timeline-list">
            {items.map((item, i) => {
              const certLink = formatDocUrl(item.certificate);
              const isValidated = typeof item.validated === 'boolean' ? item.validated : Boolean(certLink);

              return (
                <div className="timeline-item" key={item._id || `${item.company}-${i}`}>
                  <div className="timeline-dot">
                    <i className="bi bi-building" />
                  </div>
                  <div className="timeline-content">
                    <div className="d-flex justify-content-between align-items-start gap-2">
                      <div>
                        <h5 className="mb-1 fw-bold">{item.role || 'Internship role'}</h5>
                        <strong className="text-dark">{item.company || 'Company name'}</strong>
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
                            title="Upload an internship certificate to get verified"
                          >
                            <i className="bi bi-shield-exclamation me-1" />
                            Unverified
                          </span>
                        )}

                        <span
                          className={`status-pill ${
                            item.status === 'Completed'
                              ? 'success-pill'
                              : item.status === 'In progress'
                              ? 'primary-pill'
                              : 'warning-pill'
                          }`}
                        >
                          {item.status || 'Completed'}
                        </span>

                        <button
                          type="button"
                          className="table-icon text-primary p-1 border-0 bg-transparent"
                          title="Edit internship"
                          onClick={() => openEditModal(item)}
                        >
                          <i className="bi bi-pencil" style={{ fontSize: '13px' }} />
                        </button>

                        <button
                          type="button"
                          className="table-icon text-danger p-1 border-0 bg-transparent"
                          title="Delete internship"
                          disabled={deletingId === item._id}
                          onClick={() => handleDelete(item._id, item.company, item.role)}
                        >
                          {deletingId === item._id ? (
                            <span className="spinner-border spinner-border-sm text-danger" role="status" />
                          ) : (
                            <i className="bi bi-trash3" style={{ fontSize: '13px' }} />
                          )}
                        </button>
                      </div>
                    </div>

                    <p className="text-muted small mt-1 mb-2">
                      {[item.startDate, item.endDate].filter(Boolean).join(' - ') || 'Dates not added'}
                    </p>

                    {item.description && (
                      <div className="experience-tags mb-2">
                        <span>{item.description}</span>
                      </div>
                    )}

                    <div className="d-flex align-items-center gap-2 mt-2 pt-2 border-top">
                      {certLink ? (
                        <a
                          href={certLink}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm btn-outline-info d-inline-flex align-items-center fw-semibold text-nowrap"
                          style={{ fontSize: '11px', padding: '3px 8px', lineHeight: 1.2 }}
                          title={`View certificate: ${certLink}`}
                        >
                          <i className="bi bi-award me-1" /> View Certificate
                        </a>
                      ) : (
                        <span
                          className="btn btn-sm btn-outline-secondary disabled opacity-50 d-inline-flex align-items-center text-nowrap"
                          style={{ fontSize: '11px', padding: '3px 8px', lineHeight: 1.2 }}
                          title="No internship certificate uploaded"
                        >
                          <i className="bi bi-award me-1" /> No Certificate
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Internship Modal */}
      <Modal
        show={showModal}
        title={editingId ? 'Edit Internship Experience' : 'Add Internship Experience'}
        onClose={() => setShowModal(false)}
      >
        <form onSubmit={handleSave}>
          <div className="mb-3">
            <label className="form-label fw-semibold small">Company / Organization *</label>
            <input
              type="text"
              className="form-control modern-input"
              placeholder="e.g. Google, Microsoft, Startup Inc."
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold small">Role / Job Title *</label>
            <input
              type="text"
              className="form-control modern-input"
              placeholder="e.g. Software Engineer Intern, Data Science Intern"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold small">Status</label>
            <select
              className="form-select modern-input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="Completed">Completed</option>
              <option value="In progress">In progress</option>
              <option value="Upcoming">Upcoming</option>
            </select>
          </div>

          <div className="row g-2 mb-3">
            <div className="col-6">
              <label className="form-label fw-semibold small">Start Date</label>
              <input
                type="date"
                className="form-control modern-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="col-6">
              <label className="form-label fw-semibold small">End Date</label>
              <input
                type="date"
                className="form-control modern-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold small">Description / Key Responsibilities</label>
            <textarea
              className="form-control modern-input"
              rows={3}
              placeholder="Describe your contributions, tools used, and key accomplishments..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label className="form-label fw-semibold small">
              Internship Certificate <span className="text-muted fw-normal">(.pdf, .png, .jpg, .docx)</span>
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
                {editingId ? 'Update Internship' : 'Save Internship'}
              </>
            )}
          </button>
        </form>
      </Modal>
    </Layout>
  );
}
