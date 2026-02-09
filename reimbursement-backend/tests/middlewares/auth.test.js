// reimbursement-backend/tests/middlewares/auth.test.js
import { jest } from '@jest/globals';
import { verifyToken } from '../../src/middlewares/authMiddleware.js';
import { ensureAuthenticated } from '../../src/middlewares/auth.js';
import jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

describe('Authentication Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      isAuthenticated: jest.fn(),
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('verifyToken', () => {
    it('should pass if user authenticated via session', () => {
      req.isAuthenticated.mockReturnValue(true);

      verifyToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should verify JWT token from Authorization header', () => {
      req.isAuthenticated.mockReturnValue(false);
      req.headers.authorization = 'Bearer valid-token';

      const mockDecoded = {
        id: 1,
        email: 'test@example.com',
        role: 'Employee',
      };

      jwt.verify.mockReturnValue(mockDecoded);

      verifyToken(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
      expect(req.user).toEqual(mockDecoded);
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 for invalid JWT token', () => {
      req.isAuthenticated.mockReturnValue(false);
      req.headers.authorization = 'Bearer invalid-token';

      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if no authentication method found', () => {
      req.isAuthenticated.mockReturnValue(false);
      // No authorization header

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle malformed Authorization header', () => {
      req.isAuthenticated.mockReturnValue(false);
      req.headers.authorization = 'InvalidFormat';

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated' });
    });

    it('should handle Bearer token without space', () => {
      req.isAuthenticated.mockReturnValue(false);
      req.headers.authorization = 'BearerTokenWithoutSpace';

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('ensureAuthenticated', () => {
    it('should pass if user is authenticated', () => {
      req.isAuthenticated.mockReturnValue(true);

      ensureAuthenticated(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 if not authenticated', () => {
      req.isAuthenticated.mockReturnValue(false);

      ensureAuthenticated(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Not authenticated' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle missing isAuthenticated function', () => {
      req.isAuthenticated = undefined;

      ensureAuthenticated(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('JWT Token Validation', () => {
    it('should validate token expiration', () => {
      req.isAuthenticated.mockReturnValue(false);
      req.headers.authorization = 'Bearer expired-token';

      jwt.verify.mockImplementation(() => {
        const error = new Error('jwt expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(jwt.verify).toHaveBeenCalled();
    });

    it('should validate token signature', () => {
      req.isAuthenticated.mockReturnValue(false);
      req.headers.authorization = 'Bearer tampered-token';

      jwt.verify.mockImplementation(() => {
        const error = new Error('invalid signature');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should extract user data from valid token', () => {
      req.isAuthenticated.mockReturnValue(false);
      req.headers.authorization = 'Bearer valid-token';

      const mockUser = {
        id: 5,
        email: 'user@example.com',
        role: 'Admin',
      };

      jwt.verify.mockReturnValue(mockUser);

      verifyToken(req, res, next);

      expect(req.user).toEqual(mockUser);
      expect(req.user.id).toBe(5);
      expect(req.user.role).toBe('Admin');
    });
  });

  describe('Session vs JWT Priority', () => {
    it('should prioritize session authentication over JWT', () => {
      req.isAuthenticated.mockReturnValue(true);
      req.headers.authorization = 'Bearer some-token';

      verifyToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(jwt.verify).not.toHaveBeenCalled(); // Should not check JWT if session exists
    });
  });
});