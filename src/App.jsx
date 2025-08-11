import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SidebarProvider, useSidebar } from './contexts/SidebarContext';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import FormBuilder from './components/FormBuilder';
import FormsList from './components/FormsList';
import AutoFillForm from './components/AutoFillForm';
import PublicForm from './components/PublicForm';
import FormResponses from './components/FormResponses';
import OAuthCallback from './components/OAuthCallback';
import Settings from './components/Settings';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#f5f5f5', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{
          width: '3rem',
          height: '3rem',
          border: '2px solid #3b82f6',
          borderTop: '2px solid transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" />;
};

// Public Route Component (redirects to dashboard if already signed in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#f5f5f5', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{
          width: '3rem',
          height: '3rem',
          border: '2px solid #3b82f6',
          borderTop: '2px solid transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }
  
  return user ? <Navigate to="/" /> : children;
};

// Layout Component that moves content when sidebar opens
const PageLayout = ({ children }) => {
  const { sidebarOpen } = useSidebar();
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f5f5f5',
      position: 'relative'
    }}>
      <Navbar />
      <div style={{
        marginLeft: sidebarOpen ? '280px' : '0',
        transition: 'margin-left 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        width: sidebarOpen ? 'calc(100% - 280px)' : '100%'
      }}>
        {children}
      </div>
    </div>
  );
};

// Main App Layout
const AppLayout = () => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return (
    <PageLayout>
      <Dashboard />
    </PageLayout>
  );
};

// Form Builder Layout
const FormBuilderLayout = () => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return (
    <PageLayout>
      <FormBuilder />
    </PageLayout>
  );
};

// Forms List Layout
const FormsListLayout = () => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return (
    <PageLayout>
      <FormsList />
    </PageLayout>
  );
};

// Auto Fill Form Layout
const AutoFillFormLayout = () => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return (
    <PageLayout>
      <AutoFillForm />
    </PageLayout>
  );
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <SidebarProvider>
        <Router>
          <Routes>
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/form-builder/:formId" 
              element={
                <ProtectedRoute>
                  <FormBuilderLayout />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/forms" 
              element={
                <ProtectedRoute>
                  <FormsListLayout />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/auto-fill" 
              element={
                <ProtectedRoute>
                  <AutoFillFormLayout />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <PageLayout>
                    <Settings />
                  </PageLayout>
                </ProtectedRoute>
              } 
            />
            <Route path="/public/:publicId" element={<PublicForm />} />
            <Route 
              path="/form-responses/:formId" 
              element={
                <ProtectedRoute>
                  <PageLayout>
                    <FormResponses />
                  </PageLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/oauth-callback" element={<OAuthCallback />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </SidebarProvider>
    </AuthProvider>
  );
}

export default App;
