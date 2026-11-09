import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const { data } = await authApi.login({ email, password });
      login(data.user, data.token);
      localStorage.removeItem('careerPilotSetupRequired');

      const requestedPath = (location.state as any)?.from;
      navigate(requestedPath && requestedPath !== '/onboarding' ? requestedPath : '/dashboard');
    } catch (loginError: any) {
      setError(loginError.response?.data?.message || 'Sign in failed. Check your email and password.');
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-art">
        <div className="auth-orbit orbit-1" /><div className="auth-orbit orbit-2" />
        <div className="auth-rocket"><i className="bi bi-rocket-takeoff-fill" /></div>
        <h1>Take control of<br /><span>your career.</span></h1>
        <p>Track performance, discover skill gaps, prepare for placements and get AI-powered career guidance.</p>
        <div className="auth-mini-stats">
          <div><strong>12+</strong><small>Career modules</small></div>
          <div><strong>360°</strong><small>Student view</small></div>
          <div><strong>AI</strong><small>Career mentor</small></div>
        </div>
      </div>
      <div className="auth-form-area">
        <form className="auth-card" onSubmit={submit}>
          <div className="auth-logo"><i className="bi bi-rocket-takeoff-fill" /></div>
          <h2>Welcome back 👋</h2>
          <p>Sign in to continue to Career Pilot.</p>
          {error && <div className="alert alert-danger py-2">{error}</div>}
          <label>Email address</label>
          <div className="input-icon">
            <i className="bi bi-envelope" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" required />
          </div>
          <label>Password</label>
          <div className="input-icon">
            <i className="bi bi-lock" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type={show ? 'text' : 'password'} placeholder="••••••••" required />
            <button type="button" onClick={() => setShow(!show)}><i className={`bi bi-eye${show ? '-slash' : ''}`} /></button>
          </div>

          <div className="auth-row">
            <label className="check"><input type="checkbox" /> Remember me</label>
            <a href="#forgot">Forgot password?</a>
          </div>
          <button className="primary-btn w-100" type="submit">
            Sign In <i className="bi bi-arrow-right" />
          </button>
          <div className="auth-divider"><span>or</span></div>
          <p className="auth-bottom">New to Career Pilot? <Link to="/register">Create an account</Link></p>
        </form>
      </div>
    </div>
  );
}
