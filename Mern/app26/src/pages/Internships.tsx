import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

export default function Internships() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInternships = async () => {
      try {
        const response = await api.get('/internships');
        setItems(response.data?.data ?? []);
      } catch (error) {
        console.warn('Internships unavailable', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInternships();
  }, []);

  if (loading) {
    return (
      <Layout title="Internships" subtitle="Loading your internship experience...">
        <div className="panel-card text-center py-5">Loading internships...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Internships" subtitle="Keep your practical experience ready for recruiters.">
      <div className="panel-card">
        <div className="panel-head">
          <div>
            <h5>Experience</h5>
            <small>Internships and industry exposure</small>
          </div>
          <button className="primary-btn small"><i className="bi bi-plus-lg" /> Add internship</button>
        </div>

        {items.length === 0 && <p className="text-muted mb-0">No internship experience added yet.</p>}

        {items.map((item, i) => (
          <div className="timeline-item" key={`${item.company}-${i}`}>
            <div className="timeline-dot"><i className="bi bi-building" /></div>
            <div className="timeline-content">
              <div className="d-flex justify-content-between">
                <div>
                  <h5>{item.role || 'Internship role'}</h5>
                  <strong>{item.company || 'Company name'}</strong>
                </div>
                <span className="status-pill success-pill">{item.status || 'In progress'}</span>
              </div>
              <p>{[item.startDate, item.endDate].filter(Boolean).join(' - ') || 'Dates not added'}</p>
              <div className="experience-tags">
                <span>{item.description || 'No description added.'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}