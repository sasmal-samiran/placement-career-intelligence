import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

export default function Certifications() {
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCerts = async () => {
      try {
        const response = await api.get('/certifications');
        setCerts(response.data?.data ?? []);
      } catch (error) {
        console.warn('Certification data unavailable', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCerts();
  }, []);

  if (loading) {
    return (
      <Layout title="Certifications" subtitle="Loading your certifications...">
        <div className="panel-card text-center py-5">Loading certifications...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Certifications" subtitle="Collect verified proof of your learning.">
      <div className="row g-4">
        {certs.map((cert, i) => (
          <div className="col-md-6 col-xl-4" key={`${cert.name}-${i}`}>
            <div className="certificate-card">
              <div className="cert-ribbon">
                <i className="bi bi-patch-check-fill" />
              </div>
              <span className="verified">
                <i className="bi bi-patch-check-fill" /> Verified
              </span>
              <h5>{cert.name}</h5>
              <p>{cert.issuer || 'Verified issuer'}</p>
              <small>Issued {cert.issueDate || 'N/A'}</small>
              <button className="outline-btn w-100 mt-3">View certificate</button>
            </div>
          </div>
        ))}

        <div className="col-md-6 col-xl-4">
          <button className="add-certificate">
            <i className="bi bi-plus-lg" />
            <strong>Add certification</strong>
            <span>Upload a new achievement</span>
          </button>
        </div>
      </div>
    </Layout>
  );
}