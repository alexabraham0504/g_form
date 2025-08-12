import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createForm } from '../services/firestore';

const GoogleFormImport = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formUrl, setFormUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Mock data for the form preview
  const [mockForm, setMockForm] = useState({
    title: 'Sample Google Form',
    description: 'This is a sample form imported from Google Forms',
    questions: [
      {
        id: 1,
        type: 'short-answer',
        questionText: 'What is your name?',
        required: true
      },
      {
        id: 2,
        type: 'multiple-choice',
        questionText: 'What is your favorite color?',
        options: ['Red', 'Blue', 'Green', 'Yellow'],
        required: false
      },
      {
        id: 3,
        type: 'checkboxes',
        questionText: 'Which programming languages do you know?',
        options: ['JavaScript', 'Python', 'Java', 'C++', 'Ruby'],
        required: false
      },
      {
        id: 4,
        type: 'paragraph',
        questionText: 'Tell us about yourself',
        required: false
      }
    ]
  });

  const handleUrlChange = (e) => {
    setFormUrl(e.target.value);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation for Google Forms URL
    if (!formUrl.trim()) {
      setError('Please enter a Google Form URL');
      return;
    }
    
    if (!formUrl.includes('docs.google.com/forms')) {
      setError('Please enter a valid Google Form URL');
      return;
    }
    
    setIsProcessing(true);
    setError('');
    setSuccess('');
    
    try {
      // Step 1: Scrape the Google Form using the proxy endpoint
      const proxyResponse = await fetch('/api/proxy-form', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: formUrl })
      });
      
      if (!proxyResponse.ok) {
        const errorData = await proxyResponse.json();
        throw new Error(errorData.error || 'Failed to scrape the Google Form');
      }
      
      const { html, success } = await proxyResponse.json();
      
      if (!success || !html) {
        throw new Error('Failed to retrieve form HTML');
      }
      
      // Step 2: Send the HTML to Gemini for processing
      const geminiPrompt = `
        Extract all questions and options from this Google Form HTML. 
        Identify each question's type (short-answer, paragraph, multiple-choice, checkboxes, dropdown).
        For multiple-choice, checkboxes, and dropdown questions, extract all available options.
        
        Return the data in this JSON format:
        {
          "title": "Form title",
          "description": "Form description if available",
          "questions": [
            {
              "type": "short-answer|paragraph|multiple-choice|checkboxes|dropdown",
              "questionText": "The question text",
              "options": ["option1", "option2"] // Only for multiple-choice, checkboxes, dropdown
            }
          ]
        }
        
        HTML content to analyze:
        ${html}
      `;
      
      const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: geminiPrompt
            }]
          }],
          generationConfig: {
            temperature: 0.2,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096,
          }
        })
      });
      
      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        throw new Error(`Gemini API error: ${errorText}`);
      }
      
      const geminiData = await geminiResponse.json();
      
      if (!geminiData.candidates || !geminiData.candidates[0] || !geminiData.candidates[0].content) {
        throw new Error('Invalid response from Gemini API');
      }
      
      const generatedText = geminiData.candidates[0].content.parts[0].text;
      
      // Extract JSON from the response
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse form data from Gemini response');
      }
      
      const parsedForm = JSON.parse(jsonMatch[0]);
      
      // Update the form preview with the parsed data
      setMockForm({
        title: parsedForm.title || 'Imported Google Form',
        description: parsedForm.description || '',
        questions: parsedForm.questions.map((q, index) => ({
          id: Date.now() + index,
          type: q.type || 'short-answer',
          questionText: q.questionText || '',
          options: q.options || [],
          required: false
        }))
      });
      
      setSuccess('Form imported successfully! You can now edit it before saving.');
    } catch (error) {
      console.error('Error importing form:', error);
      setError(error.message || 'An error occurred while importing the form');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditQuestion = (questionId, field, value) => {
    // Update the mock form question
    setMockForm(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === questionId ? { ...q, [field]: value } : q
      )
    }));
  };

  const handleEditOption = (questionId, optionIndex, value) => {
    // Update the mock form question option
    setMockForm(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((option, index) =>
                index === optionIndex ? value : option
              )
            }
          : q
      )
    }));
  };

  const handleAddOption = (questionId) => {
    // Add a new option to the mock form question
    setMockForm(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === questionId
          ? { ...q, options: [...q.options, 'New Option'] }
          : q
      )
    }));
  };

  const handleRemoveOption = (questionId, optionIndex) => {
    // Remove an option from the mock form question
    setMockForm(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.filter((_, index) => index !== optionIndex)
            }
          : q
      )
    }));
  };

  const handleChangeQuestionType = (questionId, newType) => {
    // Change the question type
    setMockForm(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === questionId
          ? { 
              ...q, 
              type: newType,
              // Initialize options array if changing to a type that needs options
              options: ['multiple-choice', 'checkboxes', 'dropdown'].includes(newType) && !q.options 
                ? ['Option 1'] 
                : q.options
            }
          : q
      )
    }));
  };

  const handleSaveForm = async () => {
    try {
      setIsProcessing(true);
      setError('');
      
      // Validate form data
      if (!mockForm.title.trim()) {
        setError('Please enter a form title');
        setIsProcessing(false);
        return;
      }
      
      if (mockForm.questions.length === 0) {
        setError('Form must have at least one question');
        setIsProcessing(false);
        return;
      }
      
      // Prepare form data for saving
      const formToSave = {
        title: mockForm.title.trim(),
        description: mockForm.description ? mockForm.description.trim() : '',
        createdAt: new Date(),
        questions: mockForm.questions.map(q => ({
          type: q.type || 'short-answer',
          questionText: q.questionText ? q.questionText.trim() : '',
          options: q.options || [],
          required: q.required !== undefined ? q.required : false
        })),
        acceptingResponses: true,
        importedFrom: formUrl,
        importedAt: new Date().toISOString()
      };
      
      // Save to Firestore
      await createForm(user.uid, formToSave);
      
      setSuccess('Form saved successfully!');
      
      // Navigate to forms list after a short delay
      setTimeout(() => {
        navigate('/forms');
      }, 1500);
    } catch (error) {
      console.error('Error saving form:', error);
      setError('Error saving form: ' + (error.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="google-form-import-container" style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Header with gradient background */}
      <div className="gforms-header" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '2.5rem 2.5rem',
        borderRadius: '0 0 24px 24px',
        boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: '2rem',
        marginTop: '1rem'
      }}>
        {/* Decorative background elements */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '150px',
          height: '150px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          backdropFilter: 'blur(10px)'
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: '-30px',
          left: '-30px',
          width: '100px',
          height: '100px',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '50%',
          backdropFilter: 'blur(10px)'
        }}></div>
        
        <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', zIndex: 1, minHeight: '80px', paddingTop: '1rem' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 className="gforms-header-title" style={{
              color: 'white',
              fontSize: '2.5rem',
              fontWeight: '900',
              margin: 0,
              textShadow: '0 3px 12px rgba(0, 0, 0, 0.3)',
              letterSpacing: '-0.5px',
              textAlign: 'center',
              lineHeight: '1.2',
              marginTop: '-1.5rem'
            }}>
              Create Form from Google Form
            </h1>
          </div>
        </div>
      </div>

      {/* Back to Dashboard bar */}
      <div style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 100, 
        backgroundColor: 'white', 
        padding: '1rem',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center'
      }}>
        <button 
          onClick={() => navigate('/')} 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#673ab7',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.375rem',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f3ff'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
        >
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Dashboard
        </button>
      </div>

      <div className="form-content" style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
        <div className="url-input-section" style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem', color: '#4b5563' }}>Enter Google Form URL</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <input
              type="text"
              value={formUrl}
              onChange={handleUrlChange}
              placeholder="https://docs.google.com/forms/d/e/..."
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                border: '1px solid #d1d5db',
                fontSize: '1rem'
              }}
              disabled={isProcessing}
            />
            <button
              type="submit"
              disabled={isProcessing}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                backgroundColor: '#6366f1',
                color: 'white',
                fontWeight: '600',
                border: 'none',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                opacity: isProcessing ? 0.7 : 1,
                transition: 'all 0.2s'
              }}
            >
              {isProcessing ? 'Processing...' : 'Import Form'}
            </button>
          </div>
          {error && <p style={{ color: '#ef4444', marginTop: '0.5rem' }}>{error}</p>}
          {success && <p style={{ color: '#10b981', marginTop: '0.5rem' }}>{success}</p>}
          {isProcessing && (
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <p style={{ color: '#6366f1', marginBottom: '0.5rem' }}>Importing form data...</p>
              <div style={{ 
                width: '100%', 
                height: '4px', 
                backgroundColor: '#e5e7eb',
                borderRadius: '2px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  left: '0',
                  top: '0',
                  height: '100%',
                  width: '30%',
                  backgroundColor: '#6366f1',
                  borderRadius: '2px',
                  animation: 'indeterminateAnimation 1.5s infinite linear',
                }}></div>
              </div>
              <style jsx>{`
                @keyframes indeterminateAnimation {
                  0% {
                    left: -30%;
                  }
                  100% {
                    left: 100%;
                  }
                }
              `}</style>
            </div>
          )}
        </form>
      </div>

        {/* Form Preview Section */}
        <div className="form-preview-section">
          <h2 style={{ marginBottom: '1rem', color: '#4b5563' }}>Form Preview</h2>
          <div className="form-preview" style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
            <div className="form-header" style={{ marginBottom: '1.5rem' }}>
              <input
                type="text"
                value={mockForm.title}
                onChange={(e) => setMockForm(prev => ({ ...prev, title: e.target.value }))}
                style={{
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  width: '100%',
                  border: 'none',
                  borderBottom: '1px solid #e5e7eb',
                  padding: '0.5rem 0',
                  marginBottom: '0.5rem'
                }}
              />
              <textarea
                value={mockForm.description}
                onChange={(e) => setMockForm(prev => ({ ...prev, description: e.target.value }))}
                style={{
                  width: '100%',
                  border: 'none',
                  resize: 'vertical',
                  fontSize: '1rem',
                  color: '#6b7280'
                }}
                rows="2"
              />
            </div>

            <div className="form-questions">
              {mockForm.questions.map((question, index) => (
                <div key={question.id} className="question-card" style={{ marginBottom: '1.5rem', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                  <div className="question-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div className="question-number">Question {index + 1}</div>
                    <div className="question-type-selector">
                      <select
                        value={question.type}
                        onChange={(e) => handleChangeQuestionType(question.id, e.target.value)}
                        style={{
                          padding: '0.5rem',
                          borderRadius: '0.375rem',
                          border: '1px solid #d1d5db'
                        }}
                      >
                        <option value="short-answer">Short Answer</option>
                        <option value="paragraph">Paragraph</option>
                        <option value="multiple-choice">Multiple Choice</option>
                        <option value="checkboxes">Checkboxes</option>
                        <option value="dropdown">Dropdown</option>
                      </select>
                    </div>
                  </div>

                  <div className="question-content">
                    <input
                      type="text"
                      value={question.questionText}
                      onChange={(e) => handleEditQuestion(question.id, 'questionText', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        marginBottom: '1rem',
                        borderRadius: '0.375rem',
                        border: '1px solid #d1d5db'
                      }}
                      placeholder="Question text"
                    />

                    {/* Options for multiple-choice, checkboxes, and dropdown */}
                    {['multiple-choice', 'checkboxes', 'dropdown'].includes(question.type) && (
                      <div className="options-container" style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                          <span>Options</span>
                          <button
                            onClick={() => handleAddOption(question.id)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              backgroundColor: '#6366f1',
                              color: 'white',
                              borderRadius: '0.25rem',
                              border: 'none',
                              fontSize: '0.875rem',
                              cursor: 'pointer'
                            }}
                          >
                            Add Option
                          </button>
                        </div>

                        {question.options.map((option, optionIndex) => (
                          <div key={optionIndex} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <div style={{ width: '24px', display: 'flex', alignItems: 'center' }}>
                              {question.type === 'multiple-choice' && (
                                <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '1px solid #d1d5db' }}></div>
                              )}
                              {question.type === 'checkboxes' && (
                                <div style={{ width: '16px', height: '16px', border: '1px solid #d1d5db' }}></div>
                              )}
                              {question.type === 'dropdown' && (
                                <span>{optionIndex + 1}.</span>
                              )}
                            </div>
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => handleEditOption(question.id, optionIndex, e.target.value)}
                              style={{
                                flex: 1,
                                padding: '0.375rem 0.5rem',
                                borderRadius: '0.25rem',
                                border: '1px solid #d1d5db'
                              }}
                            />
                            {question.options.length > 1 && (
                              <button
                                onClick={() => handleRemoveOption(question.id, optionIndex)}
                                style={{
                                  padding: '0.25rem',
                                  backgroundColor: 'transparent',
                                  color: '#ef4444',
                                  borderRadius: '0.25rem',
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="question-footer" style={{ display: 'flex', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={question.required}
                          onChange={(e) => handleEditQuestion(question.id, 'required', e.target.checked)}
                        />
                        <span>Required</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
              {error && <p style={{ color: '#ef4444', margin: 0 }}>{error}</p>}
              {success && <p style={{ color: '#10b981', margin: 0 }}>{success}</p>}
              <button
                onClick={handleSaveForm}
                disabled={isProcessing}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#6366f1',
                  color: 'white',
                  fontWeight: '600',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  opacity: isProcessing ? 0.7 : 1,
                  transition: 'all 0.2s'
                }}
              >
                {isProcessing ? 'Saving...' : 'Save Form'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleFormImport;