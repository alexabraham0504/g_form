import { useAuth } from '../contexts/AuthContext';
import { useSidebar } from '../contexts/SidebarContext';
import { useNavigate, useLocation } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { sidebarOpen, toggleSidebar, closeSidebar } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();


  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleNavigation = (path) => {
    navigate(path);
    closeSidebar();
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="navbar" style={{ position: 'sticky', top: 0, zIndex: 100, background: '#fff', borderBottom: '1.5px solid #ede7f6', boxShadow: '0 1.5px 6px #673ab71a', minHeight: 64 }}>
      <div className="navbar-container" style={{ maxWidth: 1400, margin: '0 auto', padding: '0 2rem', display: 'flex', alignItems: 'center', height: 64 }}>
        {/* Hamburger menu */}
        <button
          aria-label="Open menu"
          style={{ background: 'none', border: 'none', marginRight: 16, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          onClick={toggleSidebar}
        >
          <svg width="28" height="28" fill="#673ab7" viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18" stroke="#673ab7" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
        {/* Logo */}
        <div className="logo-container" style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 32 }}>
          <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="40" height="40" rx="12" fill="#673ab7"/>
            <rect x="8" y="8" width="24" height="24" rx="4" fill="#fff"/>
            <rect x="12" y="12" width="16" height="3" rx="1.5" fill="#b39ddb"/>
            <rect x="12" y="18" width="16" height="3" rx="1.5" fill="#b39ddb"/>
            <rect x="12" y="24" width="10" height="3" rx="1.5" fill="#b39ddb"/>
            <circle cx="28" cy="25.5" r="1.5" fill="#b39ddb"/>
          </svg>
          <span className="logo-text" style={{ fontWeight: 700, fontSize: 22, color: '#673ab7', letterSpacing: -1 }}>Forms</span>
        </div>
        {/* Center space */}
        <div style={{ flex: 1 }}></div>
        {/* User Info and Avatar - right aligned */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginLeft: 'auto' }}>
          {user && (
            <>
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="user-avatar"
                  style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid #ede7f6', objectFit: 'cover' }}
                />
              ) : (
                <div className="user-avatar" style={{ width: 40, height: 40, borderRadius: '50%', background: '#ede7f6', color: '#673ab7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 }}>
                  <span>
                    {user.displayName?.charAt(0) || user.email?.charAt(0)}
                  </span>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="btn-secondary"
                style={{ borderRadius: 999, fontWeight: 500, fontSize: 15, padding: '0.5rem 1.5rem' }}
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sidebar Menu */}
      {sidebarOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.02)',
          zIndex: 1000,
          display: 'flex',
          backdropFilter: 'blur(0.5px)'
        }}>
          <div style={{
            width: '280px',
            height: '100%',
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
            backdropFilter: 'blur(10px)',
            borderRight: '1px solid rgba(103, 58, 183, 0.2)',
            boxShadow: '0 15px 35px -8px rgba(103, 58, 183, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            padding: '1.5rem 0',
            animation: 'slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Glass effect overlay */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, rgba(103, 58, 183, 0.05) 0%, rgba(156, 39, 176, 0.05) 100%)',
              pointerEvents: 'none'
            }}></div>
            {/* Sidebar Header */}
            <div style={{
              padding: '0 1.25rem 1rem',
              borderBottom: '1px solid rgba(103, 58, 183, 0.1)',
              marginBottom: '0.75rem',
              position: 'relative'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: '0.75rem'
              }}>
                <div style={{
                  width: 40,
                  height: 40,
                  background: 'linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 25px rgba(103, 58, 183, 0.3)',
                  position: 'relative'
                }}>
                  <svg width="24" height="24" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="8" y="8" width="24" height="24" rx="4" fill="#fff"/>
                    <rect x="12" y="12" width="16" height="3" rx="1.5" fill="#b39ddb"/>
                    <rect x="12" y="18" width="16" height="3" rx="1.5" fill="#b39ddb"/>
                    <rect x="12" y="24" width="10" height="3" rx="1.5" fill="#b39ddb"/>
                    <circle cx="28" cy="25.5" r="1.5" fill="#b39ddb"/>
                  </svg>
                </div>
                <span style={{ 
                  fontWeight: 800, 
                  fontSize: 22, 
                  background: 'linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.5px'
                }}>Forms</span>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '0.5rem',
                background: 'linear-gradient(135deg, rgba(103, 58, 183, 0.08) 0%, rgba(156, 39, 176, 0.08) 100%)',
                borderRadius: '12px',
                border: '1px solid rgba(103, 58, 183, 0.1)'
              }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  color: 'white',
                  fontSize: 16,
                  boxShadow: '0 4px 15px rgba(103, 58, 183, 0.3)'
                }}>
                  {user?.displayName?.charAt(0) || user?.email?.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#333', fontSize: 14 }}>
                    {user?.displayName || user?.email}
                  </div>
                  <div style={{ color: '#666', fontSize: 12, marginTop: 2 }}>
                    Active User
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Menu */}
            <div style={{ padding: '0 1rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#673ab7',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  margin: '0 0 0.5rem 0.5rem',
                  opacity: 0.8
                }}>
                  Navigation
                </h3>
                
                {/* Dashboard */}
                <button
                  onClick={() => handleNavigation('/')}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: isActive('/') 
                      ? 'linear-gradient(135deg, rgba(103, 58, 183, 0.15) 0%, rgba(156, 39, 176, 0.15) 100%)' 
                      : 'transparent',
                    border: isActive('/') ? '1px solid rgba(103, 58, 183, 0.2)' : '1px solid transparent',
                    borderRadius: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    color: isActive('/') ? '#673ab7' : '#555',
                    fontWeight: isActive('/') ? 700 : 500,
                    fontSize: 15,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    marginBottom: '0.25rem',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive('/')) {
                      e.target.style.background = 'linear-gradient(135deg, rgba(103, 58, 183, 0.08) 0%, rgba(156, 39, 176, 0.08) 100%)';
                      e.target.style.transform = 'translateX(4px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive('/')) {
                      e.target.style.background = 'transparent';
                      e.target.style.transform = 'translateX(0)';
                    }
                  }}
                >
                  <div style={{
                    width: 24,
                    height: 24,
                    background: isActive('/') 
                      ? 'linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)' 
                      : 'rgba(103, 58, 183, 0.1)',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease'
                  }}>
                    <svg width="16" height="16" fill="none" stroke={isActive('/') ? 'white' : '#673ab7'} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
                    </svg>
                  </div>
                  Dashboard
                </button>

                {/* Forms List */}
                <button
                  onClick={() => handleNavigation('/forms')}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: isActive('/forms') 
                      ? 'linear-gradient(135deg, rgba(103, 58, 183, 0.15) 0%, rgba(156, 39, 176, 0.15) 100%)' 
                      : 'transparent',
                    border: isActive('/forms') ? '1px solid rgba(103, 58, 183, 0.2)' : '1px solid transparent',
                    borderRadius: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    color: isActive('/forms') ? '#673ab7' : '#555',
                    fontWeight: isActive('/forms') ? 700 : 500,
                    fontSize: 15,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    marginBottom: '0.25rem',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive('/forms')) {
                      e.target.style.background = 'linear-gradient(135deg, rgba(103, 58, 183, 0.08) 0%, rgba(156, 39, 176, 0.08) 100%)';
                      e.target.style.transform = 'translateX(4px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive('/forms')) {
                      e.target.style.background = 'transparent';
                      e.target.style.transform = 'translateX(0)';
                    }
                  }}
                >
                  <div style={{
                    width: 24,
                    height: 24,
                    background: isActive('/forms') 
                      ? 'linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)' 
                      : 'rgba(103, 58, 183, 0.1)',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease'
                  }}>
                    <svg width="16" height="16" fill="none" stroke={isActive('/forms') ? 'white' : '#673ab7'} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  My Forms
                </button>

                {/* Create New Form */}
                <button
                  onClick={() => handleNavigation('/form-builder/new')}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: isActive('/form-builder/new') 
                      ? 'linear-gradient(135deg, rgba(103, 58, 183, 0.15) 0%, rgba(156, 39, 176, 0.15) 100%)' 
                      : 'transparent',
                    border: isActive('/form-builder/new') ? '1px solid rgba(103, 58, 183, 0.2)' : '1px solid transparent',
                    borderRadius: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    color: isActive('/form-builder/new') ? '#673ab7' : '#555',
                    fontWeight: isActive('/form-builder/new') ? 700 : 500,
                    fontSize: 15,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    marginBottom: '0.25rem',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive('/form-builder/new')) {
                      e.target.style.background = 'linear-gradient(135deg, rgba(103, 58, 183, 0.08) 0%, rgba(156, 39, 176, 0.08) 100%)';
                      e.target.style.transform = 'translateX(4px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive('/form-builder/new')) {
                      e.target.style.background = 'transparent';
                      e.target.style.transform = 'translateX(0)';
                    }
                  }}
                >
                  <div style={{
                    width: 24,
                    height: 24,
                    background: isActive('/form-builder/new') 
                      ? 'linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)' 
                      : 'rgba(103, 58, 183, 0.1)',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease'
                  }}>
                    <svg width="16" height="16" fill="none" stroke={isActive('/form-builder/new') ? 'white' : '#673ab7'} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  Create New Form
                </button>

                {/* Auto Fill */}
                <button
                  onClick={() => handleNavigation('/auto-fill')}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: isActive('/auto-fill') 
                      ? 'linear-gradient(135deg, rgba(103, 58, 183, 0.15) 0%, rgba(156, 39, 176, 0.15) 100%)' 
                      : 'transparent',
                    border: isActive('/auto-fill') ? '1px solid rgba(103, 58, 183, 0.2)' : '1px solid transparent',
                    borderRadius: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    color: isActive('/auto-fill') ? '#673ab7' : '#555',
                    fontWeight: isActive('/auto-fill') ? 700 : 500,
                    fontSize: 15,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    marginBottom: '0.25rem',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive('/auto-fill')) {
                      e.target.style.background = 'linear-gradient(135deg, rgba(103, 58, 183, 0.08) 0%, rgba(156, 39, 176, 0.08) 100%)';
                      e.target.style.transform = 'translateX(4px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive('/auto-fill')) {
                      e.target.style.background = 'transparent';
                      e.target.style.transform = 'translateX(0)';
                    }
                  }}
                >
                  <div style={{
                    width: 24,
                    height: 24,
                    background: isActive('/auto-fill') 
                      ? 'linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)' 
                      : 'rgba(103, 58, 183, 0.1)',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease'
                  }}>
                    <svg width="16" height="16" fill="none" stroke={isActive('/auto-fill') ? 'white' : '#673ab7'} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  Autofill Form
                </button>
                
                {/* Settings */}
                <button
                  onClick={() => handleNavigation('/settings')}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: isActive('/settings') 
                      ? 'linear-gradient(135deg, rgba(103, 58, 183, 0.15) 0%, rgba(156, 39, 176, 0.15) 100%)' 
                      : 'transparent',
                    border: isActive('/settings') ? '1px solid rgba(103, 58, 183, 0.2)' : '1px solid transparent',
                    borderRadius: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    color: isActive('/settings') ? '#673ab7' : '#555',
                    fontWeight: isActive('/settings') ? 700 : 500,
                    fontSize: 15,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    marginBottom: '0.25rem',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive('/settings')) {
                      e.target.style.background = 'linear-gradient(135deg, rgba(103, 58, 183, 0.08) 0%, rgba(156, 39, 176, 0.08) 100%)';
                      e.target.style.transform = 'translateX(4px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive('/settings')) {
                      e.target.style.background = 'transparent';
                      e.target.style.transform = 'translateX(0)';
                    }
                  }}
                >
                  <div style={{
                    width: 24,
                    height: 24,
                    background: isActive('/settings') 
                      ? 'linear-gradient(135deg, #673ab7 0%, #9c27b0 100%)' 
                      : 'rgba(103, 58, 183, 0.1)',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease'
                  }}>
                    <svg width="16" height="16" fill="none" stroke={isActive('/settings') ? 'white' : '#673ab7'} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  Settings
                </button>
              </div>

              {/* Account Section */}
              <div style={{ marginTop: '1rem' }}>
                <h3 style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#673ab7',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  margin: '0 0 0.5rem 0.5rem',
                  opacity: 0.8
                }}>
                  Account
                </h3>
                
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'transparent',
                    border: '1px solid rgba(220, 38, 38, 0.2)',
                    borderRadius: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    color: '#dc2626',
                    fontWeight: 600,
                    fontSize: 15,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'linear-gradient(135deg, rgba(220, 38, 38, 0.08) 0%, rgba(239, 68, 68, 0.08) 100%)';
                    e.target.style.transform = 'translateX(4px)';
                    e.target.style.borderColor = 'rgba(220, 38, 38, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent';
                    e.target.style.transform = 'translateX(0)';
                    e.target.style.borderColor = 'rgba(220, 38, 38, 0.2)';
                  }}
                >
                  <div style={{
                    width: 24,
                    height: 24,
                    background: 'rgba(220, 38, 38, 0.1)',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease'
                  }}>
                    <svg width="16" height="16" fill="none" stroke="#dc2626" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Overlay to close sidebar */}
          <div
            style={{
              flex: 1,
              height: '100%'
            }}
            onClick={closeSidebar}
          />
        </div>
      )}
    </nav>
  );
};

export default Navbar;