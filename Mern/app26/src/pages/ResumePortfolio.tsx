import { ChangeEvent, useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

export default function ResumePortfolio() {
  const [tab, setTab] = useState<'resume' | 'portfolio'>('resume');
  const [profile, setProfile] = useState<any>(null);
  const [resume, setResume] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  const loadData = async () => {
    try {
      const [profileRes, resumeRes] = await Promise.all([
        api.get('/students/profile'),
        api.get('/resume'),
      ]);

      setProfile(profileRes.data?.data || null);
      setResume(resumeRes.data?.data || null);
    } catch (error) {
      console.warn('Resume data not available yet', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
      await loadData();
    } catch (error) {
      console.error('CV upload failed', error);
      alert('Unable to upload and scrape CV. Please check file format (PDF, DOCX) and size (under 5MB).');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const parsed = resume?.parsedData;
  const studentName = parsed?.personal_info?.name || profile?.name || 'Student Name';
  const initials = studentName
    .split(' ')
    .filter(Boolean)
    .map((part: string) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'CP';

  // Extracted skills
  const skillsObj = parsed?.skills || {};
  const progLangs = skillsObj.programming_languages || [];
  const frameworks = skillsObj.frameworks || [];
  const databases = skillsObj.databases || [];
  const tools = skillsObj.tools || [];
  const cloud = skillsObj.cloud || [];
  const allParsedSkills = [...progLangs, ...frameworks, ...databases, ...tools, ...cloud];
  const displaySkills = allParsedSkills.length > 0
    ? allParsedSkills
    : (profile?.skills || []).map((s: any) => s.name);

  return (
    <Layout title="Resume & Portfolio" subtitle="Present your strongest professional story.">
      <div className="tab-switch mb-4">
        <button className={tab === 'resume' ? 'active' : ''} onClick={() => setTab('resume')}>
          <i className="bi bi-file-earmark-person" /> Resume
        </button>
        <button className={tab === 'portfolio' ? 'active' : ''} onClick={() => setTab('portfolio')}>
          <i className="bi bi-window-stack" /> Portfolio
        </button>
      </div>

      {tab === 'resume' ? (
        <div className="row g-4">
          {/* LEFT SIDE: Scraped Detailed CV */}
          <div className="col-lg-6">
            {uploading ? (
              <div className="resume-preview d-flex flex-column align-items-center justify-content-center text-center p-5">
                <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h5 className="fw-bold">Scraping & Analyzing CV with AI...</h5>
                <p className="text-muted" style={{ maxWidth: 360 }}>
                  Extracting your contact details, education, technical skills, projects, and work experience into the database.
                </p>
              </div>
            ) : !resume?.fileUrl && !parsed ? (
              <div className="resume-preview d-flex flex-column align-items-center justify-content-center text-center p-5">
                <div
                  className="rounded-circle d-grid place-items-center mb-3"
                  style={{ width: 70, height: 70, background: '#eeeaff', color: '#6c5ce7', fontSize: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <i className="bi bi-file-earmark-arrow-up" />
                </div>
                <h5 className="fw-bold">No CV Scraped Yet</h5>
                <p className="text-muted" style={{ maxWidth: 380 }}>
                  Upload your CV (PDF or DOCX) on the right side. Our AI system will scrape all details, save them to the database, and display your live structured CV here.
                </p>
              </div>
            ) : (
              <div className="resume-preview" style={{ maxHeight: '820px', overflowY: 'auto' }}>
                {/* Status Pill */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-2 py-1">
                    <i className="bi bi-stars me-1" /> Scraped from CV
                  </span>
                  {resume?.uploadedAt && (
                    <small className="text-muted" style={{ fontSize: '11px' }}>
                      Updated {new Date(resume.uploadedAt).toLocaleDateString()}
                    </small>
                  )}
                </div>

                {/* Header */}
                <div className="resume-top pb-2">
                  <div className="resume-photo" style={{ width: 50, height: 50, fontSize: 18 }}>{initials}</div>
                  <div>
                    <h4 className="fw-bold mb-1" style={{ fontSize: '20px' }}>{studentName}</h4>
                    <span className="text-primary fw-semibold" style={{ fontSize: '12px' }}>
                      {profile?.department || 'Software & Placement Candidate'}
                    </span>
                  </div>
                </div>

                {/* Contact Bar */}
                <div className="d-flex flex-wrap gap-2 my-2 py-2 border-top border-bottom" style={{ fontSize: '11px' }}>
                  {(parsed?.personal_info?.email || profile?.email) && (
                    <span className="text-muted d-flex align-items-center me-2">
                      <i className="bi bi-envelope me-1 text-primary" />
                      {parsed?.personal_info?.email || profile?.email}
                    </span>
                  )}
                  {parsed?.personal_info?.phone && (
                    <span className="text-muted d-flex align-items-center me-2">
                      <i className="bi bi-telephone me-1 text-primary" />
                      {parsed.personal_info.phone}
                    </span>
                  )}
                  {parsed?.personal_info?.location && (
                    <span className="text-muted d-flex align-items-center me-2">
                      <i className="bi bi-geo-alt me-1 text-primary" />
                      {parsed.personal_info.location}
                    </span>
                  )}
                  {parsed?.personal_info?.linkedin && (
                    <a
                      href={`https://${parsed.personal_info.linkedin.replace(/^https?:\/\//, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="badge bg-light text-primary border text-decoration-none"
                    >
                      <i className="bi bi-linkedin me-1" /> LinkedIn
                    </a>
                  )}
                  {parsed?.personal_info?.github && (
                    <a
                      href={`https://${parsed.personal_info.github.replace(/^https?:\/\//, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="badge bg-light text-dark border text-decoration-none"
                    >
                      <i className="bi bi-github me-1" /> GitHub
                    </a>
                  )}
                </div>

                {/* Professional Summary */}
                <div className="mt-3">
                  <h6 className="fw-bold text-uppercase text-secondary" style={{ fontSize: '11px', letterSpacing: '0.8px' }}>
                    <i className="bi bi-person-lines-fill me-1 text-primary" /> Professional Summary
                  </h6>
                  <p className="text-secondary mb-3" style={{ fontSize: '12px', lineHeight: 1.6 }}>
                    {parsed?.summary || profile?.bio || 'Driven software engineer with hands-on development expertise and strong foundational problem-solving capabilities.'}
                  </p>
                </div>

                {/* Technical Skills */}
                <div className="mt-3">
                  <h6 className="fw-bold text-uppercase text-secondary mb-2" style={{ fontSize: '11px', letterSpacing: '0.8px' }}>
                    <i className="bi bi-cpu me-1 text-primary" /> Technical Skills
                  </h6>
                  {progLangs.length > 0 && (
                    <div className="mb-2">
                      <small className="text-muted fw-bold d-block mb-1" style={{ fontSize: '10px' }}>LANGUAGES</small>
                      <div className="d-flex flex-wrap gap-1">
                        {progLangs.map((s: string) => (
                          <span key={s} className="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1" style={{ fontSize: '11px' }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {frameworks.length > 0 && (
                    <div className="mb-2">
                      <small className="text-muted fw-bold d-block mb-1" style={{ fontSize: '10px' }}>FRAMEWORKS & LIBRARIES</small>
                      <div className="d-flex flex-wrap gap-1">
                        {frameworks.map((s: string) => (
                          <span key={s} className="badge bg-info-subtle text-info-emphasis border border-info-subtle px-2 py-1" style={{ fontSize: '11px' }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {databases.length > 0 && (
                    <div className="mb-2">
                      <small className="text-muted fw-bold d-block mb-1" style={{ fontSize: '10px' }}>DATABASES & STORAGE</small>
                      <div className="d-flex flex-wrap gap-1">
                        {databases.map((s: string) => (
                          <span key={s} className="badge bg-success-subtle text-success-emphasis border border-success-subtle px-2 py-1" style={{ fontSize: '11px' }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {tools.length > 0 && (
                    <div className="mb-2">
                      <small className="text-muted fw-bold d-block mb-1" style={{ fontSize: '10px' }}>TOOLS & PLATFORMS</small>
                      <div className="d-flex flex-wrap gap-1">
                        {tools.map((s: string) => (
                          <span key={s} className="badge bg-secondary-subtle text-secondary px-2 py-1" style={{ fontSize: '11px' }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {cloud.length > 0 && (
                    <div className="mb-2">
                      <small className="text-muted fw-bold d-block mb-1" style={{ fontSize: '10px' }}>CLOUD</small>
                      <div className="d-flex flex-wrap gap-1">
                        {cloud.map((s: string) => (
                          <span key={s} className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle px-2 py-1" style={{ fontSize: '11px' }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {allParsedSkills.length === 0 && (
                    <div className="d-flex flex-wrap gap-1">
                      {displaySkills.map((s: string) => (
                        <span key={s} className="badge bg-light text-dark border px-2 py-1" style={{ fontSize: '11px' }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Experience & Internships */}
                {(parsed?.experience?.length > 0 || parsed?.internships?.length > 0 || (profile?.internships && profile.internships.length > 0)) && (
                  <div className="mt-3">
                    <h6 className="fw-bold text-uppercase text-secondary mb-2" style={{ fontSize: '11px', letterSpacing: '0.8px' }}>
                      <i className="bi bi-briefcase me-1 text-primary" /> Experience & Internships
                    </h6>
                    {parsed?.experience && parsed.experience.length > 0 ? (
                      parsed.experience.map((exp: any, i: number) => (
                        <div key={i} className="mb-2 pb-2 border-bottom">
                          <div className="d-flex justify-content-between align-items-center">
                            <strong style={{ fontSize: '12px' }}>{exp.company}</strong>
                            <small className="text-muted" style={{ fontSize: '10px' }}>{exp.start_date || exp.location || ''}</small>
                          </div>
                          <div className="text-primary" style={{ fontSize: '11px' }}>{exp.job_title}</div>
                          {exp.description && exp.description.length > 0 && (
                            <ul className="ps-3 mb-0 text-muted" style={{ fontSize: '11px' }}>
                              {exp.description.map((bullet: string, bIdx: number) => (
                                <li key={bIdx}>{bullet}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))
                    ) : (
                      (profile?.internships || []).map((item: any, idx: number) => (
                        <div key={idx} className="mb-2 pb-1 border-bottom">
                          <strong style={{ fontSize: '12px' }}>{item.company}</strong>
                          <div className="text-muted" style={{ fontSize: '11px' }}>{item.role || 'Intern'}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Projects */}
                {(parsed?.projects?.length > 0 || (profile?.projects && profile.projects.length > 0)) && (
                  <div className="mt-3">
                    <h6 className="fw-bold text-uppercase text-secondary mb-2" style={{ fontSize: '11px', letterSpacing: '0.8px' }}>
                      <i className="bi bi-folder-check me-1 text-primary" /> Projects
                    </h6>
                    {(parsed?.projects || profile?.projects || []).map((proj: any, idx: number) => (
                      <div key={idx} className="mb-2 p-2 bg-light rounded-2 border">
                        <strong style={{ fontSize: '12px' }}>{proj.name || proj.title}</strong>
                        {proj.description && (
                          <p className="text-muted mb-1" style={{ fontSize: '11px', lineHeight: 1.4 }}>
                            {proj.description}
                          </p>
                        )}
                        {proj.technologies && proj.technologies.length > 0 && (
                          <div className="d-flex flex-wrap gap-1 mt-1">
                            {proj.technologies.map((t: string) => (
                              <span key={t} className="badge bg-white text-secondary border" style={{ fontSize: '9px' }}>
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Education */}
                {(parsed?.education?.length > 0 || profile?.academic) && (
                  <div className="mt-3">
                    <h6 className="fw-bold text-uppercase text-secondary mb-2" style={{ fontSize: '11px', letterSpacing: '0.8px' }}>
                      <i className="bi bi-mortarboard me-1 text-primary" /> Education
                    </h6>
                    {parsed?.education && parsed.education.length > 0 ? (
                      parsed.education.map((edu: any, idx: number) => (
                        <div key={idx} className="mb-2">
                          <div className="d-flex justify-content-between align-items-center">
                            <strong style={{ fontSize: '12px' }}>{edu.degree}</strong>
                            {edu.cgpa && <span className="badge bg-success-subtle text-success">{edu.cgpa}</span>}
                          </div>
                          <div className="text-muted" style={{ fontSize: '11px' }}>{edu.institution}</div>
                        </div>
                      ))
                    ) : (
                      <div className="mb-2">
                        <strong style={{ fontSize: '12px' }}>{profile?.department || 'B.Tech Engineering'}</strong>
                        <div className="text-muted" style={{ fontSize: '11px' }}>CGPA: {profile?.academic?.cgpa || 8.5}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Certifications */}
                {parsed?.certifications && parsed.certifications.length > 0 && (
                  <div className="mt-3">
                    <h6 className="fw-bold text-uppercase text-secondary mb-2" style={{ fontSize: '11px', letterSpacing: '0.8px' }}>
                      <i className="bi bi-award me-1 text-primary" /> Certifications
                    </h6>
                    <ul className="list-unstyled mb-0" style={{ fontSize: '11px' }}>
                      {parsed.certifications.map((c: string, idx: number) => (
                        <li key={idx} className="d-flex align-items-center text-secondary mb-1">
                          <i className="bi bi-patch-check-fill text-success me-2" /> {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT SIDE: Resume Health & Upload / Replace Panel */}
          <div className="col-lg-6">
            <div className="panel-card">
              <div className="panel-head">
                <div>
                  <h5>Resume Health & Scraper</h5>
                  <small>AI-powered resume analysis & sync</small>
                </div>
                <span className="score-badge large">{resume?.resumeScore || 86}/100</span>
              </div>

              <div className="resume-score-row">
                <span>ATS compatibility</span>
                <strong>{resume?.atsScore || 91}%</strong>
              </div>
              <div className="progress mb-3">
                <div style={{ width: `${resume?.atsScore || 91}%` }} />
              </div>

              <div className="resume-score-row">
                <span>Content quality</span>
                <strong>{resume?.resumeScore ? Math.min(resume.resumeScore + 2, 95) : 84}%</strong>
              </div>
              <div className="progress mb-3">
                <div style={{ width: `${resume?.resumeScore ? Math.min(resume.resumeScore + 2, 95) : 84}%` }} />
              </div>

              <div className="resume-score-row">
                <span>Extracted skills count</span>
                <strong>{displaySkills.length} skills detected</strong>
              </div>
              <div className="progress mb-4">
                <div style={{ width: `${Math.min(displaySkills.length * 8, 100)}%` }} />
              </div>

              {resume?.fileUrl ? (
                <div className="mb-3 p-3 bg-light rounded-3 border">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-muted" style={{ fontSize: '12px' }}>Active CV in Database:</span>
                    <strong style={{ fontSize: '12px' }}>{resume.originalName || 'Resume.pdf'}</strong>
                  </div>
                  <a
                    href={`http://localhost:5000${resume.fileUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="outline-btn w-100 text-center d-block py-2"
                  >
                    <i className="bi bi-box-arrow-up-right me-1" /> Open Uploaded CV Document
                  </a>
                </div>
              ) : null}

              <label className="upload-zone d-block text-center cursor-pointer p-4 border rounded-3">
                <i className="bi bi-cloud-arrow-up display-6 text-primary d-block mb-2" />
                <strong className="d-block">
                  {uploading ? 'Scraping and Saving...' : resume?.fileUrl ? 'Replace CV & Re-scrape' : 'Upload CV to Scrape'}
                </strong>
                <small className="text-muted d-block mt-1">
                  {resume?.originalName ? `Current: ${resume.originalName} (PDF/DOCX/TXT - Max 5MB)` : 'Supports PDF, DOCX, TXT - Max 5MB'}
                </small>
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
        </div>
      ) : (
        <div className="row g-4">
          <div className="col-lg-4">
            <div className="project-card">
              <div className="project-icon">
                <i className="bi bi-code-square" />
              </div>
              <span className="status-pill success-pill">Featured</span>
              <h5>Placement Prediction System</h5>
              <p>Predict placement readiness using machine learning and real student analytics.</p>
              <div className="tech-tags">
                <span>Python</span>
                <span>ML</span>
                <span>React</span>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="project-card">
              <div className="project-icon">
                <i className="bi bi-bar-chart" />
              </div>
              <span className="status-pill success-pill">Live</span>
              <h5>Career Analytics Dashboard</h5>
              <p>Visualize academic, skill, and placement growth in a clean student dashboard.</p>
              <div className="tech-tags">
                <span>Charts</span>
                <span>UI</span>
                <span>Insights</span>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="project-card">
              <div className="project-icon">
                <i className="bi bi-github" />
              </div>
              <span className="status-pill">Portfolio</span>
              <h5>GitHub Portfolio</h5>
              <p>Organize work samples, repositories, and deployment highlights in one place.</p>
              <div className="tech-tags">
                <span>GitHub</span>
                <span>Projects</span>
                <span>Showcase</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
