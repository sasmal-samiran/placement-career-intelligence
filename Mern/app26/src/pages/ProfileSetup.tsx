import { FormEvent, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
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

type Profile = {
  name: string;
  email: string;
  phone: string;
  dob: string;
  branch: string;
  collegeTier: number;
  university: string;
  currentYear: string;
  bio: string;
};

type Semester = {
  semester: string;
  sgpa: string;
  attendance: string;
  credits: string;
};

type Skill = {
  name: string;
  category: string;
  level: string;
};

type Certification = {
  name: string;
  issuer: string;
  issueDate: string;
};

type CodingProfile = {
  platform: string;
  username: string;
  url: string;
  problemsSolved: string;
  score: string;
};

type Internship = {
  _id?: string;
  company: string;
  role: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
};

const emptySemester = (): Semester => ({ semester: '', sgpa: '', attendance: '', credits: '' });
const emptySkill = (): Skill => ({ name: '', category: '', level: '' });
const emptyCertification = (): Certification => ({ name: '', issuer: '', issueDate: '' });
const emptyCodingProfile = (): CodingProfile => ({ platform: '', username: '', url: '', problemsSolved: '', score: '' });
const emptyInternship = (): Internship => ({ company: '', role: '', description: '', startDate: '', endDate: '', status: '' });

export default function ProfileSetup() {
  const { user, token, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Profile>({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    dob: '',
    branch: '',
    collegeTier: 3,
    university: '',
    currentYear: '',
    bio: '',
  });
  const [semesters, setSemesters] = useState<Semester[]>([emptySemester()]);
  const [skills, setSkills] = useState<Skill[]>([emptySkill()]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [codingProfiles, setCodingProfiles] = useState<CodingProfile[]>([]);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice] = useState<string>(location.state?.notice || '');

  useEffect(() => {
    let active = true;

    Promise.all([
      api.get('/students/profile'),
      api.get('/academic'),
      api.get('/skills'),
      api.get('/certifications'),
      api.get('/coding'),
      api.get('/internships'),
    ])
      .then(([profileResponse, academicResponse, skillsResponse, certificationResponse, codingResponse, internshipResponse]) => {
        if (!active) return;

        const savedProfile = profileResponse.data?.data || {};
        setProfile((current) => ({
          ...current,
          name: savedProfile.name || current.name,
          email: savedProfile.email || current.email,
          phone: savedProfile.phone || '',
          dob: savedProfile.dob ? String(savedProfile.dob).slice(0, 10) : '',
          branch: savedProfile.branch || savedProfile.department || '',
          collegeTier: Number(savedProfile.collegeTier) || 3,
          university: savedProfile.university || '',
          currentYear: savedProfile.currentYear ? String(savedProfile.currentYear) : '',
          bio: savedProfile.bio || '',
        }));

        const savedSemesters = academicResponse.data?.data?.semesters;
        if (Array.isArray(savedSemesters) && savedSemesters.length) {
          setSemesters(savedSemesters.map((item: any) => ({
            semester: item.semester || '',
            sgpa: String(item.sgpa ?? ''),
            attendance: String(item.attendance ?? ''),
            credits: String(item.credits ?? ''),
          })));
        }

        const savedSkills = skillsResponse.data?.data?.skills;
        if (Array.isArray(savedSkills) && savedSkills.length) {
          setSkills(savedSkills.map((item: any) => ({
            name: item.name || '',
            category: item.category || item.cat || '',
            level: String(item.level ?? 50),
          })));
        }

        const savedCertifications = certificationResponse.data?.data;
        if (Array.isArray(savedCertifications)) {
          setCertifications(savedCertifications.map((item: any) => ({
            name: item.name || '',
            issuer: item.issuer || '',
            issueDate: item.issueDate || '',
          })));
        }

        const savedCodingProfiles = codingResponse.data?.data?.profiles;
        if (Array.isArray(savedCodingProfiles)) {
          setCodingProfiles(savedCodingProfiles.map((item: any) => ({
            platform: item.platform || '',
            username: item.username || '',
            url: item.url || '',
            problemsSolved: String(item.problemsSolved ?? ''),
            score: String(item.score ?? ''),
          })));
        }

        const savedInternships = internshipResponse.data?.data;
        if (Array.isArray(savedInternships)) {
          setInternships(savedInternships.map((item: any) => ({
            _id: item._id,
            company: item.company || '',
            role: item.role || '',
            description: item.description || '',
            startDate: item.startDate || '',
            endDate: item.endDate || '',
            status: item.status || '',
          })));
        }
      })
      .catch(() => {
        if (active) setError('Some saved details could not be loaded. You can still complete your profile.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const updateProfile = (field: keyof Profile, value: any) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const updateSemester = (index: number, field: keyof Semester, value: string) => {
    setSemesters((current) => current.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item
    ));
  };

  const updateSkill = (index: number, field: keyof Skill, value: string) => {
    setSkills((current) => current.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item
    ));
  };

  const updateCertification = (index: number, field: keyof Certification, value: string) => {
    setCertifications((current) => current.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item
    ));
  };

  const updateCodingProfile = (index: number, field: keyof CodingProfile, value: string) => {
    setCodingProfiles((current) => current.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item
    ));
  };

  const updateInternship = (index: number, field: keyof Internship, value: string) => {
    setInternships((current) => current.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item
    ));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (step < 4) {
      setStep((current) => current + 1);
      return;
    }

    const hasValue = (record: Record<string, string | undefined>) =>
      Object.values(record).some((value) => Boolean(value?.trim()));
    const hasAll = (record: Record<string, string | undefined>, fields: string[]) =>
      fields.every((field) => Boolean(record[field]?.trim()));

    if (semesters.some((item) => hasValue(item) && !hasAll(item, ['semester', 'sgpa', 'attendance', 'credits']))) {
      setStep(1);
      setError('Finish each semester row you started, or clear it before saving.');
      return;
    }
    if (skills.some((item) => hasValue(item) && !hasAll(item, ['name', 'category', 'level']))) {
      setStep(2);
      setError('Finish each skill row you started, or clear it before saving.');
      return;
    }
    if (certifications.some((item) => hasValue(item) && !item.name.trim())) {
      setStep(3);
      setError('Add a name to each certification row you started, or clear it before saving.');
      return;
    }
    if (codingProfiles.some((item) => hasValue(item) && !item.platform.trim())) {
      setStep(3);
      setError('Add a platform to each coding profile row you started, or clear it before saving.');
      return;
    }
    if (internships.some((item) => hasValue(item) && !hasAll(item, ['company', 'role']))) {
      setStep(4);
      setError('Add a company and role to each internship row you started, or clear it before saving.');
      return;
    }

    setSaving(true);
    try {
      const academicRecords = semesters.filter((item) => hasAll(item, ['semester', 'sgpa', 'attendance', 'credits'])).map((item) => ({
        semester: item.semester.trim(),
        sgpa: Number(item.sgpa),
        attendance: Number(item.attendance),
        credits: Number(item.credits),
        percentage: Number(item.sgpa) * 10,
      }));
      const skillRecords = skills.filter((item) => hasAll(item, ['name', 'category', 'level'])).map((item) => ({
        name: item.name.trim(),
        category: item.category.trim(),
        level: Number(item.level),
      }));
      const certificationRecords = certifications
        .filter((item) => item.name.trim())
        .map((item) => ({ ...item, name: item.name.trim() }));
      const codingRecords = codingProfiles
        .filter((item) => item.platform.trim())
        .map((item) => ({
          ...item,
          platform: item.platform.trim(),
          problemsSolved: Number(item.problemsSolved) || 0,
          score: Number(item.score) || 0,
        }));
      const internshipRecords = internships.filter((item) => hasAll(item, ['company', 'role']));

      await api.put('/students/profile', profile);
      await api.put('/academic', { semesters: academicRecords });
      await api.put('/skills', { skills: skillRecords });
      await api.put('/certifications', { certifications: certificationRecords });
      await api.put('/coding', { profiles: codingRecords });
      await Promise.all(internshipRecords.map(({ _id, ...item }) => (
        _id ? api.put(`/internships/${_id}`, item) : api.post('/internships', item)
      )));

      if (user && token) login({ ...user, name: profile.name, email: profile.email }, token);
      localStorage.removeItem('careerPilotSetupRequired');
      navigate('/dashboard', { replace: true });
    } catch {
      setError('We could not save all your details. Check your connection and submit again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Complete your profile" subtitle="Loading your saved details...">
        <div className="panel-card text-center py-5">Loading profile setup...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Complete your profile" subtitle="Add your student details, academic history, and skills.">
      <div className="panel-card">
        <div className="d-flex flex-wrap gap-3 mb-4" aria-label="Profile setup steps">
          {['Profile', 'Academics', 'Skills', 'More details', 'Internships'].map((label, index) => (
            <div key={label} className={`d-flex align-items-center gap-2 ${index === step ? 'fw-bold' : 'text-muted'}`}>
              <span className={`badge ${index <= step ? 'bg-primary' : 'bg-secondary'}`}>{index + 1}</span>
              {label}
            </div>
          ))}
        </div>

        {notice && <div className="alert alert-warning" role="status">{notice}</div>}
        {error && <div className="alert alert-danger" role="alert">{error}</div>}

        <form onSubmit={submit}>
          {step === 0 && (
            <section>
              <h4>Student profile</h4>
              <p className="text-muted">Personal and university details</p>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Full name *</label>
                  <input className="form-control modern-input" value={profile.name} onChange={(event) => updateProfile('name', event.target.value)} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Email *</label>
                  <input className="form-control modern-input" type="email" value={profile.email} onChange={(event) => updateProfile('email', event.target.value)} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Phone</label>
                  <input className="form-control modern-input" type="tel" value={profile.phone} onChange={(event) => updateProfile('phone', event.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label" htmlFor="date-of-birth">Date of birth</label>
                  <input id="date-of-birth" className="form-control modern-input" type="date" max={new Date().toISOString().slice(0, 10)} value={profile.dob} onChange={(event) => updateProfile('dob', event.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Branch</label>
                  <select className="form-select modern-input" value={profile.branch} onChange={(event) => updateProfile('branch', event.target.value)}>
                    <option value="">Select Branch</option>
                    {BRANCHES.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">College Tier</label>
                  <select className="form-select modern-input" value={profile.collegeTier} onChange={(event) => updateProfile('collegeTier', Number(event.target.value))}>
                    <option value={1}>Tier 1</option>
                    <option value={2}>Tier 2</option>
                    <option value={3}>Tier 3</option>
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label">University</label>
                  <input className="form-control modern-input" value={profile.university} onChange={(event) => updateProfile('university', event.target.value)} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Study year</label>
                  <select className="form-select modern-input" value={profile.currentYear} onChange={(event) => updateProfile('currentYear', event.target.value)}>
                    <option value="">Select Year</option>
                    {[1, 2, 3, 4, 5, 6].map((year) => (
                      <option key={year} value={String(year)}>
                        Year {year}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label">About you</label>
                  <textarea className="form-control modern-input" rows={3} value={profile.bio} onChange={(event) => updateProfile('bio', event.target.value)} />
                </div>
              </div>
            </section>
          )}

          {step === 1 && (
            <section>
              <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
                <div>
                  <h4>Academic history</h4>
                  <p className="text-muted mb-0">Add each completed semester record</p>
                </div>
                <button className="outline-btn" type="button" onClick={() => setSemesters((current) => [...current, emptySemester()])}>
                  <i className="bi bi-plus-lg" /> Add semester
                </button>
              </div>
              <div className="d-grid gap-3">
                {semesters.map((item, index) => (
                  <div className="border rounded p-3" key={`semester-${index}`}>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <strong>Semester {index + 1}</strong>
                      {semesters.length > 1 && (
                        <button className="table-icon" type="button" aria-label={`Remove semester ${index + 1}`} onClick={() => setSemesters((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                          <i className="bi bi-trash3" />
                        </button>
                      )}
                    </div>
                    <div className="row g-3">
                      <div className="col-md-3">
                        <label className="form-label">Semester name</label>
                        <input className="form-control modern-input" value={item.semester} onChange={(event) => updateSemester(index, 'semester', event.target.value)} placeholder="Semester 1" />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">SGPA (0-10)</label>
                        <input className="form-control modern-input" type="number" min="0" max="10" step="0.01" value={item.sgpa} onChange={(event) => updateSemester(index, 'sgpa', event.target.value)} />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Attendance (%)</label>
                        <input className="form-control modern-input" type="number" min="0" max="100" step="0.1" value={item.attendance} onChange={(event) => updateSemester(index, 'attendance', event.target.value)} />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Credits</label>
                        <input className="form-control modern-input" type="number" min="0" step="1" value={item.credits} onChange={(event) => updateSemester(index, 'credits', event.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {step === 2 && (
            <section>
              <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
                <div>
                  <h4>Skills</h4>
                  <p className="text-muted mb-0">Add your skills and rate your current proficiency</p>
                </div>
                <button className="outline-btn" type="button" onClick={() => setSkills((current) => [...current, emptySkill()])}>
                  <i className="bi bi-plus-lg" /> Add skill
                </button>
              </div>
              <div className="d-grid gap-3">
                {skills.map((item, index) => (
                  <div className="row g-3 align-items-end border rounded p-3 mx-0" key={`skill-${index}`}>
                    <div className="col-md-4">
                      <label className="form-label">Skill name</label>
                      <input className="form-control modern-input" value={item.name} onChange={(event) => updateSkill(index, 'name', event.target.value)} placeholder="e.g. JavaScript" />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Category</label>
                      <input className="form-control modern-input" value={item.category} onChange={(event) => updateSkill(index, 'category', event.target.value)} placeholder="e.g. Programming" />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Proficiency (1-100)</label>
                      <input className="form-control modern-input" type="number" min="1" max="100" value={item.level} onChange={(event) => updateSkill(index, 'level', event.target.value)} />
                    </div>
                    <div className="col-md-1">
                      {skills.length > 1 && (
                        <button className="table-icon mb-2" type="button" aria-label={`Remove skill ${index + 1}`} onClick={() => setSkills((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                          <i className="bi bi-trash3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {step === 3 && (
            <section>
              <h4>Certifications and coding profiles</h4>
              <p className="text-muted">Add any achievements or developer platforms you already use.</p>

              <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
                <h5 className="mb-0">Certifications</h5>
                <button className="outline-btn" type="button" onClick={() => setCertifications((current) => [...current, emptyCertification()])}>
                  <i className="bi bi-plus-lg" /> Add certification
                </button>
              </div>
              <div className="d-grid gap-3 mb-4">
                {certifications.map((item, index) => (
                  <div className="row g-3 border rounded p-3 mx-0" key={`certification-${index}`}>
                    <div className="col-md-4">
                      <label className="form-label">Name</label>
                      <input className="form-control modern-input" value={item.name} onChange={(event) => updateCertification(index, 'name', event.target.value)} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Issuer</label>
                      <input className="form-control modern-input" value={item.issuer} onChange={(event) => updateCertification(index, 'issuer', event.target.value)} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Issue date</label>
                      <input className="form-control modern-input" type="date" value={item.issueDate} onChange={(event) => updateCertification(index, 'issueDate', event.target.value)} />
                    </div>
                    <div className="col-md-1 d-flex align-items-end">
                      <button className="table-icon mb-2" type="button" aria-label={`Remove certification ${index + 1}`} onClick={() => setCertifications((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                        <i className="bi bi-trash3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
                <h5 className="mb-0">Coding profiles</h5>
                <button className="outline-btn" type="button" onClick={() => setCodingProfiles((current) => [...current, emptyCodingProfile()])}>
                  <i className="bi bi-plus-lg" /> Add coding profile
                </button>
              </div>
              <div className="d-grid gap-3">
                {codingProfiles.map((item, index) => (
                  <div className="row g-3 border rounded p-3 mx-0" key={`coding-${index}`}>
                    <div className="col-md-3">
                      <label className="form-label">Platform</label>
                      <input className="form-control modern-input" value={item.platform} onChange={(event) => updateCodingProfile(index, 'platform', event.target.value)} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Username</label>
                      <input className="form-control modern-input" value={item.username} onChange={(event) => updateCodingProfile(index, 'username', event.target.value)} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Profile URL</label>
                      <input className="form-control modern-input" type="url" value={item.url} onChange={(event) => updateCodingProfile(index, 'url', event.target.value)} />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">Score</label>
                      <input className="form-control modern-input" type="number" min="0" value={item.score} onChange={(event) => updateCodingProfile(index, 'score', event.target.value)} />
                    </div>
                    <div className="col-md-1 d-flex align-items-end">
                      <button className="table-icon mb-2" type="button" aria-label={`Remove coding profile ${index + 1}`} onClick={() => setCodingProfiles((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                        <i className="bi bi-trash3" />
                      </button>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Problems solved</label>
                      <input className="form-control modern-input" type="number" min="0" value={item.problemsSolved} onChange={(event) => updateCodingProfile(index, 'problemsSolved', event.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {step === 4 && (
            <section>
              <div className="d-flex justify-content-between align-items-center gap-3 mb-3">
                <div>
                  <h4>Internship experience</h4>
                  <p className="text-muted mb-0">This section is optional. Add experience when you have it.</p>
                </div>
                <button className="outline-btn" type="button" onClick={() => setInternships((current) => [...current, emptyInternship()])}>
                  <i className="bi bi-plus-lg" /> Add internship
                </button>
              </div>
              <div className="d-grid gap-3">
                {internships.map((item, index) => (
                  <div className="row g-3 border rounded p-3 mx-0" key={item._id || `internship-${index}`}>
                    <div className="col-md-4">
                      <label className="form-label">Company</label>
                      <input className="form-control modern-input" value={item.company} onChange={(event) => updateInternship(index, 'company', event.target.value)} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Role</label>
                      <input className="form-control modern-input" value={item.role} onChange={(event) => updateInternship(index, 'role', event.target.value)} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Status</label>
                      <select className="form-select modern-input" value={item.status} onChange={(event) => updateInternship(index, 'status', event.target.value)}>
                        <option value="">Select status</option>
                        <option>Completed</option>
                        <option>In progress</option>
                        <option>Offer received</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Start date</label>
                      <input className="form-control modern-input" type="date" value={item.startDate} onChange={(event) => updateInternship(index, 'startDate', event.target.value)} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">End date</label>
                      <input className="form-control modern-input" type="date" value={item.endDate} onChange={(event) => updateInternship(index, 'endDate', event.target.value)} />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Description</label>
                      <textarea className="form-control modern-input" rows={2} value={item.description} onChange={(event) => updateInternship(index, 'description', event.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="d-flex justify-content-between mt-4">
            <button className="outline-btn" type="button" onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0 || saving}>
              <i className="bi bi-arrow-left" /> Back
            </button>
            <button className="primary-btn" type="submit" disabled={saving}>
              {saving ? 'Saving...' : step === 4 ? 'Save profile' : 'Continue'}
              {!saving && <i className={`bi bi-arrow-${step === 4 ? 'check2' : 'right'}`} />}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}