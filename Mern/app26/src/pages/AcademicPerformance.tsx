import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import api from '../services/api';

type Row = {
  semester: string;
  sgpa: number;
  credits: number;
  attendance: number;
  percentage?: number;
};

export default function AcademicPerformance() {
  const [rows, setRows] = useState<Row[]>([]);
  const [show, setShow] = useState(false);
  const [sem, setSem] = useState('');
  const [sgpa, setSgpa] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAcademic = async () => {
    try {
      const response = await api.get('/academic');
      const profile = response.data?.data;
      const semesters = Array.isArray(profile?.semesters) ? profile.semesters : [];

      setRows(semesters.map((row: any) => ({
        semester: row.semester,
        sgpa: Number(row.sgpa ?? 0),
        credits: Number(row.credits ?? 0),
        attendance: Number(row.attendance ?? 0),
        percentage: Number(row.percentage ?? 0),
      })));
    } catch (error) {
      console.error('Failed to load academic data', error);
      setError('Could not load academic records. Please sign in again and retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcademic();
  }, []);

  const saveAcademic = async (nextRows: Row[]) => {
    try {
      const response = await api.put('/academic', { semesters: nextRows });
      setRows(response.data?.data?.semesters ?? nextRows);
      setError('');
      return true;
    } catch (error) {
      console.error('Failed to save academic data', error);
      setError('Could not save this semester. Please try again.');
      return false;
    }
  };

  const add = async () => {
    const score = Number(sgpa);
    if (!sem.trim() || sgpa === '' || !Number.isFinite(score) || score < 0 || score > 10) {
      setError('Enter a semester name and an SGPA from 0 to 10.');
      return;
    }

    const nextRows = [
      ...rows,
      {
        semester: sem.trim(),
        sgpa: score,
        credits: 24,
        attendance: 92,
        percentage: score * 10,
      },
    ];

    if (await saveAcademic(nextRows)) {
      setSem('');
      setSgpa('');
      setShow(false);
    }
  };

  const avg = rows.length
    ? (rows.reduce((sum, row) => sum + Number(row.sgpa || 0), 0) / rows.length).toFixed(2)
    : '0.00';

  const best = rows.length
    ? rows.reduce((top, row) => Number(row.sgpa || 0) > Number(top.sgpa || 0) ? row : top, rows[0])
    : null;

  const averageAttendance = rows.length
    ? (rows.reduce((sum, row) => sum + Number(row.attendance || 0), 0) / rows.length).toFixed(1)
    : '0.0';

  if (loading) {
    return (
      <Layout title="Academic Performance" subtitle="Loading your academic records...">
        <div className="panel-card text-center py-5">Loading academic details...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Academic Performance" subtitle="Track your semester-wise academic growth.">
      {error && <div className="alert alert-danger" role="alert">{error}</div>}

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="metric-card">
            <small>Overall CGPA</small>
            <strong>{avg}</strong>
            <span>Across recorded semesters</span>
          </div>
        </div>

        <div className="col-md-4">
          <div className="metric-card">
            <small>Best Semester</small>
            <strong>{best ? best.sgpa : '0.00'}</strong>
            <span>{best ? best.semester : 'No data yet'}</span>
          </div>
        </div>

        <div className="col-md-4">
          <div className="metric-card">
            <small>Average Attendance</small>
            <strong>{averageAttendance}%</strong>
            <span>Across recorded semesters</span>
          </div>
        </div>
      </div>

      <div className="panel-card">
        <div className="panel-head">
          <div>
            <h5>Semester performance</h5>
            <small>Academic records stored in your profile</small>
          </div>
          <button className="primary-btn small" onClick={() => setShow(true)}>
            <i className="bi bi-plus-lg" /> Add semester
          </button>
        </div>

        <div className="table-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Semester</th>
                <th>SGPA</th>
                <th>Credits</th>
                <th>Attendance</th>
                <th>Performance</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((r, i) => (
                <tr key={`${r.semester}-${i}`}>
                  <td><strong>{r.semester}</strong></td>
                  <td><span className="score-badge">{r.sgpa}</span></td>
                  <td>{r.credits}</td>
                  <td>{r.attendance}%</td>
                  <td>
                    <div className="mini-progress">
                      <div style={{ width: `${(Number(r.sgpa || 0) * 10)}%` }} />
                    </div>
                  </td>
                  <td>
                    <button className="table-icon">
                      <i className="bi bi-three-dots" /></button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="text-center text-muted">{loading ? 'Loading records...' : 'No academic records yet.'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal show={show} title="Add semester" onClose={() => setShow(false)}>
        <label>Semester</label>
        <input className="form-control modern-input mb-3" value={sem} onChange={(e) => setSem(e.target.value)} />
        <label>SGPA</label>
        <input
          className="form-control modern-input mb-3"
          type="number"
          min="0"
          max="10"
          step=".1"
          value={sgpa}
          onChange={(e) => setSgpa(e.target.value)}
        />
        <button className="primary-btn w-100" onClick={add}>Save semester</button>
      </Modal>
    </Layout>
  );
}