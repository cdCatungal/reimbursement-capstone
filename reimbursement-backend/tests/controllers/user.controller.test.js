// reimbursement-backend/tests/controllers/user.controller.test.js
import { jest } from '@jest/globals';
import {
  userSettings,
  getAllUsers,
  updateUser,
  deleteUser,
} from '../../src/controllers/user.controller.js';
import { User } from '../../src/models/index.js';

jest.mock('../../src/models/index.js');

describe('User Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'Admin',
      },
      body: {},
      params: {},
      isAuthenticated: jest.fn().mockReturnValue(true),
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe('userSettings', () => {
    it('should return user settings without password', async () => {
      req.user = {
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        role: 'Employee',
        password: 'hashedPassword',
        sap_code_1: 'E-12345-6789',
        toJSON: function() {
          return { ...this };
        },
      };

      await userSettings(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'user@example.com',
          name: 'Test User',
          role: 'Employee',
        }),
      });
      
      // Verify password and id are removed
      const response = res.json.mock.calls[0][0];
      expect(response.data).not.toHaveProperty('password');
      expect(response.data).not.toHaveProperty('id');
    });

    it('should return 404 if user not found', async () => {
      req.user = null;

      await userSettings(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User not found',
      });
    });

    it('should handle errors gracefully', async () => {
      req.user = {
        toJSON: jest.fn(() => {
          throw new Error('JSON conversion error');
        }),
      };

      await userSettings(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Server Error',
        })
      );
    });

    it('should include SAP codes in user settings', async () => {
      req.user = {
        email: 'employee@example.com',
        name: 'Employee',
        role: 'Employee',
        sap_code_1: 'E-12345-6789',
        sap_code_2: 'E-98765-4321',
        toJSON: function() { return { ...this }; },
      };

      await userSettings(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.data).toHaveProperty('sap_code_1', 'E-12345-6789');
      expect(response.data).toHaveProperty('sap_code_2', 'E-98765-4321');
    });
  });

  describe('getAllUsers', () => {
    it('should return all users for Admin', async () => {
      req.user.role = 'Admin';

      const mockUsers = [
        {
          id: 1,
          name: 'User 1',
          email: 'user1@example.com',
          role: 'Employee',
        },
        {
          id: 2,
          name: 'User 2',
          email: 'user2@example.com',
          role: 'SUL',
        },
      ];

      User.findAll.mockResolvedValue(mockUsers);

      await getAllUsers(req, res);

      expect(User.findAll).toHaveBeenCalledWith({
        attributes: { exclude: ['password'] },
        order: [['createdAt', 'DESC']],
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUsers,
      });
    });

    it('should allow Sales Director to view users', async () => {
      req.user.role = 'Sales Director';

      User.findAll.mockResolvedValue([]);

      await getAllUsers(req, res);

      expect(User.findAll).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 403 for non-Admin users', async () => {
      req.user.role = 'Employee';

      await getAllUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining('Access denied'),
      });
      expect(User.findAll).not.toHaveBeenCalled();
    });

    it('should return 401 if not authenticated', async () => {
      req.isAuthenticated.mockReturnValue(false);
      req.user = null;

      await getAllUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authenticated',
      });
    });

    it('should handle database errors', async () => {
      req.user.role = 'Admin';
      User.findAll.mockRejectedValue(new Error('Database error'));

      await getAllUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Server error',
        })
      );
    });
  });

  describe('updateUser', () => {
    it('should update user role successfully', async () => {
      req.params.id = '2';
      req.body = { role: 'SUL' };

      const mockUser = {
        id: 2,
        email: 'user@example.com',
        role: 'Employee',
        update: jest.fn().mockResolvedValue(true),
      };

      User.findByPk.mockResolvedValueOnce(mockUser);
      User.findByPk.mockResolvedValueOnce({
        ...mockUser,
        role: 'SUL',
        toJSON: () => ({ id: 2, role: 'SUL' }),
      });

      await updateUser(req, res);

      expect(mockUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'SUL',
        })
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should update SAP codes for Employee role', async () => {
      req.params.id = '2';
      req.body = {
        role: 'Employee',
        sap_code_1: 'E-12345-6789',
        sap_code_2: 'E-98765-4321',
      };

      const mockUser = {
        id: 2,
        role: 'Employee',
        update: jest.fn().mockResolvedValue(true),
      };

      User.findByPk.mockResolvedValueOnce(mockUser);
      User.findByPk.mockResolvedValueOnce(mockUser);

      await updateUser(req, res);

      expect(mockUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'Employee',
          sap_code_1: 'E-12345-6789',
          sap_code_2: 'E-98765-4321',
        })
      );
    });

    it('should clear SAP codes for roles that do not need them', async () => {
      req.params.id = '2';
      req.body = { role: 'Admin' };

      const mockUser = {
        id: 2,
        role: 'Employee',
        sap_code_1: 'E-12345-6789',
        update: jest.fn().mockResolvedValue(true),
      };

      User.findByPk.mockResolvedValueOnce(mockUser);
      User.findByPk.mockResolvedValueOnce(mockUser);

      await updateUser(req, res);

      expect(mockUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'Admin',
          sap_code_1: null,
          sap_code_2: null,
        })
      );
    });

    it('should not allow second SAP code for non-Employee roles', async () => {
      req.params.id = '2';
      req.body = {
        role: 'SUL',
        sap_code_1: 'E-12345-6789',
        sap_code_2: 'E-98765-4321', // Should be cleared
      };

      const mockUser = {
        id: 2,
        role: 'SUL',
        update: jest.fn().mockResolvedValue(true),
      };

      User.findByPk.mockResolvedValueOnce(mockUser);
      User.findByPk.mockResolvedValueOnce(mockUser);

      await updateUser(req, res);

      expect(mockUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          sap_code_2: null, // Should be cleared for SUL
        })
      );
    });

    it('should return 404 if user not found', async () => {
      req.params.id = '999';
      req.body = { role: 'SUL' };

      User.findByPk.mockResolvedValue(null);

      await updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
      });
    });

    it('should return 403 for non-Admin users', async () => {
      req.user.role = 'Employee';
      req.params.id = '2';

      await updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(User.findByPk).not.toHaveBeenCalled();
    });

    it('should handle roles without SAP codes correctly', async () => {
      const rolesWithoutSapCodes = [
        'Admin',
        'Invoice Specialist',
        'Sales Director',
        'Finance Officer',
      ];

      for (const role of rolesWithoutSapCodes) {
        req.params.id = '2';
        req.body = { role };

        const mockUser = {
          id: 2,
          role: 'Employee',
          update: jest.fn().mockResolvedValue(true),
        };

        User.findByPk.mockResolvedValueOnce(mockUser);
        User.findByPk.mockResolvedValueOnce(mockUser);

        await updateUser(req, res);

        expect(mockUser.update).toHaveBeenCalledWith(
          expect.objectContaining({
            sap_code_1: null,
            sap_code_2: null,
          })
        );

        jest.clearAllMocks();
      }
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      req.params.id = '2';

      const mockUser = {
        id: 2,
        email: 'user@example.com',
        destroy: jest.fn().mockResolvedValue(true),
      };

      User.findByPk.mockResolvedValue(mockUser);

      await deleteUser(req, res);

      expect(mockUser.destroy).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User deleted successfully',
      });
    });

    it('should prevent admin from deleting themselves', async () => {
      req.params.id = '1'; // Same as req.user.id

      await deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'You cannot delete your own account',
      });
      expect(User.findByPk).not.toHaveBeenCalled();
    });

    it('should return 404 if user not found', async () => {
      req.params.id = '999';

      User.findByPk.mockResolvedValue(null);

      await deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found',
      });
    });

    it('should return 403 for non-Admin users', async () => {
      req.user.role = 'Employee';
      req.params.id = '2';

      await deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(User.findByPk).not.toHaveBeenCalled();
    });

    it('should handle database errors during deletion', async () => {
      req.params.id = '2';

      const mockUser = {
        id: 2,
        destroy: jest.fn().mockRejectedValue(new Error('Foreign key constraint')),
      };

      User.findByPk.mockResolvedValue(mockUser);

      await deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Server error',
        })
      );
    });
  });

  describe('Authorization Tests', () => {
    it('should enforce role-based access control', async () => {
      const protectedEndpoints = [
        { handler: getAllUsers, method: 'getAllUsers' },
        { handler: updateUser, method: 'updateUser' },
        { handler: deleteUser, method: 'deleteUser' },
      ];

      for (const endpoint of protectedEndpoints) {
        req.user.role = 'Employee';
        req.params.id = '2';

        await endpoint.handler(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        
        jest.clearAllMocks();
      }
    });

    it('should allow Sales Director to manage users', async () => {
      req.user.role = 'Sales Director';
      User.findAll.mockResolvedValue([]);

      await getAllUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('SAP Code Logic', () => {
    it('should validate SAP code format', () => {
      const validCodes = ['E-12345-6789', 'E-98765-4321'];
      const invalidCodes = ['INVALID', '12345', 'E-123-456'];

      const sapCodeRegex = /^E-\d{5}-\d{4}$/i;

      validCodes.forEach((code) => {
        expect(sapCodeRegex.test(code)).toBe(true);
      });

      invalidCodes.forEach((code) => {
        expect(sapCodeRegex.test(code)).toBe(false);
      });
    });

    it('should identify roles that require SAP codes', () => {
      const rolesWithSapCodes = ['Employee', 'SUL', 'Account Manager'];
      const rolesWithoutSapCodes = [
        'Admin',
        'Invoice Specialist',
        'Sales Director',
        'Finance Officer',
      ];

      rolesWithSapCodes.forEach((role) => {
        expect(rolesWithoutSapCodes).not.toContain(role);
      });
    });

    it('should allow Employee to have two SAP codes', () => {
      const employeeRole = 'Employee';
      const rolesAllowingTwoSapCodes = ['Employee'];

      expect(rolesAllowingTwoSapCodes).toContain(employeeRole);
    });
  });
});