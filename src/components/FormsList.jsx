import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserForms, deleteForm, createForm, getForm } from '../services/firestore';

const FormsList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedLink, setCopiedLink] = useState('');

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      setLoading(true);
      const userForms = await getUserForms(user.uid);
      setForms(userForms);
    } catch (error) {
      console.error('Error loading forms:', error);
      setError('Failed to load forms');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteForm = async (formId) => {
    if (window.confirm('Are you sure you want to delete this form?')) {
      try {
        await deleteForm(user.uid, formId);
        setForms(forms.filter(form => form.id !== formId));
      } catch (error) {
        console.error('Error deleting form:', error);
        alert('Failed to delete form');
      }
    }
  };

  const handleDuplicateForm = async (formId) => {
    try {
      const original = await getForm(user.uid, formId);
      const copy = {
        ...original,
        title: `Copy of ${original.title || 'Untitled Form'}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        publicId: undefined, // Let backend generate a new publicId
      };
      delete copy.id;
      const newForm = await createForm(user.uid, copy);
      navigate(`/form-builder/${newForm.id}`);
    } catch (err) {
      alert('Failed to duplicate form.');
    }
  };

  const handleCopyPublicLink = (publicId) => {
    const publicUrl = `${window.location.origin}/public/${publicId}`;
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(publicId);
    setTimeout(() => setCopiedLink(''), 2000);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getQuestionCount = (questions) => {
    return questions ? questions.length : 0;
  };

  const getFormThumbnail = (form) => {
    // Placeholder: use a purple border and a simple SVG preview
    return (
      <div style={{
        width: 120,
        height: 80,
        background: '#f3e8fd',
        borderRadius: 8,
        border: '2.5px solid #673ab7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 12px auto',
      }}>
        <svg width="60" height="40" viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="0" width="60" height="40" rx="6" fill="#fff"/>
          <rect x="8" y="8" width="44" height="4" rx="2" fill="#b39ddb"/>
          <rect x="8" y="16" width="44" height="4" rx="2" fill="#b39ddb"/>
          <rect x="8" y="24" width="28" height="4" rx="2" fill="#b39ddb"/>
          <circle cx="48" cy="26" r="2" fill="#b39ddb"/>
        </svg>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="forms-list-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your forms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="forms-list-container">
      {/* Enhanced Header with Gradient */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '2rem 0',
        marginBottom: '2rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative background elements */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-20%',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%)',
          animation: 'pulse 4s ease-in-out infinite'
        }}></div>
        
        <div style={{
          position: 'absolute',
          top: '20%',
          right: '10%',
          width: '100px',
          height: '100px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          filter: 'blur(20px)'
        }}></div>
        
        <div style={{
          position: 'absolute',
          bottom: '10%',
          left: '15%',
          width: '80px',
          height: '80px',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '50%',
          filter: 'blur(15px)'
        }}></div>

        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 2rem',
          position: 'relative',
          zIndex: 1
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
            }}>
              <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="8" width="24" height="24" rx="4" fill="#fff"/>
                <rect x="12" y="12" width="16" height="3" rx="1.5" fill="#b39ddb"/>
                <rect x="12" y="18" width="16" height="3" rx="1.5" fill="#b39ddb"/>
                <rect x="12" y="24" width="10" height="3" rx="1.5" fill="#b39ddb"/>
                <circle cx="28" cy="25.5" r="1.5" fill="#b39ddb"/>
              </svg>
            </div>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: '800',
              color: 'white',
              margin: 0,
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
              letterSpacing: '-0.5px'
            }}>My Forms</h1>
          </div>
          <p style={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '1.1rem',
            margin: 0,
            fontWeight: '500'
          }}>Manage and organize all your forms in one place</p>
        </div>
      </div>

      {/* Enhanced Content Area */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 2rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <button
            onClick={() => navigate('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, rgba(103, 58, 183, 0.1) 0%, rgba(156, 39, 176, 0.1) 100%)',
              border: '1px solid rgba(103, 58, 183, 0.2)',
              borderRadius: '12px',
              color: '#673ab7',
              fontWeight: '600',
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(135deg, rgba(103, 58, 183, 0.15) 0%, rgba(156, 39, 176, 0.15) 100%)';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'linear-gradient(135deg, rgba(103, 58, 183, 0.1) 0%, rgba(156, 39, 176, 0.1) 100%)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, rgba(103, 58, 183, 0.08) 0%, rgba(156, 39, 176, 0.08) 100%)',
            borderRadius: '12px',
            border: '1px solid rgba(103, 58, 183, 0.1)'
          }}>
            <svg width="20" height="20" fill="none" stroke="#673ab7" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span style={{ color: '#673ab7', fontWeight: '600', fontSize: '1.1rem' }}>
              {forms.length} Form{forms.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="forms-list-content">
          {error && (
            <div className="message error">
              {error}
            </div>
          )}

          {forms.length === 0 ? (
            <div className="empty-forms-state">
              <div className="empty-icon">
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3>No forms yet</h3>
              <p>Create your first form to get started</p>
              <button
                onClick={() => navigate('/form-builder/new')}
                className="create-first-form-btn"
              >
                Create Your First Form
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '2rem',
              padding: '1rem 0'
            }}>
              {forms.map((form) => (
                <div key={form.id} style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)',
                  borderRadius: '20px',
                  border: '1px solid rgba(103, 58, 183, 0.1)',
                  boxShadow: '0 20px 40px rgba(103, 58, 183, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '280px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-8px)';
                  e.target.style.boxShadow = '0 25px 50px rgba(103, 58, 183, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.8)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 20px 40px rgba(103, 58, 183, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5)';
                }}
                >
                  {/* Enhanced Thumbnail */}
                  <div style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '2rem 1.5rem',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '-50%',
                      right: '-20%',
                      width: '100px',
                      height: '100px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '50%',
                      filter: 'blur(20px)'
                    }}></div>
                    
                    <div style={{
                      width: '80px',
                      height: '80px',
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%)',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 1rem auto',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
                    }}>
                      <svg width="40" height="40" viewBox="0 0 60 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="0" y="0" width="60" height="40" rx="6" fill="#fff"/>
                        <rect x="8" y="8" width="44" height="4" rx="2" fill="#b39ddb"/>
                        <rect x="8" y="16" width="44" height="4" rx="2" fill="#b39ddb"/>
                        <rect x="8" y="24" width="28" height="4" rx="2" fill="#b39ddb"/>
                        <circle cx="48" cy="26" r="2" fill="#b39ddb"/>
                      </svg>
                    </div>
                    
                    <h3 style={{
                      fontWeight: '700',
                      fontSize: '1.25rem',
                      color: 'white',
                      margin: 0,
                      textAlign: 'center',
                      textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                    }}>
                      {form.title || 'Untitled Form'}
                    </h3>
                  </div>

                  {/* Card Content */}
                  <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {form.description && (
                      <p style={{
                        fontSize: '0.95rem',
                        color: '#6b7280',
                        margin: '0 0 1rem 0',
                        lineHeight: '1.5',
                        flex: 1
                      }}>
                        {form.description}
                      </p>
                    )}
                    
                    <div style={{
                      display: 'flex',
                      gap: '1rem',
                      fontSize: '0.9rem',
                      color: '#888',
                      alignItems: 'center',
                      marginBottom: '1rem'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(103, 58, 183, 0.08)',
                        borderRadius: '8px',
                        border: '1px solid rgba(103, 58, 183, 0.1)'
                      }}>
                        <svg width="16" height="16" fill="#673ab7" viewBox="0 0 24 24">
                          <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zm0-13H5V6h14v1z"/>
                        </svg>
                        <span style={{ color: '#673ab7', fontWeight: '500' }}>
                          {form.createdAt?.toDate ? form.createdAt.toDate().toLocaleDateString() : ''}
                        </span>
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        background: 'rgba(103, 58, 183, 0.08)',
                        borderRadius: '8px',
                        border: '1px solid rgba(103, 58, 183, 0.1)'
                      }}>
                        <svg width="16" height="16" fill="#673ab7" viewBox="0 0 24 24">
                          <path d="M3 6v2h18V6H3zm0 5v2h18v-2H3zm0 5v2h18v-2H3z"/>
                        </svg>
                        <span style={{ color: '#673ab7', fontWeight: '500' }}>
                          {form.questions?.length || 0} Qs
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Footer */}
                  <div style={{
                    padding: '1.5rem',
                    background: 'linear-gradient(135deg, rgba(103, 58, 183, 0.05) 0%, rgba(156, 39, 176, 0.05) 100%)',
                    borderTop: '1px solid rgba(103, 58, 183, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => navigate(`/form-builder/${form.id}`)}
                        style={{
                          padding: '0.75rem 1.25rem',
                          background: 'linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)',
                          border: 'none',
                          borderRadius: '10px',
                          color: 'white',
                          fontWeight: '600',
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 4px 15px rgba(103, 58, 183, 0.3)',
                          flex: 1
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = '0 6px 20px rgba(103, 58, 183, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 4px 15px rgba(103, 58, 183, 0.3)';
                        }}
                      >
                        View Form
                      </button>
                      
                      <button
                        onClick={() => navigate(`/form-responses/${form.id}`)}
                        style={{
                          padding: '0.75rem 1.25rem',
                          background: 'rgba(103, 58, 183, 0.1)',
                          border: '1px solid rgba(103, 58, 183, 0.2)',
                          borderRadius: '10px',
                          color: '#673ab7',
                          fontWeight: '600',
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          flex: 1
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(103, 58, 183, 0.15)';
                          e.target.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'rgba(103, 58, 183, 0.1)';
                          e.target.style.transform = 'translateY(0)';
                        }}
                      >
                        Responses
                      </button>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleDuplicateForm(form.id)}
                        style={{
                          padding: '0.75rem 1.25rem',
                          background: 'rgba(103, 58, 183, 0.08)',
                          border: '1px solid rgba(103, 58, 183, 0.15)',
                          borderRadius: '10px',
                          color: '#673ab7',
                          fontWeight: '600',
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          flex: 1
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(103, 58, 183, 0.12)';
                          e.target.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'rgba(103, 58, 183, 0.08)';
                          e.target.style.transform = 'translateY(0)';
                        }}
                      >
                        Duplicate
                      </button>
                      
                      <button
                        onClick={() => handleDeleteForm(form.id)}
                        style={{
                          padding: '0.75rem 1.25rem',
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          borderRadius: '10px',
                          color: '#dc2626',
                          fontWeight: '600',
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          flex: 1
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'rgba(239, 68, 68, 0.12)';
                          e.target.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'rgba(239, 68, 68, 0.08)';
                          e.target.style.transform = 'translateY(0)';
                        }}
                      >
                        Delete
                      </button>
                      
                      {form.publicId && (
                        <button
                          onClick={() => handleCopyPublicLink(form.publicId)}
                          style={{
                            padding: '0.75rem 1.25rem',
                            background: 'rgba(103, 58, 183, 0.08)',
                            border: '1px solid rgba(103, 58, 183, 0.15)',
                            borderRadius: '10px',
                            color: '#673ab7',
                            fontWeight: '600',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            flex: 1
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(103, 58, 183, 0.12)';
                            e.target.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(103, 58, 183, 0.08)';
                            e.target.style.transform = 'translateY(0)';
                          }}
                        >
                          {copiedLink === form.publicId ? 'Copied!' : 'Get Link'}
                        </button>
                      )}
                    </div>
                    
                    {form.publicId && (
                      <div style={{
                        fontSize: '0.8rem',
                        color: '#666',
                        padding: '0.75rem',
                        background: 'rgba(255, 255, 255, 0.5)',
                        borderRadius: '8px',
                        border: '1px solid rgba(103, 58, 183, 0.1)'
                      }}>
                        <span style={{ fontWeight: '600', color: '#673ab7' }}>Public Link: </span>
                        <a
                          href={`/public/${form.publicId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: '#2563eb',
                            textDecoration: 'underline',
                            wordBreak: 'break-all'
                          }}
                        >
                          {window.location.origin}/public/{form.publicId}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormsList; 