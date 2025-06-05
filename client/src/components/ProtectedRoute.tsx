import React from 'react';
import { Redirect } from 'wouter';
import { useAuth, usePermissions } from '@/hooks/useAuth';
import { LoadingState } from '@/components/ui/DataStateDisplay';

interface ProtectedRouteProps {
  /**
   * Roles allowed to access this route
   */
  allowedRoles?: string[];
  /**
   * Permissions required to access this route
   */
  requiredPermissions?: string[];
  /**
   * Whether to require all specified roles/permissions (AND) or any of them (OR)
   */
  requirementType?: 'all' | 'any';
  /**
   * Path to redirect to if user doesn't have access
   */
  redirectTo?: string;
  /**
   * Children components to render if access is granted
   */
  children: React.ReactNode;
}

/**
 * A component that protects routes based on user roles and permissions
 * Use this to wrap route components that should only be accessible to users with specific roles
 */
export default function ProtectedRoute({
  allowedRoles = [],
  requiredPermissions = [],
  requirementType = 'any',
  redirectTo = '/',
  children
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasAnyRole, hasAllRoles } = useAuth();
  const { hasAnyPermission, hasAllPermissions } = usePermissions();

  // Show loading state while checking authentication
  if (isLoading) {
    return <LoadingState message="Checking access permissions..." />;
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Redirect to={redirectTo} />;
  }

  // If no roles or permissions are specified, just check if the user is authenticated
  if (allowedRoles.length === 0 && requiredPermissions.length === 0) {
    return <>{children}</>;
  }

  // Check if the user has the required roles
  const hasRoles = requirementType === 'all'
    ? hasAllRoles(allowedRoles)
    : hasAnyRole(allowedRoles);

  // Check if the user has the required permissions
  const hasPermissions = requirementType === 'all'
    ? hasAllPermissions(requiredPermissions)
    : hasAnyPermission(requiredPermissions);

  // If either roles or permissions are empty, don't consider them in the access check
  const hasAccess = (
    (allowedRoles.length === 0 || hasRoles) &&
    (requiredPermissions.length === 0 || hasPermissions)
  );

  // If access is not granted, redirect to the specified path
  if (!hasAccess) {
    return <Redirect to={redirectTo} />;
  }

  // If access is granted, render the children
  return <>{children}</>;
}
