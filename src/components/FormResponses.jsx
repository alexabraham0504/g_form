import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getForm, getFormResponses } from '../services/firestore';

const FormResponses = () => {
  const { formId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({
    startDate: '',
    endDate: '',
    questionIdx: '',
    answer: '',
    search: ''
  });
  
  // Google Sheets modal state
  const [showGoogleSheetsModal, setShowGoogleSheetsModal] = useState(false);
  const [googleSheetsEmail, setGoogleSheetsEmail] = useState('');
  const [googleSheetsDateTime, setGoogleSheetsDateTime] = useState('');
  const [googleSheetsLoading, setGoogleSheetsLoading] = useState(false);
  const [googleSheetsError, setGoogleSheetsError] = useState('');
  const [googleSheetsSuccess, setGoogleSheetsSuccess] = useState('');
  const [isGoogleAuthenticated, setIsGoogleAuthenticated] = useState(false);
  const [googleUserEmail, setGoogleUserEmail] = useState('');

  // Filtered responses
  const filteredResponses = useMemo(() => {
    // If form is null or form.questions is undefined, return empty array
    if (!form || !form.questions) return [];
    
    return responses.filter(r => {
      // Date range filter
      if (filter.startDate) {
        const start = new Date(filter.startDate);
        if (!r.submittedAt || (r.submittedAt.toDate && r.submittedAt.toDate() < start)) return false;
      }
      if (filter.endDate) {
        const end = new Date(filter.endDate);
        if (!r.submittedAt || (r.submittedAt.toDate && r.submittedAt.toDate() > end)) return false;
      }
      // Question/answer filter
      if (filter.questionIdx !== '' && filter.answer) {
        const q = form.questions[filter.questionIdx];
        const ans = r.answers?.[q.questionText];
        if (Array.isArray(ans)) {
          if (!ans.includes(filter.answer)) return false;
        } else {
          if (ans !== filter.answer) return false;
        }
      }
      // Search filter
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        const found = Object.values(r.answers || {}).some(val =>
          (Array.isArray(val) ? val.join(' ') : val + '').toLowerCase().includes(searchLower)
        );
        if (!found) return false;
      }
      return true;
    });
  }, [responses, filter, form]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // First fetch the form data
        const formData = await getForm(user.uid, formId);
        setForm(formData);
        
        // Then fetch the responses
        const res = await getFormResponses(user.uid, formId);
        setResponses(res);
      } catch (err) {
        console.error('Error loading form or responses:', err);
        setError('Failed to load form or responses. Please try again.');
        // Set empty form with default values to prevent errors
        setForm({ title: 'Form not found', questions: [] });
        setResponses([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (user && formId) {
      fetchData();
    }
  }, [formId, user]);

  const exportToCSV = () => {
    if (!form || !form.questions || responses.length === 0) return;
    const headers = form.questions.map(q => q.questionText);
    const rows = responses.map(r =>
      headers.map(h => {
        const ans = r.answers?.[h];
        if (Array.isArray(ans)) return '"' + ans.join(', ') + '"';
        return ans !== undefined ? '"' + ans + '"' : '';
      })
    );
    let csvContent = '';
    csvContent += headers.map(h => '"' + h + '"').join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.join(',') + '\n';
    });
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form.title || 'form'}-responses.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Google Sheets functionality
  const openGoogleSheetsModal = async () => {
    if (!form || !form.questions || responses.length === 0) {
      setError('No responses to export to Google Sheets');
      return;
    }
    
    // Check Google authentication status before opening modal
    await checkGoogleAuthStatus();
    
    setShowGoogleSheetsModal(true);
    setGoogleSheetsError('');
    setGoogleSheetsSuccess('');
  };

  const closeGoogleSheetsModal = () => {
    setShowGoogleSheetsModal(false);
    setGoogleSheetsEmail('');
    setGoogleSheetsDateTime('');
    setGoogleSheetsError('');
    setGoogleSheetsSuccess('');
  };

  const validateGoogleSheetsInputs = () => {
    if (!googleSheetsEmail.trim()) {
      setGoogleSheetsError('Please enter an email ID');
      return false;
    }
    if (!googleSheetsEmail.includes('@')) {
      setGoogleSheetsError('Please enter a valid email ID');
      return false;
    }
    if (!googleSheetsDateTime) {
      setGoogleSheetsError('Please select a date and time');
      return false;
    }
    return true;
  };

        // Check Google OAuth status
      const checkGoogleAuthStatus = async () => {
        try {
          const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://forms-fnuk.onrender.com';
          const response = await fetch(`${API_BASE_URL}/auth/google/status`);
      const data = await response.json();
      
      if (data.authenticated && data.email) {
        setIsGoogleAuthenticated(true);
        setGoogleUserEmail(data.email);
        setGoogleSheetsEmail(data.email); // Pre-fill the email field
      } else {
        setIsGoogleAuthenticated(false);
        setGoogleUserEmail('');
      }
      
      return data.authenticated;
    } catch (error) {
      console.error('Error checking Google auth status:', error);
      setIsGoogleAuthenticated(false);
      setGoogleUserEmail('');
      return false;
    }
  };

  // Start Google OAuth flow
  const startGoogleAuth = () => {
    // Save current location to return after auth
    sessionStorage.setItem('oauth_return_url', window.location.pathname);
    
    // Redirect to Google OAuth - use deployed URL
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://forms-fnuk.onrender.com';
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  const saveToGoogleSheets = async () => {
    // If authenticated with Google, we can skip email validation
    if (!isGoogleAuthenticated && !validateGoogleSheetsInputs()) return;

    setGoogleSheetsLoading(true);
    setGoogleSheetsError('');
    setGoogleSheetsSuccess('');

    try {
      // Check if authenticated with Google
      const isAuthenticated = await checkGoogleAuthStatus();
      
      if (!isAuthenticated) {
        // Start OAuth flow
        startGoogleAuth();
        return;
      }
      
      // Use the authenticated user's email if available
      const emailToUse = isGoogleAuthenticated ? googleUserEmail : googleSheetsEmail;
      
      // Prepare data for Google Sheets
      const headers = form.questions.map(q => q.questionText);
      const rows = responses.map(r =>
        headers.map(h => {
          const ans = r.answers?.[h];
          if (Array.isArray(ans)) return ans.join(', ');
          return ans !== undefined ? ans : '';
        })
      );

      // Add headers row
      const sheetData = [headers, ...rows];

      // Call Google Sheets API
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://forms-fnuk.onrender.com';
      const response = await fetch(`${API_BASE_URL}/api/google-sheets/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailToUse,
          dateTime: googleSheetsDateTime,
          formTitle: form.title || 'Form Responses',
          data: sheetData
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Check if we need to authenticate
        if (errorData.requiresAuth) {
          startGoogleAuth();
          return;
        }
        
        throw new Error(`Failed to create Google Sheet: ${errorData.error || errorData.details || response.statusText}`);
      }

      const result = await response.json();
      setGoogleSheetsSuccess(`Google Sheet created successfully in your Google Drive! ${isGoogleAuthenticated ? '' : `A copy has also been shared with: ${emailToUse}`}`);
      
      // Close modal after success
      setTimeout(() => {
        closeGoogleSheetsModal();
      }, 3000);

    } catch (error) {
      console.error('Error saving to Google Sheets:', error);
      setGoogleSheetsError(`${error.message || 'Failed to create Google Sheet. Please try again.'}`);
      // Log additional details for debugging
      console.log('Request details:', {
        email: googleSheetsEmail,
        dateTime: googleSheetsDateTime,
        formTitle: form.title || 'Form Responses'
      });
    } finally {
      setGoogleSheetsLoading(false);
    }
  };

  // Analytics helpers
  const getOptionCounts = (question, respList = filteredResponses) => {
    const counts = {};
    if (!respList.length) return counts;
    respList.forEach(r => {
      const ans = r.answers?.[question.questionText];
      if (question.type === 'checkboxes' && Array.isArray(ans)) {
        ans.forEach(opt => {
          counts[opt] = (counts[opt] || 0) + 1;
        });
      } else if (ans !== undefined && ans !== null) {
        counts[ans] = (counts[ans] || 0) + 1;
      }
    });
    return counts;
  };
  const getUniqueTextAnswers = (question, respList = filteredResponses) => {
    const set = new Set();
    respList.forEach(r => {
      const ans = r.answers?.[question.questionText];
      if (ans && typeof ans === 'string') set.add(ans.trim());
    });
    return Array.from(set);
  };
  // Helper for max count (for bar chart scaling)
  const getMaxCount = (counts) => {
    return Math.max(1, ...Object.values(counts));
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading responses...</div>;
  }
  if (error) {
    return <div style={{ padding: '2rem', color: 'red', textAlign: 'center' }}>{error}</div>;
  }
  if (!form) {
    return null;
  }

  return (
    <div className="form-responses-container" style={{ maxWidth: 900, margin: '2rem auto', background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #0001', padding: 0 }}>
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
        <h1 className="gforms-header-title">{form.title || 'Untitled Form'} - Responses</h1>
        {form.description && <p className="gforms-header-desc">{form.description}</p>}
      </div>
      <div style={{ padding: '2rem' }}>
        <button onClick={() => navigate('/forms')} style={{ marginBottom: 16, background: '#673ab7', color: '#fff', border: 'none', borderRadius: 4, padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 500 }}>Back to Forms</button>
        {/* Filter/Search UI */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 24, alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontWeight: 500, fontSize: 14 }}>Start Date</label><br />
            <input type="date" value={filter.startDate} onChange={e => setFilter(f => ({ ...f, startDate: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontWeight: 500, fontSize: 14 }}>End Date</label><br />
            <input type="date" value={filter.endDate} onChange={e => setFilter(f => ({ ...f, endDate: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontWeight: 500, fontSize: 14 }}>Filter by Question</label><br />
            <select
              value={filter.questionIdx}
              onChange={e => setFilter(f => ({ ...f, questionIdx: e.target.value, answer: '' }))}
              style={{ minWidth: 120 }}
            >
              <option value="">-- Select --</option>
              {form.questions.map((q, idx) => (
                <option key={idx} value={idx}>{q.questionText}</option>
              ))}
            </select>
          </div>
          {filter.questionIdx !== '' && (
            <div>
              <label style={{ fontWeight: 500, fontSize: 14 }}>Answer</label><br />
              <select
                value={filter.answer}
                onChange={e => setFilter(f => ({ ...f, answer: e.target.value }))}
                style={{ minWidth: 120 }}
              >
                <option value="">-- Select --</option>
                {Array.from(new Set(responses.flatMap(r => {
                  const q = form.questions[filter.questionIdx];
                  const ans = r.answers?.[q.questionText];
                  return Array.isArray(ans) ? ans : [ans];
                }).filter(Boolean))).map((ans, i) => (
                  <option key={i} value={ans}>{ans}</option>
                ))}
              </select>
            </div>
          )}
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={{ fontWeight: 500, fontSize: 14 }}>Search</label><br />
            <input
              type="text"
              placeholder="Search responses..."
              value={filter.search}
              onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
              style={{ width: '100%' }}
            />
          </div>
          <button
            className="btn-secondary"
            style={{ height: 40, marginTop: 18 }}
            onClick={() => setFilter({ startDate: '', endDate: '', questionIdx: '', answer: '', search: '' })}
            type="button"
          >
            Clear Filters
          </button>
        </div>
        {/* End Filter/Search UI */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, alignItems: 'center' }}>
          <button onClick={exportToCSV} style={{ background: '#673ab7', color: '#fff', border: 'none', borderRadius: 4, padding: '0.5rem 1.5rem', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>Export to CSV</button>
          <button onClick={openGoogleSheetsModal} style={{ background: '#34a853', color: '#fff', border: 'none', borderRadius: 4, padding: '0.5rem 1.5rem', fontWeight: 600, fontSize: 16, cursor: 'pointer' }}>Save to Google Sheets</button>
        </div>
        <span style={{ marginLeft: 16, fontWeight: 500, color: '#673ab7' }}>Showing {filteredResponses.length} of {responses.length} responses</span>
        {/* Analytics Section */}
        <div style={{ marginBottom: 32, background: '#f9fafb', borderRadius: 6, padding: 16 }}>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>Summary Analytics</h2>
          <div style={{ marginBottom: 12 }}><strong>Total Responses:</strong> {filteredResponses.length}</div>
          {form && form.questions && form.questions.map((q, idx) => (
            <div key={idx} style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 500 }}>{q.questionText}</div>
              {['multiple-choice', 'checkboxes'].includes(q.type) ? (
                <div style={{ marginTop: 6 }}>
                  {(() => {
                    const counts = getOptionCounts(q, filteredResponses);
                    const max = getMaxCount(counts);
                    return q.options.map((opt, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ minWidth: 120 }}>{opt}</span>
                        <div style={{
                          height: 18,
                          background: '#673ab722',
                          borderRadius: 4,
                          marginLeft: 8,
                          marginRight: 8,
                          flex: 1,
                          position: 'relative',
                          minWidth: 40,
                          maxWidth: 300,
                        }}>
                          <div style={{
                            width: `${(counts[opt] || 0) / max * 100}%`,
                            height: '100%',
                            background: '#673ab7',
                            borderRadius: 4,
                            transition: 'width 0.3s',
                          }}></div>
                          <span style={{
                            position: 'absolute',
                            left: 8,
                            top: 0,
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: 13,
                            lineHeight: '18px',
                            zIndex: 1,
                            textShadow: '0 1px 2px #0005',
                            display: (counts[opt] || 0) > 0 ? 'inline' : 'none',
                          }}>{counts[opt] || 0}</span>
                        </div>
                        <span style={{ minWidth: 24, textAlign: 'right', color: '#673ab7', fontWeight: 600 }}>{counts[opt] || 0}</span>
                      </div>
                    ));
                  })()}
                </div>
              ) : (
                <div style={{ marginTop: 4 }}>
                  <span style={{ fontWeight: 400 }}>Unique responses: {getUniqueTextAnswers(q, filteredResponses).length}</span>
                  {getUniqueTextAnswers(q, filteredResponses).length > 0 && (
                    <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
                      <span>Sample: </span>
                      <span>"{getUniqueTextAnswers(q, filteredResponses)[0]}"</span>
                      {getUniqueTextAnswers(q, filteredResponses).length > 1 && <span> (+{getUniqueTextAnswers(q, filteredResponses).length - 1} more)</span>}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        {/* End Analytics Section */}
        {responses.length === 0 ? (
          <div style={{ textAlign: 'center', margin: '2rem 0', padding: '2rem', background: '#f9fafb', borderRadius: '8px', border: '1px dashed #d1d5db' }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" style={{ margin: '0 auto 1rem' }}>
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#4b5563', marginBottom: '0.5rem' }}>No responses yet</h3>
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>This form hasn't received any responses yet.</p>
            <button 
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/public/${form.publicId}`)}
              style={{ 
                background: '#673ab7', 
                color: 'white', 
                border: 'none', 
                padding: '0.5rem 1rem', 
                borderRadius: '4px', 
                fontWeight: '500',
                cursor: 'pointer',
                display: form.publicId ? 'inline-block' : 'none'
              }}
            >
              Copy Form Link
            </button>
          </div>
        ) : filteredResponses.length === 0 ? (
          <div style={{ color: '#888', textAlign: 'center', margin: '2rem 0' }}>No responses found for the selected filters/search.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #eee', padding: 10, background: '#f9fafb', fontWeight: 600, color: '#673ab7', width: '60px', textAlign: 'center' }}>#</th>
                  <th style={{ border: '1px solid #eee', padding: 10, background: '#f9fafb', fontWeight: 600, color: '#673ab7' }}>Question</th>
                  <th style={{ border: '1px solid #eee', padding: 10, background: '#f9fafb', fontWeight: 600, color: '#673ab7' }}>Answer</th>
                  <th style={{ border: '1px solid #eee', padding: 10, background: '#f9fafb', fontWeight: 600, color: '#673ab7', width: '180px' }}>Submitted At</th>
                </tr>
              </thead>
              <tbody>
                {filteredResponses.map((response, responseIndex) => (
                  form && form.questions && form.questions.map((question, questionIndex) => {
                    const answer = response.answers?.[question.questionText];
                    const formattedAnswer = Array.isArray(answer) ? answer.join(', ') : answer || '';
                    
                    return (
                      <tr key={`${responseIndex}-${questionIndex}`}>
                        {questionIndex === 0 && (
                          <td 
                            rowSpan={form.questions.length} 
                            style={{ 
                              border: '1px solid #eee', 
                              padding: 10, 
                              textAlign: 'center',
                              fontWeight: 600,
                              background: questionIndex === 0 ? '#f9fafb' : 'transparent',
                              color: '#673ab7'
                            }}
                          >
                            {responseIndex + 1}
                          </td>
                        )}
                        <td style={{ border: '1px solid #eee', padding: 10, fontWeight: 500 }}>
                          {question.questionText}
                        </td>
                        <td style={{ border: '1px solid #eee', padding: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {formattedAnswer}
                        </td>
                        {questionIndex === 0 && (
                          <td 
                            rowSpan={form.questions.length} 
                            style={{ 
                              border: '1px solid #eee', 
                              padding: 10,
                              fontSize: '0.9rem',
                              color: '#666'
                            }}
                          >
                            {response.submittedAt?.toDate ? response.submittedAt.toDate().toLocaleString() : ''}
                          </td>
                        )}
                      </tr>
                    );
                  })
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Google Sheets Modal */}
      {showGoogleSheetsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 12,
            padding: '2rem',
            maxWidth: 500,
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ margin: 0, color: '#1f2937', fontSize: '1.5rem', fontWeight: '600' }}>
                Save to Google Sheets
              </h2>
              <button
                onClick={closeGoogleSheetsModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0.25rem'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                This will create a new Google Sheet with your form responses and save it to your Google Drive.
                {!isGoogleAuthenticated && ' A copy will also be shared with the specified email address.'}
              </p>
              <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
                <strong>Note:</strong> {isGoogleAuthenticated ? 'You are already authenticated with Google.' : 'You will be asked to log in to your Google account for authentication.'}
              </p>
            </div>
            
            {!isGoogleAuthenticated ? (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                  Email ID *
                </label>
                <input
                  type="email"
                  value={googleSheetsEmail}
                  onChange={(e) => setGoogleSheetsEmail(e.target.value)}
                  placeholder="Enter email ID"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            ) : (
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}>
                  <strong>Authenticated as:</strong> {googleUserEmail}
                </p>
                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  The Google Sheet will be created in your Google Drive.
                </p>
              </div>
            )}
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                Filled Date and Time *
              </label>
              <input
                type="datetime-local"
                value={googleSheetsDateTime}
                onChange={(e) => setGoogleSheetsDateTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
              />
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                You can select previous dates and times
              </p>
            </div>
            
            {googleSheetsError && (
              <div style={{
                padding: '0.75rem',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                color: '#dc2626',
                marginBottom: '1rem'
              }}>
                {googleSheetsError}
              </div>
            )}
            
            {googleSheetsSuccess && (
              <div style={{
                padding: '0.75rem',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '6px',
                color: '#16a34a',
                marginBottom: '1rem'
              }}>
                {googleSheetsSuccess}
              </div>
            )}
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={closeGoogleSheetsModal}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#f3f4f6',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  color: '#374151',
                  fontWeight: '500',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveToGoogleSheets}
                disabled={googleSheetsLoading}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: googleSheetsLoading ? '#9ca3af' : '#34a853',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontWeight: '500',
                  cursor: googleSheetsLoading ? 'not-allowed' : 'pointer',
                  fontSize: '1rem'
                }}
              >
                {googleSheetsLoading ? 'Creating...' : 'Create Google Sheet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormResponses;
