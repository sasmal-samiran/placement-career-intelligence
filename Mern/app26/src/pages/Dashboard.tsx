import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import api from '../services/api';

type DashboardData = {
  stats: {
    cgpa: number;
    attendance: number;
    codingScore: number;
    placementChance: number;
  };
  semesters: Array<{ semester: string; sgpa: number }>;
  profileCompletion: number;
  activity: Array<{ icon: string; label: string; detail: string; tone: string }>;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    api.get('/dashboard')
      .then((response) => {
        if (active) setDashboard(response.data.data);
      })
      .catch(() => {
        if (active) setError('Could not load your dashboard data. Please sign in again and retry.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const stats = dashboard?.stats;
  const profileCompletion = dashboard?.profileCompletion ?? 0;

  return (
    <Layout
      title={`Good evening, ${user?.name?.split(' ')[0] || 'Student'}!`}
      subtitle="Here is your career progress at a glance."
    >
      {error && <div className="alert alert-danger" role="alert">{error}</div>}

      <div className="hero-card mb-4">
        <div>
          <span className="eyebrow">CAREER READINESS</span>
          <h2>You&apos;re making great progress.</h2>
          <p>
            Complete your profile and improve your skill gaps to increase your placement readiness.
          </p>
          <a href="/mentor" className="hero-link">
            View AI recommendations <i className="bi bi-arrow-right" />
          </a>
        </div>

        <div className="readiness-ring">
          <strong>{stats ? `${stats.placementChance}%` : loading ? '...' : '0%'}</strong>
          <span>Ready</span>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-xl-3 col-md-6">
          <StatCard icon="bi-mortarboard-fill" label="Current CGPA" value={stats ? stats.cgpa.toFixed(2) : loading ? '...' : '0.00'} tone="purple" />
        </div>
        <div className="col-xl-3 col-md-6">
          <StatCard icon="bi-calendar2-check-fill" label="Attendance" value={`${stats?.attendance ?? (loading ? '...' : 0)}%`} tone="green" />
        </div>
        <div className="col-xl-3 col-md-6">
          <StatCard icon="bi-code-square" label="Coding Score" value={`${stats?.codingScore ?? (loading ? '...' : 0)}/100`} tone="orange" />
        </div>
        <div className="col-xl-3 col-md-6">
          <StatCard icon="bi-bullseye" label="Placement Chance" value={`${stats?.placementChance ?? (loading ? '...' : 0)}%`} tone="blue" />
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="panel-card">
            <div className="panel-head">
              <div>
                <h5>Academic performance</h5>
                <small>Semester-wise CGPA trend</small>
              </div>
            </div>

            <div className="chart-area">
              {dashboard?.semesters.length ? (
                <div className="chart-grid">
                  {dashboard.semesters.map((semester) => (
                    <div key={semester.semester} className="bar-wrap">
                      <div className="bar" style={{ height: `${(semester.sgpa / 10) * 100}%` }}>
                        <span>{semester.sgpa}</span>
                      </div>
                      <small>{semester.semester}</small>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted mb-0">{loading ? 'Loading academic records...' : 'No semester records yet.'}</p>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="panel-card h-100">
            <div className="panel-head">
              <div>
                <h5>Profile completion</h5>
                <small>Complete your profile</small>
              </div>
              <strong className="completion">{profileCompletion}%</strong>
            </div>

            <div className="progress big-progress">
              <div style={{ width: `${profileCompletion}%` }} />
            </div>

            <p className="text-muted mb-0">Calculated from your saved profile and career records.</p>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="panel-card">
            <div className="panel-head">
              <div>
                <h5>Recent activity</h5>
                <small>Your latest updates</small>
              </div>
              <a href="/profile">View all</a>
            </div>

            {dashboard?.activity.length ? (
              dashboard.activity.map((activity, index) => (
                <div className="activity-row" key={`${activity.label}-${index}`}>
                  <div className={`activity-icon ${activity.tone}`}>
                    <i className={`bi ${activity.icon}`} />
                  </div>
                  <div>
                    <strong>{activity.label}</strong>
                    <small>{activity.detail}</small>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted mb-0">{loading ? 'Loading activity...' : 'No recent activity yet.'}</p>
            )}
          </div>
        </div>

        <div className="col-lg-5">
          <div className="panel-card ai-card">
            <div className="ai-icon">
              <i className="bi bi-stars" />
            </div>

            <span className="eyebrow">AI CAREER MENTOR</span>
            <h4>Want to improve your placement chances?</h4>
            <p>We found 3 skills that could give your profile a stronger edge.</p>
            <a href="/mentor" className="primary-btn">
              Explore suggestions <i className="bi bi-arrow-right" />
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}
