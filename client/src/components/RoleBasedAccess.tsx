import React from 'react';
import { useAuth, usePermissions } from '@/hooks/useAuth';

interface RoleBasedAccessProps {
  /**
   * Array of role names that are allowed to access this component
   */
  allowedRoles?: string[];
  /**
   * Array of required permissions to access this component
   */
  requiredPermissions?: string[];
  /**
   * Whether all roles/permissions are required (AND logic) or any role/permission is sufficient (OR logic)
   * Defaults to 'any' (OR logic)
   */
  requirementType?: 'all' | 'any';
  /**
   * Content to render if user has the required role/permission
   */
  children: React.ReactNode;
  /**
   * Optional fallback content to render if user doesn't have the required role/permission
   */
  fallback?: React.ReactNode;
}

/**
 * Component for restricting access to UI elements based on user roles and permissions
 * Use this to conditionally render parts of the UI based on user access rights
 */
export default function RoleBasedAccess({
  allowedRoles = [],
  requiredPermissions = [],
  requirementType = 'any',
  children,
  fallback = null,
}: RoleBasedAccessProps) {
  const { hasAnyRole, hasAllRoles } = useAuth();
  const { hasAnyPermission, hasAllPermissions } = usePermissions();
  
  // Don't render anything if no access requirements are specified
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

  // Render children if user has access, otherwise render fallback
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}
