import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase/config';

const Login = () => {
  const { signInWithGoogle, user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Debug: Log authentication state
  useEffect(() => {
    console.log('Login component - User state:', user);
    console.log('Login component - Loading state:', loading);
  }, [user, loading]);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError('');
      console.log('Login: Starting Google sign-in...');
      await signInWithGoogle();
      console.log('Login: Sign-in initiated');
    } catch (error) {
      console.error('Login: Error signing in:', error);
      setError('Failed to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const testAuthState = () => {
    console.log('Current auth state:', auth.currentUser);
    console.log('Auth is ready:', !auth.config);
  };

  return (
    <div className="welcome-container" style={{ 
      background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)', 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '2rem 1rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background decorative elements */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        right: '-10%',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(103, 58, 183, 0.08) 0%, rgba(118, 75, 162, 0.05) 50%, transparent 70%)',
        borderRadius: '50%',
        backdropFilter: 'blur(20px)'
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '-15%',
        left: '-15%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(102, 126, 234, 0.06) 0%, rgba(118, 75, 162, 0.04) 50%, transparent 70%)',
        borderRadius: '50%',
        backdropFilter: 'blur(20px)'
      }}></div>
      
      {/* Hero Section */}
      <div className="welcome-hero" style={{ 
        textAlign: 'center', 
        marginBottom: '3rem',
        position: 'relative',
        zIndex: 2
      }}>
        {/* App Logo with enhanced glow */}
        <div style={{ 
          width: 120, 
          height: 120, 
          borderRadius: '50%', 
          background: 'linear-gradient(135deg, #673ab7 0%, #764ba2 100%)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          margin: '0 auto 2rem',
          boxShadow: '0 20px 60px rgba(103, 58, 183, 0.3), 0 0 0 1px rgba(103, 58, 183, 0.2), inset 0 1px 0 rgba(255,255,255,0.8)',
          position: 'relative'
        }}>
          <svg width="60" height="60" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="40" rx="12" fill="#ffffff"/>
            <rect x="8" y="8" width="24" height="24" rx="4" fill="#ede7f6"/>
            <rect x="12" y="12" width="16" height="3" rx="1.5" fill="#b39ddb"/>
            <rect x="12" y="18" width="16" height="3" rx="1.5" fill="#b39ddb"/>
            <rect x="12" y="24" width="10" height="3" rx="1.5" fill="#b39ddb"/>
            <circle cx="28" cy="25.5" r="1.5" fill="#b39ddb"/>
          </svg>
          {/* Glow effect */}
          <div style={{
            position: 'absolute',
            inset: '-20px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(103, 58, 183, 0.3) 0%, rgba(103, 58, 183, 0.1) 50%, transparent 70%)',
            animation: 'pulse 3s ease-in-out infinite'
          }}></div>
        </div>
        
        <h1 style={{ 
          fontSize: '3.5rem', 
          fontWeight: '900', 
          color: '#1a1a1a', 
          margin: '0 0 1rem',
          textShadow: '0 2px 8px rgba(0,0,0,0.1)',
          letterSpacing: '-2px',
          lineHeight: 1.1,
          fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif"
        }}>
          Welcome to <span style={{ 
            color: '#673ab7',
            textShadow: '0 2px 4px rgba(103,58,183,0.3)',
            fontWeight: '900',
            display: 'inline-block',
            position: 'relative',
            zIndex: 1
          }}>Forms</span>
        </h1>
        
        <p style={{ 
          fontSize: '1.4rem', 
          color: '#4a4a4a', 
          margin: '0 0 2rem',
          maxWidth: '600px',
          lineHeight: 1.6,
          textShadow: '0 1px 2px rgba(0,0,0,0.05)',
          fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif",
          fontWeight: '400'
        }}>
          The ultimate platform for creating, managing, and analyzing professional forms with AI-powered intelligence
        </p>
      </div>

      {/* Features Grid */}
      <div className="features-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '2rem',
        maxWidth: '1200px',
        width: '100%',
        marginBottom: '3rem',
        position: 'relative',
        zIndex: 2
      }}>
        {/* Feature Card 1 */}
        <div style={{
          background: 'rgba(255,255,255,0.98)',
          borderRadius: '20px',
          padding: '2rem',
          textAlign: 'center',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(103, 58, 183, 0.1)',
          boxShadow: '0 20px 40px rgba(103, 58, 183, 0.08), 0 8px 16px rgba(0,0,0,0.06)',
          transition: 'all 0.3s ease',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'translateY(-8px) scale(1.02)';
          e.target.style.boxShadow = '0 30px 60px rgba(103, 58, 183, 0.12), 0 12px 24px rgba(0,0,0,0.08)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'translateY(0) scale(1)';
          e.target.style.boxShadow = '0 20px 40px rgba(103, 58, 183, 0.08), 0 8px 16px rgba(0,0,0,0.06)';
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)',
            position: 'relative',
            overflow: 'visible'
          }}>
            {/* Glow effect for icon 1 */}
            <div style={{
              position: 'absolute',
              inset: '-15px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(102, 126, 234, 0.3) 0%, rgba(102, 126, 234, 0.1) 50%, transparent 70%)',
              animation: 'iconGlow1 3s ease-in-out infinite',
              pointerEvents: 'none'
            }}></div>
            <svg width="30" height="30" fill="white" viewBox="0 0 24 24" style={{
              filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.6))',
              animation: 'iconPulse1 2s ease-in-out infinite'
            }}>
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
          </div>
          <h3 style={{ 
            fontSize: '1.3rem', 
            fontWeight: '700', 
            color: '#1a1a1a', 
            margin: '0 0 1rem',
            fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif",
            letterSpacing: '-0.5px'
          }}>
            AI-Powered Generation
          </h3>
          <p style={{ 
            color: '#555', 
            lineHeight: '1.6', 
            margin: 0,
            fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif",
            fontSize: '0.95rem'
          }}>
            Create intelligent forms with AI-generated questions tailored to your needs. Save hours of manual work.
          </p>
        </div>

        {/* Feature Card 2 */}
        <div style={{
          background: 'rgba(255,255,255,0.98)',
          borderRadius: '20px',
          padding: '2rem',
          textAlign: 'center',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(16, 185, 129, 0.1)',
          boxShadow: '0 20px 40px rgba(16, 185, 129, 0.08), 0 8px 16px rgba(0,0,0,0.06)',
          transition: 'all 0.3s ease',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'translateY(-8px) scale(1.02)';
          e.target.style.boxShadow = '0 30px 60px rgba(16, 185, 129, 0.12), 0 12px 24px rgba(0,0,0,0.08)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'translateY(0) scale(1)';
          e.target.style.boxShadow = '0 20px 40px rgba(16, 185, 129, 0.08), 0 8px 16px rgba(0,0,0,0.06)';
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            boxShadow: '0 8px 25px rgba(16, 185, 129, 0.4)',
            position: 'relative',
            overflow: 'visible'
          }}>
            {/* Glow effect for icon 2 */}
            <div style={{
              position: 'absolute',
              inset: '-15px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, rgba(16, 185, 129, 0.1) 50%, transparent 70%)',
              animation: 'iconGlow2 3s ease-in-out infinite',
              pointerEvents: 'none'
            }}></div>
            <svg width="30" height="30" fill="white" viewBox="0 0 24 24" style={{
              filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.6))',
              animation: 'iconPulse2 2s ease-in-out infinite'
            }}>
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h3 style={{ 
            fontSize: '1.3rem', 
            fontWeight: '700', 
            color: '#1a1a1a', 
            margin: '0 0 1rem',
            fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif",
            letterSpacing: '-0.5px'
          }}>
            Smart Analytics
          </h3>
          <p style={{ 
            color: '#555', 
            lineHeight: '1.6', 
            margin: 0,
            fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif",
            fontSize: '0.95rem'
          }}>
            Get detailed insights into form responses with real-time analytics and visual data representation.
          </p>
        </div>

        {/* Feature Card 3 */}
        <div style={{
          background: 'rgba(255,255,255,0.98)',
          borderRadius: '20px',
          padding: '2rem',
          textAlign: 'center',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(245, 158, 11, 0.1)',
          boxShadow: '0 20px 40px rgba(245, 158, 11, 0.08), 0 8px 16px rgba(0,0,0,0.06)',
          transition: 'all 0.3s ease',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'translateY(-8px) scale(1.02)';
          e.target.style.boxShadow = '0 30px 60px rgba(245, 158, 11, 0.12), 0 12px 24px rgba(0,0,0,0.08)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'translateY(0) scale(1)';
          e.target.style.boxShadow = '0 20px 40px rgba(245, 158, 11, 0.08), 0 8px 16px rgba(0,0,0,0.06)';
        }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem',
            boxShadow: '0 8px 25px rgba(245, 158, 11, 0.4)',
            position: 'relative',
            overflow: 'visible'
          }}>
            {/* Glow effect for icon 3 */}
            <div style={{
              position: 'absolute',
              inset: '-15px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(245, 158, 11, 0.3) 0%, rgba(245, 158, 11, 0.1) 50%, transparent 70%)',
              animation: 'iconGlow3 3s ease-in-out infinite',
              pointerEvents: 'none'
            }}></div>
            <svg width="30" height="30" fill="white" viewBox="0 0 24 24" style={{
              filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.6))',
              animation: 'iconPulse3 2s ease-in-out infinite'
            }}>
              <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <h3 style={{ 
            fontSize: '1.3rem', 
            fontWeight: '700', 
            color: '#1a1a1a', 
            margin: '0 0 1rem',
            fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif",
            letterSpacing: '-0.5px'
          }}>
            Lightning Fast
          </h3>
          <p style={{ 
            color: '#555', 
            lineHeight: '1.6', 
            margin: 0,
            fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif",
            fontSize: '0.95rem'
          }}>
            Build and deploy forms in seconds with our intuitive drag-and-drop interface and pre-built templates.
          </p>
        </div>
      </div>

      {/* Stats Section */}
      <div className="stats-section" style={{
        background: 'rgba(103, 58, 183, 0.05)',
        borderRadius: '20px',
        padding: '2rem',
        marginBottom: '3rem',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(103, 58, 183, 0.1)',
        position: 'relative',
        zIndex: 2
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '2rem',
          textAlign: 'center'
        }}>
          <div>
            <div style={{ 
              fontSize: '2.5rem', 
              fontWeight: '900', 
              color: '#673ab7', 
              marginBottom: '0.5rem',
              fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif"
            }}>10K+</div>
            <div style={{ 
              color: '#555', 
              fontSize: '0.9rem',
              fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif",
              fontWeight: '500'
            }}>Forms Created</div>
          </div>
          <div>
            <div style={{ 
              fontSize: '2.5rem', 
              fontWeight: '900', 
              color: '#673ab7', 
              marginBottom: '0.5rem',
              fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif"
            }}>50K+</div>
            <div style={{ 
              color: '#555', 
              fontSize: '0.9rem',
              fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif",
              fontWeight: '500'
            }}>Responses Collected</div>
          </div>
          <div>
            <div style={{ 
              fontSize: '2.5rem', 
              fontWeight: '900', 
              color: '#673ab7', 
              marginBottom: '0.5rem',
              fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif"
            }}>99.9%</div>
            <div style={{ 
              color: '#555', 
              fontSize: '0.9rem',
              fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif",
              fontWeight: '500'
            }}>Uptime</div>
          </div>
          <div>
            <div style={{ 
              fontSize: '2.5rem', 
              fontWeight: '900', 
              color: '#673ab7', 
              marginBottom: '0.5rem',
              fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif"
            }}>24/7</div>
            <div style={{ 
              color: '#555', 
              fontSize: '0.9rem',
              fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif",
              fontWeight: '500'
            }}>Support</div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="cta-section" style={{
        textAlign: 'center',
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        <h2 style={{ 
          fontSize: '2rem', 
          fontWeight: '700', 
          color: '#1a1a1a', 
          margin: '0 0 1.5rem',
          textShadow: '0 1px 3px rgba(0,0,0,0.1)',
          fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif",
          letterSpacing: '-0.5px'
        }}>
          Ready to Get Started?
        </h2>
        <p style={{ 
          color: '#555', 
          fontSize: '1.1rem', 
          margin: '0 0 2rem',
          maxWidth: '500px',
          textAlign: 'center',
          fontFamily: "'Inter', 'Segoe UI', 'Roboto', sans-serif",
          lineHeight: '1.6'
        }}>
          Join thousands of users who trust Forms for their data collection needs
        </p>
        
        {/* Enhanced Google Sign-in Button - Perfectly Centered */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          marginBottom: '2rem'
        }}>
          <button
            onClick={handleGoogleSignIn}
            className="google-signin-glass"
            disabled={isLoading}
            style={{
              borderRadius: '999px',
              fontWeight: '600',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              padding: '1.2rem 2.5rem',
              opacity: isLoading ? 0.7 : 1,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.3)',
              border: '2px solid rgba(255,255,255,0.4)',
              background: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)',
              color: '#333',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              transform: 'scale(1)',
              position: 'relative',
              overflow: 'hidden',
              minWidth: '280px',
              maxWidth: '400px'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.target.style.transform = 'scale(1.05) translateY(-2px)';
                e.target.style.boxShadow = '0 25px 50px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.5)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1) translateY(0)';
              e.target.style.boxShadow = '0 20px 40px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.3)';
            }}
          >
            {isLoading ? (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '1.2rem',
                  height: '1.2rem',
                  border: '2px solid #e0e0e0',
                  borderTop: '2px solid #4285F4',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginRight: '0.5rem'
                }}></div>
                Signing in...
              </div>
            ) : (
              <>
                <span className="g-icon-bling" style={{ marginRight: 8 }} aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.34 0 6.05 1.44 7.9 2.65l5.76-5.76C33.84 3 29.2 1.5 24 1.5 14.62 1.5 6.5 6.88 2.9 14.62l6.9 5.35C11.3 14.38 17.1 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.5 24.5c0-1.59-.14-3.09-.41-4.5H24v8.53h12.7c-.55 2.98-2.2 5.5-4.7 7.2l7.18 5.57C43.74 37.8 46.5 31.7 46.5 24.5z"/>
                    <path fill="#FBBC05" d="M9.8 28.77a14.5 14.5 0 0 1-.78-4.27c0-1.49.26-2.93.73-4.27l-6.9-5.35C1.67 17.77.9 21.05.9 24.5c0 3.41.77 6.66 2.15 9.54l6.75-5.27z"/>
                    <path fill="#34A853" d="M24 47.5c5.88 0 10.82-1.94 14.39-5.28l-7.18-5.57c-2.02 1.38-4.61 2.21-7.21 2.21-6.9 0-12.7-4.88-14.2-11.2l-6.75 5.27C6.5 41.12 14.62 47.5 24 47.5z"/>
                  </svg>
                </span>
                Sign in with Google
              </>
            )}
          </button>
        </div>

        {error && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '1rem', 
            backgroundColor: 'rgba(220, 38, 38, 0.1)', 
            border: '1px solid rgba(220, 38, 38, 0.3)', 
            borderRadius: '12px', 
            color: '#dc2626', 
            fontSize: '15px', 
            maxWidth: '400px',
            margin: '0 auto',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="welcome-footer" style={{
        marginTop: '3rem',
        textAlign: 'center',
        position: 'relative',
        zIndex: 2
      }}>
        <p style={{ 
          fontSize: '14px', 
          color: 'rgba(0,0,0,0.7)', 
          margin: 0, 
          lineHeight: 1.6 
        }}>
          By signing in, you agree to our{' '}
          <a href="#" style={{ 
            color: 'rgba(0,0,0,0.9)', 
            textDecoration: 'underline',
            fontWeight: '500'
          }}>Terms of Service</a>{' '}
          and{' '}
          <a href="#" style={{ 
            color: 'rgba(0,0,0,0.9)', 
            textDecoration: 'underline',
            fontWeight: '500'
          }}>Privacy Policy</a>
        </p>
      </div>

      {/* Add CSS animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { 
            opacity: 0.6; 
            transform: scale(1);
          }
          50% { 
            opacity: 1; 
            transform: scale(1.1);
          }
        }
        
        @keyframes float {
          0%, 100% { 
            transform: translateY(0px);
          }
          50% { 
            transform: translateY(-10px);
          }
        }
        
        .features-grid > div {
          animation: float 6s ease-in-out infinite;
        }
        
        .features-grid > div:nth-child(2) {
          animation-delay: 2s;
        }
        
        .features-grid > div:nth-child(3) {
          animation-delay: 4s;
        }

        @keyframes iconPulse1 {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }

        @keyframes iconGlow1 {
          0%, 100% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.1);
            opacity: 1;
          }
        }

        @keyframes iconPulse2 {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }

        @keyframes iconGlow2 {
          0%, 100% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.1);
            opacity: 1;
          }
        }

        @keyframes iconPulse3 {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }

        @keyframes iconGlow3 {
          0%, 100% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default Login; 