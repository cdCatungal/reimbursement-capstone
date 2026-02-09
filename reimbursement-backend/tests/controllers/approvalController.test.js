// reimbursement-backend/tests/controllers/approvalController.test.js
import { jest } from '@jest/globals';
import { approve, reject } from '../../src/controllers/approvalController.js';
import { User, Reimbursement, Approval } from '../../src/models/index.js';
import { getNextApprover, findApproverBySapCode } from '../../src/utils/approvalFlow.js';
import { sendEmail } from '../../src/utils/sendEmail.js';

jest.mock('../../src/models/index.js');
jest.mock('../../src/utils/approvalFlow.js');
jest.mock('../../src/utils/sendEmail.js');

describe('Approval Controller', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: {
        id: 2,
        name: 'SUL User',
        email: 'sul@example.com',
        role: 'SUL',
        sap_code_1: 'E-12345-6789',
      },
      params: {},
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe('approve', () => {
    it('should approve and move to next level', async () => {
      req.params.id = '1';
      req.body.remarks = 'Looks good';

      const mockReimbursement = {
        id: 1,
        sap_code: 'E-12345-6789',
        current_approver: 'SUL',
        status: 'Pending',
        user: {
          id: 1,
          name: 'Employee',
          email: 'employee@example.com',
          role: 'Employee',
        },
        approvals: [
          {
            id: 1,
            approver_role: 'SUL',
            status: 'Pending',
            approval_level: 1,
            save: jest.fn().mockResolvedValue(true),
          },
          {
            id: 2,
            approver_role: 'Account Manager',
            status: 'Pending',
            approval_level: 2,
            save: jest.fn().mockResolvedValue(true),
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      Reimbursement.findByPk.mockResolvedValue(mockReimbursement);
      Approval.findOne.mockResolvedValue(mockReimbursement.approvals[0]);
      getNextApprover.mockReturnValue('Account Manager');
      User.findAll.mockResolvedValue([
        { id: 3, role: 'Account Manager', sap_code_1: 'E-12345-6789', email: 'manager@example.com', name: 'Manager' },
      ]);
      findApproverBySapCode.mockReturnValue({
        id: 3,
        name: 'Manager',
        email: 'manager@example.com',
      });
      sendEmail.mockResolvedValue(true);

      await approve(req, res);

      expect(mockReimbursement.approvals[0].save).toHaveBeenCalled();
      expect(mockReimbursement.approvals[0].status).toBe('Approved');
      expect(mockReimbursement.approvals[0].approver_id).toBe(2);
      expect(mockReimbursement.current_approver).toBe('Account Manager');
      expect(sendEmail).toHaveBeenCalledTimes(2); // Progress email + next approver email
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          nextApprover: 'Account Manager',
        })
      );
    });

    it('should mark as fully approved on final level', async () => {
      req.params.id = '1';
      req.body.remarks = 'Final approval';

      const mockReimbursement = {
        id: 1,
        sap_code: 'E-12345-6789',
        current_approver: 'Finance Officer',
        status: 'Pending',
        user: {
          id: 1,
          email: 'employee@example.com',
        },
        approvals: [
          {
            approver_role: 'Finance Officer',
            status: 'Pending',
            approval_level: 4,
            save: jest.fn().mockResolvedValue(true),
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      req.user.role = 'Finance Officer';

      Reimbursement.findByPk.mockResolvedValue(mockReimbursement);
      Approval.findOne.mockResolvedValue(mockReimbursement.approvals[0]);
      getNextApprover.mockReturnValue(null); // No next approver
      sendEmail.mockResolvedValue(true);

      await approve(req, res);

      expect(mockReimbursement.status).toBe('Approved');
      expect(mockReimbursement.current_approver).toBeNull();
      expect(sendEmail).toHaveBeenCalledTimes(1); // Only final approval email
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          message: expect.stringContaining('fully approved'),
        })
      );
    });

    it('should return 401 if not authenticated', async () => {
      req.user = null;

      await approve(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Not authenticated',
      });
    });

    it('should return 404 if reimbursement not found', async () => {
      req.params.id = '999';

      Reimbursement.findByPk.mockResolvedValue(null);

      await approve(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Reimbursement not found',
      });
    });

    it('should return 403 if not current approver turn', async () => {
      req.params.id = '1';

      const mockReimbursement = {
        current_approver: 'Account Manager', // Not SUL
        sap_code: 'E-12345-6789',
      };

      Reimbursement.findByPk.mockResolvedValue(mockReimbursement);

      await approve(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Not your approval step',
        })
      );
    });

    it('should verify SAP code match for SUL', async () => {
      req.params.id = '1';
      req.user.sap_code_1 = 'E-99999-9999'; // Different SAP code

      const mockReimbursement = {
        current_approver: 'SUL',
        sap_code: 'E-12345-6789',
      };

      Reimbursement.findByPk.mockResolvedValue(mockReimbursement);

      await approve(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('not assigned to your SAP code'),
        })
      );
    });

    it('should send email to requester on progress', async () => {
      req.params.id = '1';

      const mockReimbursement = {
        id: 1,
        sap_code: 'E-12345-6789',
        current_approver: 'SUL',
        user: {
          email: 'employee@example.com',
        },
        approvals: [
          {
            approver_role: 'SUL',
            status: 'Pending',
            approval_level: 1,
            save: jest.fn(),
          },
        ],
        save: jest.fn(),
      };

      Reimbursement.findByPk.mockResolvedValue(mockReimbursement);
      Approval.findOne.mockResolvedValue(mockReimbursement.approvals[0]);
      getNextApprover.mockReturnValue('Account Manager');
      User.findAll.mockResolvedValue([{ id: 3, role: 'Account Manager', sap_code_1: 'E-12345-6789', email: 'manager@example.com' }]);
      findApproverBySapCode.mockReturnValue({ id: 3, email: 'manager@example.com' });
      sendEmail.mockResolvedValue(true);

      await approve(req, res);

      expect(sendEmail).toHaveBeenCalledWith(
        'employee@example.com',
        expect.stringContaining('Approved'),
        expect.any(String)
      );
    });

    it('should send email to next approver', async () => {
      req.params.id = '1';

      const mockReimbursement = {
        id: 1,
        sap_code: 'E-12345-6789',
        current_approver: 'SUL',
        user: { id: 1, email: 'employee@example.com' },
        approvals: [
          {
            approver_role: 'SUL',
            status: 'Pending',
            approval_level: 1,
            save: jest.fn(),
          },
        ],
        save: jest.fn(),
      };

      const nextApprover = {
        id: 3,
        name: 'Manager',
        email: 'manager@example.com',
      };

      Reimbursement.findByPk.mockResolvedValue(mockReimbursement);
      Approval.findOne.mockResolvedValue(mockReimbursement.approvals[0]);
      getNextApprover.mockReturnValue('Account Manager');
      User.findAll.mockResolvedValue([{ ...nextApprover, role: 'Account Manager', sap_code_1: 'E-12345-6789' }]);
      findApproverBySapCode.mockReturnValue(nextApprover);
      sendEmail.mockResolvedValue(true);

      await approve(req, res);

      expect(sendEmail).toHaveBeenCalledWith(
        'manager@example.com',
        expect.stringContaining('Ready for Your Approval'),
        expect.any(String)
      );
    });
  });

  describe('reject', () => {
    it('should reject reimbursement with remarks', async () => {
      req.params.id = '1';
      req.body.remarks = 'Invalid receipt';

      const mockReimbursement = {
        id: 1,
        sap_code: 'E-12345-6789',
        current_approver: 'SUL',
        status: 'Pending',
        user: {
          id: 1,
          name: 'Employee',
          email: 'employee@example.com',
        },
        approvals: [
          {
            id: 1,
            approver_role: 'SUL',
            status: 'Pending',
            approval_level: 1,
            save: jest.fn().mockResolvedValue(true),
          },
          {
            id: 2,
            approver_role: 'Account Manager',
            status: 'Pending',
            approval_level: 2,
            save: jest.fn().mockResolvedValue(true),
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      Reimbursement.findByPk.mockResolvedValue(mockReimbursement);
      Approval.findOne.mockResolvedValue(mockReimbursement.approvals[0]);
      Approval.findAll.mockResolvedValue([mockReimbursement.approvals[1]]);
      sendEmail.mockResolvedValue(true);

      await reject(req, res);

      expect(mockReimbursement.approvals[0].status).toBe('Rejected');
      expect(mockReimbursement.approvals[0].remarks).toBe('Invalid receipt');
      expect(mockReimbursement.status).toBe('Rejected');
      expect(mockReimbursement.current_approver).toBeNull();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          message: expect.stringContaining('rejected'),
        })
      );
    });

    it('should require remarks for rejection', async () => {
      req.params.id = '1';
      req.body.remarks = ''; // Empty remarks

      await reject(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Remarks are required for rejection',
      });
    });

    it('should cascade rejection to remaining approvals', async () => {
      req.params.id = '1';
      req.body.remarks = 'Rejected at level 1';

      const mockReimbursement = {
        id: 1,
        sap_code: 'E-12345-6789',
        current_approver: 'SUL',
        user: { id: 1, email: 'employee@example.com', name: 'Employee' },
        approvals: [
          {
            approver_role: 'SUL',
            status: 'Pending',
            approval_level: 1,
            save: jest.fn(),
          },
          {
            approver_role: 'Account Manager',
            status: 'Pending',
            approval_level: 2,
            save: jest.fn(),
          },
          {
            approver_role: 'Sales Director',
            status: 'Pending',
            approval_level: 3,
            save: jest.fn(),
          },
        ],
        save: jest.fn(),
      };

      Reimbursement.findByPk.mockResolvedValue(mockReimbursement);
      Approval.findOne.mockResolvedValue(mockReimbursement.approvals[0]);
      Approval.findAll.mockResolvedValue([
        mockReimbursement.approvals[1],
        mockReimbursement.approvals[2],
      ]);
      sendEmail.mockResolvedValue(true);

      await reject(req, res);

      // Verify all subsequent approvals are rejected
      expect(mockReimbursement.approvals[1].status).toBe('Rejected');
      expect(mockReimbursement.approvals[2].status).toBe('Rejected');
    });

    it('should send rejection email with CC to previous approvers', async () => {
      req.params.id = '1';
      req.body.remarks = 'Invalid expense';
      req.user.role = 'Account Manager'; // Second level approver
      req.user.id = 3;

      const mockReimbursement = {
        id: 1,
        sap_code: 'E-12345-6789',
        current_approver: 'Account Manager',
        user: {
          id: 1,
          name: 'Employee',
          email: 'employee@example.com',
        },
        approvals: [
          {
            id: 1,
            approver_role: 'SUL',
            status: 'Approved', // Already approved
            approval_level: 1,
            approver: {
              id: 2,
              email: 'sul@example.com',
              name: 'SUL User',
            },
            save: jest.fn(),
          },
          {
            id: 2,
            approver_role: 'Account Manager',
            status: 'Pending', // Current rejection point
            approval_level: 2,
            save: jest.fn(),
          },
        ],
        save: jest.fn(),
      };

      Reimbursement.findByPk.mockResolvedValue(mockReimbursement);
      Approval.findOne.mockResolvedValue(mockReimbursement.approvals[1]);
      Approval.findAll.mockResolvedValue([]);
      sendEmail.mockResolvedValue(true);

      await reject(req, res);

      // Verify CC includes previous approver who approved
      expect(sendEmail).toHaveBeenCalledWith(
        'employee@example.com',
        expect.stringContaining('Rejected'),
        expect.any(String),
        ['sul@example.com'] // CC to previous approver
      );
    });

    it('should not CC if no previous approvers', async () => {
      req.params.id = '1';
      req.body.remarks = 'Rejected at first level';

      const mockReimbursement = {
        id: 1,
        sap_code: 'E-12345-6789',
        current_approver: 'SUL',
        user: {
          id: 1,
          name: 'Employee',
          email: 'employee@example.com',
        },
        approvals: [
          {
            approver_role: 'SUL',
            status: 'Pending',
            approval_level: 1,
            save: jest.fn(),
          },
        ],
        save: jest.fn(),
      };

      Reimbursement.findByPk.mockResolvedValue(mockReimbursement);
      Approval.findOne.mockResolvedValue(mockReimbursement.approvals[0]);
      Approval.findAll.mockResolvedValue([]);
      sendEmail.mockResolvedValue(true);

      await reject(req, res);

      expect(sendEmail).toHaveBeenCalledWith(
        'employee@example.com',
        expect.any(String),
        expect.any(String),
        null // No CC
      );
    });

    it('should handle email send failures gracefully', async () => {
      req.params.id = '1';
      req.body.remarks = 'Rejected';

      const mockReimbursement = {
        id: 1,
        sap_code: 'E-12345-6789',
        current_approver: 'SUL',
        user: { id: 1, email: 'employee@example.com', name: 'Employee' },
        approvals: [
          {
            approver_role: 'SUL',
            status: 'Pending',
            approval_level: 1,
            save: jest.fn(),
          },
        ],
        save: jest.fn(),
      };

      Reimbursement.findByPk.mockResolvedValue(mockReimbursement);
      Approval.findOne.mockResolvedValue(mockReimbursement.approvals[0]);
      Approval.findAll.mockResolvedValue([]);
      sendEmail.mockRejectedValue(new Error('Email service error'));

      await reject(req, res);

      // Should still return success even if email fails
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors', async () => {
      req.params.id = '1';

      Reimbursement.findByPk.mockRejectedValue(new Error('Database error'));

      await approve(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Server error',
        })
      );
    });
  });
});