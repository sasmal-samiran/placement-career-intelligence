import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import Toast from '../components/Toast';
import api from '../services/api';

type Question = {
  id?: number | string;
  question?: string;
  questions?: string | string[];
  title?: string;
  options: string[];
  answer: string | number;
};

export default function ConductTest() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const state = (location.state as {
    skillName?: string;
    category?: string;
    isExisting?: boolean;
    existingValidated?: boolean;
    existingScore?: number;
    existingLevel?: string;
  } | null) || {};
  const skillName = (state.skillName || searchParams.get('skill') || '').trim();
  const category = (state.category || searchParams.get('category') || 'Other').trim();

  const [existingInfo, setExistingInfo] = useState<{
    exists: boolean;
    validated?: boolean;
    score?: number;
    level?: string;
  } | null>(
    state.isExisting
      ? {
          exists: true,
          validated: state.existingValidated,
          score: state.existingScore,
          level: state.existingLevel,
        }
      : null
  );

  const [loading, setLoading] = useState(true);
  const [serviceUnavailable, setServiceUnavailable] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<{ [qIndex: number]: number }>({});
  const [submitting, setSubmitting] = useState(false);
  const [savingWithoutTest, setSavingWithoutTest] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    level: string;
    validated: boolean;
    correctCount: number;
    totalCount: number;
  } | null>(null);

  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning'>('success');

  const showToast = (msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
  };

  useEffect(() => {
    if (!skillName) {
      navigate('/skills');
      return;
    }

    const fetchTestPaper = async () => {
      setLoading(true);
      setServiceUnavailable(false);
      try {
        const response = await api.post('/skills/test-paper', {
          subject: skillName,
          category,
        });

        if (response?.data?.exists !== undefined) {
          setExistingInfo({
            exists: Boolean(response.data.exists),
            validated: response.data.existingSkill?.validated,
            score: response.data.existingSkill?.score,
            level: response.data.existingSkill?.level,
          });
        }

        const raw = response?.data?.data ?? response?.data;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.questions) && typeof raw.questions[0] === 'object'
          ? raw.questions
          : Array.isArray(raw?.questions)
          ? raw.questions.map((qStr: string, idx: number) => ({
              question: qStr,
              options: Array.isArray(raw.options?.[idx]) ? raw.options[idx] : raw.options,
              answer: Array.isArray(raw.answers) ? raw.answers[idx] : raw.answer || 'A',
            }))
          : [];

        const normalized: Question[] = list.map((item: any, idx: number) => {
          let qText = '';
          if (typeof item === 'string') {
            qText = item;
          } else if (item.questions) {
            qText = Array.isArray(item.questions) ? item.questions.join(' ') : String(item.questions);
          } else if (item.question) {
            qText = Array.isArray(item.question) ? item.question.join(' ') : String(item.question);
          } else if (item.title || item.prompt || item.q || item.text) {
            qText = item.title || item.prompt || item.q || item.text;
          } else {
            qText = `Question ${idx + 1}`;
          }

          let opts: string[] = [];
          if (Array.isArray(item.options)) {
            opts = item.options.map(String);
          } else if (Array.isArray(item.choices)) {
            opts = item.choices.map(String);
          } else {
            opts = ['Option A', 'Option B', 'Option C', 'Option D'];
          }

          return {
            id: item.id || idx + 1,
            question: qText,
            options: opts,
            answer: item.answer ?? item.correct_answer ?? item.correct ?? 'A',
          };
        });

        if (normalized.length > 0) {
          setQuestions(normalized);
        } else {
          setServiceUnavailable(true);
        }
      } catch (err: any) {
        console.warn('Test paper API unavailable:', err);
        setServiceUnavailable(true);
      } finally {
        setLoading(false);
      }
    };

    fetchTestPaper();
  }, [skillName, category, navigate]);

  const handleSaveWithoutValidation = async () => {
    setSavingWithoutTest(true);
    try {
      await api.post('/skills', {
        name: skillName,
        category,
        level: 'Beginner',
        score: 0,
        validated: false,
      });

      showToast(`Skill "${skillName}" saved without validation. You can validate it later!`, 'success');
      setTimeout(() => {
        navigate('/skills');
      }, 1000);
    } catch (err) {
      console.error('Failed to save skill without validation:', err);
      showToast('Could not save skill. Please try again.', 'error');
      setSavingWithoutTest(false);
    }
  };

  const handleSelectOption = (qIndex: number, optIndex: number) => {
    setAnswers((prev) => ({
      ...prev,
      [qIndex]: optIndex,
    }));
  };

  const calculateResult = () => {
    let correctCount = 0;
    const totalCount = questions.length;

    questions.forEach((q, idx) => {
      const userSelectedIdx = answers[idx];
      if (userSelectedIdx !== undefined) {
        const selectedText = q.options[userSelectedIdx]?.trim().toLowerCase();
        const letters = ['a', 'b', 'c', 'd', 'e', 'f'];
        const userLetter = letters[userSelectedIdx];
        const correctStr = String(q.answer).trim().toLowerCase();

        // Match against letter ('a','b','c','d'), zero-based index, or full option text
        if (
          correctStr === userLetter ||
          correctStr === String(userSelectedIdx) ||
          (selectedText && (correctStr === selectedText || selectedText.startsWith(correctStr)))
        ) {
          correctCount++;
        }
      }
    });

    const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
    const validated = score > 0;

    let level = 'Beginner';
    if (score >= 80) {
      level = 'Proficient';
    } else if (score >= 50) {
      level = 'Intermediate';
    } else {
      level = 'Beginner';
    }

    return { score, level, validated, correctCount, totalCount };
  };

  const handleSubmitTest = async () => {
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < questions.length) {
      const confirmIncomplete = window.confirm(
        `You have answered ${answeredCount} of ${questions.length} questions. Submit anyway?`
      );
      if (!confirmIncomplete) return;
    }

    setSubmitting(true);
    try {
      const testRes = calculateResult();

      // Store the skill with level, score, and validated status in MongoDB
      await api.post('/skills', {
        name: skillName,
        category,
        level: testRes.level,
        score: testRes.score,
        validated: testRes.validated,
      });

      setResult(testRes);
      setTestCompleted(true);
      showToast(
        testRes.validated
          ? `Congratulations! Test passed (${testRes.score}%). Skill verified as ${testRes.level}.`
          : `Test completed with score ${testRes.score}%. Saved as unverified (Requires score > 0% to pass).`,
        testRes.validated ? 'success' : 'warning'
      );
    } catch (err) {
      console.error('Failed to submit test and save skill:', err);
      showToast('Error saving test results. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout
      title="Skill Validation Test"
      subtitle={`Conduct assessment to validate your proficiency in ${skillName || 'Skill'}`}
    >
      <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage('')} />

      <div className="row justify-content-center">
        <div className="col-lg-9 col-xl-8">
          {/* Header Card */}
          <div className="panel-card mb-4">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <span className="badge bg-primary-subtle text-primary px-3 py-1 rounded-pill">
                    {category}
                  </span>
                  {existingInfo?.exists ? (
                    existingInfo.validated ? (
                      <span className="badge bg-info-subtle text-info border border-info-subtle px-2 py-1">
                        <i className="bi bi-arrow-repeat me-1" />
                        Retake (Current: {existingInfo.score}% - {existingInfo.level})
                      </span>
                    ) : (
                      <span className="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1">
                        <i className="bi bi-clock-history me-1" />
                        Validating Existing Skill
                      </span>
                    )
                  ) : (
                    <span className="badge bg-secondary-subtle text-secondary border px-2 py-1">
                      <i className="bi bi-plus-circle me-1" />
                      New Skill
                    </span>
                  )}
                </div>
                <h3 className="mb-1 fw-bold">{skillName}</h3>
                <small className="text-muted">
                  Passing criteria: <strong>Score &gt; 0%</strong> for verification | 80%+ for Proficient
                </small>
              </div>

              <button
                type="button"
                className="outline-btn btn-sm"
                onClick={() => navigate('/skills')}
              >
                <i className="bi bi-arrow-left me-1" /> Back to Skills
              </button>
            </div>

            {existingInfo?.exists && existingInfo.validated && (
              <div className="alert alert-info py-2 px-3 small mt-3 mb-0 d-flex align-items-center gap-2">
                <i className="bi bi-info-circle-fill text-info" />
                <span>
                  <strong>Note:</strong> This skill already exists in your profile and is currently verified.
                  Completing this assessment will update your verified score and level.
                </span>
              </div>
            )}
          </div>

          {/* 1. Loading State */}
          {loading && (
            <div className="panel-card text-center py-5">
              <div className="spinner-border text-primary mb-3" role="status" />
              <h5 className="fw-bold mb-1">Generating Test Paper...</h5>
              <p className="text-muted mb-0 small">
                Connecting to intelligence system to prepare adaptive questions for {skillName}.
              </p>
            </div>
          )}

          {/* 2. Service Unavailable Fallback (As Requested) */}
          {!loading && serviceUnavailable && (
            <div className="panel-card text-center py-5 px-4">
              <div
                className="rounded-circle bg-warning-subtle text-warning d-inline-flex align-items-center justify-content-center mb-3"
                style={{ width: '70px', height: '70px', fontSize: '32px' }}
              >
                <i className="bi bi-clock-history" />
              </div>
              <h4 className="fw-bold mb-2">Test Cannot Be Conducted Now</h4>
              <p className="text-muted mx-auto mb-4" style={{ maxWidth: '500px', fontSize: '14px', lineHeight: 1.6 }}>
                The automated test service for <strong>{skillName}</strong> is currently unavailable or still in development.
                You can save this skill now without validation and validate it later when the test becomes available.
              </p>

              <div className="d-flex flex-wrap align-items-center justify-content-center gap-3">
                <button
                  type="button"
                  className="primary-btn px-4 py-2"
                  disabled={savingWithoutTest}
                  onClick={handleSaveWithoutValidation}
                >
                  {savingWithoutTest ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" />
                      Saving Skill...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-bookmark-check me-2" />
                      Save Skill Without Validation (Validate Later)
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="outline-btn px-4 py-2"
                  onClick={() => navigate('/skills')}
                >
                  <i className="bi bi-x-lg me-1" /> Cancel
                </button>
              </div>
            </div>
          )}

          {/* 3. Test Paper Questions Form */}
          {!loading && !serviceUnavailable && !testCompleted && (
            <div>
              <div className="d-flex align-items-center justify-content-between mb-3 px-1">
                <span className="text-muted small">
                  Total Questions: <strong>{questions.length}</strong>
                </span>
                <span className="badge bg-secondary-subtle text-secondary">
                  Answered: {Object.keys(answers).length} / {questions.length}
                </span>
              </div>

              {questions.map((q, qIndex) => {
                const questionText = q.question || (q as any).questions || (q as any).title || (q as any).prompt || `Question ${qIndex + 1}`;
                return (
                  <div className="panel-card mb-4" key={q.id || qIndex}>
                    <div className="d-flex gap-3 mb-3">
                      <span
                        className="badge rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
                        style={{ width: '28px', height: '28px', minWidth: '28px', fontSize: '13px' }}
                      >
                        {qIndex + 1}
                      </span>
                      <h6 className="fw-semibold mb-0 pt-1" style={{ fontSize: '15px', lineHeight: 1.5 }}>
                        {questionText}
                      </h6>
                    </div>

                  <div className="d-flex flex-column gap-2 ms-md-4">
                    {q.options.map((opt, optIndex) => {
                      const isSelected = answers[qIndex] === optIndex;
                      return (
                        <div
                          key={optIndex}
                          className={`p-3 rounded border cursor-pointer d-flex align-items-center gap-3 transition-all ${
                            isSelected
                              ? 'border-primary bg-primary-subtle text-primary fw-semibold'
                              : 'bg-white hover-border'
                          }`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleSelectOption(qIndex, optIndex)}
                        >
                          <input
                            type="radio"
                            name={`question-${qIndex}`}
                            checked={isSelected}
                            onChange={() => handleSelectOption(qIndex, optIndex)}
                            className="form-check-input mt-0"
                            style={{ cursor: 'pointer' }}
                          />
                          <span
                            className={`badge rounded-circle fw-bold ${
                              isSelected ? 'bg-primary text-white' : 'bg-light text-dark border'
                            }`}
                            style={{ width: '24px', height: '24px', display: 'inline-grid', placeItems: 'center' }}
                          >
                            {['A', 'B', 'C', 'D', 'E', 'F'][optIndex] || optIndex + 1}
                          </span>
                          <span style={{ fontSize: '14px' }}>{opt}</span>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                );
              })}

              <div className="panel-card d-flex flex-wrap align-items-center justify-content-between gap-3 mt-4">
                <span className="text-muted small">
                  Ready to submit your answers for evaluation?
                </span>
                <button
                  type="button"
                  className="primary-btn px-4 py-2"
                  disabled={submitting}
                  onClick={handleSubmitTest}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" />
                      Evaluating Assessment...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send-check me-2" />
                      Submit Assessment
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 4. Assessment Completed & Results View */}
          {testCompleted && result && (
            <div className="panel-card text-center py-5 px-4">
              <div
                className={`rounded-circle d-inline-flex align-items-center justify-content-center mb-3 ${
                  result.validated ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'
                }`}
                style={{ width: '80px', height: '80px', fontSize: '38px' }}
              >
                <i className={result.validated ? 'bi bi-patch-check-fill' : 'bi bi-x-circle-fill'} />
              </div>

              <h3 className="fw-bold mb-1">
                {result.validated ? 'Skill Test Passed!' : 'Assessment Completed (Unverified)'}
              </h3>
              <p className="text-muted mb-4 small">
                {result.validated
                  ? `Your skill in ${skillName} has been officially verified in your database record.`
                  : `Score was 0%. The skill was saved as unverified.`}
              </p>

              <div className="row g-3 justify-content-center mb-4">
                <div className="col-6 col-md-3">
                  <div className="p-3 bg-light rounded border text-center">
                    <small className="text-muted d-block mb-1">Score</small>
                    <strong className="fs-4 text-dark">{result.score}%</strong>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="p-3 bg-light rounded border text-center">
                    <small className="text-muted d-block mb-1">Proficiency Level</small>
                    <strong className="fs-4 text-primary">{result.level}</strong>
                  </div>
                </div>
                <div className="col-6 col-md-3">
                  <div className="p-3 bg-light rounded border text-center">
                    <small className="text-muted d-block mb-1">Validation Status</small>
                    <strong className={`fs-5 ${result.validated ? 'text-success' : 'text-warning'}`}>
                      {result.validated ? 'Verified' : 'Unverified'}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="d-flex flex-wrap align-items-center justify-content-center gap-3">
                <button
                  type="button"
                  className="primary-btn px-4 py-2"
                  onClick={() => navigate('/skills')}
                >
                  <i className="bi bi-grid-fill me-2" />
                  View in My Skills
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
