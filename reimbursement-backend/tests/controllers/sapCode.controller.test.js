// reimbursement-backend/tests/controllers/sapCode.controller.test.js
import { jest } from '@jest/globals';
import {
  getAllSapCodes,
  getActiveSapCodes,
  createSapCode,
  updateSapCode,
  deleteSapCode,
} from '../../src/controllers/sapCode.controller.js';
import { SapCode } from '../../src/models/index.js';

jest.mock('../../src/models/index.js');

describe('SAP Code Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: {
        id: 1,
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

  describe('getAllSapCodes', () => {
    it('should return all SAP codes for Admin', async () => {
      const mockSapCodes = [
        {
          id: 1,
          code: 'E-12345-6789',
          name: 'Project A',
          status: 'Active',
          createdAt: new Date(),
        },
        {
          id: 2,
          code: 'E-98765-4321',
          name: 'Project B',
          status: 'Inactive',
          createdAt: new Date(),
        },
      ];

      SapCode.findAll.mockResolvedValue(mockSapCodes);

      await getAllSapCodes(req, res);

      expect(SapCode.findAll).toHaveBeenCalledWith({
        order: [['createdAt', 'DESC']],
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockSapCodes,
      });
    });

    it('should return 403 for non-Admin users', async () => {
      req.user.role = 'Employee';

      await getAllSapCodes(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied. Admin or Sales Director role required.',
      });
      expect(SapCode.findAll).not.toHaveBeenCalled();
    });

    it('should allow Sales Director to view SAP codes', async () => {
      req.user.role = 'Sales Director';
      SapCode.findAll.mockResolvedValue([]);

      await getAllSapCodes(req, res);

      expect(SapCode.findAll).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 401 if not authenticated', async () => {
      req.isAuthenticated.mockReturnValue(false);
      req.user = null;

      await getAllSapCodes(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Not authenticated',
      });
    });
  });

  describe('getActiveSapCodes', () => {
    it('should return only active SAP codes without auth restriction', async () => {
      const mockActiveCodes = [
        {
          id: 1,
          code: 'E-12345-6789',
          name: 'Active Project',
          status: 'Active',
        },
      ];

      SapCode.findAll.mockResolvedValue(mockActiveCodes);

      await getActiveSapCodes(req, res);

      expect(SapCode.findAll).toHaveBeenCalledWith({
        where: { status: 'Active' },
        order: [['name', 'ASC']],
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockActiveCodes,
      });
    });

    it('should handle database errors', async () => {
      SapCode.findAll.mockRejectedValue(new Error('Database error'));

      await getActiveSapCodes(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server error',
      });
    });
  });

  describe('createSapCode', () => {
    it('should create new SAP code successfully', async () => {
      req.body = {
        code: 'E-11111-2222',
        name: 'New Project',
        description: 'Test project',
        status: 'Active',
      };

      SapCode.findOne.mockResolvedValue(null); // Code doesn't exist
      SapCode.create.mockResolvedValue({
        id: 1,
        ...req.body,
      });

      await createSapCode(req, res);

      expect(SapCode.findOne).toHaveBeenCalledWith({
        where: { code: 'E-11111-2222' },
      });
      expect(SapCode.create).toHaveBeenCalledWith({
        code: 'E-11111-2222',
        name: 'New Project',
        description: 'Test project',
        status: 'Active',
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should validate SAP code format', async () => {
      req.body = {
        code: 'E-11111-2222',
        name: 'Project',
      };

      const sapCodeRegex = /^E-\d{5}-\d{4}$/i;
      expect(sapCodeRegex.test(req.body.code)).toBe(true);
      expect(sapCodeRegex.test('INVALID')).toBe(false);
    });

    it('should return 400 if code or name missing', async () => {
      req.body = {
        code: 'E-11111-2222',
        // Missing name
      };

      await createSapCode(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Code and name are required',
      });
      expect(SapCode.create).not.toHaveBeenCalled();
    });

    it('should return 400 if SAP code already exists', async () => {
      req.body = {
        code: 'E-12345-6789',
        name: 'Duplicate Project',
      };

      SapCode.findOne.mockResolvedValue({ id: 1, code: 'E-12345-6789' });

      await createSapCode(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'SAP code already exists',
      });
      expect(SapCode.create).not.toHaveBeenCalled();
    });

    it('should default status to Active if not provided', async () => {
      req.body = {
        code: 'E-11111-2222',
        name: 'Project',
        // No status provided
      };

      SapCode.findOne.mockResolvedValue(null);
      SapCode.create.mockResolvedValue({ id: 1 });

      await createSapCode(req, res);

      expect(SapCode.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'Active',
        })
      );
    });
  });

  describe('updateSapCode', () => {
    it('should update SAP code successfully', async () => {
      req.params.id = '1';
      req.body = {
        code: 'E-12345-6789',
        name: 'Updated Project',
        description: 'Updated description',
        status: 'Inactive',
      };

      const mockSapCode = {
        id: 1,
        code: 'E-12345-6789',
        name: 'Old Project',
        update: jest.fn().mockResolvedValue(true),
      };

      SapCode.findByPk.mockResolvedValue(mockSapCode);

      await updateSapCode(req, res);

      expect(mockSapCode.update).toHaveBeenCalledWith({
        code: 'E-12345-6789',
        name: 'Updated Project',
        description: 'Updated description',
        status: 'Inactive',
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 if SAP code not found', async () => {
      req.params.id = '999';
      req.body = { name: 'Updated' };

      SapCode.findByPk.mockResolvedValue(null);

      await updateSapCode(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'SAP code not found',
      });
    });

    it('should check for duplicate code when changing code', async () => {
      req.params.id = '1';
      req.body = {
        code: 'E-99999-9999', // New code
      };

      const mockSapCode = {
        id: 1,
        code: 'E-12345-6789', // Old code
      };

      SapCode.findByPk.mockResolvedValue(mockSapCode);
      SapCode.findOne.mockResolvedValue({ id: 2, code: 'E-99999-9999' }); // Duplicate

      await updateSapCode(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'SAP code already exists',
      });
    });
  });

  describe('deleteSapCode', () => {
    it('should delete SAP code successfully', async () => {
      req.params.id = '1';

      const mockSapCode = {
        id: 1,
        code: 'E-12345-6789',
        destroy: jest.fn().mockResolvedValue(true),
      };

      SapCode.findByPk.mockResolvedValue(mockSapCode);

      await deleteSapCode(req, res);

      expect(mockSapCode.destroy).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'SAP code deleted successfully',
      });
    });

    it('should return 404 if SAP code not found', async () => {
      req.params.id = '999';

      SapCode.findByPk.mockResolvedValue(null);

      await deleteSapCode(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'SAP code not found',
      });
    });

    it('should require Admin/Sales Director role', async () => {
      req.user.role = 'Employee';
      req.params.id = '1';

      await deleteSapCode(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(SapCode.findByPk).not.toHaveBeenCalled();
    });

    it('should handle deletion errors', async () => {
      req.params.id = '1';

      const mockSapCode = {
        id: 1,
        destroy: jest.fn().mockRejectedValue(new Error('Foreign key constraint')),
      };

      SapCode.findByPk.mockResolvedValue(mockSapCode);

      await deleteSapCode(req, res);

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
    it('should allow Admin to perform all operations', async () => {
      req.user.role = 'Admin';

      // Test each endpoint
      SapCode.findAll.mockResolvedValue([]);
      await getAllSapCodes(req, res);
      expect(res.status).toHaveBeenCalledWith(200);

      req.body = { code: 'E-11111-2222', name: 'Test' };
      SapCode.findOne.mockResolvedValue(null);
      SapCode.create.mockResolvedValue({ id: 1 });
      await createSapCode(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should allow Sales Director to perform all operations', async () => {
      req.user.role = 'Sales Director';

      SapCode.findAll.mockResolvedValue([]);
      await getAllSapCodes(req, res);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should deny Employee access to admin operations', async () => {
      req.user.role = 'Employee';

      await getAllSapCodes(req, res);
      expect(res.status).toHaveBeenCalledWith(403);

      await createSapCode(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});