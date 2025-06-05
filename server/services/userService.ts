import jwt from 'jsonwebtoken';
import { User } from '../models';
import { blacklistToken, isTokenBlacklisted, storeUserSession, getUserSession, deleteUserSession } from '../redis';
import type { UserDocument } from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

interface RegisterUserInput {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: 'admin' | 'operator' | 'viewer';
}

interface LoginInput {
  username: string;
  password: string;
}

interface AuthResponse {
  user: Partial<UserDocument>;
  token: string;
}

/**
 * Register a new user
 */
export const registerUser = async (userData: RegisterUserInput): Promise<AuthResponse> => {
  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [
      { email: userData.email },
      { username: userData.username }
    ]
  });

  if (existingUser) {
    throw new Error('User with this email or username already exists');
  }

  // Create new user
  const user = new User(userData);
  await user.save();

  // Generate JWT token
  const token = generateToken(user);

  // Store session data
  const sessionData = {
    userId: user._id,
    role: user.role,
    lastActive: new Date()
  };

  // Calculate expiry in seconds based on JWT_EXPIRES_IN
  const expiryInSeconds = getExpiryInSeconds(JWT_EXPIRES_IN);
  await storeUserSession(user._id.toString(), sessionData, expiryInSeconds);

  // Update last login time
  user.lastLogin = new Date();
  await user.save();

  return {
    user: user.toJSON(),
    token
  };
};

/**
 * Login a user
 */
export const loginUser = async (loginData: LoginInput): Promise<AuthResponse> => {
  // Find user by username
  const user = await User.findOne({ username: loginData.username });
  
  if (!user) {
    throw new Error('Invalid username or password');
  }

  // Check if user is active
  if (!user.isActive) {
    throw new Error('This account has been deactivated');
  }

  // Check password
  const isPasswordValid = await user.comparePassword(loginData.password);
  
  if (!isPasswordValid) {
    throw new Error('Invalid username or password');
  }

  // Generate JWT token
  const token = generateToken(user);

  // Store session data
  const sessionData = {
    userId: user._id,
    role: user.role,
    lastActive: new Date()
  };

  // Calculate expiry in seconds based on JWT_EXPIRES_IN
  const expiryInSeconds = getExpiryInSeconds(JWT_EXPIRES_IN);
  await storeUserSession(user._id.toString(), sessionData, expiryInSeconds);

  // Update last login time
  user.lastLogin = new Date();
  await user.save();

  return {
    user: user.toJSON(),
    token
  };
};

/**
 * Logout a user
 */
export const logoutUser = async (userId: string, token: string): Promise<boolean> => {
  try {
    // Delete the user session
    await deleteUserSession(userId);

    // Add token to blacklist until it expires
    const decodedToken = jwt.decode(token) as any;
    
    if (decodedToken && decodedToken.exp) {
      const expiresIn = decodedToken.exp - Math.floor(Date.now() / 1000);
      if (expiresIn > 0) {
        await blacklistToken(token, expiresIn);
      }
    }

    return true;
  } catch (error) {
    console.error('Error during logout:', error);
    return false;
  }
};

/**
 * Verify token is valid and not blacklisted
 */
export const verifyToken = async (token: string): Promise<any> => {
  // Check if token is blacklisted
  const isBlacklisted = await isTokenBlacklisted(token);
  if (isBlacklisted) {
    throw new Error('Token has been revoked');
  }

  // Verify token
  return jwt.verify(token, JWT_SECRET);
};

/**
 * Get user by ID
 */
export const getUserById = async (userId: string): Promise<UserDocument | null> => {
  return User.findById(userId);
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  userId: string, 
  updates: Partial<Omit<UserDocument, 'password' | 'email' | 'username' | 'role'>>
): Promise<UserDocument | null> => {
  return User.findByIdAndUpdate(
    userId,
    { $set: updates },
    { new: true, runValidators: true }
  );
};

/**
 * Change user password
 */
export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<boolean> => {
  const user = await User.findById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }

  const isPasswordValid = await user.comparePassword(currentPassword);
  
  if (!isPasswordValid) {
    throw new Error('Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();
  
  return true;
};

/**
 * Update user role (admin only)
 */
export const updateUserRole = async (
  userId: string,
  role: 'admin' | 'operator' | 'viewer'
): Promise<UserDocument | null> => {
  return User.findByIdAndUpdate(
    userId,
    { role },
    { new: true }
  );
};

/**
 * Deactivate/activate user account
 */
export const toggleUserStatus = async (
  userId: string,
  isActive: boolean
): Promise<UserDocument | null> => {
  return User.findByIdAndUpdate(
    userId,
    { isActive },
    { new: true }
  );
};

/**
 * Generate JWT token for a user
 */
const generateToken = (user: UserDocument): string => {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
      username: user.username
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN
    }
  );
};

/**
 * Helper to convert JWT expiry string to seconds
 */
const getExpiryInSeconds = (expiresIn: string): number => {
  if (expiresIn.endsWith('h')) {
    return parseInt(expiresIn) * 60 * 60;
  } else if (expiresIn.endsWith('m')) {
    return parseInt(expiresIn) * 60;
  } else if (expiresIn.endsWith('d')) {
    return parseInt(expiresIn) * 24 * 60 * 60;
  } else {
    // Default to 24 hours
    return 24 * 60 * 60;
  }
};
