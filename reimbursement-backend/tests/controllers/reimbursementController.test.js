// reimbursement-backend/tests/controllers/reimbursementController.test.js
import { jest } from '@jest/globals';
import {
  createReimbursement,
  getUserReimbursements,
  getPendingApprovals,
  updateReimbursementStatus,
} from '../../src/controllers/reimbursementController.js';
import { Reimbursement, User, Approval } from '../../src/models/index.js';
import { getApprovalFlow, findApproverBySapCode } from '../../src/utils/approvalFlow.js';
import { sendEmail } from '../../src/utils/sendEmail.js';

// Mock dependencies
jest.mock('../../src/models/index.js');
jest.mock('../../src/utils/approvalFlow.js');
jest.mock('../../src/utils/sendEmail.js');

describe('Reimbursement Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'Employee',
        sap_code_1: 'E-12345-6789',
        sap_code_2: null,
      },
      body: {},
      file: null,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe('createReimbursement', () => {
    it('should create reimbursement with valid SAP code', async () => {
      req.body = {
        category: 'Meal with Client',
        type: 'Meal',
        description: 'Business lunch',
        items: 'Lunch meeting',
        total: '150.00',
        merchant: 'Restaurant',
        sap_code: 'E-12345-6789',
        date_of_expense: '2024-01-15',
      };

      req.file = {
        buffer: Buffer.from('test'),
        mimetype: 'image/jpeg',
        originalname: 'receipt.jpg',
        size: 1024,
      };

      getApprovalFlow.mockReturnValue(['SUL', 'Account Manager']);
      User.findAll.mockResolvedValue([
        { id: 2, name: 'SUL User', role: 'SUL', sap_code_1: 'E-12345-6789' },
        { id: 3, name: 'Manager', role: 'Account Manager', sap_code_1: 'E-12345-6789' },
      ]);
      findApproverBySapCode.mockReturnValue({
        id: 2,
        name: 'SUL User',
        email: 'sul@example.com',
        role: 'SUL',
      });

      Reimbursement.create.mockResolvedValue({
        id: 1,
        user_id: 1,
        category: 'Meal with Client',
        total: '150.00',
        sap_code: 'E-12345-6789',
        status: 'Pending',
      });

      Approval.bulkCreate.mockResolvedValue([]);
      sendEmail.mockResolvedValue(true);

      await createReimbursement(req, res);

      expect(Reimbursement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 1,
          category: 'Meal with Client',
          total: '150.00',
          sap_code: 'E-12345-6789',
          status: 'Pending',
          current_approver: 'SUL',
        })
      );
      expect(Approval.bulkCreate).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });

    it('should reject reimbursement with invalid SAP code', async () => {
      req.body = {
        category: 'Meal',
        total: '100',
        sap_code: 'E-99999-9999', // Not assigned to user
      };

      await createReimbursement(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Invalid SAP code'),
        })
      );
      expect(Reimbursement.create).not.toHaveBeenCalled();
    });

    it('should require SAP code', async () => {
      req.body = {
        category: 'Meal',
        total: '100',
        // Missing sap_code
      };

      await createReimbursement(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'SAP code is required',
      });
    });

    it('should handle missing approver for SAP code', async () => {
      req.body = {
        category: 'Meal',
        total: '100',
        sap_code: 'E-12345-6789',
      };

      getApprovalFlow.mockReturnValue(['SUL']);
      User.findAll.mockResolvedValue([]);
      findApproverBySapCode.mockReturnValue(null); // No approver found

      await createReimbursement(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('No SUL found'),
        })
      );
    });

    it('should parse date_of_expense correctly', async () => {
      req.body = {
        category: 'Meal',
        total: '100',
        sap_code: 'E-12345-6789',
        date_of_expense: '2024-01-15',
      };

      getApprovalFlow.mockReturnValue(['SUL']);
      User.findAll.mockResolvedValue([
        { id: 2, role: 'SUL', sap_code_1: 'E-12345-6789' },
      ]);
      findApproverBySapCode.mockReturnValue({ id: 2, email: 'sul@test.com' });
      Reimbursement.create.mockResolvedValue({ id: 1 });
      Approval.bulkCreate.mockResolvedValue([]);
      sendEmail.mockResolvedValue(true);

      await createReimbursement(req, res);

      expect(Reimbursement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          date_of_expense: '2024-01-15',
        })
      );
    });

    it('should send email notification to first approver', async () => {
      req.body = {
        category: 'Meal',
        total: '100',
        sap_code: 'E-12345-6789',
      };

      getApprovalFlow.mockReturnValue(['SUL']);
      const mockApprover = {
        id: 2,
        name: 'SUL Approver',
        email: 'sul@example.com',
        role: 'SUL',
      };
      User.findAll.mockResolvedValue([mockApprover]);
      findApproverBySapCode.mockReturnValue(mockApprover);
      Reimbursement.create.mockResolvedValue({
        id: 1,
        sap_code: 'E-12345-6789',
        category: 'Meal',
        total: '100',
      });
      Approval.bulkCreate.mockResolvedValue([]);
      sendEmail.mockResolvedValue(true);

      await createReimbursement(req, res);

      expect(sendEmail).toHaveBeenCalledWith(
        'sul@example.com',
        expect.stringContaining('New Reimbursement Request'),
        expect.any(String)
      );
    });
  });

  describe('getUserReimbursements', () => {
    it('should return user reimbursements with approvals', async () => {
      const mockReimbursements = [
        {
          id: 1,
          user_id: 1,
          category: 'Meal',
          total: '100',
          status: 'Pending',
          sap_code: 'E-12345-6789',
          date_of_expense: '2024-01-15',
          submitted_at: new Date('2024-01-15T10:00:00Z'),
          user: {
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
            role: 'Employee',
          },
          approvals: [
            {
              id: 1,
              approver_role: 'SUL',
              status: 'Pending',
              approval_level: 1,
            },
          ],
          receipt_data: 'base64data',
          receipt_mimetype: 'image/jpeg',
          receipt_filename: 'receipt.jpg',
        },
      ];

      Reimbursement.findAll.mockResolvedValue(mockReimbursements);

      await getUserReimbursements(req, res);

      expect(Reimbursement.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user_id: 1 },
        })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            category: 'Meal',
            status: 'Pending',
            receipt: expect.objectContaining({
              data: 'base64data',
              mimetype: 'image/jpeg',
              filename: 'receipt.jpg',
            }),
          }),
        ])
      );
    });

    it('should return 401 if user not authenticated', async () => {
      req.user = null;

      await getUserReimbursements(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'User not authenticated',
      });
    });
  });

  describe('getPendingApprovals', () => {
    it('should filter reimbursements by SAP code for SUL', async () => {
      req.user = {
        id: 2,
        role: 'SUL',
        sap_code_1: 'E-12345-6789',
        sap_code_2: null,
      };

      const mockReimbursements = [
        {
          id: 1,
          sap_code: 'E-12345-6789', // Matches SUL's SAP code
          status: 'Pending',
          user: { id: 1, name: 'User 1', role: 'Employee' },
          approvals: [{ approver_role: 'SUL', status: 'Pending' }],
          date_of_expense: '2024-01-15',
          submitted_at: new Date(),
        },
        {
          id: 2,
          sap_code: 'E-99999-9999', // Different SAP code
          status: 'Pending',
          user: { id: 3, name: 'User 2', role: 'Employee' },
          approvals: [{ approver_role: 'SUL', status: 'Pending' }],
          date_of_expense: '2024-01-15',
          submitted_at: new Date(),
        },
      ];

      Reimbursement.findAll.mockResolvedValue(mockReimbursements);

      await getPendingApprovals(req, res);

      const returnedData = res.json.mock.calls[0][0];
      expect(returnedData).toHaveLength(1);
      expect(returnedData[0].sapCode).toBe('E-12345-6789');
    });

    it('should return empty array if user has no SAP codes', async () => {
      req.user = {
        id: 2,
        role: 'SUL',
        sap_code_1: null,
        sap_code_2: null,
      };

      await getPendingApprovals(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe('updateReimbursementStatus', () => {
    beforeEach(() => {
      req.params = { id: '1' };
      req.user = {
        id: 2,
        name: 'SUL User',
        role: 'SUL',
        sap_code_1: 'E-12345-6789',
      };
    });

    it('should approve reimbursement and move to next approver', async () => {
      req.body = {
        action: 'approve',
        remarks: 'Approved by SUL',
      };

      const mockReimbursement = {
        id: 1,
        current_approver: 'SUL',
        sap_code: 'E-12345-6789',
        status: 'Pending',
        user: { id: 1, name: 'Employee', role: 'Employee' },
        approvals: [
          {
            id: 1,
            approver_role: 'SUL',
            status: 'Pending',
            approval_level: 1,
            update: jest.fn().mockResolvedValue(true),
          },
          {
            id: 2,
            approver_role: 'Account Manager',
            status: 'Pending',
            approval_level: 2,
          },
        ],
        update: jest.fn().mockResolvedValue(true),
      };

      Reimbursement.findByPk.mockResolvedValue(mockReimbursement);
      User.findAll.mockResolvedValue([
        { id: 3, role: 'Account Manager', sap_code_1: 'E-12345-6789' },
      ]);
      findApproverBySapCode.mockReturnValue({
        id: 3,
        name: 'Manager',
        role: 'Account Manager',
      });

      await updateReimbursementStatus(req, res);

      expect(mockReimbursement.approvals[0].update).toHaveBeenCalledWith({
        status: 'Approved',
        approver_id: 2,
        remarks: 'Approved by SUL',
        approved_at: expect.any(Date),
      });
      expect(res.json).toHaveBeenCalled();
    });

    it('should reject reimbursement with remarks', async () => {
      req.body = {
        action: 'reject',
        remarks: 'Invalid expense',
      };

      const mockReimbursement = {
        id: 1,
        current_approver: 'SUL',
        sap_code: 'E-12345-6789',
        user: { id: 1 },
        approvals: [
          {
            approver_role: 'SUL',
            status: 'Pending',
            approval_level: 1,
            update: jest.fn().mockResolvedValue(true),
          },
        ],
        update: jest.fn().mockResolvedValue(true),
      };

      Reimbursement.findByPk.mockResolvedValue(mockReimbursement);

      await updateReimbursementStatus(req, res);

      expect(mockReimbursement.approvals[0].update).toHaveBeenCalledWith({
        status: 'Rejected',
        approver_id: 2,
        remarks: 'Invalid expense',
        approved_at: expect.any(Date),
      });
      expect(mockReimbursement.update).toHaveBeenCalledWith({
        status: 'Rejected',
        current_approver: null,
      });
    });

    it('should return 403 if not current approver', async () => {
      req.user.role = 'Account Manager'; // Wrong approver

      const mockReimbursement = {
        id: 1,
        current_approver: 'SUL', // Expecting SUL
        sap_code: 'E-12345-6789',
      };

      Reimbursement.findByPk.mockResolvedValue(mockReimbursement);

      await updateReimbursementStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('not authorized'),
        })
      );
    });

    it('should verify SAP code match for SUL/Account Manager', async () => {
      req.user = {
        id: 2,
        role: 'SUL',
        sap_code_1: 'E-99999-9999', // Different SAP code
      };

      const mockReimbursement = {
        id: 1,
        current_approver: 'SUL',
        sap_code: 'E-12345-6789', // Different from user's SAP code
      };

      Reimbursement.findByPk.mockResolvedValue(mockReimbursement);

      await updateReimbursementStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('different SAP code'),
        })
      );
    });
  });
});