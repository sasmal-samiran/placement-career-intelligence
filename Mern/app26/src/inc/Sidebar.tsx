import { NavLink } from 'react-router-dom';
import { useState } from 'react';

const menu = [
  { to: '/dashboard', icon: 'bi-grid-1x2-fill', label: 'Dashboard' },
  { to: '/profile', icon: 'bi-person-badge-fill', label: 'Student Profile' },
  { to: '/academic', icon: 'bi-bar-chart-fill', label: 'Academic Performance' },
  { to: '/attendance', icon: 'bi-calendar2-check-fill', label: 'Attendance' },
  { to: '/skills', icon: 'bi-lightning-charge-fill', label: 'Skills' },
  { to: '/projects', icon: 'bi-kanban-fill', label: 'Projects' },
  { to: '/internships', icon: 'bi-building-fill', label: 'Internships' },
  { to: '/certifications', icon: 'bi-patch-check-fill', label: 'Certifications' },
  { to: '/coding', icon: 'bi-code-slash', label: 'Coding Profile' },
  { to: '/resume', icon: 'bi-file-earmark-person-fill', label: 'Resume & Portfolio' },
  { to: '/placement', icon: 'bi-bullseye', label: 'Placement Prediction' },
  { to: '/mentor', icon: 'bi-robot', label: 'AI Career Mentor' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="brand">
        <div className="brand-logo"><i className="bi bi-rocket-takeoff-fill" /></div>
        {!collapsed && <div><strong>Career Pilot</strong><small>Student Success Hub</small></div>}
      </div>
      <div className="sidebar-section-title">{!collapsed && 'MAIN MENU'}</div>
      <nav className="side-nav">
        {menu.map(item => (
          <NavLink key={item.to} to={item.to} title={collapsed ? item.label : undefined} className={({isActive}) => `side-link ${isActive ? 'active' : ''}`}>
            <i className={`bi ${item.icon}`} />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
      <button className="sidebar-toggle" onClick={() => setCollapsed(v => !v)}>
        <i className={`bi bi-chevron-${collapsed ? 'right' : 'left'}`} />
        {!collapsed && 'Collapse menu'}
      </button>
    </aside>
  );
}