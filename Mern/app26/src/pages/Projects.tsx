import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import api from '../services/api';

export default function Projects() {
  const [items, setItems] = useState<any[]>([]);
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/students/profile');
      setItems(response.data?.data?.projects ?? []);
    } catch (error) {
      console.warn('Projects unavailable', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const saveProjects = async (nextItems: any[]) => {
    try {
      const response = await api.get('/students/profile');
      const profile = response.data?.data || {};
      await api.put('/students/profile', {
        ...profile,
        projects: nextItems,
      });
    } catch (error) {
      console.error('Could not save projects', error);
    }
  };

  const add = async () => {
    if (!name.trim()) return;
    const nextItems = [...items, {
      title: name.trim(),
      description: desc,
      techStack: ['New project'],
      role: 'Developer',
      githubUrl: '',
      liveUrl: '',
    }];
    setItems(nextItems);
    setName('');
    setDesc('');
    setShow(false);
    await saveProjects(nextItems);
  };

  const removeItem = async (index: number) => {
    const nextItems = items.filter((_, i) => i !== index);
    setItems(nextItems);
    await saveProjects(nextItems);
  };

  if (loading) {
    return (
      <Layout title="Projects" subtitle="Loading your project portfolio...">
        <div className="panel-card text-center py-5">Loading projects...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Projects" subtitle="Showcase the work that proves your skills.">
      <div className="row g-4">
        {items.map((p, i) => (
          <div className="col-lg-4" key={`${p.title}-${i}`}>
            <div className="project-card">
              <div className="project-icon"><i className="bi bi-code-square" /></div>
              <span className="status-pill success-pill">Completed</span>
              <h5>{p.title}</h5>
              <p>{p.description || 'Project description not added yet.'}</p>
              <div className="tech-tags">
                {(p.techStack || ['Project']).map((t: string) => <span key={t}>{t}</span>)}
              </div>
              <div className="project-actions">
                <button className="outline-btn small">View project</button>
                <button className="table-icon" onClick={() => removeItem(i)}><i className="bi bi-trash3" /></button>
              </div>
            </div>
          </div>
        ))}

        <div className="col-lg-4">
          <button className="add-project" onClick={() => setShow(true)}>
            <i className="bi bi-plus-circle" />
            <strong>Add new project</strong>
            <span>Document your next achievement</span>
          </button>
        </div>
      </div>

      <Modal show={show} title="Add project" onClose={() => setShow(false)}>
        <label>Project name</label>
        <input className="form-control modern-input mb-3" value={name} onChange={(e) => setName(e.target.value)} />
        <label>Description</label>
        <textarea className="form-control modern-input mb-3" rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} />
        <button className="primary-btn w-100" onClick={add}>Add project</button>
      </Modal>
    </Layout>
  );
}