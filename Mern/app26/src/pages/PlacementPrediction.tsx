import { useState } from 'react';
import Layout from '../components/Layout';

export default function PlacementPrediction() {
  const [score, setScore] = useState(84);
  const [loading, setLoading] = useState(false);

  const predict = () => {
    setLoading(true);
    setTimeout(() => {
      setScore((prev) => Math.min(99, prev + 2));
      setLoading(false);
    }, 900);
  };

  const factors = [
    ['Academic performance', 91],
    ['Technical skills', 84],
    ['Projects', 88],
    ['Coding profile', 82],
    ['Resume quality', 86],
    ['Communication', 78],
  ];

  return (
    <Layout
      title="Placement Prediction"
      subtitle="Estimate readiness using your academic, skill and profile data."
    >
      <div className="prediction-hero">
        <div>
          <span className="eyebrow">AI PLACEMENT ENGINE</span>
          <h2>Your current placement probability</h2>
          <p>
            Based on your latest academic performance, skills, projects, coding and resume profile.
          </p>
          <button className="primary-btn" onClick={predict} disabled={loading}>
            {loading ? 'Analyzing...' : 'Run new prediction'}
            <i className="bi bi-arrow-repeat" />
          </button>
        </div>

        <div className="prediction-score">
          <strong>{score}%</strong>
          <span>High probability</span>
        </div>
      </div>

      <div className="row g-4 mt-1">
        <div className="col-lg-7">
          <div className="panel-card">
            <div className="panel-head">
              <div>
                <h5>Readiness factors</h5>
                <small>What is influencing your prediction</small>
              </div>
            </div>

            {factors.map(([label, value]) => (
              <div className="factor" key={label}>
                <div>
                  <span>{label}</span>
                  <strong>{value}%</strong>
                </div>
                <div className="progress">
                  <div style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-lg-5">
          <div className="panel-card">
            <h5>Expected salary range</h5>
            <div className="salary">₹5.5L <span>–</span> ₹8.5L</div>
            <p>Estimated annual package based on your current profile.</p>
            <hr />
            <h6>Top improvement areas</h6>
            <ul className="simple-list">
              <li><i className="bi bi-arrow-up-circle" /> Communication</li>
              <li><i className="bi bi-arrow-up-circle" /> Advanced DSA</li>
              <li><i className="bi bi-arrow-up-circle" /> System Design</li>
            </ul>
            <a href="/mentor" className="outline-btn w-100 text-center">Improve with AI Mentor</a>
          </div>
        </div>
      </div>
    </Layout>
  );
}
