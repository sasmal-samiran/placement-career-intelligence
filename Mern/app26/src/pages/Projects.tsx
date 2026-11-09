import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import api from '../services/api';

type ProjectItem = {
  _id?: string;
  name?: string;
  title?: string;
  description?: string;
  desc?: string;
  technologies?: string[];
  techStack?: string[];
  githubUrl?: string;
  githubRepoUrl?: string;
  github?: string;
  liveUrl?: string;
  liveDemoUrl?: string;
  demoUrl?: string;
  url?: string;
  documentationUrl?: string;
  documentation?: string;
  docUrl?: string;
  validated?: boolean;
  status?: string;
};

export default function Projects() {
  const [items, setItems] = useState<ProjectItem[]>([]);
  const [show, setShow] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [tech, setTech] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [documentationUrl, setDocumentationUrl] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning'>('success');

  const showToast = (msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
  };

  const formatUrl = (url?: string) => {
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

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      const list = Array.isArray(response.data?.data) ? response.data.data : [];
      setItems(list);
    } catch (error) {
      console.warn('Projects unavailable', error);
      showToast('Could not load projects from database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setDesc('');
    setTech('');
    setGithubUrl('');
    setLiveUrl('');
    setDocumentationUrl('');
    setDocFile(null);
    setShow(true);
  };

  const openEditModal = (p: ProjectItem) => {
    setEditingId(p._id || null);
    setName(p.name || p.title || '');
    setDesc(p.description || p.desc || '');
    const tags = Array.isArray(p.technologies) && p.technologies.length > 0
      ? p.technologies
      : Array.isArray(p.techStack)
      ? p.techStack
      : [];
    setTech(tags.join(', '));
    setGithubUrl(p.githubUrl || p.githubRepoUrl || p.github || '');
    setLiveUrl(p.liveUrl || p.liveDemoUrl || p.demoUrl || p.url || '');
    setDocumentationUrl(p.documentationUrl || p.documentation || p.docUrl || '');
    setDocFile(null);
    setShow(true);
  };

  const saveProject = async () => {
    if (!name.trim()) {
      showToast('Please enter a project name.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const techList = tech
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const formattedGit = formatUrl(githubUrl);
      const formattedLive = formatUrl(liveUrl);

      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('description', desc.trim());
      formData.append('technologies', techList.join(','));
      formData.append('githubUrl', formattedGit);
      formData.append('liveUrl', formattedLive);
      formData.append('status', 'Completed');

      if (docFile) {
        formData.append('documentation', docFile);
      } else if (documentationUrl) {
        formData.append('documentationUrl', documentationUrl);
      }

      if (editingId) {
        await api.put(`/projects/${editingId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showToast('Project and documentation updated successfully!', 'success');
      } else {
        await api.post('/projects', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        showToast('Project and documentation saved successfully!', 'success');
      }

      setShow(false);
      await fetchProjects();
    } catch (error) {
      console.error('Could not save project', error);
      showToast('Failed to save project. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const removeItem = async (id?: string) => {
    if (!id) return;
    try {
      await api.delete(`/projects/${id}`);
      showToast('Project deleted successfully.', 'success');
      setItems((prev) => prev.filter((item) => item._id !== id));
    } catch (error) {
      console.error('Could not delete project', error);
      showToast('Failed to delete project.', 'error');
    }
  };

  if (loading) {
    return (
      <Layout title="Projects" subtitle="Loading your project portfolio...">
        <div className="panel-card text-center py-5">
          <div className="spinner-border text-primary mb-2" role="status" />
          <p className="text-muted mb-0">Loading projects from database...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Projects" subtitle="Showcase the technical work that proves your skills.">
      <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage('')} />

      <div className="row g-4">
        {items.map((p) => {
          const title = p.name || p.title || 'NA';
          const description = p.description || p.desc || 'NA';
          const tags = Array.isArray(p.technologies) && p.technologies.length > 0
            ? p.technologies
            : Array.isArray(p.techStack) && p.techStack.length > 0
            ? p.techStack
            : [];

          const rawGit = p.githubUrl || p.githubRepoUrl || p.github;
          const rawDemo = p.liveUrl || p.liveDemoUrl || p.demoUrl || p.url;
          const rawDocs = p.documentationUrl || p.documentation || p.docUrl;
          const gitLink = formatUrl(rawGit);
          const demoLink = formatUrl(rawDemo);
          const docsLink = formatUrl(rawDocs);
          const isValidated = typeof p.validated === 'boolean' ? p.validated : Boolean(gitLink && docsLink);

          return (
            <div className="col-lg-4" key={p._id || title}>
              <div className="project-card h-100 d-flex flex-column">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="project-icon">
                    <i className="bi bi-code-square" />
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    {isValidated ? (
                      <span className="badge bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center px-2 py-1">
                        <i className="bi bi-patch-check-fill me-1" />
                        Validated
                      </span>
                    ) : (
                      <span
                        className="badge bg-warning-subtle text-warning border border-warning-subtle d-inline-flex align-items-center px-2 py-1"
                        title="Requires both GitHub repository and documentation to be validated"
                      >
                        <i className="bi bi-shield-exclamation me-1" />
                        Unverified
                      </span>
                    )}
                    <span className="status-pill success-pill">{p.status || 'Completed'}</span>
                  </div>
                </div>

                <h5 className="mb-2 text-truncate" title={title}>{title}</h5>
                <p className="text-muted flex-grow-1" style={{ fontSize: '13px', lineHeight: 1.5 }}>
                  {description}
                </p>

                {tags.length > 0 && (
                  <div className="tech-tags mb-3">
                    {tags.map((t: string) => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                )}

                <div className="project-actions mt-auto d-flex align-items-center justify-content-between gap-1 pt-3 border-top">
                  <div className="d-flex flex-nowrap align-items-center gap-1 overflow-hidden" style={{ minWidth: 0 }}>
                    {gitLink ? (
                      <a
                        href={gitLink}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm btn-outline-dark d-inline-flex align-items-center fw-semibold text-nowrap"
                        style={{ fontSize: '11px', padding: '3px 7px', lineHeight: 1.2 }}
                        title={gitLink}
                      >
                        <i className="bi bi-github me-1" /> GitHub
                      </a>
                    ) : (
                      <span
                        className="btn btn-sm btn-outline-secondary disabled opacity-50 d-inline-flex align-items-center text-nowrap"
                        style={{ fontSize: '11px', padding: '3px 7px', lineHeight: 1.2 }}
                        title="No GitHub repository URL in database"
                      >
                        <i className="bi bi-github me-1" /> No Repo
                      </span>
                    )}

                    {demoLink ? (
                      <a
                        href={demoLink}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm btn-primary d-inline-flex align-items-center fw-semibold text-nowrap"
                        style={{ fontSize: '11px', padding: '3px 7px', lineHeight: 1.2 }}
                        title={demoLink}
                      >
                        <i className="bi bi-box-arrow-up-right me-1" /> Demo
                      </a>
                    ) : (
                      <span
                        className="btn btn-sm btn-outline-secondary disabled opacity-50 d-inline-flex align-items-center text-nowrap"
                        style={{ fontSize: '11px', padding: '3px 7px', lineHeight: 1.2 }}
                        title="No live demo URL in database"
                      >
                        <i className="bi bi-globe me-1" /> No Demo
                      </span>
                    )}

                    {docsLink ? (
                      <a
                        href={docsLink}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm btn-outline-info d-inline-flex align-items-center fw-semibold text-nowrap"
                        style={{ fontSize: '11px', padding: '3px 7px', lineHeight: 1.2 }}
                        title={`View documentation: ${docsLink}`}
                      >
                        <i className="bi bi-file-earmark-text me-1" /> Docs
                      </a>
                    ) : (
                      <span
                        className="btn btn-sm btn-outline-secondary disabled opacity-50 d-inline-flex align-items-center text-nowrap"
                        style={{ fontSize: '11px', padding: '3px 7px', lineHeight: 1.2 }}
                        title="No documentation URL in database"
                      >
                        <i className="bi bi-file-earmark-text me-1" /> No Docs
                      </span>
                    )}
                  </div>

                  <div className="d-flex align-items-center gap-1 ms-auto flex-shrink-0">
                    <button
                      type="button"
                      className="table-icon text-primary p-1 border-0 bg-transparent"
                      title="Edit project & URLs"
                      onClick={() => openEditModal(p)}
                    >
                      <i className="bi bi-pencil" style={{ fontSize: '13px' }} />
                    </button>
                    <button
                      type="button"
                      className="table-icon text-danger p-1 border-0 bg-transparent"
                      title="Delete project"
                      onClick={() => removeItem(p._id)}
                    >
                      <i className="bi bi-trash3" style={{ fontSize: '13px' }} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div className="col-lg-4">
          <button type="button" className="add-project w-100 h-100" onClick={openAddModal}>
            <i className="bi bi-plus-circle" />
            <strong>Add new project</strong>
            <span>Document your latest work or prototype</span>
          </button>
        </div>
      </div>

      <Modal show={show} title={editingId ? 'Edit Project & URLs' : 'Add New Project'} onClose={() => setShow(false)}>
        <div className="mb-3">
          <label className="form-label fw-semibold small">Project Name *</label>
          <input
            className="form-control modern-input"
            placeholder="e.g. AI Placement Predictor"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold small">Description</label>
          <textarea
            className="form-control modern-input"
            rows={4}
            placeholder="Describe what the project does, key features, and your role..."
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold small">Technologies (comma separated)</label>
          <input
            className="form-control modern-input"
            placeholder="e.g. React, Node.js, Express, MongoDB"
            value={tech}
            onChange={(e) => setTech(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold small">
            <i className="bi bi-github me-1" /> GitHub Repo Link (URL)
          </label>
          <input
            type="url"
            className="form-control modern-input"
            placeholder="https://github.com/username/project-repo"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold small">
            <i className="bi bi-box-arrow-up-right me-1" /> Live Demo Link (URL)
          </label>
          <input
            type="url"
            className="form-control modern-input"
            placeholder="https://my-live-project.vercel.app"
            value={liveUrl}
            onChange={(e) => setLiveUrl(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold small">
            <i className="bi bi-file-earmark-arrow-up me-1 text-primary" /> Project Documentation File
          </label>
          <div className="p-3 border rounded bg-light">
            <input
              type="file"
              className="form-control form-control-sm mb-2"
              accept=".pdf,.docx,.doc,.html,.htm,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setDocFile(e.target.files[0]);
                }
              }}
            />
            {docFile ? (
              <div className="d-flex align-items-center justify-content-between p-2 bg-white rounded border small">
                <span className="text-truncate">
                  <i className="bi bi-file-earmark-check text-success me-1" />
                  <strong>Selected:</strong> {docFile.name} ({(docFile.size / 1024).toFixed(1)} KB)
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-link text-danger p-0 ms-2 text-decoration-none"
                  onClick={() => setDocFile(null)}
                >
                  <i className="bi bi-x-circle" /> Clear
                </button>
              </div>
            ) : documentationUrl ? (
              <div className="d-flex align-items-center justify-content-between p-2 bg-white rounded border small">
                <span className="text-truncate">
                  <i className="bi bi-file-earmark-text text-primary me-1" />
                  <strong>Current File:</strong>{' '}
                  <a href={formatUrl(documentationUrl)} target="_blank" rel="noreferrer">
                    {documentationUrl.split('/').pop()}
                  </a>
                </span>
                <small className="text-muted ms-2">Select new file above to replace</small>
              </div>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          className="primary-btn w-100 justify-content-center"
          disabled={submitting}
          onClick={saveProject}
        >
          {submitting ? 'Saving Project...' : editingId ? 'Update Project in Database' : 'Save Project to Database'}
        </button>
      </Modal>
    </Layout>
  );
}
