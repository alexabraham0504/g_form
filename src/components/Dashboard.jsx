import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserForms } from '../services/firestore';
import { createForm } from '../services/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalForms: 0,
    totalQuestions: 0,
    recentActivity: 0
  });
  const [loading, setLoading] = useState(true);
  const [showTemplates, setShowTemplates] = useState(false);
  const [customTemplates, setCustomTemplates] = useState([]);
  const [hasApiKey, setHasApiKey] = useState(false);
  const templates = [
    {
      name: 'Feedback Form',
      questions: [
        { type: 'short-answer', questionText: 'Name', required: false },
        { type: 'short-answer', questionText: 'Email', required: false },
        { type: 'linear-scale', questionText: 'How would you rate your experience?', min: 1, max: 5, required: true },
        { type: 'paragraph', questionText: 'Additional comments', required: false }
      ],
      description: 'Collect feedback and ratings.'
    },
    {
      name: 'Event RSVP',
      questions: [
        { type: 'short-answer', questionText: 'Name', required: true },
        { type: 'multiple-choice', questionText: 'Will you attend?', options: ['Yes', 'No', 'Maybe'], required: true },
        { type: 'short-answer', questionText: 'Number of guests', required: false },
        { type: 'paragraph', questionText: 'Comments', required: false }
      ],
      description: 'RSVP for events.'
    },
    {
      name: 'Quiz',
      questions: [
        { type: 'multiple-choice', questionText: 'What is 2 + 2?', options: ['3', '4', '5'], required: true },
        { type: 'short-answer', questionText: 'Explain your answer', required: false }
      ],
      description: 'Sample quiz template.'
    }
  ];

  // Debug: Log user state
  useEffect(() => {
    console.log('Dashboard component - User:', user);
  }, [user]);

  // Load user statistics and check API key
  useEffect(() => {
    if (user) {
      loadUserStats();
      checkApiKey();
    }
  }, [user]);
  
  // Check if user has API key
  const checkApiKey = async () => {
    try {
      const userSettingsRef = doc(db, 'users', user.uid, 'settings', 'gemini');
      const docSnap = await getDoc(userSettingsRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setHasApiKey(!!data.apiKey);
      } else {
        setHasApiKey(false);
      }
    } catch (error) {
      console.error('Error checking API key:', error);
      setHasApiKey(false);
    }
  };

  useEffect(() => {
    setCustomTemplates(JSON.parse(localStorage.getItem('gforms_custom_templates') || '[]'));
  }, [showTemplates]);

  const loadUserStats = async () => {
    try {
      setLoading(true);
      const forms = await getUserForms(user.uid);
      
      const totalQuestions = forms.reduce((total, form) => {
        return total + (form.questions ? form.questions.length : 0);
      }, 0);

      const recentActivity = forms.filter(form => {
        const formDate = form.createdAt?.toDate ? form.createdAt.toDate() : new Date(form.createdAt);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return formDate > weekAgo;
      }).length;

      setStats({
        totalForms: forms.length,
        totalQuestions,
        recentActivity
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFromTemplate = async (template) => {
    try {
      // Create a sanitized version of the template with default values for any potentially undefined fields
      const sanitizedQuestions = template.questions.map(q => {
        // Create a base question with default values
        const sanitizedQuestion = {
          type: q.type || 'short-answer',
          questionText: q.questionText || 'Untitled Question',
          required: q.required !== undefined ? q.required : false,
          options: Array.isArray(q.options) ? [...q.options] : []
        };
        
        // Add min/max only for linear-scale questions
        if (q.type === 'linear-scale') {
          sanitizedQuestion.min = q.min !== undefined ? q.min : 1;
          sanitizedQuestion.max = q.max !== undefined ? q.max : 5;
        }
        
        return sanitizedQuestion;
      });
      
      const formData = {
        title: template.name || 'Untitled Form',
        description: template.description || '',
        createdAt: new Date(),
        questions: sanitizedQuestions,
        settings: {
          acceptingResponses: true,
          confirmationMessage: 'Your response has been recorded.',
          startDate: null,
          endDate: null
        }
      };
      
      const newForm = await createForm(user.uid, formData);
      navigate(`/form-builder/${newForm.id}`);
    } catch (err) {
      console.error('Error creating form from template:', err);
      alert('Failed to create form from template.');
    }
  };

  const dashboardOptions = [
    {
      id: 'google-form',
      title: 'Create from Google Form',
      description: 'Quickly import and create a form directly from an existing Google Form',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      color: 'purple'
    },
    {
      id: 'create',
      title: 'Create New Form',
      description: 'Start building a new form from scratch',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      color: 'blue'
    },
    {
      id: 'view',
      title: 'View My Forms',
      description: 'See and manage your existing forms',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'green'
    },
    {
      id: 'scrape',
      title: 'Scrape Form',
      description: 'Scrape and auto-fill existing Forms with AI',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      ),
      color: 'yellow'
    },
    {
      id: 'settings',
      title: hasApiKey ? 'Go to Settings' : 'Add Gemini API Key',
      description: hasApiKey ? 'Manage your API key and settings' : 'Set up Gemini API for AI features',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: 'purple'
    }
  ];

  const handleOptionClick = (optionId) => {
    switch (optionId) {
      case 'google-form':
        navigate('/google-form-import');
        break;
      case 'create':
        navigate('/form-builder/new');
        break;
      case 'view':
        navigate('/forms');
        break;
      case 'scrape':
        navigate('/auto-fill');
        break;
      case 'settings':
        navigate('/settings');
        break;
      default:
        console.log(`Clicked: ${optionId}`);
    }
  };

  const templateThumbnails = [
    // Placeholder images or SVGs for each template
    'https://www.gstatic.com/images/icons/material/system/2x/add_box_purple600_48dp.png', // Blank
    'https://www.gstatic.com/classroom/templates/contact_info.png', // Contact
    'https://www.gstatic.com/classroom/templates/rsvp.png', // RSVP
    'https://www.gstatic.com/classroom/templates/party_invite.png', // Party
    'https://www.gstatic.com/classroom/templates/tshirt_signup.png', // T-Shirt
    'https://www.gstatic.com/classroom/templates/event_registration.png', // Event
  ];
  const templateGallery = [
    { name: 'Blank form', icon: (
      <svg width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#ede7f6"/><g><rect x="21" y="11" width="6" height="26" rx="3" fill="#673ab7"/><rect x="11" y="21" width="26" height="6" rx="3" fill="#673ab7"/></g></svg>
    ), onClick: () => navigate('/form-builder/new') },
    { name: 'Contact Information', icon: (
      <svg width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#ede7f6"/><rect x="12" y="16" width="24" height="4" rx="2" fill="#b39ddb"/><rect x="12" y="24" width="24" height="4" rx="2" fill="#b39ddb"/><rect x="12" y="32" width="16" height="4" rx="2" fill="#b39ddb"/></svg>
    ), onClick: () => handleCreateFromTemplate(templates[0]) },
    { name: 'RSVP', icon: (
      <svg width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#ede7f6"/><circle cx="24" cy="24" r="10" fill="#b39ddb"/><rect x="20" y="20" width="8" height="8" rx="2" fill="#fff"/></svg>
    ), onClick: () => handleCreateFromTemplate(templates[1]) },
    { name: 'Party Invite', icon: (
      <svg width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="12" fill="#ede7f6"/><ellipse cx="24" cy="32" rx="10" ry="4" fill="#b39ddb"/><rect x="18" y="12" width="12" height="12" rx="6" fill="#fff"/></svg>
    ), onClick: () => handleCreateFromTemplate(templates[2]) },
  ];

  // If no user, show loading or redirect
  if (!user) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-content">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <h2>Loading...</h2>
            <p>Please wait while we check your authentication status.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="gforms-header" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '2.5rem 2.5rem',
        borderRadius: '0 0 24px 24px',
        boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: '2rem',
        marginTop: '1rem',
        textAlign: 'center'
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
        <h1 className="gforms-header-title" style={{
          color: 'white',
          fontSize: '2.5rem',
          fontWeight: '900',
          margin: 0,
          textShadow: '0 3px 12px rgba(0, 0, 0, 0.3)',
          letterSpacing: '-0.5px',
          lineHeight: '1.2',
          textAlign: 'center'
        }}>Dashboard</h1>
        <h2 style={{
          color: 'white',
          fontSize: '1.5rem',
          fontWeight: '600',
          margin: '1rem 0 0.5rem',
          textShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          textAlign: 'center'
        }}>Welcome, <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>{user?.displayName || user?.email}</span>!</h2>
        <p className="gforms-header-desc" style={{ 
          marginTop: '0.5rem',
          color: 'rgba(255, 255, 255, 0.8)',
          fontSize: '1.1rem',
          textShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
          maxWidth: '600px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>Create, manage, and share your forms with ease</p>
        {showTemplates && (
          <div style={{ background: '#fff', border: '1px solid #ede7f6', borderRadius: 8, marginTop: 16, padding: 16, maxWidth: 400, marginLeft: 'auto', marginRight: 'auto', boxShadow: '0 2px 8px #0001' }}>
            <h3 style={{ margin: 0, marginBottom: 12, color: 'var(--gforms-purple)' }}>Choose a template</h3>
            {templates.map((tpl, i) => (
              <div key={i} style={{ marginBottom: 16, paddingBottom: 12, borderBottom: i < templates.length - 1 || customTemplates.length > 0 ? '1px solid #f3f4f6' : 'none' }}>
                <div style={{ fontWeight: 600 }}>{tpl.name}</div>
                <div style={{ color: '#6b7280', fontSize: 14, marginBottom: 6 }}>{tpl.description}</div>
                <button
                  className="btn-primary"
                  style={{ fontSize: 14, padding: '0.5rem 1.5rem' }}
                  onClick={() => handleCreateFromTemplate(tpl)}
                >
                  Use this template
                </button>
              </div>
            ))}
            {customTemplates.length > 0 && <h4 style={{ margin: '12px 0 8px 0', color: '#673ab7', fontSize: 15 }}>Your Templates</h4>}
            {customTemplates.map((tpl, i) => (
              <div key={i} style={{ marginBottom: 16, paddingBottom: 12, borderBottom: i < customTemplates.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                <div style={{ fontWeight: 600 }}>{tpl.name}</div>
                <div style={{ color: '#6b7280', fontSize: 14, marginBottom: 6 }}>{tpl.description}</div>
                <button
                  className="btn-primary"
                  style={{ fontSize: 14, padding: '0.5rem 1.5rem' }}
                  onClick={() => handleCreateFromTemplate({ ...tpl, ...tpl.settings })}
                >
                  Use this template
                </button>
              </div>
            ))}
            <button
              className="btn-secondary"
              style={{ width: '100%' }}
              onClick={() => setShowTemplates(false)}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
      <div className="dashboard-content">
        <style>
          {`
          .option-icon.purple {
            background-color: rgba(103, 58, 183, 0.1);
            color: #673ab7;
          }
          `}
        </style>
        {/* Template Gallery */}
        <div style={{ marginBottom: 32, marginTop: 32, background: 'none', boxShadow: 'none', border: 'none', padding: 0 }}>
          <h3 style={{ fontWeight: 600, fontSize: 18, margin: '0 0 12px 8px', color: '#673ab7', background: 'none', textAlign: 'center' }}>Start a new form</h3>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 32,
            padding: '8px 0 8px 0',
            marginBottom: 16,
            background: 'none',
            boxShadow: 'none',
            border: 'none',
          }}>
            {templateGallery.map((tpl, i) => (
              <div
                key={i}
                style={{
                  minWidth: 140,
                  maxWidth: 160,
                  background: '#fff',
                  borderRadius: 12,
                  boxShadow: '0 1.5px 6px #673ab71a',
                  border: '2px solid #ede7f6',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: 12,
                  transition: 'box-shadow 0.2s, border 0.2s',
                }}
                onClick={tpl.onClick}
                tabIndex={0}
                aria-label={`Use template: ${tpl.name}`}
                onKeyDown={e => { if (e.key === 'Enter') tpl.onClick(); }}
              >
                <div style={{ marginBottom: 8 }}>{tpl.icon}</div>
                <span style={{ fontWeight: 500, fontSize: 15, color: '#673ab7', textAlign: 'center' }}>{tpl.name}</span>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginBottom: 24, background: 'none' }}>
            <button
              className="btn-primary"
              style={{ 
                fontSize: 16, 
                borderRadius: 999, 
                padding: '0.75rem 2.5rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                color: 'white',
                fontWeight: '700',
                boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                transition: 'all 0.3s ease',
                letterSpacing: '0.5px'
              }}
              onClick={() => setShowTemplates(t => !t)}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                e.target.style.background = 'linear-gradient(135deg, #5a6fd9 0%, #6a3f9c 100%)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
                e.target.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
              }}
            >
              Start from Template
            </button>
          </div>
        </div>
        {/* Dashboard Options */}

        {/* Dashboard Options */}
        <div className="dashboard-grid">
          {dashboardOptions.map((option) => (
            <div
              key={option.id}
              onClick={() => handleOptionClick(option.id)}
              className="dashboard-option"
            >
              <div className="option-content">
                <div className={`option-icon ${option.color}`}>
                  {option.icon}
                </div>
                <div className="option-text">
                  <h3 className="option-title">
                    {option.title}
                  </h3>
                  <p className="option-description">
                    {option.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="stats-section">
          <h2 className="stats-title">
            Quick Overview
          </h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-content">
                <div className="stat-icon blue">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="stat-info">
                  <p className="stat-label">Total Forms</p>
                  <p className="stat-value">
                    {loading ? '...' : stats.totalForms}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-content">
                <div className="stat-icon green">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="stat-info">
                  <p className="stat-label">Total Questions</p>
                  <p className="stat-value">
                    {loading ? '...' : stats.totalQuestions}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="stat-content">
                <div className="stat-icon yellow">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="stat-info">
                  <p className="stat-label">Recent Activity</p>
                  <p className="stat-value">
                    {loading ? '...' : stats.recentActivity}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;