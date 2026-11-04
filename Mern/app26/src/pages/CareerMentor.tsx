import { useState } from 'react';
import Layout from '../components/Layout';

const initial = [
  {
    role: 'ai',
    text: 'Hi! I am your Career Pilot AI Mentor. Tell me what you want to improve - placement, skills, resume, interview preparation, or projects.',
  },
];

export default function CareerMentor() {
  const [messages, setMessages] = useState(initial);
  const [input, setInput] = useState('');

  const send = () => {
    if (!input.trim()) return;

    const question = input;
    const lowerQuestion = question.toLowerCase();

    setMessages((prev) => [
      ...prev,
      { role: 'user', text: question },
      {
        role: 'ai',
        text: `Great question! Based on your profile, I recommend focusing on ${
          lowerQuestion.includes('resume')
            ? 'ATS keywords and measurable project results'
            : lowerQuestion.includes('placement')
              ? 'DSA, communication and interview practice'
              : 'one practical project and consistent coding practice'
        } this week.`,
      },
    ]);

    setInput('');
  };

  const suggestions = [
    'How can I improve placement chances?',
    'What skills should I learn next?',
    'Review my resume',
    'Give me an interview plan',
  ];

  return (
    <Layout title="AI Career Mentor" subtitle="Personalized guidance based on your Career Pilot profile.">
      <div className="mentor-shell">
        <div className="mentor-chat">
          <div className="mentor-head">
            <div className="ai-avatar">
              <i className="bi bi-stars" />
            </div>
            <div>
              <strong>Career Pilot AI</strong>
              <small>Online - Personalized mentor</small>
            </div>
            <span className="online-dot" />
          </div>

          <div className="chat-body">
            {messages.map((message, index) => (
              <div key={index} className={`message ${message.role}`}>
                <div className="message-avatar">
                  {message.role === 'ai' ? <i className="bi bi-stars" /> : 'You'}
                </div>
                <div className="message-bubble">{message.text}</div>
              </div>
            ))}
          </div>

          <div className="suggestions">
            {suggestions.map((suggestion) => (
              <button key={suggestion} onClick={() => setInput(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>

          <div className="chat-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask your career mentor..."
            />
            <button onClick={send}>
              <i className="bi bi-send-fill" />
            </button>
          </div>
        </div>

        <div className="mentor-side">
          <div className="panel-card">
            <span className="eyebrow">THIS WEEK</span>
            <h5>Your action plan</h5>
            <div className="mentor-task done">
              <i className="bi bi-check-circle-fill" /> Update resume metrics
            </div>
            <div className="mentor-task">
              <i className="bi bi-circle" /> Solve 10 DSA problems
            </div>
            <div className="mentor-task">
              <i className="bi bi-circle" /> Complete one project milestone
            </div>
          </div>

          <div className="panel-card mt-3">
            <span className="eyebrow">FOCUS AREA</span>
            <h5>Interview readiness</h5>
            <p>Practice 2 mock interviews and refine your communication flow.</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
