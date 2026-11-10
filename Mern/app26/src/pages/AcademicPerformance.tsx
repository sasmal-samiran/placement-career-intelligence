import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Toast from '../components/Toast';
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
  const [credits, setCredits] = useState('');
  const [attendance, setAttendance] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchAcademic = async () => {
    try {
      const response = await api.get('/academic');
      const profile = response.data?.data;
      const semesters = Array.isArray(profile?.semesters) ? profile.semesters : [];

      setRows(
        semesters.map((row: any) => ({
          semester: row.semester,
          sgpa: Number(row.sgpa ?? 0),
          credits: Number(row.credits ?? 0),
          attendance: Number(row.attendance ?? 0),
          percentage: Number(row.percentage ?? 0),
        }))
      );
    } catch (err) {
      console.error('Failed to load academic data', err);
      setError('Could not load academic records. Please sign in again and retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcademic();
  }, []);

  const saveAcademic = async (nextRows: Row[]) => {
    setSaving(true);
    try {
      const response = await api.put('/academic', { semesters: nextRows });
      setRows(response.data?.data?.semesters ?? nextRows);
      setError('');
      return true;
    } catch (err) {
      console.error('Failed to save academic data', err);
      setError('Could not save academic record. Please try again.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const add = async () => {
    const score = Number(sgpa);
    const cred = Number(credits);
    const att = Number(attendance);

    if (!sem.trim()) {
      setError('Please enter a semester name (e.g. Semester 1).');
      return;
    }
    if (sgpa === '' || !Number.isFinite(score) || score < 0 || score > 10) {
      setError('Enter a valid SGPA from 0 to 10.');
      return;
    }
    if (credits === '' || !Number.isFinite(cred) || cred <= 0) {
      setError('Enter a valid positive number for total credits.');
      return;
    }
    if (attendance === '' || !Number.isFinite(att) || att < 0 || att > 100) {
      setError('Enter an attendance percentage from 0 to 100.');
      return;
    }

    const nextRows = [
      ...rows,
      {
        semester: sem.trim(),
        sgpa: Number(score.toFixed(2)),
        credits: Math.round(cred),
        attendance: Math.round(att),
        percentage: Number((score * 10).toFixed(1)),
      },
    ];

    if (await saveAcademic(nextRows)) {
      setSem('');
      setSgpa('');
      setCredits('');
      setAttendance('');
      setShow(false);
    }
  };

  const removeRow = async (index: number) => {
    const nextRows = rows.filter((_, i) => i !== index);
    await saveAcademic(nextRows);
  };

  // Weighted CGPA formula: Σ(SGPA * Credits) / Σ(Credits)
  const totalCredits = rows.reduce((sum, row) => sum + Number(row.credits || 0), 0);
  const weightedSum = rows.reduce(
    (sum, row) => sum + Number(row.sgpa || 0) * Number(row.credits || 0),
    0
  );
  const weightedCgpa =
    totalCredits > 0
      ? (weightedSum / totalCredits).toFixed(2)
      : rows.length
      ? (rows.reduce((sum, row) => sum + Number(row.sgpa || 0), 0) / rows.length).toFixed(2)
      : '0.00';

  const best = rows.length
    ? rows.reduce(
        (top, row) => (Number(row.sgpa || 0) > Number(top.sgpa || 0) ? row : top),
        rows[0]
      )
    : null;

  const averageAttendance = rows.length
    ? (
        rows.reduce((sum, row) => sum + Number(row.attendance || 0), 0) / rows.length
      ).toFixed(1)
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
      <Toast message={error} type="error" onClose={() => setError('')} />

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="metric-card">
            <small>Overall CGPA (Weighted)</small>
            <strong>{weightedCgpa}</strong>
            <span>Formula: Σ(SGPA × Credits) / Σ(Credits)</span>
          </div>
        </div>

        <div className="col-md-4">
          <div className="metric-card">
            <small>Average Attendance</small>
            <strong>{averageAttendance}%</strong>
            <span>Across {rows.length} recorded semester{rows.length === 1 ? '' : 's'}</span>
          </div>
        </div>

        <div className="col-md-4">
          <div className="metric-card">
            <small>Best Semester</small>
            <strong>{best ? Number(best.sgpa).toFixed(2) : '0.00'}</strong>
            <span>{best ? best.semester : 'No data yet'}</span>
          </div>
        </div>
      </div>

      <div className="panel-card">
        <div className="panel-head">
          <div>
            <h5>Semester performance</h5>
            <small>Semester SGPA, credits, and attendance records</small>
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
                <th>Total Credits</th>
                <th>Attendance</th>
                <th>Performance</th>
                <th style={{ width: '60px' }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((r, i) => (
                  <tr key={`${r.semester}-${i}`}>
                    <td>
                      <strong>{r.semester}</strong>
                    </td>
                    <td>
                      <span className="score-badge">{Number(r.sgpa).toFixed(2)}</span>
                    </td>
                    <td>{r.credits} credits</td>
                    <td>{r.attendance}%</td>
                    <td>
                      <div className="mini-progress">
                        <div style={{ width: `${Math.min(100, Number(r.sgpa || 0) * 10)}%` }} />
                      </div>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm text-danger p-0"
                        title="Delete semester record"
                        onClick={() => removeRow(i)}
                      >
                        <i className="bi bi-trash3" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center text-muted py-4">
                    {loading ? 'Loading records...' : 'No academic records yet. Click "Add semester" above to add one.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal show={show} title="Add Semester Record" onClose={() => setShow(false)}>
        <div className="mb-3">
          <label className="form-label">Semester *</label>
          <input
            className="form-control modern-input"
            placeholder="e.g. Semester 1"
            value={sem}
            onChange={(e) => setSem(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">SGPA (0–10) *</label>
          <input
            className="form-control modern-input"
            type="number"
            min="0"
            max="10"
            step="0.01"
            placeholder="e.g. 8.65"
            value={sgpa}
            onChange={(e) => setSgpa(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Total Credits *</label>
          <input
            className="form-control modern-input"
            type="number"
            min="1"
            max="60"
            step="1"
            placeholder="e.g. 24"
            value={credits}
            onChange={(e) => setCredits(e.target.value)}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Attendance (%) *</label>
          <input
            className="form-control modern-input"
            type="number"
            min="0"
            max="100"
            step="1"
            placeholder="e.g. 88"
            value={attendance}
            onChange={(e) => setAttendance(e.target.value)}
          />
        </div>

        <button className="primary-btn w-100 mt-2" onClick={add} disabled={saving}>
          {saving ? 'Saving Record...' : 'Save Semester'}
        </button>
      </Modal>
    </Layout>
  );
}
