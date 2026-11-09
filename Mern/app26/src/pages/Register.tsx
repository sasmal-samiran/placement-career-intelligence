import { ChangeEvent, FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const BRANCHES = [
  { code: 'CSE', name: 'Computer Science and Engineering (CSE)' },
  { code: 'DS', name: 'Computer Science and Engineering – Data Science (DS)' },
  { code: 'AIML', name: 'Computer Science and Engineering – Artificial Intelligence and Machine Learning (AIML)' },
  { code: 'IT', name: 'Information Technology (IT)' },
  { code: 'CS', name: 'Computer Science and Engineering – Cyber Security (CS)' },
  { code: 'ECE', name: 'Electronics and Communication Engineering (ECE)' },
  { code: 'EEE', name: 'Electrical and Electronics Engineering (EEE)' },
  { code: 'Mechanical', name: 'Mechanical Engineering (Mechanical)' },
  { code: 'Civil', name: 'Civil Engineering (Civil)' },
  { code: 'Chemical', name: 'Chemical Engineering (Chemical)' },
];

export default function Register() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    studentId: '',
    password: '',
    confirm: '',
    dob: '',
    branch: '',
    university: '',
    collegeTier: '3',
    currentYear: '',
  });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const update = (k: string, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  const uploadResume = async (token: string) => {
    if (!resumeFile) return;

    const formData = new FormData();
    formData.append('resume', resumeFile);

    setIsUploadingResume(true);
    try {
      localStorage.setItem('careerPilotToken', token);
      await api.post('/resume/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } finally {
      setIsUploadingResume(false);
    }
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (
      !form.name ||
      !form.email ||
      !form.studentId ||
      !form.password ||
      !form.dob ||
      !form.branch ||
      !form.university ||
      !form.collegeTier ||
      !form.currentYear
    ) {
      return setError('Please fill all required fields.');
    }

    if (form.password !== form.confirm) return setError('Passwords do not match.');

    try {
      const { data } = await authApi.register({
        name: form.name.trim(),
        email: form.email.trim(),
        studentId: form.studentId.trim(),
        password: form.password,
        dob: form.dob,
        branch: form.branch,
        university: form.university.trim(),
        collegeTier: Number(form.collegeTier),
        currentYear: String(form.currentYear),
      });

      login(data.user, data.token);
      localStorage.setItem('careerPilotSetupRequired', 'true');

      let notice = '';
      try {
        await uploadResume(data.token);
      } catch {
        notice = 'Your account was created, but the CV upload failed. You can add it later.';
      }

      navigate('/onboarding', { replace: true, state: { notice } });
    } catch (registrationError: any) {
      setError(registrationError.response?.data?.message || 'Account registration failed. Please try again.');
    }
  }

  return (
    <div className="auth-page register-page">
      <div className="auth-form-area">
        <form className="auth-card auth-card-wide" onSubmit={submit}>
          <div className="auth-logo"><i className="bi bi-rocket-takeoff-fill" /></div>
          <h2>Create your account 🚀</h2>
          <p>Start building your career profile in one place.</p>
          {error && <div className="alert alert-danger py-2">{error}</div>}
          <div className="row g-3">
            <div className="col-md-6">
              <label>Full name *</label>
              <div className="input-icon">
                <i className="bi bi-person" />
                <input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Your name" required />
              </div>
            </div>
            <div className="col-md-6">
              <label>Student ID *</label>
              <div className="input-icon">
                <i className="bi bi-person-vcard" />
                <input value={form.studentId} onChange={(e) => update('studentId', e.target.value)} placeholder="STU1001" required />
              </div>
            </div>
            <div className="col-12">
              <label>Email *</label>
              <div className="input-icon">
                <i className="bi bi-envelope" />
                <input value={form.email} onChange={(e) => update('email', e.target.value)} type="email" placeholder="you@example.com" required />
              </div>
            </div>
            <div className="col-md-6">
              <label>Date of birth *</label>
              <div className="input-icon">
                <i className="bi bi-calendar3" />
                <input
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={form.dob}
                  onChange={(e) => update('dob', e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="col-md-6">
              <label>Branch *</label>
              <div className="input-icon">
                <i className="bi bi-journal-code" />
                <select value={form.branch} onChange={(e) => update('branch', e.target.value)} required>
                  <option value="">Select Branch</option>
                  {BRANCHES.map((b) => (
                    <option key={b.code} value={b.code}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="col-md-6">
              <label>University *</label>
              <div className="input-icon">
                <i className="bi bi-building" />
                <input value={form.university} onChange={(e) => update('university', e.target.value)} placeholder="University name" required />
              </div>
            </div>
            <div className="col-md-6">
              <label>College Tier *</label>
              <div className="input-icon">
                <i className="bi bi-award" />
                <select value={form.collegeTier} onChange={(e) => update('collegeTier', e.target.value)} required>
                  <option value="1">Tier 1</option>
                  <option value="2">Tier 2</option>
                  <option value="3">Tier 3</option>
                </select>
              </div>
            </div>
            <div className="col-md-6">
              <label>Study Year *</label>
              <div className="input-icon">
                <i className="bi bi-mortarboard" />
                <select value={form.currentYear} onChange={(e) => update('currentYear', e.target.value)} required>
                  <option value="">Select Year</option>
                  {[1, 2, 3, 4, 5, 6].map((y) => (
                    <option key={y} value={String(y)}>Year {y}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="col-md-6">
              <label>Password *</label>
              <div className="input-icon">
                <i className="bi bi-lock" />
                <input value={form.password} onChange={(e) => update('password', e.target.value)} type="password" placeholder="Create password" required />
              </div>
            </div>
            <div className="col-md-6">
              <label>Confirm password *</label>
              <div className="input-icon">
                <i className="bi bi-shield-check" />
                <input value={form.confirm} onChange={(e) => update('confirm', e.target.value)} type="password" placeholder="Repeat password" required />
              </div>
            </div>
          </div>

          <div className="mt-3">
            <label>Upload CV (optional)</label>
            <div className="input-icon">
              <i className="bi bi-file-earmark-arrow-up" />
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e: ChangeEvent<HTMLInputElement>) => setResumeFile(e.target.files?.[0] || null)}
              />
            </div>
            <small className="text-muted d-block mt-1">This file will appear in your Resume & Portfolio section.</small>
          </div>

          <label className="check mt-3"><input type="checkbox" required /> I agree to the terms and privacy policy.</label>
          <button className="primary-btn w-100 mt-3" type="submit" disabled={isUploadingResume}>
            {isUploadingResume ? 'Saving CV...' : 'Create Account'} <i className="bi bi-arrow-right" />
          </button>
          <p className="auth-bottom mt-3">Already have an account? <Link to="/login">Sign in</Link></p>
        </form>
      </div>
      <div className="auth-art">
        <div className="success-illustration"><i className="bi bi-stars" /></div>
        <h1>Your career.<br /><span>Your dashboard.</span></h1>
        <p>Keep your academics, skills, projects, resume and placement readiness together.</p>
      </div>
    </div>
  );
}
