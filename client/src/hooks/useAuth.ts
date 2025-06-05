import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

type User = {
  roles?: string[];
  permissions?: string[];
  [key: string]: any;
};

export function useAuth() {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Helper functions for role-based authorization
  const hasRole = (role: string) => {
    if (!user || !user.roles) return false;
    return user.roles.includes(role);
  };

  const hasAnyRole = (roles: string[]) => {
    if (!user || !user.roles) return false;
    return roles.some(role => user.roles?.includes(role));
  };

  const hasAllRoles = (roles: string[]) => {
    if (!user || !user.roles) return false;
    return roles.every(role => user.roles?.includes(role));
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    hasRole,
    hasAnyRole,
    hasAllRoles,
  };
}

// Helper hook for permission-based authorization
export function usePermissions() {
  const auth = useAuth();
  const { user } = auth;

  const hasPermission = (permission: string) => {
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: string[]) => {
    if (!user || !user.permissions) return false;
    return permissions.some(permission => user.permissions?.includes(permission));
  };

  const hasAllPermissions = (permissions: string[]) => {
    if (!user || !user.permissions) return false;
    return permissions.every(permission => (user.permissions ?? []).includes(permission));
  };

  return {
    ...auth,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}
