/**
 * Enhanced RBAC (Role-Based Access Control) for ProSyncHub
 * This file defines the permission model and provides middleware for protecting routes
 */

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';

// Define permission sets for each role
export const Permissions = {
  admin: [
    'user:read', 'user:create', 'user:update', 'user:delete',
    'asset:read', 'asset:create', 'asset:update', 'asset:delete',
    'sensor:read', 'sensor:create', 'sensor:update', 'sensor:delete',
    'maintenance:read', 'maintenance:create', 'maintenance:update', 'maintenance:delete',
    'checklist:read', 'checklist:create', 'checklist:update', 'checklist:delete',
    'report:read', 'report:create', 'report:export',
    'notification:read', 'notification:create', 'notification:update', 'notification:delete',
    'settings:read', 'settings:update',
    'analytics:read', 'analytics:export',
    'system:read', 'system:update'
  ],
  operator: [
    'user:read',
    'asset:read',
    'sensor:read',
    'maintenance:read', 'maintenance:create', 'maintenance:update',
    'checklist:read', 'checklist:create', 'checklist:update',
    'report:read',
    'notification:read',
    'settings:read',
    'analytics:read'
  ],
  viewer: [
    'user:read',
    'asset:read',
    'sensor:read',
    'maintenance:read',
    'checklist:read',
    'report:read',
    'notification:read',
    'analytics:read'
  ]
};

// Map resources to route patterns for easier configuration
export const ResourceRouteMap = {
  'user': /^\/api\/users/,
  'asset': /^\/api\/assets/,
  'sensor': /^\/api\/sensors/,
  'maintenance': /^\/api\/maintenance/,
  'checklist': /^\/api\/checklists/,
  'report': /^\/api\/reports/,
  'notification': /^\/api\/notifications/,
  'settings': /^\/api\/settings/,
  'analytics': /^\/api\/analytics/,
  'system': /^\/api\/system/
};

// Map HTTP methods to permission actions
export const MethodActionMap = {
  'GET': 'read',
  'POST': 'create',
  'PUT': 'update',
  'PATCH': 'update',
  'DELETE': 'delete'
};

/**
 * Middleware to check if the user has the required permission for the requested resource
 * @param resource The resource being accessed
 * @param action The action being performed (read, create, update, delete)
 */
export function requirePermission(resource: string, action: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthRequest).user as { userId: string; role: string } | undefined;
    if (!user || !user.role) {
      res.status(401).json({ message: 'Unauthorized: Authentication required' });
      return;
    }
    const permission = `${resource}:${action}`;
    if (Permissions[user.role as keyof typeof Permissions]?.includes(permission)) {
      next();
      return;
    }
    res.status(403).json({ message: `Forbidden: Insufficient permissions for ${permission}` });
  };
}

/**
 * Auto-detect resource and action from request path and method
 * This middleware can be used when the route structure follows the RESTful pattern
 */
export function requirePermissionAuto() {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // If no user or role is set, deny access
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: 'Unauthorized: Authentication required' });
    }

    const method = req.method;
    const path = req.path;
    
    // Determine the resource from the path
    let resource: string | null = null;
    for (const [key, pattern] of Object.entries(ResourceRouteMap)) {
      if (pattern.test(path)) {
        resource = key;
        break;
      }
    }
    
    // If resource couldn't be determined, allow (better to specifically protect routes)
    if (!resource) {
      return next();
    }
    
    // Determine the action from the HTTP method
    const action = MethodActionMap[method as keyof typeof MethodActionMap] || 'read';
    
    // Check permission
    const permission = `${resource}:${action}`;
    const role = req.user.role;
    
    if (Permissions[role as keyof typeof Permissions]?.includes(permission)) {
      next();
    } else {
      return res.status(403).json({ message: `Forbidden: Insufficient permissions for ${permission}` });
    }
  };
}

/**
 * Middleware to restrict access to specific roles
 * @param roles Array of roles that are allowed to access the route
 */
export function requireRoles(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: 'Unauthorized: Authentication required' });
    }
    
    if (roles.includes(req.user.role)) {
      next();
    } else {
      return res.status(403).json({ message: 'Forbidden: Role not authorized' });
    }
  };
}
