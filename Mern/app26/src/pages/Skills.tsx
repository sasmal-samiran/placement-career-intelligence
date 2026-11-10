import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import api from '../services/api';

type SkillItem = {
  _id?: string;
  name: string;
  category?: string;
  level?: string;
  score?: number;
  validated?: boolean;
};

const DEFAULT_CATEGORIES = [
  'Programming Languages',
  'Frameworks & Libraries',
  'Web Development',
  'Databases',
  'Cloud & DevOps',
  'AI & Machine Learning',
  'Data Science & Analytics',
  'Tools & Version Control',
  'Cyber Security',
  'Core Computer Science',
  'Other',
];

export default function Skills() {
  const navigate = useNavigate();
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Programming Languages');
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning'>('success');

  const showToast = (msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
  };

  const fetchSkills = async () => {
    try {
      const response = await api.get('/skills');
      const list = Array.isArray(response.data?.data?.skills) ? response.data.data.skills : [];
      setSkills(list);
    } catch (error) {
      console.warn('Skills not available yet', error);
      showToast('Could not load skills from database.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  // Compute category options combining defaults and any custom categories in existing skills
  const categoryOptions = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    skills.forEach((s) => {
      if (s.category && s.category.trim()) {
        set.add(s.category.trim());
      }
    });
    return Array.from(set);
  }, [skills]);

  // Check if current name in modal already exists in DB/profile
  const existingSkillInModal = useMemo(() => {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) return null;
    return skills.find((s) => (s.name || '').trim().toLowerCase() === trimmed) || null;
  }, [name, skills]);

  const handleStartTest = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      showToast('Please enter a skill name to proceed.', 'warning');
      return;
    }

    // 1. Efficient check against in-memory skills list
    let existing = skills.find(
      (s) => (s.name || '').trim().toLowerCase() === trimmedName.toLowerCase()
    );

    // 2. Fallback check to database if not in memory
    if (!existing) {
      try {
        const checkRes = await api.get(`/skills/check?name=${encodeURIComponent(trimmedName)}`);
        if (checkRes.data?.exists && checkRes.data?.skill) {
          existing = checkRes.data.skill;
        }
      } catch (err) {
        console.warn('Check skill existence query failed, continuing with local check:', err);
      }
    }

    if (existing) {
      if (existing.validated) {
        const confirmRetake = window.confirm(
          `Skill "${existing.name}" already exists in your profile and is already verified with a score of ${existing.score || 0}% (${existing.level || 'Beginner'}).\n\nDo you want to retake the test to update your score?`
        );
        if (!confirmRetake) {
          return;
        }
      } else {
        showToast(
          `Skill "${existing.name}" already exists in your profile as unverified. Proceeding to validation test.`,
          'warning'
        );
      }
    }

    setShow(false);
    navigate('/conduct-test', {
      state: {
        skillName: trimmedName,
        category: category.trim() || existing?.category || 'Other',
        isExisting: Boolean(existing),
        existingValidated: Boolean(existing?.validated),
        existingScore: existing?.score || 0,
        existingLevel: existing?.level || 'Beginner',
      },
    });
  };

  const removeSkill = async (id?: string, index?: number) => {
    try {
      if (id) {
        await api.delete(`/skills/${id}`);
      } else {
        const next = skills.filter((_, i) => i !== index);
        await api.put('/skills', { skills: next });
      }
      showToast('Skill removed successfully.', 'success');
      setSkills((prev) => (id ? prev.filter((s) => s._id !== id) : prev.filter((_, i) => i !== index)));
    } catch (error) {
      console.error('Could not remove skill', error);
      showToast('Failed to delete skill.', 'error');
    }
  };

  const openAddModal = (presetName = '') => {
    setName(presetName);
    setCategory('Programming Languages');
    setShow(true);
  };

  if (loading) {
    return (
      <Layout title="Skills" subtitle="Loading your technical skill portfolio...">
        <div className="panel-card text-center py-5">
          <div className="spinner-border text-primary mb-2" role="status" />
          <p className="text-muted mb-0">Loading skills from database...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Skills" subtitle="Build, validate, and maintain your technical skill profile.">
      <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage('')} />

      <div className="panel-card">
        <div className="panel-head">
          <div>
            <h5>My Skills</h5>
            <small>Validate your expertise through adaptive skill tests</small>
          </div>
          <button className="primary-btn small" onClick={() => openAddModal()}>
            <i className="bi bi-plus-lg me-1" /> Add Skill
          </button>
        </div>

        {skills.length === 0 ? (
          <div className="text-center py-5">
            <div
              className="rounded-circle bg-light d-inline-flex align-items-center justify-content-center mb-3"
              style={{ width: '60px', height: '60px', fontSize: '24px' }}
            >
              <i className="bi bi-lightning-charge text-muted" />
            </div>
            <h6 className="fw-semibold mb-1">No skills added yet</h6>
            <p className="text-muted small mb-3">
              Add your technical skills and validate them through automated assessments.
            </p>
            <button className="primary-btn small" onClick={() => openAddModal()}>
              <i className="bi bi-plus-lg me-1" /> Add First Skill
            </button>
          </div>
        ) : (
          <div className="skill-grid">
            {skills.map((s, i) => {
              const letter = (s.name?.[0] || 'S').toUpperCase();
              const levelStr = s.level || 'Beginner';
              const isValidated = Boolean(s.validated);
              const scoreVal = typeof s.score === 'number' ? s.score : 0;

              return (
                <div className="skill-card d-flex flex-column" key={s._id || `${s.name}-${i}`}>
                  <div className="skill-top">
                    <div className="skill-letter">{letter}</div>
                    <div className="flex-grow-1 overflow-hidden">
                      <strong className="d-block text-truncate" title={s.name}>
                        {s.name}
                      </strong>
                      <small className="text-muted text-truncate d-block">
                        {s.category || 'Other'}
                      </small>
                    </div>

                    {isValidated ? (
                      <span className="badge bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center px-2 py-1">
                        <i className="bi bi-patch-check-fill me-1" />
                        Verified
                      </span>
                    ) : (
                      <span className="badge bg-warning-subtle text-warning border border-warning-subtle d-inline-flex align-items-center px-2 py-1">
                        <i className="bi bi-clock-history me-1" />
                        Unverified
                      </span>
                    )}
                  </div>

                  <div className="d-flex align-items-center justify-content-between mt-3 mb-2 px-1">
                    <span className="text-muted small">Proficiency</span>
                    <span
                      className={`badge rounded-pill px-2 py-1 ${
                        levelStr === 'Proficient'
                          ? 'bg-success text-white'
                          : levelStr === 'Intermediate'
                          ? 'bg-primary text-white'
                          : 'bg-secondary text-white'
                      }`}
                      style={{ fontSize: '11px' }}
                    >
                      {levelStr}
                    </span>
                  </div>

                  <div className="d-flex align-items-center justify-content-between mb-3 px-1">
                    <span className="text-muted small">Test Score</span>
                    <strong style={{ fontSize: '12px' }}>
                      {scoreVal > 0 ? `${scoreVal}%` : 'Not Taken'}
                    </strong>
                  </div>

                  <div className="skill-bottom mt-auto d-flex align-items-center justify-content-between pt-2 border-top">
                    <button
                      type="button"
                      className={`btn btn-sm ${
                        isValidated ? 'btn-outline-secondary' : 'btn-outline-primary'
                      } d-inline-flex align-items-center px-2 py-1`}
                      style={{ fontSize: '12px' }}
                      onClick={() =>
                        navigate('/conduct-test', {
                          state: { skillName: s.name, category: s.category || 'Other' },
                        })
                      }
                      title={isValidated ? 'Retake skill assessment' : 'Take skill test to verify'}
                    >
                      <i className={`bi ${isValidated ? 'bi-arrow-repeat' : 'bi-pencil-square'} me-1`} />
                      {isValidated ? 'Retake Test' : 'Validate Skill'}
                    </button>

                    <button
                      type="button"
                      className="table-icon text-danger"
                      onClick={() => removeSkill(s._id, i)}
                      title="Delete skill"
                    >
                      <i className="bi bi-trash3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recommended skills section */}
      <div className="panel-card mt-4">
        <div className="panel-head">
          <h5>Recommended Skills</h5>
          <span className="ai-label">
            <i className="bi bi-stars" /> AI Suggested
          </span>
        </div>
        <p className="text-muted small mb-3">
          Click on any recommended skill to quickly add it and conduct a validation test.
        </p>
        <div className="recommend-chips">
          {['Node.js', 'MongoDB', 'Docker', 'Git & GitHub', 'Deep Learning', 'React', 'Python', 'Kubernetes'].map(
            (rec) => (
              <span
                key={rec}
                style={{ cursor: 'pointer' }}
                onClick={() => openAddModal(rec)}
                title={`Add ${rec} and take validation test`}
              >
                <i className="bi bi-plus-sm me-1" />
                {rec}
              </span>
            )
          )}
        </div>
      </div>

      {/* Add Skill Modal - Takes only skill name & category, then moves to ConductTest */}
      <Modal show={show} title="Add New Skill" onClose={() => setShow(false)}>
        <div className="mb-3">
          <label className="form-label fw-semibold small">Skill Name *</label>
          <input
            className="form-control modern-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. React, Python, Docker, SQL"
            autoFocus
            required
          />
        </div>

        <div className="mb-4">
          <label className="form-label fw-semibold small">Skill Category *</label>
          <select
            className="form-select modern-input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <small className="text-muted mt-1 d-block">
            Categorizing your skill helps tailor the validation test questions.
          </small>
        </div>

        {existingSkillInModal && (
          <div
            className={`alert ${
              existingSkillInModal.validated ? 'alert-info' : 'alert-warning'
            } py-2 px-3 small d-flex align-items-center gap-2 mb-3`}
          >
            <i
              className={`bi ${
                existingSkillInModal.validated
                  ? 'bi-patch-check-fill text-success fs-5'
                  : 'bi-clock-history text-warning fs-5'
              }`}
            />
            <div>
              <strong className="d-block">Skill already in your profile:</strong>
              {existingSkillInModal.validated ? (
                <span>
                  Already verified with score <strong>{existingSkillInModal.score || 0}%</strong> (
                  {existingSkillInModal.level || 'Beginner'}). Taking the test will retake and update your score.
                </span>
              ) : (
                <span>
                  Currently <strong>Unverified</strong> (saved to validate later). Taking the test will validate this skill.
                </span>
              )}
            </div>
          </div>
        )}

        <div className="p-3 bg-light rounded border mb-4">
          <div className="d-flex align-items-center gap-2 mb-1">
            <i className="bi bi-patch-check text-primary fs-5" />
            <strong className="small">Validation Test Process</strong>
          </div>
          <p className="text-muted small mb-0" style={{ fontSize: '12px', lineHeight: 1.5 }}>
            After entering the skill, you will proceed to the <strong>Skill Test Page</strong> to validate your
            knowledge. If the test service is currently unavailable, you will have the option to save the skill
            without validation and validate it later.
          </p>
        </div>

        <button
          type="button"
          className="primary-btn w-100 justify-content-center py-2"
          onClick={handleStartTest}
        >
          <i
            className={`bi ${
              existingSkillInModal?.validated ? 'bi-arrow-repeat' : 'bi-arrow-right-circle'
            } me-2`}
          />
          {existingSkillInModal?.validated
            ? 'Retake Skill Test'
            : existingSkillInModal
            ? 'Proceed to Validate Skill'
            : 'Proceed to Skill Test'}
        </button>
      </Modal>
    </Layout>
  );
}
