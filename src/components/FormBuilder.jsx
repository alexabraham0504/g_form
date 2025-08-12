import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createForm, getForm, updateForm } from '../services/firestore';
import AIGenerationModal from './AIGenerationModal';

// Add custom styles for form input placeholders and animations
const formInputStyles = `
  .form-title-input::placeholder {
    color: #9ca3af;
  }
  
  .form-description-input::placeholder {
    color: #9ca3af;
    font-size: 0.875rem;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .name-question {
    border-left: 3px solid #4f46e5;
  }
  
  .locked-question {
    background-color: rgba(243, 244, 246, 0.5);
  }
  
  .locked-indicator {
    color: #ef4444;
    margin-left: 5px;
  }
  
  .locked-text {
    color: #ef4444;
    font-size: 0.8rem;
    font-style: italic;
  }
  
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  input:disabled {
    background-color: #f3f4f6;
    cursor: not-allowed;
  }
`;


// Add the styles to the document head
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = formInputStyles;
  document.head.appendChild(styleElement);
}

const FormBuilder = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { formId } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [templateMsg, setTemplateMsg] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    createdAt: new Date().toISOString().split('T')[0],
    questions: []
  });

  const [settings, setSettings] = useState({
    acceptingResponses: true,
    startDate: '',
    endDate: '',
    confirmationMessage: 'Your response has been recorded.'
  });
  
  // Name Upload feature state
  const [nameUpload, setNameUpload] = useState({
    enabled: false,
    names: [],
    inputMethod: 'manual', // 'manual' or 'csv'
    manualInput: '',
    isSaving: false,
    message: '',
    locked: false // true if responses have been generated
  });

  // Load existing form if editing
  useEffect(() => {
    if (formId && formId !== 'new') {
      loadForm();
    }
  }, [formId]);

  const loadForm = async () => {
    try {
      setIsLoading(true);
      const form = await getForm(user.uid, formId);
      
      // Check if form has responses
      const hasResponses = form.hasResponses || false;
      
      // Check if there's a name question in the form
      const nameQuestion = form.questions.find(q => q.id === 'name_q' || (q.metadata && q.metadata.source === 'name_upload'));
      
      setFormData({
        title: form.title || '',
        description: form.description || '',
        createdAt: form.createdAt ? new Date(form.createdAt.toDate()).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        questions: form.questions || [],
        publicId: form.publicId || '' // Assuming publicId is part of the form data
      });
      
      setSettings({
        acceptingResponses: form.acceptingResponses !== undefined ? form.acceptingResponses : true,
        startDate: form.startDate || '',
        endDate: form.endDate || '',
        confirmationMessage: form.confirmationMessage || 'Your response has been recorded.'
      });
      
      // Load name upload data if it exists
      if (form.nameUpload) {
        setNameUpload({
          enabled: form.nameUpload.enabled || false,
          names: form.nameUpload.names || [],
          inputMethod: form.nameUpload.inputMethod || 'manual',
          manualInput: form.nameUpload.names ? form.nameUpload.names.join('\n') : '',
          isSaving: false,
          message: '',
          locked: hasResponses // Lock if form has responses
        });
        
        // If name upload is enabled but no name question exists, create it
        if (form.nameUpload.enabled && !nameQuestion && form.nameUpload.names && form.nameUpload.names.length > 0) {
          const nameQuestion = {
            id: 'name_q',
            type: 'dropdown',
            questionText: 'Name',
            options: form.nameUpload.names,
            required: false,
            metadata: { source: 'name_upload' }
          };
          
          // Add name question as the first question
          setFormData(prev => ({
            ...prev,
            questions: [nameQuestion, ...prev.questions]
          }));
        }
      } else {
        // If no name upload data exists but form has responses, set default with locked state
        setNameUpload(prev => ({
          ...prev,
          locked: hasResponses
        }));
      }
    } catch (error) {
      console.error('Error loading form:', error);
      setMessage('Error loading form');
    } finally {
      setIsLoading(false);
    }
  };

  const addQuestion = (type = 'short-answer') => {
    let newQuestion = {
      id: Date.now() + Math.random(),
      type,
      questionText: '',
      options: [],
      required: false
    };
    if (type === 'multiple-choice' || type === 'checkboxes' || type === 'dropdown') {
      newQuestion.options = [''];
    }
    if (type === 'linear-scale') {
      newQuestion.min = 1;
      newQuestion.max = 5;
      newQuestion.options = [];
    }
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  };

  const updateQuestion = (questionId, field, value) => {
    // Check if this is the name question and if it's locked
    const question = formData.questions.find(q => q.id === questionId);
    if (question && question.id === 'name_q' && nameUpload.locked) {
      showPopupMessage('Cannot modify the Name question after responses have been generated');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === questionId ? { ...q, [field]: value } : q
      )
    }));
  };

  const deleteQuestion = (questionId) => {
    // Check if this is the name question and if it's locked
    const question = formData.questions.find(q => q.id === questionId);
    if (question && question.id === 'name_q' && nameUpload.locked) {
      showPopupMessage('Cannot delete the Name question after responses have been generated');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId)
    }));
  };

  const duplicateQuestion = (questionId) => {
    // Check if this is the name question and if it's locked
    const questionToDuplicate = formData.questions.find(q => q.id === questionId);
    if (!questionToDuplicate) return;
    
    if ((questionToDuplicate.id === 'name_q' || 
        (questionToDuplicate.metadata && questionToDuplicate.metadata.source === 'name_upload')) && 
        nameUpload.locked) {
      showPopupMessage('Cannot duplicate the Name question after responses have been generated');
      return;
    }
    
    const newQuestion = {
      ...questionToDuplicate,
      id: Date.now() + Math.random(),
      questionText: questionToDuplicate.questionText + ' (Copy)'
    };
    
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));
  };

  const addOption = (questionId) => {
    // Check if this is the name question and if it's locked
    const question = formData.questions.find(q => q.id === questionId);
    if (question && question.id === 'name_q' && nameUpload.locked) {
      showPopupMessage('Cannot modify the Name question options after responses have been generated');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === questionId
          ? { ...q, options: [...q.options, ''] }
          : q
      )
    }));
  };

  const updateOption = (questionId, optionIndex, value) => {
    // Check if this is the name question and if it's locked
    const question = formData.questions.find(q => q.id === questionId);
    if (question && question.id === 'name_q' && nameUpload.locked) {
      showPopupMessage('Cannot modify the Name question options after responses have been generated');
      return;
    }
    
    setFormData(prev => ({
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

  const removeOption = (questionId, optionIndex) => {
    // Check if this is the name question and if it's locked
    const question = formData.questions.find(q => q.id === questionId);
    if (question && question.id === 'name_q' && nameUpload.locked) {
      showPopupMessage('Cannot modify the Name question options after responses have been generated');
      return;
    }
    
    setFormData(prev => ({
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

  // Name Upload feature handlers
  const handleNameUploadToggle = (e) => {
    // If locked, don't allow changes
    if (nameUpload.locked) {
      showPopupMessage('Cannot modify name upload settings after responses have been generated');
      return;
    }
    
    setNameUpload(prev => ({
      ...prev,
      enabled: e.target.checked,
      message: ''
    }));
  };
  
  const handleInputMethodChange = (method) => {
    // If locked, don't allow changes
    if (nameUpload.locked) return;
    
    setNameUpload(prev => ({
      ...prev,
      inputMethod: method,
      message: ''
    }));
  };
  
  const handleManualInputChange = (e) => {
    // If locked, don't allow changes
    if (nameUpload.locked) return;
    
    setNameUpload(prev => ({
      ...prev,
      manualInput: e.target.value,
      message: ''
    }));
  };
  
  const handleCsvUpload = (e) => {
    // If locked, don't allow changes
    if (nameUpload.locked) return;
    
    const file = e.target.files[0];
    if (!file) return;
    
    // Check if it's a CSV file
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setNameUpload(prev => ({
        ...prev,
        message: 'Error: Please upload a CSV file'
      }));
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const csvContent = event.target.result;
        // Split by newline and filter out empty lines
        const names = csvContent.split(/\r?\n/)
          .map(name => name.trim())
          .filter(name => name.length > 0);
        
        if (names.length === 0) {
          setNameUpload(prev => ({
            ...prev,
            message: 'Error: No names found in the CSV file'
          }));
          return;
        }
        
        setNameUpload(prev => ({
          ...prev,
          names,
          message: `${names.length} names loaded successfully`
        }));
      } catch (error) {
        console.error('Error parsing CSV:', error);
        setNameUpload(prev => ({
          ...prev,
          message: 'Error: Failed to parse CSV file'
        }));
      }
    };
    
    reader.onerror = () => {
      setNameUpload(prev => ({
        ...prev,
        message: 'Error: Failed to read CSV file'
      }));
    };
    
    reader.readAsText(file);
  };
  
  // Save name upload data and add/update name dropdown question
  const saveNameUpload = () => {
    // If locked, don't allow changes
    if (nameUpload.locked) return;
    
    setNameUpload(prev => ({ ...prev, isSaving: true, message: '' }));
    
    try {
      let names = [];
      
      if (nameUpload.inputMethod === 'manual') {
        // Process manual input - split by newline and filter empty lines
        names = nameUpload.manualInput.split('\n')
          .map(name => name.trim())
          .filter(name => name.length > 0);
      } else {
        // Use already parsed CSV names
        names = nameUpload.names;
      }
      
      if (names.length === 0) {
        setNameUpload(prev => ({
          ...prev,
          isSaving: false,
          message: 'Error: No names provided'
        }));
        return;
      }
      
      // Update state with processed names
      setNameUpload(prev => ({
        ...prev,
        names,
        isSaving: false,
        message: `${names.length} names saved successfully`
      }));
      
      // Add or update the name dropdown question
      const nameQuestionId = 'name_q';
      const existingNameQuestion = formData.questions.find(q => q.id === nameQuestionId);
      
      if (existingNameQuestion) {
        // Update existing name question
        setFormData(prev => ({
          ...prev,
          questions: prev.questions.map(q => 
            q.id === nameQuestionId 
              ? { ...q, options: names, metadata: { ...q.metadata, source: 'name_upload' } }
              : q
          )
        }));
      } else {
        // Create new name question and add it as the first question
        const nameQuestion = {
          id: nameQuestionId,
          type: 'dropdown',
          questionText: 'Name',
          options: names,
          required: false,
          metadata: { source: 'name_upload' }
        };
        
        setFormData(prev => ({
          ...prev,
          questions: [nameQuestion, ...prev.questions]
        }));
      }
      
      // Save to database without redirecting
      saveFormWithoutRedirect();
    } catch (error) {
      console.error('Error saving names:', error);
      setNameUpload(prev => ({
        ...prev,
        isSaving: false,
        message: 'Error: Failed to save names'
      }));
    }
  };
  
  // Save form without redirecting (for name upload)
  const saveFormWithoutRedirect = async () => {
    try {
      const formToSave = {
        title: formData.title.trim(),
        description: formData.description ? formData.description.trim() : '',
        createdAt: new Date(formData.createdAt || new Date()),
        questions: formData.questions.map(q => ({
          id: q.id, // Preserve the id
          type: q.type || 'short-answer',
          questionText: q.questionText ? q.questionText.trim() : '',
          options: q.options || [],
          required: q.required !== undefined ? q.required : false,
          min: q.min !== undefined ? q.min : null,
          max: q.max !== undefined ? q.max : null,
          metadata: q.metadata // Preserve metadata
        })),
        acceptingResponses: settings.acceptingResponses !== undefined ? settings.acceptingResponses : true,
        startDate: settings.startDate || '',
        endDate: settings.endDate || '',
        confirmationMessage: settings.confirmationMessage || 'Your response has been recorded.',
        // Include name upload data
        nameUpload: nameUpload.enabled ? {
          enabled: nameUpload.enabled,
          names: nameUpload.names,
          inputMethod: nameUpload.inputMethod,
          locked: nameUpload.locked
        } : null
      };

      if (formId && formId !== 'new') {
        await updateForm(user.uid, formId, formToSave);
        setMessage('Form updated successfully!');
      } else {
        const newFormId = await createForm(user.uid, formToSave);
        // If this is a new form, update the URL to include the new form ID
        if (newFormId) {
          navigate(`/form/${newFormId}`, { replace: true });
        }
        setMessage('Form saved successfully!');
      }
    } catch (error) {
      console.error('Error saving form:', error);
      setMessage('Error saving form. Please try again.');
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      setMessage('Please enter a form title');
      return;
    }

    if (formData.questions.length === 0) {
      setMessage('Please add at least one question');
      return;
    }

    try {
      setIsSaving(true);
      setMessage('');

      const formToSave = {
        title: formData.title.trim(),
        description: formData.description ? formData.description.trim() : '',
        createdAt: new Date(formData.createdAt || new Date()),
        questions: formData.questions.map(q => ({
          type: q.type || 'short-answer',
          questionText: q.questionText ? q.questionText.trim() : '',
          options: q.options || [],
          required: q.required !== undefined ? q.required : false,
          min: q.min !== undefined ? q.min : null,
          max: q.max !== undefined ? q.max : null
        })),
        acceptingResponses: settings.acceptingResponses !== undefined ? settings.acceptingResponses : true,
        startDate: settings.startDate || '',
        endDate: settings.endDate || '',
        confirmationMessage: settings.confirmationMessage || 'Your response has been recorded.',
        // Include name upload data
        nameUpload: nameUpload.enabled ? {
          enabled: nameUpload.enabled,
          names: nameUpload.names,
          inputMethod: nameUpload.inputMethod,
          locked: nameUpload.locked
        } : null
      };

      if (formId && formId !== 'new') {
        await updateForm(user.uid, formId, formToSave);
        setMessage('Form updated successfully!');
      } else {
        await createForm(user.uid, formToSave);
        setMessage('Form saved successfully!');
      }

      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error) {
      console.error('Error saving form:', error);
      setMessage('Error saving form. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAsTemplate = () => {
    const template = {
      name: formData.title || 'Untitled Template',
      description: formData.description,
      questions: formData.questions,
      settings,
      createdAt: new Date().toISOString()
    };
    const existing = JSON.parse(localStorage.getItem('gforms_custom_templates') || '[]');
    localStorage.setItem('gforms_custom_templates', JSON.stringify([...existing, template]));
    setTemplateMsg('Template saved! You can use it from the Dashboard.');
    setTimeout(() => setTemplateMsg(''), 2000);
  };



  const handlePreview = () => {
    if (!formData.title.trim()) {
      showPopupMessage('Please enter a form title first');
      return;
    }
    
    if (formData.questions.length === 0) {
      showPopupMessage('Please add at least one question to preview');
      return;
    }
    
    if (formId && formId !== 'new' && formData.publicId) {
      window.open(`/public/${formData.publicId}`, '_blank');
    } else {
      // Create a temporary preview by saving the form first
      showPopupMessage('Saving form for preview...');
      handleSave().then(() => {
        // After saving, the form will have a publicId and can be previewed
        setTimeout(() => {
          if (formData.publicId) {
            window.open(`/public/${formData.publicId}`, '_blank');
          }
        }, 1000);
      }).catch(() => {
        showPopupMessage('Error creating preview. Please try again.');
      });
    }
  };

  const handleAIGeneration = () => {
    if (!formData.title.trim()) {
      setMessage('Please enter a form title first');
      return;
    }
    setShowAIModal(true);
  };

  const handleQuestionsGenerated = (generatedQuestions) => {
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, ...generatedQuestions]
    }));
    setMessage('AI questions generated successfully!');
  };

  const shuffleQuestions = () => {
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions].sort(() => Math.random() - 0.5)
    }));
    setMessage('Questions shuffled successfully!');
  };

  const showPopupMessage = (message) => {
    setPopupMessage(message);
    setShowPopup(true);
    setTimeout(() => {
      setShowPopup(false);
      setPopupMessage('');
    }, 3000);
  };
  
  // Placeholder for removed duplicate functions
  // The name upload feature handlers are now defined earlier in the file

  const renderQuestion = (question, index) => {
    // Check if this is the name question and if it's locked
    const isNameQuestion = question.id === 'name_q' || (question.metadata && question.metadata.source === 'name_upload');
    const isLocked = isNameQuestion && nameUpload.locked;
    
    return (
      <div key={question.id} className={`question-card ${isNameQuestion ? 'name-question' : ''} ${isLocked ? 'locked-question' : ''}`}>
        <div className="question-header">
          <div className="question-number">
            {isNameQuestion ? (
              <span>
                Question {index + 1} - Name Question 
                {isLocked && (
                  <span className="locked-indicator" title="This question is locked because responses exist">
                    🔒
                  </span>
                )}
              </span>
            ) : (
              <span>Question {index + 1}</span>
            )}
          </div>
          <div className="question-actions">
            <button
              onClick={() => duplicateQuestion(question.id)}
              className="action-btn"
              title="Duplicate"
              disabled={isLocked}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={() => deleteQuestion(question.id)}
              className="action-btn delete"
              title={isLocked ? "Cannot delete - responses exist" : "Delete"}
              disabled={isLocked}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        <div className="question-content">
          <div className="question-type-selector">
            <select
              value={question.type}
              onChange={e => updateQuestion(question.id, 'type', e.target.value)}
              className="type-select"
            >
              <option value="short-answer">Short Answer</option>
              <option value="paragraph">Paragraph</option>
              <option value="multiple-choice">Multiple Choice</option>
              <option value="checkboxes">Checkboxes</option>
              <option value="dropdown">Dropdown</option>
              <option value="linear-scale">Linear Scale</option>
              <option value="date">Date</option>
              <option value="time">Time</option>
            </select>
          </div>
          <div className="question-input">
            <input
              type="text"
              placeholder="Enter your question"
              value={question.questionText}
              onChange={e => updateQuestion(question.id, 'questionText', e.target.value)}
              className="question-text-input"
              disabled={isLocked}
            />
          </div>
          {(question.type === 'multiple-choice' || question.type === 'checkboxes' || question.type === 'dropdown') && (
            <div className="options-container">
              <div className="options-header">
                <span className="options-label">
                  {question.type === 'multiple-choice' ? 'Options' : question.type === 'checkboxes' ? 'Checkbox options' : 'Dropdown options'}
                  {isLocked && <span className="locked-text"> (Locked - responses exist)</span>}
                </span>
                <button
                  onClick={() => addOption(question.id)}
                  className="add-option-btn"
                  disabled={isLocked}
                >
                  Add Option
                </button>
              </div>
              {question.options.map((option, optionIndex) => (
                <div key={`${question.id}-option-${optionIndex}`} className="option-row">
                  <div className="option-input-container">
                    <div className="option-icon">
                      {question.type === 'multiple-choice' ? (
                        <div className="radio-icon"></div>
                      ) : question.type === 'checkboxes' ? (
                        <div className="checkbox-icon"></div>
                      ) : (
                        <div className="radio-icon"></div>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder={`Option ${optionIndex + 1}`}
                      value={option}
                      onChange={e => updateOption(question.id, optionIndex, e.target.value)}
                      className="option-input"
                      disabled={isLocked}
                    />
                  </div>
                  {question.options.length > 1 && (
                    <button
                      onClick={() => removeOption(question.id, optionIndex)}
                      className="remove-option-btn"
                      disabled={isLocked}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {question.type === 'linear-scale' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '1rem 0' }}>
              <span>Scale from</span>
              <input
                type="number"
                min={1}
                max={question.max || 10}
                value={question.min || 1}
                onChange={e => updateQuestion(question.id, 'min', parseInt(e.target.value) || 1)}
                style={{ width: 60, padding: 4, borderRadius: 4, border: '1px solid #d1d5db' }}
              />
              <span>to</span>
              <input
                type="number"
                min={question.min || 1}
                max={10}
                value={question.max || 5}
                onChange={e => updateQuestion(question.id, 'max', parseInt(e.target.value) || 5)}
                style={{ width: 60, padding: 4, borderRadius: 4, border: '1px solid #d1d5db' }}
              />
            </div>
          )}
          {/* Date and Time types need no extra options */}
          <div className="question-footer">
            <label className="required-checkbox">
              <input
                type="checkbox"
                checked={question.required}
                onChange={e => updateQuestion(question.id, 'required', e.target.checked)}
                disabled={isLocked}
              />
              <span>Required</span>
              {isLocked && <span className="locked-text"> (Locked)</span>}
            </label>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="form-builder-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="form-builder-container" style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Add style tag for custom placeholder styles */}
      <style>{formInputStyles}</style>
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
              {formId && formId !== 'new' ? 'Edit Form' : 'Create New Form'}
            </h1>
            {formData.title && (
              <div style={{ 
                fontWeight: '600', 
                fontSize: '1.3rem', 
                marginTop: '0.5rem',
                color: 'rgba(255, 255, 255, 0.9)',
                textShadow: '0 1px 4px rgba(0, 0, 0, 0.1)'
              }}>
                {formData.title}
              </div>
            )}
            {formData.description && (
              <p className="gforms-header-desc" style={{ 
                marginTop: '0.5rem',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '1rem',
                fontWeight: '400',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
              }}>
                {formData.description}
              </p>
            )}
          </div>
        </div>
      </div>
      {/* Back to Dashboard bar below the banner (match Settings style) */}
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
      <div className="form-builder-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', background: '#f5f5f5', padding: '1rem 2rem', marginBottom: '1rem', gap: '1rem' }}>
        <button
          className="btn-secondary"
          style={{ 
            borderRadius: 12, 
            fontWeight: 600, 
            fontSize: 14, 
            padding: '0.75rem 1.5rem',
            background: '#e9ecef',
            border: '1px solid #ced4da',
            color: '#495057',
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}
          onClick={() => navigate('/google-form-import')}
          onMouseEnter={(e) => {
            e.target.style.background = '#dee2e6';
            e.target.style.transform = 'translateY(-1px)';
            e.target.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = '#e9ecef';
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.05)';
          }}
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Create from Google Form
        </button>
        <button
          className="btn-secondary"
          style={{ 
            borderRadius: 12, 
            fontWeight: 600, 
            fontSize: 14, 
            padding: '0.75rem 1.5rem',
            background: '#e9ecef',
            border: '1px solid #ced4da',
            color: '#495057',
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}
          onClick={handlePreview}
          onMouseEnter={(e) => {
            e.target.style.background = '#dee2e6';
            e.target.style.transform = 'translateY(-1px)';
            e.target.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = '#e9ecef';
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.05)';
          }}
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Preview Form
        </button>
      </div>

      <div className="form-builder-content" style={{ display: 'flex', gap: '2rem', maxWidth: '1400px', margin: '0 auto', padding: '0 2rem', justifyContent: 'center' }}>
        {/* Left Side - Manual Question Creation */}
        <div style={{ flex: '1', minWidth: 0 }}>
          <div className="form-settings">
            <div className="form-title-section">
              <input
                type="text"
                placeholder="Untitled form"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="form-title-input"
                style={{ color: '#111827' }}
              />
              <textarea
                placeholder="Form description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="form-description-input"
                style={{ color: '#6b7280', fontSize: '0.875rem' }}
                rows="3"
              />
            </div>

            <div className="form-date-section">
              <label className="date-label">Creation Date:</label>
              <input
                type="date"
                value={formData.createdAt}
                onChange={(e) => setFormData(prev => ({ ...prev, createdAt: e.target.value }))}
                className="date-input"
              />
            </div>
            {/* Form Settings Section */}
            <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f9fafb', borderRadius: 8, border: '1px solid #ede7f6' }}>
              <h3 style={{ margin: 0, fontWeight: 600, color: 'var(--gforms-purple)', marginBottom: 12 }}>Form Settings</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <label style={{ fontWeight: 500 }}>Accepting responses:</label>
                <input
                  type="checkbox"
                  checked={settings.acceptingResponses}
                  onChange={e => setSettings(s => ({ ...s, acceptingResponses: e.target.checked }))}
                  style={{ width: 20, height: 20, accentColor: 'var(--gforms-purple)' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <label style={{ fontWeight: 500 }}>Start date:</label>
                <input
                  type="date"
                  value={settings.startDate}
                  onChange={e => setSettings(s => ({ ...s, startDate: e.target.value }))}
                  className="date-input"
                />
                <label style={{ fontWeight: 500 }}>End date:</label>
                <input
                  type="date"
                  value={settings.endDate}
                  onChange={e => setSettings(s => ({ ...s, endDate: e.target.value }))}
                  className="date-input"
                />
              </div>
              <div style={{ marginBottom: 0 }}>
                <label style={{ fontWeight: 500, display: 'block', marginBottom: 4 }}>Confirmation message:</label>
                <input
                  type="text"
                  value={settings.confirmationMessage}
                  onChange={e => setSettings(s => ({ ...s, confirmationMessage: e.target.value }))}
                  className="form-title-input"
                  style={{ fontSize: 15 }}
                />
              </div>
            </div>
            
            {/* Name Upload Section */}
            <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f9fafb', borderRadius: 8, border: '1px solid #ede7f6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontWeight: 600, color: 'var(--gforms-purple)' }}>Name Upload (Optional)</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ fontWeight: 500 }}>Enable:</label>
                  <input
                    type="checkbox"
                    checked={nameUpload.enabled}
                    onChange={handleNameUploadToggle}
                    disabled={nameUpload.locked}
                    style={{ width: 20, height: 20, accentColor: 'var(--gforms-purple)' }}
                  />
                </div>
              </div>
              
              {nameUpload.locked && (
                <div style={{ 
                  padding: '0.75rem', 
                  background: 'rgba(255, 193, 7, 0.1)', 
                  border: '1px solid rgba(255, 193, 7, 0.3)', 
                  borderRadius: 6, 
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#f59e0b">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span style={{ color: '#92400e', fontSize: '0.9rem' }}>
                    This feature is locked because responses have already been generated.
                  </span>
                </div>
              )}
              
              {nameUpload.enabled && (
                <div style={{ opacity: nameUpload.locked ? 0.7 : 1 }}>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                      <button
                        onClick={() => handleInputMethodChange('manual')}
                        style={{
                          padding: '0.5rem 1rem',
                          background: nameUpload.inputMethod === 'manual' ? 'var(--gforms-purple)' : '#e9ecef',
                          color: nameUpload.inputMethod === 'manual' ? 'white' : '#495057',
                          border: '1px solid ' + (nameUpload.inputMethod === 'manual' ? 'var(--gforms-purple)' : '#ced4da'),
                          borderRadius: 6,
                          fontWeight: 500,
                          cursor: nameUpload.locked ? 'not-allowed' : 'pointer'
                        }}
                        disabled={nameUpload.locked}
                      >
                        Manual Entry
                      </button>
                      <button
                        onClick={() => handleInputMethodChange('csv')}
                        style={{
                          padding: '0.5rem 1rem',
                          background: nameUpload.inputMethod === 'csv' ? 'var(--gforms-purple)' : '#e9ecef',
                          color: nameUpload.inputMethod === 'csv' ? 'white' : '#495057',
                          border: '1px solid ' + (nameUpload.inputMethod === 'csv' ? 'var(--gforms-purple)' : '#ced4da'),
                          borderRadius: 6,
                          fontWeight: 500,
                          cursor: nameUpload.locked ? 'not-allowed' : 'pointer'
                        }}
                        disabled={nameUpload.locked}
                      >
                        CSV Upload
                      </button>
                    </div>
                    
                    {nameUpload.inputMethod === 'manual' ? (
                      <div>
                        <label style={{ fontWeight: 500, display: 'block', marginBottom: 8 }}>
                          Enter one name per line:
                        </label>
                        <textarea
                          value={nameUpload.manualInput}
                          onChange={handleManualInputChange}
                          disabled={nameUpload.locked}
                          placeholder="John Smith\nJane Doe\nAlex Johnson"
                          style={{
                            width: '100%',
                            minHeight: '120px',
                            padding: '0.75rem',
                            borderRadius: 6,
                            border: '1px solid #ced4da',
                            resize: 'vertical'
                          }}
                        />
                      </div>
                    ) : (
                      <div>
                        <label style={{ fontWeight: 500, display: 'block', marginBottom: 8 }}>
                          Upload CSV file (single column of names):
                        </label>
                        <input
                          type="file"
                          accept=".csv,text/csv"
                          onChange={handleCsvUpload}
                          disabled={nameUpload.locked}
                          style={{
                            display: 'block',
                            width: '100%',
                            padding: '0.5rem 0'
                          }}
                        />
                        {nameUpload.names.length > 0 && (
                          <div style={{ marginTop: 8, fontSize: '0.9rem', color: '#4b5563' }}>
                            {nameUpload.names.length} names loaded
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      {nameUpload.message && (
                        <div style={{
                          fontSize: '0.9rem',
                          color: nameUpload.message.includes('Error') ? '#dc2626' : '#059669',
                          fontWeight: 500
                        }}>
                          {nameUpload.message}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={saveNameUpload}
                      disabled={nameUpload.isSaving || nameUpload.locked}
                      style={{
                        padding: '0.5rem 1.5rem',
                        background: 'var(--gforms-purple)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        fontWeight: 600,
                        cursor: nameUpload.locked ? 'not-allowed' : 'pointer',
                        opacity: nameUpload.isSaving || nameUpload.locked ? 0.7 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}
                    >
                      {nameUpload.isSaving ? (
                        <>
                          <div style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                          Saving...
                        </>
                      ) : 'Save Names'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="questions-section">
            <div className="questions-header">
              <h2 className="questions-title">Manual Question Creation</h2>
              <div className="add-question-buttons">
                {formData.questions.length > 1 && (
                  <button
                    onClick={shuffleQuestions}
                    className="add-question-btn shuffle"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Shuffle
                  </button>
                )}
                <button
                  onClick={() => addQuestion('short-answer')}
                  className="add-question-btn"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Short Answer
                </button>
                <button
                  onClick={() => addQuestion('paragraph')}
                  className="add-question-btn"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Paragraph
                </button>
                <button
                  onClick={() => addQuestion('multiple-choice')}
                  className="add-question-btn"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Multiple Choice
                </button>
                <button
                  onClick={() => addQuestion('checkboxes')}
                  className="add-question-btn"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Checkboxes
                </button>
              </div>
            </div>

            <div className="questions-list">
              {formData.questions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3>No questions yet</h3>
                  <p>Click the buttons above to add your first question</p>
                </div>
              ) : (
                formData.questions.map((question, index) => renderQuestion(question, index))
              )}
            </div>
          </div>
        </div>

        {/* Right Side - AI Generation */}
        <div style={{ flex: '0.5', minWidth: 0, display: 'flex', justifyContent: 'center' }}>
          <div className="ai-generation-panel" style={{
            borderRadius: '16px',
            padding: '2rem 1.5rem',
            color: 'white',
            height: 'fit-content',
            position: 'sticky',
            top: '2rem',
            maxWidth: '500px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}>
            {/* Form Title Input at the Top */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.8rem', 
                fontWeight: '800', 
                fontSize: '1.1rem',
                textShadow: '0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.4), 0 2px 4px rgba(0, 0, 0, 0.4)',
                letterSpacing: '0.6px',
                background: 'linear-gradient(135deg, #ffffff 0%, #f0f8ff 50%, #ffffff 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textTransform: 'uppercase',
                textAlign: 'center',
                position: 'relative',
                zIndex: 1,
                animation: 'glow 2s ease-in-out infinite alternate'
              }}>
                ✨ Form Title
              </label>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center',
                padding: '0 0.5rem'
              }}>
                <input
                  type="text"
                  placeholder="Enter form title..."
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  style={{
                    width: '100%',
                    maxWidth: '280px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '12px',
                    padding: '0.8rem 1rem',
                    color: 'white',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    fontWeight: '500',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    backdropFilter: 'blur(10px)',
                    textAlign: 'center'
                  }}
                  onFocus={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.25)';
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                    e.target.style.transform = 'scale(1.02)';
                    e.target.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                  }}
                />
              </div>
              <style>
                {`
                  input::placeholder {
                    color: rgba(255, 255, 255, 0.7);
                    font-style: italic;
                  }
                `}
              </style>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div className="lightbulb-icon" style={{
                width: '60px',
                height: '60px',
                background: 'radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.8rem',
                backdropFilter: 'blur(15px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                position: 'relative',
                zIndex: 1
              }}>
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h2 style={{ 
                margin: 0, 
                fontSize: '1.6rem', 
                fontWeight: '900',
                textShadow: '0 0 25px rgba(255, 255, 255, 0.8), 0 0 50px rgba(255, 255, 255, 0.4), 0 3px 6px rgba(0, 0, 0, 0.4)',
                letterSpacing: '0.8px',
                background: 'linear-gradient(135deg, #ffffff 0%, #e6f3ff 50%, #ffffff 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textTransform: 'uppercase',
                position: 'relative',
                zIndex: 1,
                animation: 'glow 2.5s ease-in-out infinite alternate'
              }}>
                🚀 AI Generation
              </h2>
              <p style={{ 
                margin: '0.6rem 0 0', 
                opacity: 0.95, 
                fontSize: '1.05rem',
                fontWeight: '600',
                textShadow: '0 0 15px rgba(255, 255, 255, 0.6), 0 2px 4px rgba(0, 0, 0, 0.3)',
                letterSpacing: '0.3px',
                fontStyle: 'italic',
                position: 'relative',
                zIndex: 1
              }}>
                Smart question creation
              </p>
            </div>

            <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
              <div style={{ marginBottom: '0.6rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.6rem', 
                  fontWeight: '800', 
                  fontSize: '1.1rem',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.4)',
                  letterSpacing: '0.6px',
                  background: 'linear-gradient(135deg, #ffffff 0%, #fffacd 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textTransform: 'uppercase',
                  textAlign: 'center'
                }}>
                  ⚡ Quick Generate
                </label>
                <div style={{ display: 'grid', gap: '0.4rem' }}>
                  <button
                    onClick={() => {
                      if (!formData.title.trim()) {
                        // Show popup message if no title is entered
                        showPopupMessage('Please enter a form title first');
                        return;
                      }
                      setShowAIModal(true);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%)',
                      border: '2px solid rgba(255, 255, 255, 0.4)',
                      borderRadius: '10px',
                      padding: '0.7rem',
                      color: 'white',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                                          fontSize: '1.1rem',
                    fontWeight: '700',
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                    letterSpacing: '0.5px',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
                    onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
                  >
                    <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Generate Questions
                  </button>
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%)',
                padding: '0.8rem',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
              }}>
                <h4 style={{ 
                  margin: '0 0 0.6rem', 
                  fontSize: '1rem', 
                  fontWeight: '800',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.4)',
                  letterSpacing: '0.5px',
                  background: 'linear-gradient(135deg, #ffffff 0%, #e6f3ff 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textTransform: 'uppercase'
                }}>
                  🎯 AI Features:
                </h4>
                <ul style={{ 
                  margin: 0, 
                  paddingLeft: '0.8rem', 
                  fontSize: '0.95rem', 
                  opacity: 0.95,
                  fontWeight: '600',
                  lineHeight: '1.6',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
                }}>
                  <li style={{ marginBottom: '0.3rem' }}>✨ Smart question generation</li>
                  <li style={{ marginBottom: '0.3rem' }}>🎨 Multiple question types</li>
                  <li style={{ marginBottom: '0.3rem' }}>⚙️ Customizable distribution</li>
                  <li style={{ marginBottom: '0.3rem' }}>🏆 Professional questions</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="save-form-btn"
        >
          {isSaving ? (
            <>
              <div className="loading-spinner-small"></div>
              Saving...
            </>
          ) : (
            'Save Form'
          )}
        </button>
        <button
          type="button"
          onClick={handleSaveAsTemplate}
          className="btn-secondary"
          style={{ marginLeft: 16 }}
        >
          Save as Template
        </button>
      </div>

      {message && (
        <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}
      {templateMsg && (
        <div className="message success">{templateMsg}</div>
      )}

      <AIGenerationModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onQuestionsGenerated={handleQuestionsGenerated}
        formTitle={formData.title}
      />

      {/* Popup Message */}
      {showPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            padding: '0',
            borderRadius: '24px',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            textAlign: 'center',
            maxWidth: '450px',
            width: '90%',
            animation: 'popupSlideIn 0.4s ease-out',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {/* Decorative background elements */}
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '100px',
              height: '100px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              backdropFilter: 'blur(10px)'
            }}></div>
            <div style={{
              position: 'absolute',
              bottom: '-30px',
              left: '-30px',
              width: '60px',
              height: '60px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '50%',
              backdropFilter: 'blur(10px)'
            }}></div>

            {/* Header section */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '2rem 2rem 1.5rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
              position: 'relative'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                backdropFilter: 'blur(15px)',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
              }}>
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 style={{ 
                margin: '0 0 0.5rem', 
                fontSize: '1.5rem', 
                fontWeight: '700',
                background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}>
                Form Title Required
              </h3>
              <p style={{ 
                margin: 0, 
                fontSize: '1.1rem', 
                opacity: 0.9,
                fontWeight: '400'
              }}>
                {popupMessage}
              </p>
            </div>

            {/* Content section */}
            <div style={{
              padding: '2rem',
              background: 'rgba(255, 255, 255, 0.05)'
            }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '1.5rem',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                marginBottom: '1.5rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span style={{ fontWeight: '500', fontSize: '0.95rem' }}>
                    Quick Tip
                  </span>
                </div>
                <p style={{ 
                  margin: 0, 
                  fontSize: '0.9rem', 
                  opacity: 0.8,
                  lineHeight: '1.4'
                }}>
                  Enter a descriptive title for your form to help AI generate more relevant and contextual questions.
                </p>
              </div>

              <button
                onClick={() => setShowPopup(false)}
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%)',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '12px',
                  padding: '1rem 2rem',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                  minWidth: '120px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.25) 100%)';
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%)';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
                }}
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormBuilder;