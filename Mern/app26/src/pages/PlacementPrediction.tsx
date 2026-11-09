import { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import Toast from '../components/Toast';
import api from '../services/api';

type PredictionData = {
  probability: number;
  prediction: string;
  factors: Array<{ name: string; score: number }>;
  createdAt: string | null;
};

type ProfilePreview = {
  branch?: string;
  collegeTier?: number;
  cgpa?: number;
  attendance?: number;
  dsaSolved?: number;
};

export default function PlacementPrediction() {
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [profile, setProfile] = useState<ProfilePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      api.get('/placement'),
      api.get('/students/profile'),
      api.get('/dashboard'),
      api.get('/coding'),
    ]).then(([predRes, profRes, dashRes, codingRes]) => {
      if (!active) return;

      if (predRes.status === 'fulfilled') {
        setPrediction(predRes.value.data?.data ?? null);
      }
      const st = profRes.status === 'fulfilled' ? profRes.value.data?.data : {};
      const ds = dashRes.status === 'fulfilled' ? dashRes.value.data?.data?.stats : {};
      const cd = codingRes.status === 'fulfilled' ? codingRes.value.data?.data?.profiles : [];

      const totalDsa = Array.isArray(cd)
        ? cd.reduce((sum: number, p: any) => sum + Number(p.problemsSolved || 0), 0)
        : 0;

      setProfile({
        branch: st?.branch || st?.department || 'Not added',
        collegeTier: st?.collegeTier || 3,
        cgpa: ds?.cgpa,
        attendance: ds?.attendance,
        dsaSolved: totalDsa,
      });
    }).catch(() => {
      if (active) setError('Could not load your placement data.');
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const runPrediction = async () => {
    setRunning(true);
    setError('');

    try {
      const response = await api.post('/placement', {});
      setPrediction(response.data.data);
    } catch (requestError) {
      const message = axios.isAxiosError(requestError)
        ? requestError.response?.data?.message
        : null;
      setError(
        typeof message === 'string'
          ? message
          : 'Could not run placement prediction. Please check that your profile has branch and date of birth.'
      );
    } finally {
      setRunning(false);
    }
  };

  const improvementAreas = prediction?.factors
    .slice()
    .sort((first, second) => first.score - second.score)
    .slice(0, 3);

  return (
    <Layout
      title="Placement Prediction"
      subtitle="AI-driven placement probability and factor breakdown evaluated from your database profile."
    >
      <Toast message={error} type="error" onClose={() => setError('')} />

      {/* Hero Prediction Section */}
      <div className="prediction-hero mb-4">
        <div>
          <span className="eyebrow">AI PLACEMENT ENGINE</span>
          <h2>Your placement probability</h2>
          <p>
            The model analyzes your complete academic records, skills, projects, and coding stats stored in your profile.
          </p>
          <button className="primary-btn" onClick={runPrediction} disabled={running || loading}>
            {running ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" />
                Analyzing Profile...
              </>
            ) : (
              <>
                Run Placement Prediction <i className="bi bi-arrow-repeat" />
              </>
            )}
          </button>
        </div>

        <div className="prediction-score" aria-live="polite">
          <strong>{prediction ? `${prediction.probability}%` : loading ? '...' : '—'}</strong>
          <span>{prediction?.prediction ? `${prediction.prediction} Chance` : 'No prediction yet'}</span>
        </div>
      </div>

      {/* Database Context Summary */}
      <div className="panel-card mb-4">
        <div className="panel-head mb-3">
          <div>
            <h5>Evaluated Profile Metrics</h5>
            <small>Live records fetched directly from your database used for prediction</small>
          </div>
        </div>
        <div className="row g-3">
          <div className="col-6 col-md-3">
            <div className="border rounded p-3 text-center bg-light">
              <small className="text-muted d-block">Branch</small>
              <strong className="fs-6">{profile?.branch || 'CSE'}</strong>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="border rounded p-3 text-center bg-light">
              <small className="text-muted d-block">College Tier</small>
              <strong className="fs-6">Tier {profile?.collegeTier || 3}</strong>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="border rounded p-3 text-center bg-light">
              <small className="text-muted d-block">Current CGPA</small>
              <strong className="fs-6">{profile?.cgpa ? Number(profile.cgpa).toFixed(2) : '7.00'}</strong>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="border rounded p-3 text-center bg-light">
              <small className="text-muted d-block">DSA Solved</small>
              <strong className="fs-6">{profile?.dsaSolved ?? 0} Problems</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics & Focus Areas */}
      <div className="row g-4">
        <div className="col-lg-7">
          <div className="panel-card">
            <div className="panel-head">
              <div>
                <h5>Profile readiness metrics</h5>
                <small>Factor breakdown scored by the model</small>
              </div>
            </div>

            {prediction?.factors.length ? (
              prediction.factors.map((factor) => (
                <div className="factor" key={factor.name}>
                  <div>
                    <span>{factor.name}</span>
                    <strong>{factor.score}%</strong>
                  </div>
                  <div className="progress">
                    <div style={{ width: `${factor.score}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted mb-0 py-3 text-center">
                {loading ? 'Loading your prediction...' : 'Click "Run Placement Prediction" to evaluate your readiness.'}
              </p>
            )}
          </div>
        </div>

        <div className="col-lg-5">
          <div className="panel-card">
            <h5>Recommended Focus Areas</h5>
            <p className="text-muted small">Target these specific areas to raise your placement probability score.</p>
            {improvementAreas?.length ? (
              <ul className="simple-list mb-4">
                {improvementAreas.map((factor) => (
                  <li key={factor.name}>
                    <i className="bi bi-arrow-up-circle text-primary me-2" />
                    <strong>{factor.name}</strong> ({factor.score}%)
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted mb-4">Run a prediction to generate tailored recommendations.</p>
            )}
            <a href="/mentor" className="outline-btn w-100 text-center d-block">
              <i className="bi bi-chat-dots me-2" />
              Improve with AI Career Mentor
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}
