import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Toast from '../components/Toast';
import StatCard from '../components/StatCard';
import api from '../services/api';

type DashboardData = {
  stats: {
    latestSgpa: number | null;
    latestSemester: string | null;
    latestSemesterNumber?: number | null;
    hasAcademic?: boolean;
    latestAttendance: number | null;
    attendance: number | null;
    cgpa: number;
    averageAttendance?: number;
    codingScore: number | null;
    hasCodingProfile: boolean;
    codingDetails?: {
      score: number | null;
      hasProfile: boolean;
      totalProblems: number;
      contestRating: number;
      totalBadges: number;
      platformsCount: number;
    };
    placementPredictionScore: number | null;
    placementChance: number;
    predictionLevel?: string | null;
  };
  latestSemester?: {
    semester: string;
    semesterNumber: number | null;
    sgpa: number | null;
    attendance: number | null;
    credits: number;
  } | null;
  semesters: Array<{
    semester: string;
    sgpa: number;
    attendance?: number;
    credits?: number;
    percentage?: number;
  }>;
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
      <Toast message={error} type="error" onClose={() => setError('')} />

      {/* Hero Card: Placement Prediction */}
      <div className="hero-card mb-4">
        <div>
          <span className="eyebrow">PLACEMENT PREDICTION</span>
          <h2>
            {stats?.predictionLevel
              ? `${stats.predictionLevel} Placement Probability`
              : "You're making great progress."}
          </h2>
          <p>
            {stats?.placementPredictionScore != null
              ? 'Your score is calculated by the machine learning prediction model using your academic and technical profile.'
              : 'Run placement prediction to analyze your profile with machine learning and calculate your placement score.'}
          </p>
          <a href="/placement" className="hero-link">
            {stats?.placementPredictionScore != null ? 'View full prediction report' : 'Run Placement Prediction'} <i className="bi bi-arrow-right" />
          </a>
        </div>

        <div className="readiness-ring">
          <strong>
            {loading ? '...' : stats?.placementPredictionScore != null ? `${stats.placementPredictionScore}%` : 'N/A'}
          </strong>
          <span>{stats?.predictionLevel ? stats.predictionLevel : 'Prediction'}</span>
        </div>
      </div>

      {/* Top Stat Cards: Dynamic Latest SGPA, Attendance, Coding Score, Placement Score */}
      <div className="row g-3 mb-4">
        {/* Card 1: Latest Semester SGPA */}
        <div className="col-xl-3 col-md-6">
          <StatCard
            icon="bi-mortarboard-fill"
            label={stats?.latestSemester ? `Latest SGPA (${stats.latestSemester})` : 'Latest SGPA'}
            value={
              loading
                ? '...'
                : stats?.latestSgpa != null
                ? Number(stats.latestSgpa).toFixed(2)
                : 'No Records'
            }
            change={
              loading
                ? undefined
                : stats?.latestSemester
                ? stats.latestSemester
                : 'No semesters added'
            }
            empty={!loading && stats?.latestSgpa == null}
            tone="purple"
          />
        </div>

        {/* Card 2: Latest Semester Attendance */}
        <div className="col-xl-3 col-md-6">
          <StatCard
            icon="bi-calendar2-check-fill"
            label={stats?.latestSemester ? `Attendance (${stats.latestSemester})` : 'Latest Attendance'}
            value={
              loading
                ? '...'
                : stats?.latestAttendance != null
                ? `${stats.latestAttendance}%`
                : stats?.attendance != null
                ? `${stats.attendance}%`
                : 'No Records'
            }
            change={
              loading
                ? undefined
                : stats?.latestSemester && (stats?.latestAttendance != null || stats?.attendance != null)
                ? stats.latestSemester
                : 'No attendance logged'
            }
            empty={!loading && stats?.latestAttendance == null && stats?.attendance == null}
            tone="green"
          />
        </div>

        {/* Card 3: Coding Profile Score */}
        <div className="col-xl-3 col-md-6">
          <StatCard
            icon="bi-code-square"
            label="Coding Score"
            value={
              loading
                ? '...'
                : stats?.hasCodingProfile && stats?.codingScore != null
                ? `${stats.codingScore}/100`
                : 'Not Connected'
            }
            change={
              loading
                ? undefined
                : stats?.hasCodingProfile
                ? `${stats.codingDetails?.platformsCount || 1} platform(s)`
                : 'Connect profile'
            }
            empty={!loading && (!stats?.hasCodingProfile || stats?.codingScore == null)}
            tone="orange"
          />
        </div>

        {/* Card 4: Placement Score */}
        <div className="col-xl-3 col-md-6">
          <StatCard
            icon="bi-bullseye"
            label="Placement Score"
            value={
              loading
                ? '...'
                : stats?.placementPredictionScore != null
                ? `${stats.placementPredictionScore}%`
                : 'Not Run'
            }
            change={
              loading
                ? undefined
                : stats?.predictionLevel
                ? stats.predictionLevel
                : 'Run prediction'
            }
            empty={!loading && stats?.placementPredictionScore == null}
            tone="blue"
          />
        </div>
      </div>

      <div className="row g-4">
        {/* Left: Academic Performance Chart */}
        <div className="col-lg-8">
          <div className="panel-card">
            <div className="panel-head">
              <div>
                <h5>Academic performance</h5>
                <small>
                  {stats?.cgpa ? `Cumulative CGPA: ${stats.cgpa.toFixed(2)}` : 'Semester-wise SGPA trend'}
                </small>
              </div>
              <a href="/academic" className="btn btn-sm btn-outline-secondary">
                View Academic Details <i className="bi bi-arrow-right" />
              </a>
            </div>

            <div className="chart-area">
              {dashboard?.semesters && dashboard.semesters.length > 0 ? (
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
                <p className="text-muted mb-0 py-4 text-center">
                  {loading ? 'Loading academic records...' : 'No semester records yet. Add your results in Academic Performance.'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right: Profile Completion */}
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

            <p className="text-muted mb-0">Calculated from your saved profile, academic, and career records.</p>
          </div>
        </div>

        {/* Bottom Left: Recent Activity */}
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

        {/* Bottom Right: AI Career Mentor Recommendation */}
        <div className="col-lg-5">
          <div className="panel-card ai-card">
            <div className="ai-icon">
              <i className="bi bi-stars" />
            </div>

            <span className="eyebrow">AI CAREER MENTOR</span>
            <h4>Want to improve your placement chances?</h4>
            <p>Get personalized guidance based on your academic profile and coding scores.</p>
            <a href="/mentor" className="primary-btn">
              Explore suggestions <i className="bi bi-arrow-right" />
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}
