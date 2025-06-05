import { Router, Request, Response } from 'express';
import { userService } from '../services';
import { AuthRequest, authenticateJWT, authorizeRoles } from '../authMiddleware';
import { isTokenBlacklisted, incrementRateLimit, getRateLimit } from '../redis';

const router = Router();

// Rate limiting middleware
const rateLimitMiddleware = async (req: Request, res: Response, next: Function) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const key = `ratelimit:auth:${ip}`;
  const MAX_ATTEMPTS = 5;
  const WINDOW_SECONDS = 60 * 15; // 15 minutes
  
  try {
    const attempts = await incrementRateLimit(key, WINDOW_SECONDS);
    
    if (attempts > MAX_ATTEMPTS) {
      return res.status(429).json({ 
        message: 'Too many requests, please try again later',
        retryAfter: WINDOW_SECONDS
      });
    }
    
    next();
  } catch (error) {
    console.error('Rate limit error:', error);
    next(); // Continue even if rate limiting fails
  }
};

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account and returns a JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Invalid input
 *       409:
 *         description: User already exists
 */
router.post('/register', rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }
    
    const result = await userService.registerUser({
      username,
      email,
      password,
      firstName,
      lastName,
      // New users default to 'viewer' role
      role: 'viewer'
    });
    
    res.status(201).json(result);
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      return res.status(409).json({ message: error.message });
    }
    
    console.error('Registration error:', error);
    res.status(500).json({ message: 'An error occurred during registration' });
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login to user account
 *     description: Authenticates a user and returns a JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many failed attempts
 */
router.post('/login', rateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    const result = await userService.loginUser({ username, password });
    
    res.status(200).json(result);
  } catch (error: any) {
    console.error('Login error:', error);
    
    // Don't expose detailed error messages to client
    res.status(401).json({ message: 'Invalid username or password' });
  }
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Invalidates the current JWT token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Not authenticated
 */
router.post('/logout', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1] || '';
    
    await userService.logoutUser(userId, token);
    
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'An error occurred during logout' });
  }
});

/**
 * @swagger
 * /auth/verify-token:
 *   get:
 *     summary: Verify JWT token
 *     description: Verifies that the current JWT token is valid
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token is valid
 *       401:
 *         description: Invalid or expired token
 */
router.get('/verify-token', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing or invalid Authorization header' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Check if token is blacklisted
    const isBlacklisted = await isTokenBlacklisted(token);
    
    if (isBlacklisted) {
      return res.status(401).json({ message: 'Token has been revoked' });
    }
    
    const decoded = await userService.verifyToken(token);
    res.status(200).json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ valid: false, message: 'Invalid or expired token' });
  }
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user profile
 *     description: Returns the profile of the currently logged in user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Not authenticated
 */
router.get('/me', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const user = await userService.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'An error occurred while fetching profile' });
  }
});

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: Change user password
 *     description: Changes the password for the current user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Current password is incorrect
 */
router.post('/change-password', authenticateJWT, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters long' });
    }
    
    await userService.changePassword(userId, currentPassword, newPassword);
    
    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error: any) {
    if (error.message === 'Current password is incorrect') {
      return res.status(401).json({ message: error.message });
    }
    
    console.error('Change password error:', error);
    res.status(500).json({ message: 'An error occurred while changing password' });
  }
});

/**
 * @swagger
 * /auth/users:
 *   get:
 *     summary: Get all users (admin only)
 *     description: Returns a list of all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *       403:
 *         description: Forbidden
 */
router.get('/users', authenticateJWT, authorizeRoles(['admin']), async (_req: Request, res: Response) => {
  try {
    const users = await userService.getUserById('');
    res.status(200).json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'An error occurred while fetching users' });
  }
});

export default router;
