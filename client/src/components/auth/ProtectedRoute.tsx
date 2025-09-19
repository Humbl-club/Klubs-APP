import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { useOrganization } from '../../contexts/OrganizationContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
  requireAuth?: boolean;
  requireOrganization?: boolean;
  requireFeature?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAdmin = false,
  requireSuperAdmin = false,
  requireAuth = true,
  requireOrganization = true,
  requireFeature
}) => {
  const { user, loading, isAdmin, isSuperAdmin } = useAuth();
  const { currentOrganization, loading: orgLoading, isFeatureEnabled } = useOrganization();

  if (loading || (requireOrganization && orgLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="glass-card max-w-sm mx-4 text-center p-6 border border-white/10">
          <div className="animate-spin w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full mx-auto mb-3"></div>
          <p className="text-sm font-medium">Loading your account...</p>
        </div>
      </div>
    );
  }

  if (requireAuth && !user) {
    return <Navigate to="/auth" replace />;
  }

  if (requireOrganization && !currentOrganization && user) {
    // If user needs an organization but doesn't have one, redirect to create one
    return <Navigate to="/organization/new" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireFeature && currentOrganization && !isFeatureEnabled(requireFeature)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
