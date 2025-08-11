import { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithPopup, 
  signInWithRedirect, 
  signOut, 
  onAuthStateChanged,
  getRedirectResult,
  browserPopupRedirectResolver
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // First, check for redirect result
        console.log('Checking for redirect result...');
        const result = await getRedirectResult(auth);
        
        if (result) {
          console.log('Redirect result found:', result.user);
          setUser(result.user);
        } else {
          console.log('No redirect result found');
        }

        // Then set up auth state listener
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          console.log('Auth state changed:', user ? user.email : 'No user');
          setUser(user);
          setLoading(false);
        });

        return unsubscribe;
      } catch (error) {
        console.error('Error initializing auth:', error);
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const signInWithGoogle = async () => {
    try {
      console.log('Starting Google sign-in with popup...');
      
      // Try popup first
      try {
        const result = await signInWithPopup(auth, googleProvider);
        console.log('Popup sign-in successful:', result.user);
        return result.user;
      } catch (popupError) {
        console.log('Popup failed, trying redirect:', popupError);
        
        // Check if it's a domain authorization error
        if (popupError.code === 'auth/unauthorized-domain') {
          const currentDomain = window.location.hostname;
          console.error(`Domain authorization error. Current domain: ${currentDomain}`);
          console.error('Please add this domain to Firebase Console:');
          console.error('1. Go to Firebase Console > Authentication > Settings');
          console.error('2. Add the following domains to "Authorized domains":');
          console.error(`   - ${currentDomain}`);
          console.error('   - localhost (for development)');
          
          throw new Error(`Domain not authorized. Please add "${currentDomain}" to Firebase Console > Authentication > Settings > Authorized domains.`);
        }
        
        // If popup fails for other reasons, try redirect
        await signInWithRedirect(auth, googleProvider);
        console.log('Redirect initiated');
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      console.log('User logged out');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signInWithGoogle,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 