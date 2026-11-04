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
      alert('Unable to upload CV. Please check the file type and size.');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const studentName = profile?.name || 'Student Name';
  const initials = studentName
    .split(' ')
    .map((part: string) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

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
          <div className="col-lg-5">
            <div className="resume-preview">
              <div className="resume-top">
                <div className="resume-photo">{initials}</div>
                <div>
                  <h4>{studentName}</h4>
                  <small>{profile?.department || 'Data Science Student'}</small>
                </div>
              </div>

              <hr />
              <h6>PROFILE</h6>
              <p>
                {profile?.bio || 'Data Science student passionate about analytics, machine learning and full-stack development.'}
              </p>

              <h6>SKILLS</h6>
              <div className="resume-lines">
                {(profile?.skills || []).slice(0, 3).map((skill: any) => (
                  <span key={skill.name}>{skill.name}</span>
                ))}
              </div>

              <h6>EXPERIENCE</h6>
              <div className="resume-lines wide">
                {(profile?.internships || []).slice(0, 4).map((item: any, index: number) => (
                  <span key={`${item.company}-${index}`}>{item.company || 'Experience'}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="col-lg-7">
            <div className="panel-card">
              <div className="panel-head">
                <div>
                  <h5>Resume health</h5>
                  <small>AI-powered resume analysis</small>
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
                <strong>84%</strong>
              </div>
              <div className="progress mb-3">
                <div style={{ width: '84%' }} />
              </div>

              <div className="resume-score-row">
                <span>Keyword match</span>
                <strong>79%</strong>
              </div>
              <div className="progress mb-4">
                <div style={{ width: '79%' }} />
              </div>

              {resume?.fileUrl ? (
                <div className="mb-3">
                  <div className="resume-score-row">
                    <span>Uploaded CV</span>
                    <strong>{resume.originalName || 'Resume.pdf'}</strong>
                  </div>
                  <a href={`http://localhost:5000${resume.fileUrl}`} target="_blank" rel="noreferrer" className="outline-btn w-100 text-center">
                    Open CV
                  </a>
                </div>
              ) : null}

              <label className="upload-zone">
                <i className="bi bi-cloud-arrow-up" />
                <strong>{uploading ? 'Uploading...' : resume?.fileUrl ? 'Replace CV' : 'Upload latest resume'}</strong>
                <small>{resume?.originalName || 'PDF or DOCX - Max 5MB'}</small>
                <input type="file" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} disabled={uploading} />
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
