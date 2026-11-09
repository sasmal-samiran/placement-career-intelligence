import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Toast from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const BRANCHES = [
  { code: 'CSE', name: 'Computer Science and Engineering (CSE)' },
  { code: 'DS', name: 'Computer Science and Engineering – Data Science (DS)' },
  { code: 'AIML', name: 'Computer Science and Engineering – Artificial Intelligence and Machine Learning (AIML)' },
  { code: 'IT', name: 'Information Technology (IT)' },
  { code: 'CS', name: 'Computer Science and Engineering – Cyber Security (CS)' },
  { code: 'ECE', name: 'Electronics and Communication Engineering (ECE)' },
  { code: 'EEE', name: 'Electrical and Electronics Engineering (EEE)' },
  { code: 'Mechanical', name: 'Mechanical Engineering (Mechanical)' },
  { code: 'Civil', name: 'Civil Engineering (Civil)' },
  { code: 'Chemical', name: 'Chemical Engineering (Chemical)' },
];

const getBranchName = (code?: string) => {
  const match = BRANCHES.find((b) => b.code === code);
  return match ? match.name : code || '';
};

const POPULAR_ROLES = [
  'Software Development Engineer (SDE)',
  'Full Stack Developer',
  'Frontend Developer',
  'Backend Developer',
  'Data Scientist',
  'Machine Learning Engineer',
  'DevOps / Cloud Engineer',
  'Cybersecurity Analyst',
  'Mobile App Developer',
  'Product Manager',
  'Data Analyst',
  'QA / Automation Engineer',
];

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
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning'>('success');
  const [deletingAchievementId, setDeletingAchievementId] = useState<string | number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

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
        const data = profileResult.value.data?.data || {};
        if (data.dob) data.dob = String(data.dob).slice(0, 10);
        setProfile(data);
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

  const update = (key: string, value: any) => {
    setProfile((current: any) => ({ ...current, [key]: value }));
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await api.delete('/students/profile');
      logout();
      navigate('/login', { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete account. Please try again.');
      setShowDeleteModal(false);
      setDeleting(false);
    }
  };

  const handleDeleteAchievement = async (id?: string, index?: number, title?: string) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the achievement "${title || 'Achievement'}"?`
    );
    if (!confirmDelete) return;

    setDeletingAchievementId(id || (typeof index === 'number' ? index : null));
    try {
      if (id) {
        await api.delete(`/students/achievements/${id}`);
      } else {
        const nextAchievements = (profile?.achievements || []).filter((_: any, i: number) => i !== index);
        await api.put('/students/profile', { achievements: nextAchievements });
      }

      setProfile((prev: any) => ({
        ...prev,
        achievements: (prev?.achievements || []).filter((item: any, i: number) =>
          id ? item._id !== id : i !== index
        ),
      }));
      setToastMessage('Achievement deleted successfully.');
      setToastType('success');
    } catch (err: any) {
      console.error('Failed to delete achievement:', err);
      setToastMessage(err?.response?.data?.message || 'Failed to delete achievement.');
      setToastType('error');
    } finally {
      setDeletingAchievementId(null);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: profile?.name,
        email: profile?.email,
        phone: profile?.phone,
        dob: profile?.dob ? String(profile.dob).slice(0, 10) : null,
        branch: profile?.branch || profile?.department || '',
        collegeTier: Number(profile?.collegeTier) || 3,
        university: profile?.university || '',
        currentYear: profile?.currentYear ? String(profile.currentYear) : '',
        targetJobRole: profile?.targetJobRole || '',
        bio: profile?.bio || '',
      };
      const response = await api.put('/students/profile', payload);
      const updated = response.data?.data || payload;
      if (updated.dob) updated.dob = String(updated.dob).slice(0, 10);
      setProfile((current: any) => ({ ...current, ...updated }));
      setEdit(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Your profile changes could not be saved. Please try again.');
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

  const totalCredits = semesters.reduce((sum, item) => sum + Number(item.credits || 0), 0);
  const weightedSum = semesters.reduce(
    (sum, item) => sum + Number(item.sgpa || 0) * Number(item.credits || 0),
    0
  );
  const averageCgpa = totalCredits > 0
    ? (weightedSum / totalCredits).toFixed(2)
    : semesters.length
    ? (semesters.reduce((sum, item) => sum + Number(item.sgpa || 0), 0) / semesters.length).toFixed(2)
    : 'N/A';
  const averageAttendance = semesters.length
    ? (semesters.reduce((sum, item) => sum + Number(item.attendance || 0), 0) / semesters.length).toFixed(1)
    : 'Not added';
  const completionFields = [
    profile?.name,
    profile?.email,
    profile?.phone,
    profile?.branch || profile?.department,
    profile?.collegeTier,
    profile?.university,
    profile?.currentYear,
    profile?.targetJobRole,
  ];
  const completion = Math.round(completionFields.filter(Boolean).length / completionFields.length * 100);

  const activeTargetJobRole = profile?.targetJobRole || '';

  return (
    <Layout title="Student Profile" subtitle="Manage your personal and academic identity.">
      <Toast
        message={toastMessage || error}
        type={toastMessage ? toastType : 'warning'}
        onClose={() => {
          setToastMessage('');
          setError('');
        }}
      />

      <div className="profile-cover">
        <div className="profile-avatar-lg">{profile?.name?.charAt(0) || '?'}</div>
        <div>
          <h3>{profile?.name || 'Student profile'}</h3>
          <p>{getBranchName(profile?.branch || profile?.department) || 'Branch not added'} · {profile?.university || 'University not added'}</p>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="status-pill"><i className="bi bi-person-check" /> Student account</span>
            {activeTargetJobRole && (
              <span className="status-pill primary-pill">
                <i className="bi bi-briefcase me-1" />
                Target: {activeTargetJobRole}
              </span>
            )}
          </div>
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
              <div className="col-md-6">
                <label className="form-label" htmlFor="profile-name">Name</label>
                <input
                  id="profile-name"
                  className="form-control modern-input"
                  type="text"
                  value={profile?.name || ''}
                  disabled={!edit || saving}
                  onChange={(e) => update('name', e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="profile-email">Email</label>
                <input
                  id="profile-email"
                  className="form-control modern-input"
                  type="email"
                  value={profile?.email || ''}
                  disabled={!edit || saving}
                  onChange={(e) => update('email', e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="profile-phone">Phone</label>
                <input
                  id="profile-phone"
                  className="form-control modern-input"
                  type="text"
                  value={profile?.phone || ''}
                  disabled={!edit || saving}
                  onChange={(e) => update('phone', e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="profile-dob">Date Of Birth</label>
                <input
                  id="profile-dob"
                  className="form-control modern-input"
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={typeof profile?.dob === 'string' ? profile.dob.slice(0, 10) : ''}
                  disabled={!edit || saving}
                  onChange={(e) => update('dob', e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="profile-branch">Branch</label>
                <select
                  id="profile-branch"
                  className="form-select modern-input"
                  value={profile?.branch || profile?.department || ''}
                  disabled={!edit || saving}
                  onChange={(e) => update('branch', e.target.value)}
                >
                  <option value="">Select Branch</option>
                  {BRANCHES.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="profile-collegeTier">College Tier</label>
                <select
                  id="profile-collegeTier"
                  className="form-select modern-input"
                  value={profile?.collegeTier || 3}
                  disabled={!edit || saving}
                  onChange={(e) => update('collegeTier', Number(e.target.value))}
                >
                  <option value={1}>Tier 1</option>
                  <option value={2}>Tier 2</option>
                  <option value={3}>Tier 3</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="profile-university">University</label>
                <input
                  id="profile-university"
                  className="form-control modern-input"
                  type="text"
                  value={profile?.university || ''}
                  disabled={!edit || saving}
                  onChange={(e) => update('university', e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label" htmlFor="profile-currentYear">Study Year</label>
                <select
                  id="profile-currentYear"
                  className="form-select modern-input"
                  value={profile?.currentYear || ''}
                  disabled={!edit || saving}
                  onChange={(e) => update('currentYear', e.target.value)}
                >
                  <option value="">Select Year</option>
                  {[1, 2, 3, 4, 5, 6].map((year) => (
                    <option key={year} value={String(year)}>
                      Year {year}
                    </option>
                  ))}
                </select>
              </div>
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

      {/* Target Job Role Section */}
      <div className="row g-4 mt-1">
        <div className="col-12">
          <div className="panel-card">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <div>
                <h5 className="mb-1 d-flex align-items-center gap-2">
                  <i className="bi bi-briefcase text-primary fs-5" />
                  Target Job Role
                </h5>
                <small className="text-muted">Define your primary career objective and engineering designation</small>
              </div>
              {activeTargetJobRole && (
                <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 fs-6">
                  <i className="bi bi-crosshair2 me-1" />
                  {activeTargetJobRole}
                </span>
              )}
            </div>

            {edit ? (
              <div>
                <label className="form-label small fw-semibold" htmlFor="profile-target-role">
                  Target Role / Designation
                </label>
                <div className="input-group mb-3">
                  <span className="input-group-text bg-light text-muted">
                    <i className="bi bi-crosshair" />
                  </span>
                  <input
                    id="profile-target-role"
                    type="text"
                    className="form-control modern-input"
                    placeholder="e.g. Full Stack Developer, Data Scientist, SDE, Cloud Engineer"
                    value={profile?.targetJobRole || ''}
                    disabled={saving}
                    onChange={(e) => update('targetJobRole', e.target.value)}
                  />
                  {profile?.targetJobRole && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => update('targetJobRole', '')}
                      title="Clear target role"
                    >
                      <i className="bi bi-x-lg" />
                    </button>
                  )}
                </div>

                <div className="small text-muted mb-2 fw-medium">Quick Select from Popular Roles:</div>
                <div className="d-flex flex-wrap gap-2">
                  {POPULAR_ROLES.map((role) => {
                    const isSelected = activeTargetJobRole.toLowerCase() === role.toLowerCase();
                    return (
                      <button
                        key={role}
                        type="button"
                        className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline-secondary'}`}
                        style={{ fontSize: '12px', borderRadius: '20px', padding: '4px 12px' }}
                        onClick={() => update('targetJobRole', role)}
                      >
                        {isSelected && <i className="bi bi-check2 me-1" />}
                        {role}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                {activeTargetJobRole ? (
                  <div className="p-3 bg-light rounded border d-flex flex-wrap align-items-center justify-content-between gap-3">
                    <div className="d-flex align-items-center gap-3">
                      <div
                        className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: '48px', height: '48px', fontSize: '22px' }}
                      >
                        <i className="bi bi-briefcase-fill" />
                      </div>
                      <div>
                        <h6 className="fw-bold mb-1 text-dark" style={{ fontSize: '16px' }}>
                          {activeTargetJobRole}
                        </h6>
                        <small className="text-muted">Primary Career Goal & Target Designation for AI Roadmaps</small>
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-2">
                        <i className="bi bi-check-circle-fill me-1" /> Active Career Goal
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => setEdit(true)}
                        style={{ fontSize: '12px' }}
                      >
                        <i className="bi bi-pencil me-1" /> Change
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 bg-light rounded border">
                    <div className="text-muted mb-2">
                      <i className="bi bi-crosshair fs-2 text-primary" />
                    </div>
                    <h6 className="fw-semibold mb-1">No target job role specified yet</h6>
                    <p className="text-muted small mb-3">
                      Setting your target job role helps tailor your placement roadmap, skill gap recommendations, and AI career guidance.
                    </p>
                    <button
                      type="button"
                      className="primary-btn small"
                      onClick={() => setEdit(true)}
                    >
                      <i className="bi bi-pencil me-1" /> Set Target Role
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="row g-4 mt-1">
        <div className="col-lg-6">
          <div className="panel-card">
            <h5>Academic summary</h5>
            <p><strong>Overall CGPA (Weighted):</strong> {averageCgpa}</p>
            <p><strong>Current semester:</strong> {semesters.at(-1)?.semester || 'Not added'}</p>
            <p><strong>Average attendance:</strong> {averageAttendance !== 'Not added' ? `${averageAttendance}%` : 'Not added'}</p>
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
                  {skill.name} · <span className="text-muted fw-normal">{skill.level}</span>
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

      <div className="row g-4 mt-1">
        <div className="col-12">
          <div className="panel-card">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">
                <i className="bi bi-trophy text-warning me-2" />
                Achievements
              </h5>
              <span className="badge bg-secondary-subtle text-secondary">
                {profile?.achievements?.length || 0} Total
              </span>
            </div>

            {profile?.achievements?.length ? (
              <div className="d-flex flex-column gap-2">
                {profile.achievements.map((item: any, index: number) => {
                  const itemKey = item._id || `${item.title}-${index}`;
                  const isItemDeleting = deletingAchievementId === (item._id || index);

                  return (
                    <div
                      key={itemKey}
                      className="p-3 bg-light rounded border d-flex align-items-start justify-content-between gap-3"
                    >
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                          <strong className="text-dark">{item.title}</strong>
                          {item.year && (
                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                              {item.year}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-muted small mb-0" style={{ fontSize: '13px' }}>
                            {item.description}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm d-inline-flex align-items-center justify-content-center p-1 px-2"
                        title="Delete achievement"
                        disabled={isItemDeleting}
                        onClick={() => handleDeleteAchievement(item._id, index, item.title)}
                        style={{ minWidth: '32px', height: '32px' }}
                      >
                        {isItemDeleting ? (
                          <span className="spinner-border spinner-border-sm" role="status" />
                        ) : (
                          <i className="bi bi-trash3" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted mb-0">No achievements recorded yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="panel-card mt-4 border border-danger-subtle">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div>
            <h5 className="text-danger mb-1"><i className="bi bi-shield-x me-2" />Delete Account</h5>
            <small className="text-muted">
              Permanently remove your student account, profile, academics, skills, and placement records.
            </small>
          </div>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm px-3 py-2 fw-semibold"
            onClick={() => setShowDeleteModal(true)}
            disabled={saving || deleting}
          >
            <i className="bi bi-trash3 me-1" /> Delete Account
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)' }}
        >
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" role="document">
            <div className="modal-content shadow-lg border-0" style={{ borderRadius: '14px' }}>
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title text-danger fw-bold">
                  <i className="bi bi-exclamation-triangle-fill me-2" />
                  Permanently Delete Account?
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                />
              </div>
              <div className="modal-body py-3">
                <p className="mb-3 text-muted">
                  Are you sure you want to permanently delete your account? This action cannot be reversed.
                </p>
                <div className="alert alert-danger py-2 px-3 small mb-0 border-0" style={{ borderRadius: '8px' }}>
                  All your academic scores, attendance, skills, projects, certifications, uploaded resumes, and placement predictions will be permanently wiped from the database.
                </div>
              </div>
              <div className="modal-footer border-0 pt-0">
                <button
                  type="button"
                  className="outline-btn btn-sm"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm px-3 fw-semibold"
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
