import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

export default function Attendance() {
  const [month, setMonth] = useState('Current Semester');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/students/profile');
        setProfile(response.data?.data || {});
      } catch (error) {
        console.warn('Attendance profile unavailable', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const semesters = profile?.academic?.semesters ?? [];
  const currentSemester = semesters[semesters.length - 1] ?? { attendance: 0, subjects: [] };
  const overallAttendance = semesters.length
    ? semesters.reduce((sum: number, item: any) => sum + Number(item.attendance || 0), 0) / semesters.length
    : Number(currentSemester.attendance || 0);

  const subjectAttendance = (currentSemester.subjects ?? []).length
    ? currentSemester.subjects.map((subject: any) => ({
        name: subject.name,
        value: Math.min(100, Math.max(0, Number(subject.marks ?? 0)))
      }))
    : [
        { name: 'Current semester', value: overallAttendance },
      ];

  const totalClasses = 100;
  const presentClasses = Math.round((overallAttendance / 100) * totalClasses);
  const absentClasses = totalClasses - presentClasses;

  if (loading) {
    return (
      <Layout title="Attendance" subtitle="Loading your attendance...">
        <div className="panel-card text-center py-5">Loading attendance...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Attendance" subtitle="Monitor attendance subject by subject.">
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="attendance-main">
            <div className="attendance-donut">
              <strong>{overallAttendance.toFixed(0)}%</strong>
              <small>Overall</small>
            </div>
            <div>
              <h4>{overallAttendance >= 75 ? 'Good standing' : 'Needs attention'}</h4>
              <p>{overallAttendance >= 75 ? 'You are above the 75% minimum requirement.' : 'Your attendance is below the required threshold.'}</p>
            </div>
          </div>
        </div>

        <div className="col-md-8">
          <div className="panel-card h-100">
            <div className="panel-head">
              <h5>Attendance summary</h5>
              <select value={month} onChange={(e) => setMonth(e.target.value)}>
                <option>Current Semester</option>
                <option>August 2026</option>
                <option>July 2026</option>
              </select>
            </div>
            <div className="row g-2">
              {[
                ['Present', String(presentClasses)],
                ['Absent', String(absentClasses)],
                ['Total classes', String(totalClasses)],
              ].map((x) => (
                <div className="col-4" key={x[0]}>
                  <div className="mini-stat">
                    <small>{x[0]}</small>
                    <strong>{x[1]}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="panel-card">
        <div className="panel-head">
          <div>
            <h5>Subject-wise attendance</h5>
            <small>Updated from the academic database</small>
          </div>
        </div>

        {subjectAttendance.map((item: any) => (
          <div className="subject-att" key={item.name}>
            <div className="subject-title">
              <strong>{item.name}</strong>
              <span>{Math.round(item.value)}%</span>
            </div>
            <div className="progress">
              <div style={{ width: `${item.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}