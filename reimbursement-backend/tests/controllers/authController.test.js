// reimbursement-backend/tests/controllers/authController.test.js
import { jest } from '@jest/globals';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { register, login } from '../../src/controllers/authController.js';
import User from '../../src/models/User.js';

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../src/models/User.js');

describe('Auth Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'password123',
        role: 'Employee',
      };

      User.findOne.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashedPassword');
      User.create.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        role: 'Employee',
      });

      await register(req, res);

      expect(User.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(User.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'hashedPassword',
        role: 'Employee',
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User registered successfully',
        user: expect.objectContaining({
          id: 1,
          email: 'test@example.com',
        }),
      });
    });

    it('should return 400 if user already exists', async () => {
      req.body = {
        email: 'existing@example.com',
        password: 'password123',
        role: 'Employee',
      };

      User.findOne.mockResolvedValue({ id: 1, email: 'existing@example.com' });

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User already exists',
      });
      expect(User.create).not.toHaveBeenCalled();
    });

    it('should handle server errors', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'password123',
        role: 'Employee',
      };

      User.findOne.mockRejectedValue(new Error('Database error'));

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });

  describe('login', () => {
    it('should login user successfully with valid credentials', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedPassword',
        role: 'Employee',
        profilePicture: null,
        sap_code_1: 'E-12345-6789',
        sap_code_2: null,
      };

      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mockJwtToken');

      await login(req, res);

      expect(User.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          id: 1,
          email: 'test@example.com',
          role: 'Employee',
        },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );
      expect(res.json).toHaveBeenCalledWith({
        message: 'Login successful',
        token: 'mockJwtToken',
        user: {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          role: 'Employee',
          profilePicture: null,
          sap_code_1: 'E-12345-6789',
          sap_code_2: null,
        },
      });
    });

    it('should return 404 if user not found', async () => {
      req.body = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      User.findOne.mockResolvedValue(null);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return 401 if password is invalid', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      User.findOne.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        password: 'hashedPassword',
      });
      bcrypt.compare.mockResolvedValue(false);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('should handle server errors during login', async () => {
      req.body = {
        email: 'test@example.com',
        password: 'password123',
      };

      User.findOne.mockRejectedValue(new Error('Database error'));

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });

    it('should return user data with SAP codes', async () => {
      req.body = {
        email: 'employee@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 2,
        email: 'employee@example.com',
        name: 'Employee User',
        password: 'hashedPassword',
        role: 'Employee',
        profilePicture: 'data:image/jpeg;base64,test',
        sap_code_1: 'E-11111-1111',
        sap_code_2: 'E-22222-2222',
      };

      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mockToken');

      await login(req, res);

      expect(res.json).toHaveBeenCalledWith({
        message: 'Login successful',
        token: 'mockToken',
        user: expect.objectContaining({
          sap_code_1: 'E-11111-1111',
          sap_code_2: 'E-22222-2222',
          profilePicture: 'data:image/jpeg;base64,test',
        }),
      });
    });
  });

  describe('JWT Token Generation', () => {
    it('should generate token with correct payload', async () => {
      req.body = {
        email: 'admin@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 10,
        email: 'admin@example.com',
        name: 'Admin',
        password: 'hashedPassword',
        role: 'Admin',
      };

      User.findOne.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockImplementation((payload, secret, options) => {
        expect(payload).toEqual({
          id: 10,
          email: 'admin@example.com',
          role: 'Admin',
        });
        expect(options.expiresIn).toBe('1d');
        return 'generatedToken';
      });

      await login(req, res);

      expect(jwt.sign).toHaveBeenCalled();
    });
  });

  describe('Password Security', () => {
    it('should hash password with bcrypt during registration', async () => {
      req.body = {
        email: 'secure@example.com',
        password: 'securePassword123',
        role: 'Employee',
      };

      User.findOne.mockResolvedValue(null);
      bcrypt.hash.mockImplementation((password, rounds) => {
        expect(password).toBe('securePassword123');
        expect(rounds).toBe(10);
        return Promise.resolve('hashedSecurePassword');
      });
      User.create.mockResolvedValue({ id: 1 });

      await register(req, res);

      expect(bcrypt.hash).toHaveBeenCalledWith('securePassword123', 10);
    });
  });
});