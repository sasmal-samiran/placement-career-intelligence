import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import Toast from '../components/Toast';
import api from '../services/api';

type ResumeData = {
  fileName?: string;
  originalName?: string;
  fileUrl?: string;
  uploadedAt?: string;
  portfolioUrl?: string;
};

type JDCompareResult = {
  targetRole: string;
  resumeAnalyzed: string;
  matchScore: number;
  matchingSkills: string[];
  missingSkills: string[];
  recommendations: string[];
  summary: string;
  isPlaceholder?: boolean;
};

export default function ResumePortfolio() {
  const [tab, setTab] = useState<'resume' | 'portfolio'>('resume');
  const [profile, setProfile] = useState<any>(null);
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [uploading, setUploading] = useState(false);

  // Toast state
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning'>('success');

  // JD Matcher State
  const [targetRole, setTargetRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [useExistingResume, setUseExistingResume] = useState(true);
  const [newJdFile, setNewJdFile] = useState<File | null>(null);
  const [comparing, setComparing] = useState(false);
  const [jdResult, setJdResult] = useState<JDCompareResult | null>(null);

  // Portfolio State
  const [portfolioUrlInput, setPortfolioUrlInput] = useState('');
  const [savedPortfolioUrl, setSavedPortfolioUrl] = useState('');
  const [savingPortfolio, setSavingPortfolio] = useState(false);
  const [viewportMode, setViewportMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [iframeKey, setIframeKey] = useState(0);

  const loadData = async () => {
    try {
      const [profileRes, resumeRes] = await Promise.all([
        api.get('/students/profile'),
        api.get('/resume'),
      ]);

      const prof = profileRes.data?.data || null;
      const resData = resumeRes.data?.data || null;

      setProfile(prof);
      setResume(resData);

      const existingUrl =
        resData?.portfolioUrl ||
        prof?.portfolio?.url ||
        prof?.socialLinks?.website ||
        '';

      setSavedPortfolioUrl(existingUrl);
      setPortfolioUrlInput(existingUrl);
      if (resData?.fileUrl) {
        setUseExistingResume(true);
      } else {
        setUseExistingResume(false);
      }
    } catch (error) {
      console.warn('Resume data not available yet', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToastMessage(message);
    setToastType(type);
  };

  // Upload Resume (Left Side)
  const handleResumeUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('resume', file);

    setUploading(true);
    try {
      const response = await api.post('/resume/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setResume(response.data?.data || null);
      showToast(response.data?.message || 'Resume uploaded successfully!', 'success');
      await loadData();
    } catch (uploadError) {
      const msg = axios.isAxiosError(uploadError)
        ? uploadError.response?.data?.message
        : 'Unable to upload resume. Please check file format and size.';
      showToast(msg || 'Resume upload failed', 'error');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  // Compare Resume with Job Description (Right Side)
  const handleCompareJD = async (e: FormEvent) => {
    e.preventDefault();

    if (!jobDescription.trim()) {
      showToast('Please enter a job description to compare.', 'warning');
      return;
    }

    if (!useExistingResume && !newJdFile) {
      showToast('Please select a CV file to compare with this job description.', 'warning');
      return;
    }

    if (useExistingResume && !resume?.fileUrl) {
      showToast('No existing resume found. Please upload a resume first or choose "Upload a new CV".', 'warning');
      return;
    }

    setComparing(true);
    setJdResult(null);

    try {
      const formData = new FormData();
      formData.append('jobDescription', jobDescription);
      formData.append('targetRole', targetRole);
      formData.append('useExistingResume', String(useExistingResume));

      if (!useExistingResume && newJdFile) {
        formData.append('resume', newJdFile);
      }

      const response = await api.post('/resume/compare-jd', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data?.data) {
        setJdResult(response.data.data);
        showToast(response.data.message || 'Comparison completed successfully!', 'success');
      }
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message
        : 'Failed to analyze resume against job description.';
      showToast(msg || 'JD comparison failed', 'error');
    } finally {
      setComparing(false);
    }
  };

  // Save Portfolio URL
  const handleSavePortfolio = async (e: FormEvent) => {
    e.preventDefault();
    let url = portfolioUrlInput.trim();

    if (!url) {
      showToast('Please enter a valid website URL.', 'warning');
      return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }

    setSavingPortfolio(true);
    try {
      await api.put('/resume/portfolio', { portfolioUrl: url });
      setSavedPortfolioUrl(url);
      setPortfolioUrlInput(url);
      setIframeKey((k) => k + 1);
      showToast('Portfolio website URL saved successfully!', 'success');
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.message
        : 'Failed to save portfolio URL.';
      showToast(msg || 'Portfolio update failed', 'error');
    } finally {
      setSavingPortfolio(false);
    }
  };

  const fullResumeUrl = resume?.fileUrl
    ? resume.fileUrl.startsWith('http')
      ? resume.fileUrl
      : `http://localhost:5000${resume.fileUrl}`
    : null;

  return (
    <Layout title="Resume & Portfolio" subtitle="Manage your CV, test JD alignment, and showcase your live portfolio.">
      <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage('')} />

      <div className="tab-switch mb-4">
        <button
          type="button"
          className={tab === 'resume' ? 'active' : ''}
          onClick={() => setTab('resume')}
        >
          <i className="bi bi-file-earmark-person me-2" />
          Resume & JD Matcher
        </button>
        <button
          type="button"
          className={tab === 'portfolio' ? 'active' : ''}
          onClick={() => setTab('portfolio')}
        >
          <i className="bi bi-window-stack me-2" />
          Live Portfolio Showcase
        </button>
      </div>

      {tab === 'resume' ? (
        <div className="row g-4">
          {/* ======================================================== */}
          {/* LEFT COLUMN: RESUME UPLOAD (TOP) & FULL RESUME VIEW (BELOW) */}
          {/* ======================================================== */}
          <div className="col-lg-6">
            {/* Small Resume Upload Section at Left Top */}
            <div className="panel-card mb-3 p-3">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="fw-bold small text-dark">
                  <i className="bi bi-cloud-arrow-up text-primary me-2" />
                  {resume?.fileUrl ? 'Replace Resume' : 'Upload Resume'}
                </span>
                <small className="text-muted">PDF, DOC, DOCX, TXT (Max 5MB)</small>
              </div>

              <div>
                <label
                  className="btn btn-outline-primary btn-sm w-100 py-2 d-flex align-items-center justify-content-center cursor-pointer mb-0 fw-semibold"
                  style={{ borderRadius: 8, borderStyle: 'dashed', borderWidth: '1.5px' }}
                >
                  <i className="bi bi-upload me-2" />
                  {uploading
                    ? 'Uploading & extracting...'
                    : resume?.fileUrl
                    ? 'Choose New File to Replace'
                    : 'Choose Resume File'}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleResumeUpload}
                    disabled={uploading}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>

            {/* Below that: Full Uploaded Resume View (No KPIs) */}
            <div className="panel-card p-3">
              <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
                <div className="overflow-hidden me-2">
                  <strong className="d-block text-truncate" title={resume?.originalName || 'NA'}>
                    <i className="bi bi-file-earmark-pdf text-danger me-2" />
                    {resume?.originalName || 'NA'}
                  </strong>
                  <small className="text-muted d-block">
                    Uploaded: {resume?.uploadedAt ? new Date(resume.uploadedAt).toLocaleDateString() : 'NA'}
                  </small>
                </div>
                {fullResumeUrl ? (
                  <a
                    href={fullResumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary btn-sm px-3 fw-semibold text-nowrap"
                  >
                    <i className="bi bi-box-arrow-up-right me-1" /> Open
                  </a>
                ) : null}
              </div>

              {fullResumeUrl ? (
                <div
                  className="resume-viewer-frame border rounded-3 overflow-hidden bg-light"
                  style={{ height: '700px' }}
                >
                  <iframe
                    src={fullResumeUrl}
                    title="Full Uploaded Resume Document"
                    className="w-100 h-100 border-0 d-block"
                  />
                </div>
              ) : (
                <div className="text-center py-5 px-3 border rounded-3 bg-light">
                  <i className="bi bi-file-earmark-x text-muted display-4 mb-2 d-block" />
                  <h6 className="fw-bold mb-1">No Resume Uploaded</h6>
                  <p className="text-muted small mb-0">
                    Upload your resume using the section above to view the full document here.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN: RESUME & JOB DESCRIPTION (JD) MATCHER      */}
          {/* ======================================================== */}
          <div className="col-lg-6">
            <div className="panel-card mb-4">
              <div className="panel-head mb-3">
                <div>
                  <h5 className="mb-0">
                    <i className="bi bi-stars text-primary me-2" />
                    Compare Resume with Job Description
                  </h5>
                  <small className="text-muted">
                    Evaluate your resume against target job requirements to reveal keyword gaps
                  </small>
                </div>
              </div>

              <form onSubmit={handleCompareJD}>
                {/* Target Role */}
                <div className="mb-3">
                  <label className="form-label fw-semibold small">Target Role / Designation (optional)</label>
                  <input
                    type="text"
                    className="form-control modern-input"
                    placeholder="e.g. Full Stack Developer, Data Scientist, DevOps Engineer"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                  />
                </div>

                {/* Resume Source Option */}
                <div className="mb-3">
                  <label className="form-label fw-semibold small">Select Resume for Comparison</label>
                  <div className="d-flex flex-wrap gap-3">
                    <label className="check mb-0 cursor-pointer">
                      <input
                        type="radio"
                        name="resumeSource"
                        checked={useExistingResume}
                        disabled={!resume?.fileUrl}
                        onChange={() => setUseExistingResume(true)}
                      />
                      <span>
                        Use latest uploaded CV
                        {resume?.originalName ? ` (${resume.originalName})` : ' (NA)'}
                      </span>
                    </label>

                    <label className="check mb-0 cursor-pointer">
                      <input
                        type="radio"
                        name="resumeSource"
                        checked={!useExistingResume}
                        onChange={() => setUseExistingResume(false)}
                      />
                      <span>Upload a different CV for this JD</span>
                    </label>
                  </div>

                  {!useExistingResume && (
                    <div className="mt-2">
                      <input
                        type="file"
                        className="form-control form-control-sm"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={(e) => setNewJdFile(e.target.files?.[0] || null)}
                        required={!useExistingResume}
                      />
                      <small className="text-muted">Selected file will be evaluated against the JD.</small>
                    </div>
                  )}
                </div>

                {/* Job Description Textarea */}
                <div className="mb-3">
                  <label className="form-label fw-semibold small">
                    Job Description (JD) *
                  </label>
                  <textarea
                    className="form-control modern-input"
                    rows={6}
                    placeholder="Paste the target job description, responsibilities, and required qualifications here..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    required
                  />
                  <div className="d-flex justify-content-between mt-1 text-muted small">
                    <span>Paste complete text for accurate keyword matching</span>
                    <span>{jobDescription.length} characters</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="primary-btn w-100 justify-content-center"
                  disabled={comparing}
                >
                  {comparing ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                      Analyzing Resume against JD...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-magic me-2" />
                      Compare Resume with JD
                    </>
                  )}
                </button>
              </form>

              {/* JD Match Results Area */}
              {jdResult && (
                <div className="mt-4 pt-3 border-top">
                  <div className="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
                    <div>
                      <h6 className="fw-bold mb-0">Match Evaluation Results</h6>
                      <small className="text-muted">
                        Evaluated for: <strong>{jdResult.targetRole || 'NA'}</strong> using <em>{jdResult.resumeAnalyzed || 'NA'}</em>
                      </small>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span className="fs-4 fw-bold text-primary">{jdResult.matchScore != null ? `${jdResult.matchScore}%` : 'NA'}</span>
                      <span className="badge bg-success-subtle text-success">
                        {jdResult.matchScore >= 80 ? 'High Match' : jdResult.matchScore >= 60 ? 'Moderate Match' : 'Low Match'}
                      </span>
                    </div>
                  </div>

                  {/* Match Progress Bar */}
                  <div className="progress mb-3" style={{ height: 8 }}>
                    <div
                      className="progress-bar bg-primary"
                      style={{ width: `${jdResult.matchScore ?? 0}%` }}
                    />
                  </div>

                  {/* Summary */}
                  <p className="small text-muted mb-3 bg-light p-2 rounded">
                    <i className="bi bi-chat-left-quote me-1 text-primary" />
                    {jdResult.summary || 'NA'}
                  </p>

                  {/* Matching Skills */}
                  <div className="mb-3">
                    <strong className="d-block small text-success mb-1">
                      <i className="bi bi-check-circle-fill me-1" />
                      Matching Skills Found in Resume ({jdResult.matchingSkills?.length ?? 0})
                    </strong>
                    <div>
                      {jdResult.matchingSkills?.length ? (
                        jdResult.matchingSkills.map((skill) => (
                          <span key={skill} className="jd-skill-pill match">
                            <i className="bi bi-check2" /> {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted small">NA</span>
                      )}
                    </div>
                  </div>

                  {/* Missing Skills */}
                  <div className="mb-3">
                    <strong className="d-block small text-warning-emphasis mb-1">
                      <i className="bi bi-exclamation-triangle-fill me-1 text-warning" />
                      Missing Skills / Identified Gaps ({jdResult.missingSkills?.length ?? 0})
                    </strong>
                    <div>
                      {jdResult.missingSkills?.length ? (
                        jdResult.missingSkills.map((skill) => (
                          <span key={skill} className="jd-skill-pill missing">
                            <i className="bi bi-plus-lg" /> {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted small">NA</span>
                      )}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="mb-2">
                    <strong className="d-block small text-dark mb-2">
                      <i className="bi bi-lightbulb-fill text-warning me-1" />
                      Key Improvement Recommendations
                    </strong>
                    <div>
                      {jdResult.recommendations?.length ? (
                        jdResult.recommendations.map((rec, idx) => (
                          <div key={idx} className="jd-recommendation-item">
                            {rec}
                          </div>
                        ))
                      ) : (
                        <span className="text-muted small">NA</span>
                      )}
                    </div>
                  </div>

                  {jdResult.isPlaceholder && (
                    <div className="border border-info-subtle bg-info-subtle p-2 rounded small text-dark mt-3">
                      <i className="bi bi-code-slash me-1 text-primary" />
                      <strong>Developer Hook:</strong> This endpoint is wired to <code>POST /api/resume/compare-jd</code> in your Express server, prepared for direct integration with your custom AI intelligence service.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* PORTFOLIO SECTION: CONFIGURATION & VISUALIZATION        */
        /* ======================================================== */
        <div>
          {/* Portfolio Configuration Bar */}
          <div className="panel-card mb-4">
            <div className="row g-3 align-items-center">
              <div className="col-lg-7">
                <form onSubmit={handleSavePortfolio} className="d-flex flex-wrap gap-2">
                  <div className="input-icon flex-grow-1" style={{ minWidth: 260 }}>
                    <i className="bi bi-globe2" />
                    <input
                      type="url"
                      placeholder="https://yourportfolio.github.io or custom domain"
                      value={portfolioUrlInput}
                      onChange={(e) => setPortfolioUrlInput(e.target.value)}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="primary-btn btn-sm"
                    disabled={savingPortfolio}
                  >
                    {savingPortfolio ? 'Saving...' : 'Save Website URL'}
                  </button>
                </form>
              </div>

              <div className="col-lg-5 d-flex justify-content-lg-end align-items-center gap-2">
                {savedPortfolioUrl ? (
                  <>
                    {/* Viewport mode switcher */}
                    <div className="browser-controls d-flex gap-1">
                      <button
                        type="button"
                        className={viewportMode === 'desktop' ? 'active' : ''}
                        title="Desktop view"
                        onClick={() => setViewportMode('desktop')}
                      >
                        <i className="bi bi-display" />
                      </button>
                      <button
                        type="button"
                        className={viewportMode === 'tablet' ? 'active' : ''}
                        title="Tablet view"
                        onClick={() => setViewportMode('tablet')}
                      >
                        <i className="bi bi-tablet" />
                      </button>
                      <button
                        type="button"
                        className={viewportMode === 'mobile' ? 'active' : ''}
                        title="Mobile view"
                        onClick={() => setViewportMode('mobile')}
                      >
                        <i className="bi bi-phone" />
                      </button>
                      <button
                        type="button"
                        title="Reload preview"
                        onClick={() => setIframeKey((k) => k + 1)}
                      >
                        <i className="bi bi-arrow-clockwise" />
                      </button>
                    </div>

                    <a
                      href={savedPortfolioUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="outline-btn btn-sm"
                    >
                      <i className="bi bi-box-arrow-up-right me-1" /> Open Live Site
                    </a>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* Visualization Area */}
          {savedPortfolioUrl ? (
            <div
              className="browser-frame"
              style={{
                maxWidth:
                  viewportMode === 'mobile'
                    ? '390px'
                    : viewportMode === 'tablet'
                    ? '768px'
                    : '100%',
              }}
            >
              {/* Browser Bar */}
              <div className="browser-bar">
                <div className="browser-dots">
                  <span className="browser-dot red" />
                  <span className="browser-dot yellow" />
                  <span className="browser-dot green" />
                </div>
                <div className="browser-url-bar">
                  <i className="bi bi-lock-fill text-success" />
                  <span>{savedPortfolioUrl}</span>
                </div>
                <a
                  href={savedPortfolioUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted"
                  title="Open in new window"
                >
                  <i className="bi bi-box-arrow-up-right" />
                </a>
              </div>

              {/* Browser Viewport Frame */}
              <iframe
                key={iframeKey}
                src={savedPortfolioUrl}
                title="Portfolio Website Preview"
                className="browser-viewport"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />

              <div className="bg-light p-2 text-center text-muted small border-top">
                <i className="bi bi-shield-check text-primary me-1" />
                Interactive live preview of <strong>{savedPortfolioUrl}</strong>. If your site blocks embedding via CSP/X-Frame-Options, click <strong>Open Live Site</strong>.
              </div>
            </div>
          ) : (
            <div className="panel-card text-center py-5">
              <div
                className="rounded-circle bg-primary-subtle text-primary d-grid place-items-center mx-auto mb-3"
                style={{ width: 64, height: 64 }}
              >
                <i className="bi bi-window-fullscreen display-6" />
              </div>
              <h4>Showcase Your Portfolio Website</h4>
              <p className="text-muted mx-auto mb-4" style={{ maxWidth: 520 }}>
                Connect your personal portfolio, GitHub Pages website, or project showcase. Once linked, you can interact with and visualize it directly from this dashboard.
              </p>
              <div className="d-flex justify-content-center gap-2 flex-wrap">
                <span className="badge bg-light text-dark border p-2">
                  <i className="bi bi-github me-1" /> GitHub Pages
                </span>
                <span className="badge bg-light text-dark border p-2">
                  <i className="bi bi-triangle-fill me-1" /> Vercel
                </span>
                <span className="badge bg-light text-dark border p-2">
                  <i className="bi bi-gem me-1" /> Netlify
                </span>
                <span className="badge bg-light text-dark border p-2">
                  <i className="bi bi-globe me-1" /> Custom Domain
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
