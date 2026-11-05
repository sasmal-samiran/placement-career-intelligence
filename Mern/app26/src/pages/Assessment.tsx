import { useEffect, useState, useRef } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

interface Option {
  option_id: string;
  text: string;
}

interface Question {
  question_id: string;
  category: string;
  subtopic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_text: string;
  options: Option[];
}

interface TestModule {
  id: string;
  title: string;
  description: string;
  category?: string;
  icon: string;
  durationMinutes: number;
  tag: string;
  tagColor: string;
}

const TEST_MODULES: TestModule[] = [
  {
    id: 'diag_comprehensive',
    title: 'Comprehensive Placement Diagnostic',
    description: 'All-round mock placement evaluation covering DSA, Core CS, Web Dev, Aptitude, and Workplace Judgment.',
    icon: 'bi-mortarboard-fill',
    durationMinutes: 15,
    tag: 'Recommended',
    tagColor: 'primary',
  },
  {
    id: 'dsa_challenge',
    title: 'DSA & Algorithms Mastery',
    description: 'Data structures, asymptotic complexity, graphs, trees, dynamic programming, and search algorithms.',
    category: 'dsa',
    icon: 'bi-code-square',
    durationMinutes: 10,
    tag: 'Technical',
    tagColor: 'success',
  },
  {
    id: 'core_cs_test',
    title: 'Core CS (OS, DBMS & Networks)',
    description: 'Acid transactions, deadlock conditions, TCP/UDP protocols, process scheduling, and indexing.',
    category: 'core_cs',
    icon: 'bi-cpu-fill',
    durationMinutes: 10,
    tag: 'Foundational',
    tagColor: 'info',
  },
  {
    id: 'web_dev_test',
    title: 'Full Stack & Web Engineering',
    description: 'REST API architectures, idempotent HTTP methods, React state & hooks, and modern web practices.',
    category: 'web_dev',
    icon: 'bi-window-stack',
    durationMinutes: 10,
    tag: 'Applied',
    tagColor: 'warning',
  },
  {
    id: 'aptitude_test',
    title: 'Quantitative & Logical Aptitude',
    description: 'Number patterns, percentage profit/loss, speed-distance-time, verbal ability, and logical reasoning.',
    category: 'aptitude_quantitative',
    icon: 'bi-calculator-fill',
    durationMinutes: 10,
    tag: 'Screening',
    tagColor: 'secondary',
  },
];

export default function Assessment() {
  const [mode, setMode] = useState<'hub' | 'taking' | 'result'>('hub');
  const [selectedModule, setSelectedModule] = useState<TestModule>(TEST_MODULES[0]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(900); // 15 mins default
  const [submitting, setSubmitting] = useState(false);
  const [evalResult, setEvalResult] = useState<any>(null);
  const [skillProfile, setSkillProfile] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const timerRef = useRef<any>(null);

  // Load past assessment history on mount
  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await api.get('/assessment/history');
      setHistory(res.data?.data || []);
    } catch (err) {
      console.warn('Could not load assessment history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Countdown timer when taking test
  useEffect(() => {
    if (mode === 'taking') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleSubmitTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode, questions, selectedAnswers]);

  // Start exam
  const handleStartExam = async (testMod: TestModule) => {
    setSelectedModule(testMod);
    try {
      let url = '/assessment/questions?limit=15';
      if (testMod.category) {
        url += `&category=${encodeURIComponent(testMod.category)}`;
      }
      const res = await api.get(url);
      const fetched: Question[] = res.data?.data || [];
      if (fetched.length === 0) {
        alert('No questions available for this module currently.');
        return;
      }
      setQuestions(fetched);
      setCurrentIndex(0);
      setSelectedAnswers({});
      setTimeLeft(testMod.durationMinutes * 60);
      setMode('taking');
    } catch (err) {
      console.error('Failed to fetch test questions:', err);
      alert('Unable to start assessment. Please ensure services are active.');
    }
  };

  // Select an option for current question
  const handleSelectOption = (optionId: string) => {
    const qId = questions[currentIndex].question_id;
    setSelectedAnswers((prev) => ({
      ...prev,
      [qId]: optionId,
    }));
  };

  // Submit test answers
  const handleSubmitTest = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const payloadAnswers = questions.map((q) => ({
        questionId: q.question_id,
        selectedOptionId: selectedAnswers[q.question_id] || '',
        timeTakenSeconds: 30,
      }));

      const res = await api.post('/assessment/submit', {
        testId: selectedModule.id,
        testTitle: selectedModule.title,
        answers: payloadAnswers,
      });

      const data = res.data?.data;
      setEvalResult(data?.evaluation || data?.attempt);
      setSkillProfile(data?.profile);
      setMode('result');
      await fetchHistory();
    } catch (err) {
      console.error('Failed to submit assessment:', err);
      alert('Error evaluating assessment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const answeredCount = Object.keys(selectedAnswers).length;
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Best score calculation
  const bestScore = history.length > 0 ? Math.max(...history.map((h) => h.totalScore || 0)) : 0;
  const latestAttempt = history[0];

  return (
    <Layout
      title="Skill Assessment"
      subtitle="Evaluate your readiness, verify your competencies, and benchmark against company tiers."
    >
      {/* ========================================================
          MODE 1: ASSESSMENT HUB & TEST SELECTION
         ======================================================== */}
      {mode === 'hub' && (
        <>
          {/* Top Hero Banner */}
          <div className="hero-card mb-4" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            <div>
              <span className="eyebrow text-uppercase">Diagnostic Assessment Engine</span>
              <h2 className="fw-bold mt-1 mb-2">Test Your Industry Placement Readiness</h2>
              <p className="mb-3" style={{ opacity: 0.9, maxWidth: 580 }}>
                Take timed assessments curated to mirror top product and service company hiring tests. Your results
                directly update your Skill Radar chart and placement prediction features.
              </p>
              <div className="d-flex flex-wrap gap-2">
                <button
                  className="btn btn-light fw-bold px-3 py-2 text-primary"
                  onClick={() => handleStartExam(TEST_MODULES[0])}
                >
                  <i className="bi bi-play-circle-fill me-1" /> Quick Start Diagnostic Test
                </button>
              </div>
            </div>

            {/* Overall Score Dial */}
            <div className="readiness-ring text-center">
              <strong>{bestScore}%</strong>
              <span>Best Score</span>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <div className="stat-card">
                <div className="stat-icon green"><i className="bi bi-journal-check" /></div>
                <div>
                  <small>Tests Completed</small>
                  <h3 className="mb-0">{history.length}</h3>
                  <span className="positive">Verified on platform</span>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="stat-card">
                <div className="stat-icon purple"><i className="bi bi-trophy-fill" /></div>
                <div>
                  <small>Highest Score</small>
                  <h3 className="mb-0">{bestScore}%</h3>
                  <span className="positive">{bestScore >= 75 ? 'Tier 1 / Product Ready' : 'In Progress'}</span>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="stat-card">
                <div className="stat-icon orange"><i className="bi bi-speedometer2" /></div>
                <div>
                  <small>Latest Performance</small>
                  <h3 className="mb-0">{latestAttempt?.totalScore ?? 'N/A'}{latestAttempt ? '%' : ''}</h3>
                  <small className="text-muted">{latestAttempt ? new Date(latestAttempt.completedAt).toLocaleDateString() : 'No attempts yet'}</small>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="stat-card">
                <div className="stat-icon blue"><i className="bi bi-radar" /></div>
                <div>
                  <small>Radar Dimensions</small>
                  <h3 className="mb-0">5 Domains</h3>
                  <span className="text-primary fw-semibold" style={{ fontSize: '11px' }}>DSA, CS, Web, Apt, Soft</span>
                </div>
              </div>
            </div>
          </div>

          {/* Test Modules Grid */}
          <div className="panel-card mb-4">
            <div className="panel-head">
              <div>
                <h5>Available Placement Assessments</h5>
                <small>Select an assessment track to begin your timed test</small>
              </div>
            </div>

            <div className="row g-3">
              {TEST_MODULES.map((mod) => (
                <div className="col-lg-6 col-xl-4" key={mod.id}>
                  <div className="p-3 border rounded-3 h-100 d-flex flex-column justify-content-between bg-white shadow-sm hover-shadow">
                    <div>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className={`badge bg-${mod.tagColor}-subtle text-${mod.tagColor} border border-${mod.tagColor}-subtle`}>
                          {mod.tag}
                        </span>
                        <small className="text-muted d-flex align-items-center">
                          <i className="bi bi-clock me-1" /> {mod.durationMinutes} mins
                        </small>
                      </div>
                      <h6 className="fw-bold mb-1" style={{ fontSize: '15px' }}>{mod.title}</h6>
                      <p className="text-muted mb-3" style={{ fontSize: '12px', lineHeight: 1.5 }}>
                        {mod.description}
                      </p>
                    </div>

                    <button
                      className="primary-btn w-100 d-flex align-items-center justify-content-center py-2"
                      onClick={() => handleStartExam(mod)}
                    >
                      <i className="bi bi-play-fill me-1" /> Start Exam
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Past History */}
          <div className="panel-card">
            <div className="panel-head">
              <div>
                <h5>Assessment History & Verified Badges</h5>
                <small>Your past test submissions and performance records</small>
              </div>
            </div>

            {loadingHistory ? (
              <div className="text-center py-4 text-muted">Loading history...</div>
            ) : history.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-journal-x display-6 d-block mb-2 text-secondary" />
                <h6 className="fw-bold">No Tests Completed Yet</h6>
                <p className="small">Choose an assessment track above to take your first placement readiness exam.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle mb-0">
                  <thead className="table-light">
                    <tr style={{ fontSize: '12px' }}>
                      <th>TEST TITLE</th>
                      <th>DATE</th>
                      <th>QUESTIONS</th>
                      <th>SCORE</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontSize: '13px' }}>
                    {history.map((h, i) => (
                      <tr key={i}>
                        <td>
                          <strong>{h.testTitle || 'Placement Assessment'}</strong>
                        </td>
                        <td className="text-muted">{new Date(h.completedAt).toLocaleDateString()}</td>
                        <td>{h.totalQuestions || 8} Qs</td>
                        <td>
                          <span className="badge bg-light text-dark border fw-bold px-2 py-1">
                            {h.totalScore}%
                          </span>
                        </td>
                        <td>
                          {h.totalScore >= 75 ? (
                            <span className="badge bg-success-subtle text-success border border-success-subtle">
                              <i className="bi bi-check-circle me-1" /> Advanced
                            </span>
                          ) : h.totalScore >= 50 ? (
                            <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                              Intermediate
                            </span>
                          ) : (
                            <span className="badge bg-warning-subtle text-warning border border-warning-subtle">
                              Beginner
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ========================================================
          MODE 2: ACTIVE EXAM INTERFACE
         ======================================================== */}
      {mode === 'taking' && questions.length > 0 && (
        <div className="row g-4">
          {/* Main Question Panel */}
          <div className="col-lg-8">
            <div className="panel-card position-relative">
              {/* Question Header Bar */}
              <div className="d-flex justify-content-between align-items-center pb-3 mb-3 border-bottom">
                <div>
                  <span className="badge bg-primary-subtle text-primary text-uppercase me-2">
                    {questions[currentIndex]?.category?.replace('_', ' ')}
                  </span>
                  <span className="badge bg-light text-secondary border text-capitalize">
                    {questions[currentIndex]?.difficulty}
                  </span>
                </div>
                <div className="fw-bold text-muted" style={{ fontSize: '13px' }}>
                  Question {currentIndex + 1} of {questions.length}
                </div>
              </div>

              {/* Question Prompt */}
              <div className="py-2 mb-4">
                <h5 className="fw-bold text-dark" style={{ lineHeight: 1.5 }}>
                  {questions[currentIndex]?.question_text}
                </h5>
                {questions[currentIndex]?.subtopic && (
                  <small className="text-muted">
                    Topic: {questions[currentIndex]?.subtopic}
                  </small>
                )}
              </div>

              {/* Options List */}
              <div className="d-flex flex-column gap-2 mb-4">
                {questions[currentIndex]?.options.map((opt) => {
                  const isSelected = selectedAnswers[questions[currentIndex]?.question_id] === opt.option_id;
                  return (
                    <div
                      key={opt.option_id}
                      onClick={() => handleSelectOption(opt.option_id)}
                      className={`p-3 rounded-3 border d-flex align-items-center cursor-pointer transition ${
                        isSelected
                          ? 'border-primary bg-primary-subtle text-primary fw-semibold shadow-sm'
                          : 'bg-white hover-bg-light'
                      }`}
                      style={{ cursor: 'pointer', transition: '0.15s ease' }}
                    >
                      <span
                        className={`badge rounded-circle me-3 d-flex align-items-center justify-content-center ${
                          isSelected ? 'bg-primary text-white' : 'bg-light text-secondary border'
                        }`}
                        style={{ width: 28, height: 28, fontSize: '12px' }}
                      >
                        {opt.option_id}
                      </span>
                      <span style={{ fontSize: '14px' }}>{opt.text}</span>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Nav Controls */}
              <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                <button
                  className="outline-btn"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((c) => Math.max(0, c - 1))}
                >
                  <i className="bi bi-chevron-left me-1" /> Previous
                </button>

                <div className="d-flex gap-2">
                  {selectedAnswers[questions[currentIndex]?.question_id] && (
                    <button
                      className="btn btn-sm btn-link text-muted text-decoration-none"
                      onClick={() => {
                        const copy = { ...selectedAnswers };
                        delete copy[questions[currentIndex]?.question_id];
                        setSelectedAnswers(copy);
                      }}
                    >
                      Clear Selection
                    </button>
                  )}

                  {currentIndex < questions.length - 1 ? (
                    <button
                      className="primary-btn px-4"
                      onClick={() => setCurrentIndex((c) => Math.min(questions.length - 1, c + 1))}
                    >
                      Next <i className="bi bi-chevron-right ms-1" />
                    </button>
                  ) : (
                    <button
                      className="btn btn-success px-4 fw-bold"
                      onClick={() => {
                        if (confirm(`You have answered ${answeredCount} of ${questions.length} questions. Ready to submit?`)) {
                          handleSubmitTest();
                        }
                      }}
                      disabled={submitting}
                    >
                      {submitting ? 'Submitting...' : 'Submit Assessment'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Exam Sidebar (Timer & Question Palette) */}
          <div className="col-lg-4">
            <div className="panel-card mb-3">
              <div className="text-center py-2">
                <small className="text-muted text-uppercase fw-bold" style={{ letterSpacing: '1px' }}>
                  Time Remaining
                </small>
                <div
                  className={`display-6 fw-bold mt-1 ${timeLeft < 180 ? 'text-danger' : 'text-primary'}`}
                  style={{ fontFamily: 'monospace' }}
                >
                  <i className="bi bi-stopwatch me-1" />
                  {formatTime(timeLeft)}
                </div>
              </div>

              <div className="progress mt-3 mb-2" style={{ height: 6 }}>
                <div
                  className="progress-bar bg-primary"
                  style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                />
              </div>
              <div className="d-flex justify-content-between small text-muted">
                <span>{answeredCount} Answered</span>
                <span>{questions.length - answeredCount} Remaining</span>
              </div>
            </div>

            {/* Question Matrix / Palette */}
            <div className="panel-card">
              <h6 className="fw-bold mb-3" style={{ fontSize: '13px' }}>
                Question Navigator
              </h6>
              <div className="d-flex flex-wrap gap-2">
                {questions.map((q, idx) => {
                  const isAnswered = Boolean(selectedAnswers[q.question_id]);
                  const isCurrent = idx === currentIndex;
                  return (
                    <button
                      key={q.question_id}
                      onClick={() => setCurrentIndex(idx)}
                      className={`btn btn-sm ${
                        isCurrent
                          ? 'btn-primary fw-bold'
                          : isAnswered
                          ? 'btn-success-subtle text-success border border-success'
                          : 'btn-light border text-muted'
                      }`}
                      style={{ width: 38, height: 38, fontSize: '12px' }}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 pt-3 border-top">
                <button
                  className="btn btn-outline-danger w-100 py-2 fw-semibold"
                  onClick={() => {
                    if (confirm('Are you sure you want to exit the exam? Your progress will be evaluated as is.')) {
                      handleSubmitTest();
                    }
                  }}
                  disabled={submitting}
                >
                  <i className="bi bi-box-arrow-right me-1" /> Finish & Submit Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODE 3: EXAM EVALUATION & RESULTS
         ======================================================== */}
      {mode === 'result' && evalResult && (
        <div className="row g-4">
          <div className="col-lg-5">
            {/* Overall Score Card */}
            <div className="panel-card text-center p-4 mb-4">
              <span className="badge bg-success-subtle text-success px-3 py-1 rounded-pill mb-3">
                <i className="bi bi-patch-check-fill me-1" /> Assessment Evaluated
              </span>
              <div className="display-4 fw-bold text-primary mb-1">
                {evalResult.total_score || 0}%
              </div>
              <h5 className="fw-bold mb-1">
                {evalResult.total_score >= 75
                  ? 'Advanced Proficiency'
                  : evalResult.total_score >= 50
                  ? 'Intermediate Ready'
                  : 'Needs Practice'}
              </h5>
              <p className="text-muted small mb-4">
                Test: {selectedModule.title}
              </p>

              {/* Recommendations */}
              <div className="text-start bg-light p-3 rounded-3 border mb-3">
                <h6 className="fw-bold mb-2" style={{ fontSize: '12px' }}>
                  <i className="bi bi-lightbulb-fill text-warning me-1" /> Recommended Next Steps
                </h6>
                <ul className="ps-3 mb-0 small text-secondary">
                  {(evalResult.recommendations || [
                    'Review weak technical topics and attempt weekly mock tests.',
                  ]).map((r: string, i: number) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>

              <div className="d-flex gap-2">
                <button
                  className="primary-btn flex-fill py-2"
                  onClick={() => handleStartExam(selectedModule)}
                >
                  <i className="bi bi-arrow-repeat me-1" /> Retake Test
                </button>
                <button
                  className="outline-btn flex-fill py-2"
                  onClick={() => setMode('hub')}
                >
                  Assessment Hub
                </button>
              </div>
            </div>
          </div>

          <div className="col-lg-7">
            {/* Category Scores Breakdown */}
            <div className="panel-card mb-4">
              <div className="panel-head">
                <div>
                  <h5>Category-wise Breakdown</h5>
                  <small>Detailed breakdown across technical and analytical domains</small>
                </div>
              </div>

              <div className="d-flex flex-column gap-3">
                {Object.entries(evalResult.category_scores || {}).map(([cat, stat]: any) => (
                  <div key={cat} className="p-2 border rounded-2 bg-light">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="fw-semibold text-capitalize" style={{ fontSize: '13px' }}>
                        {cat.replace('_', ' ')}
                      </span>
                      <span className="badge bg-white text-dark border">
                        {stat.score_percentage}% ({stat.correct_count}/{stat.total_questions})
                      </span>
                    </div>
                    <div className="progress" style={{ height: 7 }}>
                      <div
                        className={`progress-bar ${
                          stat.score_percentage >= 75
                            ? 'bg-success'
                            : stat.score_percentage >= 50
                            ? 'bg-primary'
                            : 'bg-warning'
                        }`}
                        style={{ width: `${stat.score_percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths & Areas to Improve */}
            <div className="panel-card">
              <h5 className="fw-bold mb-3" style={{ fontSize: '15px' }}>
                Diagnostic Feedback
              </h5>
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="p-3 bg-success-subtle border border-success-subtle rounded-3 h-100">
                    <h6 className="fw-bold text-success mb-2" style={{ fontSize: '12px' }}>
                      <i className="bi bi-shield-check me-1" /> Strengths Identified
                    </h6>
                    <ul className="ps-3 mb-0 small text-success-emphasis">
                      {(evalResult.strengths || ['Good baseline problem solving']).map((s: string, idx: number) => (
                        <li key={idx} className="mb-1">{s}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="p-3 bg-warning-subtle border border-warning-subtle rounded-3 h-100">
                    <h6 className="fw-bold text-warning-emphasis mb-2" style={{ fontSize: '12px' }}>
                      <i className="bi bi-exclamation-triangle-fill me-1" /> Focus Areas
                    </h6>
                    <ul className="ps-3 mb-0 small text-warning-emphasis">
                      {(evalResult.areas_for_improvement || ['Focus on timed speed & edge cases']).map((a: string, idx: number) => (
                        <li key={idx} className="mb-1">{a}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

