import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

export default function StudentProfile() {
  const [edit, setEdit] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [certifications, setCertifications] = useState<any[]>([]);
  const [codingProfiles, setCodingProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      api.get('/students/profile'),
      api.get('/academic'),
      api.get('/skills'),
      api.get('/certifications'),
      api.get('/coding'),
    ]).then(([profileResult, academicResult, skillsResult, certificationResult, codingResult]) => {
      if (!active) return;

      if (profileResult.status === 'fulfilled') {
        setProfile(profileResult.value.data?.data || {});
      }
      if (academicResult.status === 'fulfilled') {
        setSemesters(academicResult.value.data?.data?.semesters || []);
      }
      if (skillsResult.status === 'fulfilled') {
        setSkills(skillsResult.value.data?.data?.skills || []);
      }
      if (certificationResult.status === 'fulfilled') {
        setCertifications(certificationResult.value.data?.data || []);
      }
      if (codingResult.status === 'fulfilled') {
        setCodingProfiles(codingResult.value.data?.data?.profiles || []);
      }

      if ([profileResult, academicResult, skillsResult, certificationResult, codingResult]
        .some((result) => result.status === 'rejected')) {
        setError('Some profile sections could not be loaded. Check your connection and refresh.');
      }
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const update = (key: string, value: string) => {
    setProfile((current: any) => ({ ...current, [key]: value }));
  };

  const saveProfile = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await api.put('/students/profile', profile);
      setProfile(response.data?.data || profile);
      setEdit(false);
    } catch {
      setError('Your profile changes could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Student Profile" subtitle="Loading your details...">
        <div className="panel-card text-center py-5">Loading profile...</div>
      </Layout>
    );
  }

  const averageCgpa = semesters.length
    ? (semesters.reduce((sum, item) => sum + Number(item.sgpa || 0), 0) / semesters.length).toFixed(2)
    : 'N/A';
  const totalCredits = semesters.reduce((sum, item) => sum + Number(item.credits || 0), 0);
  const completionFields = [profile?.name, profile?.email, profile?.phone, profile?.department, profile?.university, profile?.currentYear];
  const completion = Math.round(completionFields.filter(Boolean).length / completionFields.length * 100);

  return (
    <Layout title="Student Profile" subtitle="Manage your personal and academic identity.">
      {error && <div className="alert alert-warning" role="alert">{error}</div>}

      <div className="profile-cover">
        <div className="profile-avatar-lg">{profile?.name?.charAt(0) || '?'}</div>
        <div>
          <h3>{profile?.name || 'Student profile'}</h3>
          <p>{profile?.department || 'Department not added'} · {profile?.university || 'University not added'}</p>
          <span className="status-pill"><i className="bi bi-person-check" /> Student account</span>
        </div>
        <button
          className="outline-btn ms-auto"
          onClick={() => edit ? saveProfile() : setEdit(true)}
          disabled={saving || !profile}
        >
          <i className={`bi bi-${edit ? 'check2' : 'pencil'}`} /> {saving ? 'Saving...' : edit ? 'Save changes' : 'Edit profile'}
        </button>
      </div>

      <div className="row g-4 mt-1">
        <div className="col-lg-8">
          <div className="panel-card">
            <div className="panel-head">
              <div>
                <h5>Personal information</h5>
                <small>Details saved to your student account</small>
              </div>
            </div>
            <div className="row g-3">
              {Object.entries({
                name: profile?.name || '',
                email: profile?.email || '',
                phone: profile?.phone || '',
                dob: profile?.dob || '',
                department: profile?.department || '',
                university: profile?.university || '',
                currentYear: profile?.currentYear || '',
                address: profile?.address || '',
                guardian: profile?.guardian || '',
                guardianPhone: profile?.guardianPhone || '',
              }).map(([key, value]) => (
                <div className="col-md-6" key={key}>
                  <label className="form-label text-capitalize">{key.replace(/([A-Z])/g, ' $1')}</label>
                  <input
                    className="form-control modern-input"
                    value={value as string}
                    disabled={!edit || saving}
                    onChange={(event) => update(key, event.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="panel-card">
            <h5>Profile completion</h5>
            <div className="strength-circle">{completion}%</div>
            <p className="text-center muted">Based on your saved account details.</p>
            <div className="progress"><div style={{ width: `${completion}%` }} /></div>
          </div>
        </div>
      </div>

      <div className="row g-4 mt-1">
        <div className="col-lg-6">
          <div className="panel-card">
            <h5>Academic summary</h5>
            <p><strong>Average SGPA:</strong> {averageCgpa}</p>
            <p><strong>Current semester:</strong> {semesters.at(-1)?.semester || 'Not added'}</p>
            <p><strong>Total credits:</strong> {totalCredits || 'Not added'}</p>
            <div className="mt-3">
              {semesters.length ? semesters.map((semester, index) => (
                <div key={`${semester.semester}-${index}`} className="mb-3 border rounded p-2">
                  <strong>{semester.semester}</strong>
                  <div>SGPA: {semester.sgpa}, Attendance: {semester.attendance}%</div>
                  <small>{semester.credits} credits</small>
                </div>
              )) : <p className="text-muted mb-0">No semester records added yet.</p>}
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="panel-card">
            <h5>Skills</h5>
            <div className="d-flex flex-wrap gap-2">
              {skills.length ? skills.map((skill, index) => (
                <span key={`${skill.name}-${index}`} className="badge bg-primary-subtle text-primary rounded-pill px-3 py-2">
                  {skill.name} · {skill.level}%
                </span>
              )) : <p className="text-muted mb-0">No skills added yet.</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mt-1">
        <div className="col-lg-6">
          <div className="panel-card">
            <h5>Certifications</h5>
            {certifications.length ? (
              <ul className="mb-0 ps-3">
                {certifications.map((item, index) => (
                  <li key={`${item.name}-${index}`}>{item.name}{item.issuer ? ` - ${item.issuer}` : ''}</li>
                ))}
              </ul>
            ) : <p className="text-muted mb-0">No certifications added yet.</p>}
          </div>
        </div>

        <div className="col-lg-6">
          <div className="panel-card">
            <h5>Coding profiles</h5>
            {codingProfiles.length ? (
              <ul className="mb-0 ps-3">
                {codingProfiles.map((item, index) => (
                  <li key={`${item.platform}-${item.username}-${index}`}>
                    {item.platform}: {item.username || item.url || 'Profile added'}
                  </li>
                ))}
              </ul>
            ) : <p className="text-muted mb-0">No coding profiles added yet.</p>}
          </div>
        </div>
      </div>
    </Layout>
  );
}