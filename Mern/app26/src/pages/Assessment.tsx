import { useEffect, useState, useRef, useCallback } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';

interface Option {
  option_id: string;
  text: string;
}

interface Question {
  questionId: string;
  question_text: string;
  category: string;
  subtopic: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  options: Option[];
  marks: number;
}

interface AssessmentTrack {
  _id?: string;
  title: string;
  slug: string;
  category: string;
  description: string;
  icon: string;
  badge: string;
  badgeColor: string;
}

interface AssessmentLevel {
  _id?: string;
  name: string;
  slug: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  description: string;
  durationMinutes: number;
  totalQuestions: number;
  passingPercentage: number;
  badge: string;
  color: string;
}

interface ActiveSessionData {
  _id: string;
  assessmentSlug: string;
  assessmentTitle: string;
  level: string;
  durationMinutes: number;
  startTime: string;
  expiresAt: string;
  remainingSeconds: number;
  questions: Question[];
  savedAnswers: Record<string, string>;
  markedForReview: Record<string, boolean>;
}

interface QuestionReview {
  questionId: string;
  question_text: string;
  category: string;
  subtopic: string;
  difficulty: string;
  options: Option[];
  selectedOptionId: string;
  correct_option_id: string;
  isCorrect: boolean;
  explanation: string;
  marks: number;
}

interface EvaluationResult {
  sessionId: string;
  assessmentTitle: string;
  level: string;
  status: string;
  score: number;
  totalMarks: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  percentage: number;
  passed: boolean;
  autoSubmitted: boolean;
  categoryBreakdown: Record<string, any>;
  strengths: string[];
  areasForImprovement: string[];
  recommendations: string[];
  submittedAt: string;
  questionReviews: QuestionReview[];
}

export default function Assessment() {
  const [mode, setMode] = useState<'hub' | 'taking' | 'result'>('hub');

  // Catalog state
  const [tracks, setTracks] = useState<AssessmentTrack[]>([]);
  const [levels, setLevels] = useState<AssessmentLevel[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<AssessmentTrack | null>(null);
  const [selectedLevelSlug, setSelectedLevelSlug] = useState<string>('intermediate');
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // Active Session state
  const [activeSession, setActiveSession] = useState<ActiveSessionData | null>(null);
  const [showStartModal, setShowStartModal] = useState(false);
  const [trackToStart, setTrackToStart] = useState<AssessmentTrack | null>(null);

  // Taking Test state
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [currentTrackTitle, setCurrentTrackTitle] = useState<string>('');
  const [currentLevel, setCurrentLevel] = useState<string>('intermediate');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [timeLeft, setTimeLeft] = useState<number>(600);
  const [expiresAtTime, setExpiresAtTime] = useState<number>(0);
  const [savingDraft, setSavingDraft] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showAutoSubmitAlert, setShowAutoSubmitAlert] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Result state
  const [evalResult, setEvalResult] = useState<EvaluationResult | null>(null);

  // Past History state
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const timerRef = useRef<any>(null);

  // 1. Fetch Catalog & Active Session on Mount
  const loadInitialData = async () => {
    try {
      setLoadingCatalog(true);
      const [catalogRes, activeRes, historyRes] = await Promise.allSettled([
        api.get('/assessment/catalog'),
        api.get('/assessment/active-session'),
        api.get('/assessment/history'),
      ]);

      if (catalogRes.status === 'fulfilled' && catalogRes.value.data?.success) {
        const cat = catalogRes.value.data.data;
        setTracks(cat.assessments || []);
        setLevels(cat.levels || []);
        if (cat.assessments?.length > 0) {
          setSelectedTrack(cat.assessments[0]);
        }
      }

      if (historyRes.status === 'fulfilled' && historyRes.value.data?.success) {
        setHistory(historyRes.value.data.data || []);
      }

      if (activeRes.status === 'fulfilled' && activeRes.value.data?.success) {
        const activeData = activeRes.value.data.data;
        if (activeData?.hasActive && activeData?.session) {
          setActiveSession(activeData.session);
        } else {
          setActiveSession(null);
        }
      }
    } catch (err) {
      console.warn('Initial assessment data load error:', err);
    } finally {
      setLoadingCatalog(false);
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // 2. Authoritative Timer Effect
  useEffect(() => {
    if (mode === 'taking' && expiresAtTime > 0) {
      const updateTimer = () => {
        const now = Date.now();
        const diff = Math.max(0, Math.floor((expiresAtTime - now) / 1000));
        setTimeLeft(diff);

        if (diff <= 0) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
        }
      };

      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode, expiresAtTime]);

  // 3. Navigation Guard against accidental tab close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (mode === 'taking') {
        e.preventDefault();
        e.returnValue = 'You have an active examination session in progress. Leaving will not pause the timer.';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [mode]);

  // Handle Resume Existing Session
  const handleResumeSession = (sessionToResume?: ActiveSessionData) => {
    const s = sessionToResume || activeSession;
    if (!s) return;

    setCurrentSessionId(s._id);
    setCurrentTrackTitle(s.assessmentTitle);
    setCurrentLevel(s.level);
    setQuestions(s.questions || []);
    setSelectedAnswers(s.savedAnswers || {});
    setMarkedForReview(s.markedForReview || {});
    setCurrentIndex(0);

    const expMs = new Date(s.expiresAt).getTime();
    setExpiresAtTime(expMs);
    const secsLeft = Math.max(0, Math.floor((expMs - Date.now()) / 1000));
    setTimeLeft(secsLeft);

    setMode('taking');
  };

  // Open Start Confirmation Modal
  const handlePromptStartExam = (track: AssessmentTrack) => {
    setTrackToStart(track);
    setShowStartModal(true);
  };

  // Confirm and Start Examination Session on Backend
  const handleConfirmStartExam = async () => {
    if (!trackToStart) return;
    try {
      setShowStartModal(false);
      const res = await api.post('/assessment/start', {
        assessmentSlug: trackToStart.slug,
        levelSlug: selectedLevelSlug,
      });

      const sessionData = res.data?.data;
      if (!sessionData) {
        throw new Error('Invalid session response from server');
      }

      setCurrentSessionId(sessionData.sessionId);
      setCurrentTrackTitle(sessionData.assessmentTitle);
      setCurrentLevel(sessionData.level);
      setQuestions(sessionData.questions || []);
      setSelectedAnswers({});
      setMarkedForReview({});
      setCurrentIndex(0);

      const expMs = new Date(sessionData.expiresAt).getTime();
      setExpiresAtTime(expMs);
      setTimeLeft(sessionData.remainingSeconds || 600);

      setActiveSession(null);
      setMode('taking');
    } catch (err: any) {
      console.error('Failed to start assessment:', err);
      if (err.response?.status === 409) {
        alert(
          err.response?.data?.message ||
            'You already have an active assessment session in progress. Please resume it.'
        );
        // Refresh active session
        const activeRes = await api.get('/assessment/active-session');
        if (activeRes.data?.data?.hasActive) {
          setActiveSession(activeRes.data.data.session);
        }
      } else {
        alert(err.response?.data?.message || 'Unable to start assessment session. Please try again.');
      }
    }
  };

  // Option selection with Real-Time Draft Saving
  const handleSelectOption = async (optionId: string) => {
    if (questions.length === 0 || !questions[currentIndex]) return;
    const q = questions[currentIndex];
    const qId = q.questionId;

    // Optimistic UI update
    setSelectedAnswers((prev) => ({
      ...prev,
      [qId]: optionId,
    }));

    // Auto-save draft on backend
    try {
      setSavingDraft(true);
      await api.post('/assessment/save-draft', {
        sessionId: currentSessionId,
        questionId: qId,
        selectedOptionId: optionId,
        isMarkedForReview: !!markedForReview[qId],
      });
    } catch (err) {
      console.warn('Failed to auto-save draft answer:', err);
    } finally {
      setSavingDraft(false);
    }
  };

  // Toggle Mark For Review
  const handleToggleReview = async () => {
    if (questions.length === 0 || !questions[currentIndex]) return;
    const qId = questions[currentIndex].questionId;
    const newVal = !markedForReview[qId];

    setMarkedForReview((prev) => ({
      ...prev,
      [qId]: newVal,
    }));

    try {
      await api.post('/assessment/save-draft', {
        sessionId: currentSessionId,
        questionId: qId,
        selectedOptionId: selectedAnswers[qId] || '',
        isMarkedForReview: newVal,
      });
    } catch (err) {
      console.warn('Failed to save review flag:', err);
    }
  };

  // Clear current question answer
  const handleClearAnswer = async () => {
    if (questions.length === 0 || !questions[currentIndex]) return;
    const qId = questions[currentIndex].questionId;

    setSelectedAnswers((prev) => {
      const copy = { ...prev };
      delete copy[qId];
      return copy;
    });

    try {
      await api.post('/assessment/save-draft', {
        sessionId: currentSessionId,
        questionId: qId,
        selectedOptionId: '',
      });
    } catch (err) {
      console.warn('Failed to clear answer:', err);
    }
  };

  // Auto-submit when countdown hits zero
  const handleAutoSubmit = useCallback(async () => {
    if (submitting) return;
    setShowAutoSubmitAlert(true);
    await executeSubmission(true);
  }, [currentSessionId, questions, selectedAnswers, submitting]);

  // Execute Submission on Backend
  const executeSubmission = async (isAuto: boolean) => {
    if (submitting) return;
    setSubmitting(true);
    setShowSubmitModal(false);

    try {
      const payloadAnswers = questions.map((q) => ({
        questionId: q.questionId,
        selectedOptionId: selectedAnswers[q.questionId] || '',
      }));

      const res = await api.post('/assessment/submit', {
        sessionId: currentSessionId,
        answers: payloadAnswers,
        isAutoSubmitted: isAuto,
      });

      const data = res.data?.data as EvaluationResult;
      setEvalResult(data);
      setMode('result');
      setShowAutoSubmitAlert(false);

      // Refresh past history
      const historyRes = await api.get('/assessment/history');
      if (historyRes.data?.success) {
        setHistory(historyRes.data.data || []);
      }
    } catch (err: any) {
      console.error('Failed to submit assessment:', err);
      alert(err.response?.data?.message || 'Error evaluating examination. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Format Time Helper
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(selectedAnswers).filter((k) => selectedAnswers[k]).length;
  const currentLevelConfig = levels.find((l) => l.slug === selectedLevelSlug) || levels[1];
  const activeLevelConfig = levels.find((l) => l.slug === currentLevel);

  return (
    <Layout
      title="Skill Assessment"
      subtitle="Database-driven diagnostic tests, progressive difficulty levels, and authoritative readiness evaluations."
    >
      {/* ========================================================
          MODE 1: ASSESSMENT HUB & TEST SELECTION
         ======================================================== */}
      {mode === 'hub' && (
        <>
          {/* Active Session Notification Banner */}
          {activeSession && (
            <div
              className="alert alert-warning mb-4 shadow-sm d-flex flex-column flex-md-row align-items-md-center justify-content-between p-3 rounded-3"
              style={{ borderLeft: '5px solid #f59e0b', background: '#fffbeb' }}
            >
              <div className="d-flex align-items-center mb-2 mb-md-0">
                <i className="bi bi-clock-history fs-2 text-warning me-3" />
                <div>
                  <h6 className="mb-1 text-dark fw-bold">Active Examination in Progress</h6>
                  <p className="mb-0 text-muted small">
                    You have an ongoing session for <strong>{activeSession.assessmentTitle}</strong> (
                    <span className="text-uppercase fw-semibold">{activeSession.level}</span>). Time remaining:{' '}
                    <span className="badge bg-warning text-dark font-monospace">
                      {formatTime(activeSession.remainingSeconds)}
                    </span>
                  </p>
                </div>
              </div>
              <button
                className="btn btn-warning fw-bold px-4 shadow-sm"
                onClick={() => handleResumeSession(activeSession)}
              >
                <i className="bi bi-play-fill me-1" /> Resume Active Exam
              </button>
            </div>
          )}

          {/* Top Hero Banner */}
          <div
            className="hero-card mb-4 text-white p-4 rounded-3 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #4338ca, #6366f1)' }}
          >
            <div className="row align-items-center">
              <div className="col-lg-8">
                <span className="badge bg-light text-dark fw-bold mb-2">
                  <i className="bi bi-shield-check text-primary me-1" /> Production Examination Engine
                </span>
                <h3 className="fw-bold mb-2">Placement Readiness & Skill Competency Diagnostic</h3>
                <p className="mb-3 opacity-90 small">
                  Take timed, progressive examinations benchmarked against industry engineering tiers.
                  All question selections are uniquely tailored, preventing repetition and advancing across Beginner,
                  Intermediate, Advanced, and Expert levels.
                </p>
                <div className="d-flex flex-wrap gap-2">
                  <span className="badge bg-white bg-opacity-25 px-3 py-2">
                    <i className="bi bi-database-check me-1" /> 100% Database Driven
                  </span>
                  <span className="badge bg-white bg-opacity-25 px-3 py-2">
                    <i className="bi bi-shuffle me-1" /> Anti-Repetition Tracking
                  </span>
                  <span className="badge bg-white bg-opacity-25 px-3 py-2">
                    <i className="bi bi-stopwatch me-1" /> Authoritative Server Timer
                  </span>
                </div>
              </div>
              <div className="col-lg-4 text-center text-lg-end mt-3 mt-lg-0">
                <div
                  className="bg-white bg-opacity-10 p-3 rounded-3 d-inline-block text-center"
                  style={{ minWidth: '180px' }}
                >
                  <small className="text-white-50 text-uppercase fw-semibold d-block">Completed Exams</small>
                  <span className="display-6 fw-bold">{history.length}</span>
                  <div className="small text-white-50 mt-1">
                    Best Score:{' '}
                    <strong className="text-white">
                      {history.length > 0 ? Math.max(...history.map((h) => h.totalScore || 0)) : 0}%
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Level Selection Bar */}
          <div className="card shadow-sm border-0 mb-4 rounded-3">
            <div className="card-body p-3 p-md-4">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3">
                <div>
                  <h6 className="fw-bold mb-1 text-dark">
                    <i className="bi bi-layers-fill text-primary me-2" />
                    Select Examination Difficulty Level
                  </h6>
                  <p className="text-muted small mb-0">
                    Difficulty distribution dynamically adjusts question complexity and time limits.
                  </p>
                </div>
                {currentLevelConfig && (
                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-2 mt-2 mt-md-0">
                    <i className="bi bi-check2-circle me-1" /> {currentLevelConfig.name}: {currentLevelConfig.durationMinutes} mins · {currentLevelConfig.totalQuestions} questions · Pass: {currentLevelConfig.passingPercentage}%
                  </span>
                )}
              </div>

              <div className="row g-2">
                {levels.map((lvl) => {
                  const isSelected = selectedLevelSlug === lvl.slug;
                  return (
                    <div className="col-6 col-md-3" key={lvl.slug}>
                      <div
                        onClick={() => setSelectedLevelSlug(lvl.slug)}
                        className={`p-3 rounded-3 border text-center h-100 cursor-pointer transition ${
                          isSelected
                            ? 'border-primary bg-primary text-white shadow-sm'
                            : 'border-light-subtle bg-light text-dark hover-shadow'
                        }`}
                        style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                      >
                        <div className="fw-bold mb-1">{lvl.name}</div>
                        <div className={`small ${isSelected ? 'text-white-50' : 'text-muted'}`}>
                          {lvl.durationMinutes} Mins · {lvl.totalQuestions} Qs
                        </div>
                        <div className="mt-2">
                          <span
                            className={`badge ${
                              isSelected ? 'bg-white text-primary' : 'bg-secondary-subtle text-secondary'
                            }`}
                          >
                            Pass {lvl.passingPercentage}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Available Assessment Tracks */}
          <h5 className="fw-bold mb-3 text-dark d-flex align-items-center">
            <i className="bi bi-grid-fill text-primary me-2" /> Available Assessment Tracks
          </h5>

          {loadingCatalog ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
              <p className="text-muted small mt-2">Loading database question catalog...</p>
            </div>
          ) : (
            <div className="row g-3 mb-5">
              {tracks.map((track) => (
                <div className="col-md-6 col-xl-4" key={track.slug}>
                  <div className="card h-100 shadow-sm border-0 rounded-3 overflow-hidden d-flex flex-column">
                    <div className="card-body p-4 d-flex flex-column">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div
                          className="rounded-3 p-3 text-white d-flex align-items-center justify-content-center"
                          style={{
                            width: '50px',
                            height: '50px',
                            background:
                              track.badgeColor === 'primary'
                                ? '#4f46e5'
                                : track.badgeColor === 'success'
                                ? '#059669'
                                : track.badgeColor === 'info'
                                ? '#0284c7'
                                : track.badgeColor === 'warning'
                                ? '#d97706'
                                : track.badgeColor === 'danger'
                                ? '#dc2626'
                                : '#6b7280',
                          }}
                        >
                          <i className={`bi ${track.icon} fs-4`} />
                        </div>
                        <span className={`badge bg-${track.badgeColor || 'primary'}-subtle text-${track.badgeColor || 'primary'} border border-${track.badgeColor || 'primary'}-subtle px-2 py-1`}>
                          {track.badge}
                        </span>
                      </div>

                      <h5 className="fw-bold text-dark mb-2">{track.title}</h5>
                      <p className="text-muted small flex-grow-1 mb-3">{track.description}</p>

                      <div className="border-top pt-3 mt-auto">
                        <div className="d-flex justify-content-between text-muted small mb-3">
                          <span>
                            <i className="bi bi-clock me-1" />
                            {currentLevelConfig?.durationMinutes || 15} Mins
                          </span>
                          <span>
                            <i className="bi bi-question-circle me-1" />
                            {currentLevelConfig?.totalQuestions || 12} Questions
                          </span>
                        </div>
                        <button
                          className="btn btn-outline-primary w-100 fw-semibold"
                          onClick={() => handlePromptStartExam(track)}
                        >
                          <i className="bi bi-play-circle-fill me-1" /> Start Assessment
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Past Assessment History */}
          <div className="card shadow-sm border-0 rounded-3 mb-4">
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0 text-dark">
                <i className="bi bi-clock-history text-primary me-2" /> Past Examination History
              </h6>
              <span className="badge bg-secondary-subtle text-secondary">{history.length} Attempts</span>
            </div>
            <div className="card-body p-0">
              {loadingHistory ? (
                <div className="text-center py-4">
                  <div className="spinner-border spinner-border-sm text-primary" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-5 text-muted small">
                  <i className="bi bi-journal-x fs-2 d-block mb-2 text-muted" />
                  No completed assessments found yet. Take an assessment above to establish your verified readiness score!
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light text-muted small">
                      <tr>
                        <th>Assessment Track</th>
                        <th>Level</th>
                        <th>Score</th>
                        <th>Status</th>
                        <th>Questions</th>
                        <th>Completed Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h, i) => (
                        <tr key={h._id || i}>
                          <td className="fw-bold text-dark">{h.testTitle}</td>
                          <td>
                            <span className="badge bg-info-subtle text-info border text-uppercase small">
                              {h.level || 'Intermediate'}
                            </span>
                          </td>
                          <td>
                            <span className="fw-bold fs-6 text-dark">{h.totalScore}%</span>
                            <small className="text-muted ms-1">({h.correctCount}/{h.totalQuestions})</small>
                          </td>
                          <td>
                            {h.passed ? (
                              <span className="badge bg-success-subtle text-success border border-success-subtle">
                                <i className="bi bi-check-circle-fill me-1" /> Passed
                              </span>
                            ) : (
                              <span className="badge bg-danger-subtle text-danger border border-danger-subtle">
                                <i className="bi bi-x-circle-fill me-1" /> Needs Practice
                              </span>
                            )}
                          </td>
                          <td className="small text-muted">{h.totalQuestions} Questions</td>
                          <td className="small text-muted">
                            {h.completedAt ? new Date(h.completedAt).toLocaleDateString() : 'Recent'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ========================================================
          MODE 2: ACTIVE EXAMINATION SESSION (TAKING EXAM)
         ======================================================== */}
      {mode === 'taking' && questions.length > 0 && (
        <div className="active-exam-container pb-5">
          {/* Sticky Top Status Bar */}
          <div
            className="sticky-top bg-white border-bottom shadow-sm py-2 px-3 mb-4 rounded-3"
            style={{ zIndex: 1020, top: '10px' }}
          >
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div>
                <span className="badge bg-primary text-uppercase me-2">{currentLevel}</span>
                <strong className="text-dark fs-6">{currentTrackTitle}</strong>
                {savingDraft && (
                  <span className="small text-muted ms-2 animate-pulse">
                    <i className="bi bi-cloud-arrow-up text-primary me-1" /> Saving draft...
                  </span>
                )}
              </div>

              {/* Real-time Countdown Timer */}
              <div className="d-flex align-items-center gap-3">
                <div
                  className={`d-flex align-items-center px-3 py-1 rounded-pill ${
                    timeLeft < 120 ? 'bg-danger text-white animate-pulse' : 'bg-light text-dark border'
                  }`}
                >
                  <i className="bi bi-stopwatch fs-5 me-2" />
                  <span className="fw-bold font-monospace fs-5">{formatTime(timeLeft)}</span>
                </div>

                <div className="small text-muted d-none d-md-block">
                  Answered: <strong>{answeredCount}</strong> / {questions.length}
                </div>

                <button
                  className="btn btn-primary fw-bold px-3 py-1 shadow-sm"
                  onClick={() => setShowSubmitModal(true)}
                  disabled={submitting}
                >
                  <i className="bi bi-check2-circle me-1" /> Submit Exam
                </button>
              </div>
            </div>
          </div>

          <div className="row g-4">
            {/* Left: Current Question Area */}
            <div className="col-lg-8">
              {questions[currentIndex] && (
                <div className="card shadow-sm border-0 rounded-3 mb-3">
                  <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                    <div>
                      <span className="badge bg-secondary-subtle text-dark border me-2">
                        Question {currentIndex + 1} of {questions.length}
                      </span>
                      <span className="badge bg-info-subtle text-info border me-2">
                        {questions[currentIndex].subtopic}
                      </span>
                      <span className="badge bg-light text-muted border text-uppercase">
                        Diff: {questions[currentIndex].difficulty}
                      </span>
                    </div>
                    <span className="small text-muted fw-semibold">
                      {questions[currentIndex].marks || 1} Mark(s)
                    </span>
                  </div>

                  <div className="card-body p-4">
                    {/* Question Text */}
                    <h5 className="fw-bold text-dark mb-4 lh-base">
                      {questions[currentIndex].question_text}
                    </h5>

                    {/* Options List */}
                    <div className="d-flex flex-column gap-3">
                      {questions[currentIndex].options.map((opt) => {
                        const isSelected =
                          selectedAnswers[questions[currentIndex].questionId] === opt.option_id;

                        return (
                          <div
                            key={opt.option_id}
                            onClick={() => handleSelectOption(opt.option_id)}
                            className={`p-3 rounded-3 border d-flex align-items-center transition cursor-pointer ${
                              isSelected
                                ? 'border-primary bg-primary-subtle text-dark shadow-sm'
                                : 'border-light-subtle bg-white hover-bg-light text-dark'
                            }`}
                            style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                          >
                            <div
                              className={`rounded-circle d-flex align-items-center justify-content-center me-3 fw-bold flex-shrink-0 ${
                                isSelected ? 'bg-primary text-white' : 'bg-light text-dark border'
                              }`}
                              style={{ width: '36px', height: '36px' }}
                            >
                              {opt.option_id}
                            </div>
                            <span className="fs-6 lh-base">{opt.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Question Bottom Toolbar */}
                  <div className="card-footer bg-white py-3 border-top d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <div className="d-flex gap-2">
                      <button
                        className={`btn btn-sm ${
                          markedForReview[questions[currentIndex].questionId]
                            ? 'btn-warning text-dark fw-bold'
                            : 'btn-outline-secondary'
                        }`}
                        onClick={handleToggleReview}
                      >
                        <i className="bi bi-flag-fill me-1" />
                        {markedForReview[questions[currentIndex].questionId]
                          ? 'Marked for Review'
                          : 'Mark for Review'}
                      </button>

                      {selectedAnswers[questions[currentIndex].questionId] && (
                        <button className="btn btn-sm btn-outline-danger" onClick={handleClearAnswer}>
                          <i className="bi bi-eraser me-1" /> Clear Answer
                        </button>
                      )}
                    </div>

                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-outline-primary btn-sm px-3"
                        disabled={currentIndex === 0}
                        onClick={() => setCurrentIndex((prev) => prev - 1)}
                      >
                        <i className="bi bi-chevron-left me-1" /> Previous
                      </button>

                      {currentIndex < questions.length - 1 ? (
                        <button
                          className="btn btn-primary btn-sm px-3"
                          onClick={() => setCurrentIndex((prev) => prev + 1)}
                        >
                          Next <i className="bi bi-chevron-right ms-1" />
                        </button>
                      ) : (
                        <button
                          className="btn btn-success btn-sm px-3 fw-bold"
                          onClick={() => setShowSubmitModal(true)}
                        >
                          Finish & Submit <i className="bi bi-check2-all ms-1" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Question Navigation Palette */}
            <div className="col-lg-4">
              <div className="card shadow-sm border-0 rounded-3">
                <div className="card-header bg-white py-3 border-bottom">
                  <h6 className="fw-bold mb-0 text-dark">
                    <i className="bi bi-grid-3x3-gap-fill text-primary me-2" />
                    Question Navigator
                  </h6>
                </div>
                <div className="card-body p-3">
                  <div className="d-flex flex-wrap gap-2 mb-3">
                    {questions.map((q, idx) => {
                      const isAnswered = !!selectedAnswers[q.questionId];
                      const isMarked = !!markedForReview[q.questionId];
                      const isCurrent = currentIndex === idx;

                      let btnClass = 'btn-outline-secondary';
                      if (isMarked) {
                        btnClass = 'btn-warning text-dark fw-bold';
                      } else if (isAnswered) {
                        btnClass = 'btn-success text-white fw-bold';
                      }

                      return (
                        <button
                          key={q.questionId || idx}
                          onClick={() => setCurrentIndex(idx)}
                          className={`btn btn-sm ${btnClass} ${
                            isCurrent ? 'border-3 border-dark shadow-sm' : ''
                          }`}
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '8px',
                          }}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>

                  {/* Navigator Legend */}
                  <div className="border-top pt-3 small text-muted">
                    <div className="d-flex align-items-center mb-1">
                      <span
                        className="badge bg-success me-2"
                        style={{ width: '14px', height: '14px', borderRadius: '4px' }}
                      />
                      <span>Answered ({answeredCount})</span>
                    </div>
                    <div className="d-flex align-items-center mb-1">
                      <span
                        className="badge bg-warning me-2"
                        style={{ width: '14px', height: '14px', borderRadius: '4px' }}
                      />
                      <span>
                        Marked for Review ({Object.values(markedForReview).filter(Boolean).length})
                      </span>
                    </div>
                    <div className="d-flex align-items-center">
                      <span
                        className="badge bg-secondary-subtle border me-2"
                        style={{ width: '14px', height: '14px', borderRadius: '4px' }}
                      />
                      <span>Unanswered ({questions.length - answeredCount})</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODE 3: EVALUATION RESULTS & EXPLANATIONS
         ======================================================== */}
      {mode === 'result' && evalResult && (
        <div className="result-container pb-5">
          {/* Result Hero Banner */}
          <div
            className={`p-4 rounded-3 text-white mb-4 shadow-sm ${
              evalResult.passed
                ? 'bg-gradient'
                : 'bg-dark'
            }`}
            style={{
              background: evalResult.passed
                ? 'linear-gradient(135deg, #059669, #10b981)'
                : 'linear-gradient(135deg, #1f2937, #374151)',
            }}
          >
            <div className="row align-items-center">
              <div className="col-md-8">
                <span className="badge bg-white bg-opacity-25 text-white mb-2 text-uppercase">
                  {evalResult.level} Level Assessment
                </span>
                <h3 className="fw-bold mb-1">{evalResult.assessmentTitle}</h3>
                <p className="mb-0 text-white-50 small">
                  {evalResult.autoSubmitted
                    ? 'Examination was automatically finalized when the timer expired.'
                    : 'Examination successfully completed and verified on the server.'}
                </p>
              </div>
              <div className="col-md-4 text-center text-md-end mt-3 mt-md-0">
                <div className="bg-white bg-opacity-20 p-3 rounded-3 d-inline-block text-center">
                  <div className="display-5 fw-bold">{evalResult.percentage}%</div>
                  <div className="fw-bold">
                    {evalResult.passed ? (
                      <span className="text-warning">
                        <i className="bi bi-patch-check-fill me-1" /> PASSED
                      </span>
                    ) : (
                      <span className="text-white-50">NEEDS PRACTICE</span>
                    )}
                  </div>
                  <small className="text-white-50">
                    {evalResult.correctCount} of {evalResult.totalMarks} Marks
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="row g-3 mb-4">
            <div className="col-6 col-md-3">
              <div className="card shadow-sm border-0 rounded-3 p-3 text-center">
                <div className="text-muted small">Total Questions</div>
                <div className="fs-4 fw-bold text-dark">{evalResult.questionReviews?.length || 0}</div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card shadow-sm border-0 rounded-3 p-3 text-center">
                <div className="text-success small">Correct Answers</div>
                <div className="fs-4 fw-bold text-success">{evalResult.correctCount}</div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card shadow-sm border-0 rounded-3 p-3 text-center">
                <div className="text-danger small">Incorrect Answers</div>
                <div className="fs-4 fw-bold text-danger">{evalResult.incorrectCount}</div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="card shadow-sm border-0 rounded-3 p-3 text-center">
                <div className="text-muted small">Unanswered</div>
                <div className="fs-4 fw-bold text-muted">{evalResult.unansweredCount}</div>
              </div>
            </div>
          </div>

          {/* Category Breakdown & Feedback */}
          <div className="row g-4 mb-4">
            <div className="col-lg-6">
              <div className="card shadow-sm border-0 rounded-3 h-100">
                <div className="card-header bg-white py-3 border-bottom">
                  <h6 className="fw-bold mb-0 text-dark">
                    <i className="bi bi-pie-chart-fill text-primary me-2" />
                    Domain Breakdown
                  </h6>
                </div>
                <div className="card-body p-3">
                  {Object.keys(evalResult.categoryBreakdown || {}).length === 0 ? (
                    <p className="text-muted small mb-0">No category breakdown data available.</p>
                  ) : (
                    Object.entries(evalResult.categoryBreakdown).map(([cat, stats]: [string, any]) => (
                      <div className="mb-3" key={cat}>
                        <div className="d-flex justify-content-between small fw-semibold mb-1">
                          <span className="text-uppercase text-dark">
                            {cat.replace(/_/g, ' ')}
                          </span>
                          <span className="text-primary">{stats.percentage || 0}%</span>
                        </div>
                        <div className="progress" style={{ height: '8px' }}>
                          <div
                            className={`progress-bar ${
                              (stats.percentage || 0) >= 70 ? 'bg-success' : 'bg-warning'
                            }`}
                            style={{ width: `${stats.percentage || 0}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="card shadow-sm border-0 rounded-3 h-100">
                <div className="card-header bg-white py-3 border-bottom">
                  <h6 className="fw-bold mb-0 text-dark">
                    <i className="bi bi-lightbulb-fill text-warning me-2" />
                    Analysis & Recommendations
                  </h6>
                </div>
                <div className="card-body p-3">
                  {evalResult.strengths?.length > 0 && (
                    <div className="mb-3">
                      <span className="badge bg-success-subtle text-success border border-success-subtle mb-1">
                        Demonstrated Strengths
                      </span>
                      <ul className="small text-muted ps-3 mb-0">
                        {evalResult.strengths.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {evalResult.areasForImprovement?.length > 0 && (
                    <div className="mb-3">
                      <span className="badge bg-warning-subtle text-warning border border-warning-subtle mb-1">
                        Areas for Practice
                      </span>
                      <ul className="small text-muted ps-3 mb-0">
                        {evalResult.areasForImprovement.map((a, idx) => (
                          <li key={idx}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {evalResult.recommendations?.length > 0 && (
                    <div>
                      <span className="badge bg-info-subtle text-info border border-info-subtle mb-1">
                        Action Plan
                      </span>
                      <ul className="small text-muted ps-3 mb-0">
                        {evalResult.recommendations.map((r, idx) => (
                          <li key={idx}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Question Review Section with Technical Explanations */}
          <div className="card shadow-sm border-0 rounded-3 mb-4">
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0 text-dark">
                <i className="bi bi-check-all text-primary me-2" />
                Comprehensive Question Review & Explanations
              </h6>
              <span className="badge bg-light text-muted border">
                Revealed post-submission for study
              </span>
            </div>
            <div className="card-body p-4">
              <div className="d-flex flex-column gap-4">
                {evalResult.questionReviews?.map((rev, qIdx) => (
                  <div
                    key={rev.questionId || qIdx}
                    className={`p-4 rounded-3 border ${
                      rev.isCorrect
                        ? 'border-success-subtle bg-success-subtle bg-opacity-10'
                        : rev.selectedOptionId
                        ? 'border-danger-subtle bg-danger-subtle bg-opacity-10'
                        : 'border-secondary-subtle bg-light'
                    }`}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <span className="fw-bold text-dark">
                        Question {qIdx + 1}
                        {rev.isCorrect ? (
                          <span className="badge bg-success ms-2">
                            <i className="bi bi-check-lg" /> Correct
                          </span>
                        ) : rev.selectedOptionId ? (
                          <span className="badge bg-danger ms-2">
                            <i className="bi bi-x-lg" /> Incorrect
                          </span>
                        ) : (
                          <span className="badge bg-secondary ms-2">Unanswered</span>
                        )}
                      </span>
                      <span className="badge bg-light text-muted border">
                        {rev.subtopic} · {rev.difficulty}
                      </span>
                    </div>

                    <p className="fw-semibold text-dark mb-3">{rev.question_text}</p>

                    <div className="row g-2 mb-3">
                      {rev.options.map((opt) => {
                        const isStudentChoice = rev.selectedOptionId === opt.option_id;
                        const isCorrectChoice = rev.correct_option_id === opt.option_id;

                        let cardStyle = 'border bg-white text-dark';
                        if (isCorrectChoice) {
                          cardStyle = 'border-success bg-success text-white fw-bold';
                        } else if (isStudentChoice && !isCorrectChoice) {
                          cardStyle = 'border-danger bg-danger text-white fw-bold';
                        }

                        return (
                          <div className="col-md-6" key={opt.option_id}>
                            <div className={`p-2 rounded-2 small ${cardStyle}`}>
                              <span className="me-2">{opt.option_id}.</span>
                              {opt.text}
                              {isCorrectChoice && (
                                <span className="ms-2 badge bg-white text-success small">
                                  Correct Answer
                                </span>
                              )}
                              {isStudentChoice && !isCorrectChoice && (
                                <span className="ms-2 badge bg-white text-danger small">
                                  Your Answer
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Technical Explanation */}
                    <div className="p-3 rounded-2 bg-white border border-light-subtle small">
                      <strong className="text-primary d-block mb-1">
                        <i className="bi bi-info-circle-fill me-1" /> Technical Explanation:
                      </strong>
                      <span className="text-muted">{rev.explanation}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="text-center pt-2">
            <button
              className="btn btn-primary fw-bold px-4 py-2 shadow-sm rounded-pill"
              onClick={() => {
                setMode('hub');
                setEvalResult(null);
                loadInitialData();
              }}
            >
              <i className="bi bi-arrow-left-circle me-2" /> Return to Assessment Hub
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 1: START CONFIRMATION DIALOG
         ======================================================== */}
      {showStartModal && trackToStart && (
        <div
          className="modal show d-block"
          style={{ background: 'rgba(0, 0, 0, 0.55)', zIndex: 1050 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-3">
              <div className="modal-header border-bottom py-3">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center">
                  <i className="bi bi-clipboard2-check-fill text-primary me-2" />
                  Examination Confirmation
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowStartModal(false)}
                />
              </div>

              <div className="modal-body p-4">
                <div className="mb-3 text-center">
                  <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 text-uppercase fw-semibold mb-2">
                    {selectedLevelSlug} Level
                  </span>
                  <h4 className="fw-bold text-dark mb-1">{trackToStart.title}</h4>
                  <p className="text-muted small mb-0">{trackToStart.description}</p>
                </div>

                <div className="bg-light p-3 rounded-3 mb-3 border">
                  <div className="row text-center">
                    <div className="col-6 border-end">
                      <small className="text-muted d-block">Duration</small>
                      <strong className="fs-6 text-dark">
                        {currentLevelConfig?.durationMinutes || 15} Minutes
                      </strong>
                    </div>
                    <div className="col-6">
                      <small className="text-muted d-block">Total Questions</small>
                      <strong className="fs-6 text-dark">
                        {currentLevelConfig?.totalQuestions || 12} Questions
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="small text-muted">
                  <strong className="text-dark d-block mb-1">
                    <i className="bi bi-exclamation-triangle-fill text-warning me-1" />
                    Important Examination Rules:
                  </strong>
                  <ul className="ps-3 mb-0">
                    <li>Once you confirm, the countdown timer begins on the server immediately.</li>
                    <li>You cannot pause or restart the timer once the assessment begins.</li>
                    <li>Answers are saved continuously; you may change options at any time.</li>
                    <li>When the timer expires, your exam will be automatically submitted.</li>
                    <li>Only one active assessment is allowed at a time.</li>
                  </ul>
                </div>
              </div>

              <div className="modal-footer border-top py-3 d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowStartModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary fw-bold px-4"
                  onClick={handleConfirmStartExam}
                >
                  <i className="bi bi-play-circle-fill me-1" /> Confirm & Start Examination
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: MANUAL SUBMISSION CONFIRMATION
         ======================================================== */}
      {showSubmitModal && (
        <div
          className="modal show d-block"
          style={{ background: 'rgba(0, 0, 0, 0.55)', zIndex: 1060 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-3">
              <div className="modal-header border-bottom py-3">
                <h5 className="modal-title fw-bold text-dark d-flex align-items-center">
                  <i className="bi bi-check2-circle text-primary me-2" />
                  Confirm Exam Submission
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowSubmitModal(false)}
                />
              </div>

              <div className="modal-body p-4 text-center">
                <i className="bi bi-question-circle text-primary display-4 mb-3 d-block" />
                <h5 className="fw-bold text-dark mb-2">Are you ready to submit your exam?</h5>
                <p className="text-muted small mb-3">
                  You have answered <strong>{answeredCount}</strong> of{' '}
                  <strong>{questions.length}</strong> questions.
                  {questions.length - answeredCount > 0 && (
                    <span className="text-warning d-block mt-1">
                      Warning: You have {questions.length - answeredCount} unanswered question(s).
                    </span>
                  )}
                </p>

                <p className="text-muted small mb-0">
                  Once submitted, your responses will be locked and graded on the server.
                </p>
              </div>

              <div className="modal-footer border-top py-3 d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowSubmitModal(false)}
                  disabled={submitting}
                >
                  Return to Exam
                </button>
                <button
                  type="button"
                  className="btn btn-primary fw-bold px-4"
                  onClick={() => executeSubmission(false)}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Evaluating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-lg me-1" /> Yes, Submit Exam
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: AUTO-SUBMITTING ALERT OVERLAY
         ======================================================== */}
      {showAutoSubmitAlert && (
        <div
          className="modal show d-block"
          style={{ background: 'rgba(0, 0, 0, 0.75)', zIndex: 1070 }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-3 p-4 text-center">
              <div className="spinner-border text-danger mb-3" role="status" style={{ width: '3rem', height: '3rem' }} />
              <h5 className="fw-bold text-dark mb-2">Time Has Expired!</h5>
              <p className="text-muted small mb-0">
                Your examination period has concluded. The server is auto-submitting and grading your responses...
              </p>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
