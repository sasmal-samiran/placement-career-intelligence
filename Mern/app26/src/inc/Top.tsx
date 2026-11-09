import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Top() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <div className="search-box">
        <i className="bi bi-search" />
        <input placeholder="Search your career data..." />
      </div>
      <div className="top-actions">
        <button className="icon-btn" title="Notifications"><i className="bi bi-bell-fill" /><span /></button>
        <div className="profile-mini" onClick={() => navigate('/profile')}>
          <div className="avatar">{(user?.name || 'S').charAt(0).toUpperCase()}</div>
          <div className="d-none d-md-block"><strong>{user?.name || 'Student'}</strong><small>{user?.studentId || 'Student'}</small></div>
          <i className="bi bi-chevron-down ms-2" />
        </div>
        <button className="logout-btn" onClick={() => { logout(); navigate('/login'); }}><i className="bi bi-box-arrow-right" /> Logout</button>
      </div>
    </header>
  );
}