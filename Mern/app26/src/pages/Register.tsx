import { ChangeEvent, FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
// import API from "../Api/axoic";

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', studentId: '', password: '', confirm: '' });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const update = (k: string, v: string) => setForm({ ...form, [k]: v });

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
    e.preventDefault(); setError('');
    if (!form.name || !form.email || !form.studentId || !form.password) return setError('Please fill all required fields.');
    if (form.password !== form.confirm) return setError('Passwords do not match.');

    try {
      const { data } = await authApi.register({
        name: form.name,
        email: form.email,
        studentId: form.studentId,
        password: form.password,
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

  return <div className="auth-page register-page">
    <div className="auth-form-area">
      <form className="auth-card auth-card-wide" onSubmit={submit}>
        <div className="auth-logo"><i className="bi bi-rocket-takeoff-fill" /></div>
        <h2>Create your account 🚀</h2><p>Start building your career profile in one place.</p>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <div className="row g-3">
          <div className="col-md-6"><label>Full name *</label><div className="input-icon"><i className="bi bi-person" /><input value={form.name} onChange={e => update('name', e.target.value)} placeholder="Your name" /></div></div>
          <div className="col-md-6"><label>Student ID *</label><div className="input-icon"><i className="bi bi-person-vcard" /><input value={form.studentId} onChange={e => update('studentId', e.target.value)} placeholder="STU1001" /></div></div>
          <div className="col-12"><label>Email *</label><div className="input-icon"><i className="bi bi-envelope" /><input value={form.email} onChange={e => update('email', e.target.value)} type="email" placeholder="you@example.com" /></div></div>
          <div className="col-md-6"><label>Password *</label><div className="input-icon"><i className="bi bi-lock" /><input value={form.password} onChange={e => update('password', e.target.value)} type="password" placeholder="Create password" /></div></div>
          <div className="col-md-6"><label>Confirm password *</label><div className="input-icon"><i className="bi bi-shield-check" /><input value={form.confirm} onChange={e => update('confirm', e.target.value)} type="password" placeholder="Repeat password" /></div></div>
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
      <h1>Your career.<br/><span>Your dashboard.</span></h1>
      <p>Keep your academics, skills, projects, resume and placement readiness together.</p>
    </div>
  </div>;
}