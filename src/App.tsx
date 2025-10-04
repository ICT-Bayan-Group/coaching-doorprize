import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import  AdminPage from './pages/AdminPage';
import DisplayPage from './pages/DisplayPage';
import LoginPage from './components/LoginPage';
import VipPage from './pages/VipPage';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const location = useLocation();

  useEffect(() => {
    // Check authentication status
    const authStatus = sessionStorage.getItem('bayan-run-authenticated');
    const authTime = sessionStorage.getItem('bayan-run-auth-time');
    const currentTime = Date.now();
    
    // Session expires after 8 hours (28800000 ms)
    const SESSION_DURATION = 8 * 60 * 60 * 1000;
    
    if (authStatus === 'true' && authTime) {
      const authTimestamp = parseInt(authTime);
      if (currentTime - authTimestamp < SESSION_DURATION) {
        setIsAuthenticated(true);
      } else {
        // Session expired
        sessionStorage.removeItem('bayan-run-authenticated');
        sessionStorage.removeItem('bayan-run-auth-time');
        setIsAuthenticated(false);
      }
    }
    
    setIsLoading(false);
  }, []);

  const handleLogin = (success: boolean) => {
    if (success) {
      setIsAuthenticated(true);
      sessionStorage.setItem('bayan-run-authenticated', 'true');
      sessionStorage.setItem('bayan-run-auth-time', Date.now().toString());
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('bayan-run-authenticated');
    sessionStorage.removeItem('bayan-run-auth-time');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Clone children and pass logout handler if it's AdminPage or VipPage
  if (React.isValidElement(children)) {
    const childProps = (location.pathname === '/' || location.pathname === '/admin' || location.pathname === '/vip')
      ? { onLogout: handleLogout } 
      : {};
    
    return React.cloneElement(children, childProps);
  }

  return <>{children}</>;
};

// Public Route Component (for DisplayPage)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Protected Admin Routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          } 
        />
        
        {/* Protected VIP Route */}
        <Route
          path="/vip"
          element={
            <PublicRoute>
              <VipPage />
            </PublicRoute>
          }
        />
        
        {/* Public Display Route */}
        <Route 
          path="/display" 
          element={
            <PublicRoute>
              <DisplayPage />
            </PublicRoute>
          } 
        />
        
        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;