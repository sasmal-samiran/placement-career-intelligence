import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

export default function CodingProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/coding');
        setProfile(response.data?.data || { profiles: [] });
      } catch (error) {
        console.warn('Coding profile unavailable', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const platforms = profile?.profiles ?? [];
  const totalProblems = platforms.reduce((sum: number, item: any) => sum + Number(item.problemsSolved || 0), 0);
  const contestRating = platforms.reduce((sum: number, item: any) => sum + Number(item.contestRating || 0), 0);
  const totalBadges = platforms.reduce((sum: number, item: any) => sum + Number(item.badges || 0), 0);
  const codingScore = platforms.length ? Math.min(100, Math.round((platforms.reduce((sum: number, item: any) => sum + Number(item.score || 0), 0) / platforms.length))) : 0;

  if (loading) {
    return (
      <Layout title="Coding Profile" subtitle="Loading your coding activity...">
        <div className="panel-card text-center py-5">Loading coding profile...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Coding Profile" subtitle="Connect your competitive programming and developer activity.">
      <div className="row g-4">
        <div className="col-lg-5">
          <div className="panel-card coding-score">
            <span className="eyebrow">CODING SCORE</span>
            <div className="big-score">{codingScore}<span>/100</span></div>
            <p>{platforms.length ? 'Keep building your coding activity.' : 'Add a coding profile to see your score.'}</p>
            <div className="progress"><div style={{ width: `${codingScore}%` }} /></div>
          </div>
        </div>

        <div className="col-lg-7">
          <div className="panel-card">
            <div className="panel-head">
              <h5>Platforms</h5>
              <button className="primary-btn small"><i className="bi bi-plus-lg" /> Add profile</button>
            </div>

            {platforms.map((item: any, index: number) => (
              <div className="platform-row" key={`${item.platform}-${index}`}>
                <div className="platform-icon"><i className="bi bi-code-slash" /></div>
                <div>
                  <strong>{item.platform}</strong>
                  <small>{item.username || item.url || 'Profile link'}</small>
                </div>
                <span>{item.problemsSolved ? `${item.problemsSolved} problems` : item.badges ? `${item.badges} badges` : 'Active'}</span>
                <button className="table-icon"><i className="bi bi-box-arrow-up-right" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="row g-3 mt-1">
        <div className="col-md-4">
          <div className="metric-card">
            <small>Problems solved</small>
            <strong>{totalProblems}</strong>
            <span>All platforms</span>
          </div>
        </div>
        <div className="col-md-4">
          <div className="metric-card">
            <small>Contest rating</small>
            <strong>{contestRating}</strong>
            <span>Combined rating</span>
          </div>
        </div>
        <div className="col-md-4">
          <div className="metric-card">
            <small>Badges</small>
            <strong>{totalBadges}</strong>
            <span>Total earned</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}