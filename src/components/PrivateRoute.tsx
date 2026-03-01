import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
  allowNewUser?: boolean;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, allowNewUser = false }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (currentUser.isNewUser && !allowNewUser) {
    return <Navigate to="/complete-profile" replace />;
  }

  if (!currentUser.isNewUser && allowNewUser) {
    // If user is NOT new but tries to access complete-profile (allowNewUser=true), redirect to home
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
