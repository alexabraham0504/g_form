import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getFormByPublicId, savePublicFormResponse } from '../services/firestore';

const PublicForm = () => {
  const { publicId } = useParams();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const fetchForm = async () => {
      try {
        setLoading(true);
        const fetchedForm = await getFormByPublicId(publicId);
        setForm(fetchedForm);
      } catch (err) {
        setError('Form not found or is no longer public.');
      } finally {
        setLoading(false);
      }
    };
    fetchForm();
  }, [publicId]);

  const handleChange = (q, value, optionIdx) => {
    if (q.type === 'checkboxes') {
      setAnswers((prev) => {
        const arr = Array.isArray(prev[q.questionText]) ? [...prev[q.questionText]] : [];
        if (arr.includes(value)) {
          return { ...prev, [q.questionText]: arr.filter((v) => v !== value) };
        } else {
          return { ...prev, [q.questionText]: [...arr, value] };
        }
      });
    } else if (q.type === 'multiple-choice') {
      setAnswers((prev) => ({ ...prev, [q.questionText]: value }));
    } else {
      setAnswers((prev) => ({ ...prev, [q.questionText]: value }));
    }
  };

  const validate = () => {
    if (!form || !form.questions) return false;
    for (const q of form.questions) {
      if (q.required) {
        if (q.type === 'checkboxes') {
          if (!answers[q.questionText] || answers[q.questionText].length === 0) return false;
        } else {
          if (!answers[q.questionText] || answers[q.questionText].toString().trim() === '') return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!validate()) {
      setSubmitError('Please fill all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      // Sanitize answers to remove any undefined values
      const sanitizedAnswers = {};
      Object.keys(answers).forEach(key => {
        if (answers[key] !== undefined) {
          sanitizedAnswers[key] = answers[key];
        }
      });
      
      await savePublicFormResponse(publicId, { answers: sanitizedAnswers });
      setSubmitted(true);
    } catch (err) {
      setSubmitError('Failed to submit response. Please try again.');
      console.error('Form submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading form...</div>;
  }
  if (error) {
    return <div style={{ padding: '2rem', color: 'red', textAlign: 'center' }}>{error}</div>;
  }
  if (!form) {
    return null;
  }

  // Check form settings for accepting responses and date range
  const now = new Date();
  let notAccepting = false;
  if (form.acceptingResponses === false) notAccepting = true;
  if (form.startDate) {
    const start = new Date(form.startDate);
    if (now < start) notAccepting = true;
  }
  if (form.endDate) {
    const end = new Date(form.endDate);
    if (now > end) notAccepting = true;
  }

  if (notAccepting) {
    return (
      <div className="public-form-container" style={{ maxWidth: 600, margin: '2rem auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0001', padding: 0 }}>
        <div className="gforms-header">
          <h2 className="gforms-header-title">Form is not accepting responses</h2>
          <p className="gforms-header-desc">This form is currently closed for submissions.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="public-form-container" style={{ maxWidth: 600, margin: '2rem auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0001', padding: '2rem', textAlign: 'center' }}>
        <div className="gforms-header">
          <h2 className="gforms-header-title">{form.confirmationMessage || 'Thank you for your response!'}</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="public-form-container" style={{ maxWidth: 600, margin: '2rem auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px #0002', padding: 0 }}>
      <div className="gforms-header">
        <div className="gforms-logo">
          {/* Google Forms SVG logo */}
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="40" rx="12" fill="#673ab7"/>
            <rect x="8" y="8" width="24" height="24" rx="4" fill="#fff"/>
            <rect x="12" y="12" width="16" height="3" rx="1.5" fill="#b39ddb"/>
            <rect x="12" y="18" width="16" height="3" rx="1.5" fill="#b39ddb"/>
            <rect x="12" y="24" width="10" height="3" rx="1.5" fill="#b39ddb"/>
            <circle cx="28" cy="25.5" r="1.5" fill="#b39ddb"/>
          </svg>
        </div>
        <h1 className="gforms-header-title">{form.title || 'Untitled Form'}</h1>
        {form.description && <p className="gforms-header-desc">{form.description}</p>}
      </div>
      <form onSubmit={handleSubmit} style={{ padding: '2rem' }}>
        {form.questions && form.questions.length > 0 ? (
          form.questions.map((q, idx) => (
            <div key={idx} style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontWeight: 500, display: 'block', marginBottom: 6 }}>
                {q.questionText} {q.required && <span style={{ color: 'var(--gforms-purple)' }}>*</span>}
              </label>
              {q.type === 'short-answer' && (
                <input
                  type="text"
                  className="public-form-input"
                  style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 16, marginBottom: 2 }}
                  value={answers[q.questionText] || ''}
                  onChange={e => handleChange(q, e.target.value)}
                  required={q.required}
                />
              )}
              {q.type === 'paragraph' && (
                <textarea
                  className="public-form-input"
                  style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 16, marginBottom: 2 }}
                  rows={3}
                  value={answers[q.questionText] || ''}
                  onChange={e => handleChange(q, e.target.value)}
                  required={q.required}
                />
              )}
              {q.type === 'multiple-choice' && q.options && (
                <div>
                  {q.options.map((opt, i) => (
                    <div key={i} style={{ marginBottom: 4 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="radio"
                          name={`q${idx}`}
                          value={opt}
                          checked={answers[q.questionText] === opt}
                          onChange={() => handleChange(q, opt)}
                          required={q.required}
                          style={{ accentColor: 'var(--gforms-purple)' }}
                        />{' '}{opt}
                      </label>
                    </div>
                  ))}
                </div>
              )}
              {q.type === 'checkboxes' && q.options && (
                <div>
                  {q.options.map((opt, i) => (
                    <div key={i} style={{ marginBottom: 4 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="checkbox"
                          name={`q${idx}_${i}`}
                          value={opt}
                          checked={Array.isArray(answers[q.questionText]) && answers[q.questionText].includes(opt)}
                          onChange={() => handleChange(q, opt, i)}
                          required={q.required && (!answers[q.questionText] || answers[q.questionText].length === 0)}
                          style={{ accentColor: 'var(--gforms-purple)' }}
                        />{' '}{opt}
                      </label>
                    </div>
                  ))}
                </div>
              )}
              {q.type === 'dropdown' && q.options && (
                <select
                  className="public-form-input"
                  style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 16, marginBottom: 2 }}
                  value={answers[q.questionText] || ''}
                  onChange={e => handleChange(q, e.target.value)}
                  required={q.required}
                >
                  <option value="" disabled>Select an option</option>
                  {q.options.map((opt, i) => (
                    <option key={i} value={opt}>{opt}</option>
                  ))}
                </select>
              )}
              {q.type === 'linear-scale' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {Array.from({ length: (q.max || 5) - (q.min || 1) + 1 }, (_, i) => (q.min || 1) + i).map(val => (
                    <label key={val} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 14 }}>
                      <input
                        type="radio"
                        name={`q${idx}`}
                        value={val}
                        checked={answers[q.questionText] == val}
                        onChange={() => handleChange(q, val)}
                        required={q.required}
                        style={{ accentColor: 'var(--gforms-purple)' }}
                      />
                      <span>{val}</span>
                    </label>
                  ))}
                </div>
              )}
              {q.type === 'date' && (
                <input
                  type="date"
                  className="public-form-input"
                  style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 16, marginBottom: 2 }}
                  value={answers[q.questionText] || ''}
                  onChange={e => handleChange(q, e.target.value)}
                  required={q.required}
                />
              )}
              {q.type === 'time' && (
                <input
                  type="time"
                  className="public-form-input"
                  style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 16, marginBottom: 2 }}
                  value={answers[q.questionText] || ''}
                  onChange={e => handleChange(q, e.target.value)}
                  required={q.required}
                />
              )}
            </div>
          ))
        ) : (
          <div>No questions in this form.</div>
        )}
        {submitError && <div style={{ color: 'red', marginBottom: 12 }}>{submitError}</div>}
        <button type="submit" className="btn-primary" style={{ padding: '0.75rem 2rem', fontSize: 18, marginTop: 8 }} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </div>
  );
};

export default PublicForm;
