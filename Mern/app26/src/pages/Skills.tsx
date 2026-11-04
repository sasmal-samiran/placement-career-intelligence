import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import api from '../services/api';

export default function Skills() {
  const [skills, setSkills] = useState<any[]>([]);
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');
  const [level, setLevel] = useState('70');
  const [loading, setLoading] = useState(true);

  const fetchSkills = async () => {
    try {
      const response = await api.get('/skills');
      setSkills(response.data?.data?.skills ?? []);
    } catch (error) {
      console.warn('Skills not available yet', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const saveSkills = async (nextSkills: any[]) => {
    try {
      const response = await api.put('/skills', { skills: nextSkills });
      setSkills(response.data?.data?.skills ?? nextSkills);
    } catch (error) {
      console.error('Could not save skills', error);
    }
  };

  const add = async () => {
    if (!name.trim()) return;
    const nextSkills = [...skills, { name: name.trim(), level: Number(level) || 70, category: 'Other' }];
    setSkills(nextSkills);
    setName('');
    setLevel('70');
    setShow(false);
    await saveSkills(nextSkills);
  };

  const removeSkill = async (index: number) => {
    const nextSkills = skills.filter((_, i) => i !== index);
    setSkills(nextSkills);
    await saveSkills(nextSkills);
  };

  if (loading) {
    return (
      <Layout title="Skills" subtitle="Loading your skill profile...">
        <div className="panel-card text-center py-5">Loading skills...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Skills" subtitle="Build and maintain your technical skill profile.">
      <div className="panel-card">
        <div className="panel-head">
          <div>
            <h5>My skills</h5>
            <small>Rate your current proficiency</small>
          </div>
          <button className="primary-btn small" onClick={() => setShow(true)}>
            <i className="bi bi-plus-lg" /> Add skill
          </button>
        </div>

        <div className="skill-grid">
          {skills.map((s, i) => (
            <div className="skill-card" key={`${s.name}-${i}`}>
              <div className="skill-top">
                <div className="skill-letter">{s.name?.[0] || 'S'}</div>
                <div>
                  <strong>{s.name}</strong>
                  <small>{s.category || 'Other'}</small>
                </div>
                <span>{s.level}%</span>
              </div>
              <div className="progress"><div style={{ width: `${s.level}%` }} /></div>
              <div className="skill-bottom">
                <small>{s.level >= 85 ? 'Advanced' : s.level >= 70 ? 'Intermediate' : 'Beginner'}</small>
                <button onClick={() => removeSkill(i)}><i className="bi bi-trash3" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel-card mt-4">
        <div className="panel-head">
          <h5>Recommended skills</h5>
          <span className="ai-label"><i className="bi bi-stars" /> AI matched</span>
        </div>
        <div className="recommend-chips">
          <span>Node.js</span><span>MongoDB</span><span>Docker</span><span>Git & GitHub</span><span>Deep Learning</span>
        </div>
      </div>

      <Modal show={show} title="Add skill" onClose={() => setShow(false)}>
        <label>Skill name</label>
        <input className="form-control modern-input mb-3" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. TypeScript" />
        <label>Proficiency: {level}%</label>
        <input className="form-range mb-4" type="range" min="1" max="100" value={level} onChange={(e) => setLevel(e.target.value)} />
        <button className="primary-btn w-100" onClick={add}>Add skill</button>
      </Modal>
    </Layout>
  );
}