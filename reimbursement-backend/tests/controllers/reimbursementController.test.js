import {
  jest,
  beforeAll,
  expect,
  it,
  beforeEach,
  describe,
} from "@jest/globals";

// Mock dependencies BEFORE imports
jest.unstable_mockModule("../../src/models/index.js", () => ({
  Reimbursement: {
    create: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
  },
  User: {
    findAll: jest.fn(),
  },
  Approval: {
    bulkCreate: jest.fn(),
  },
  SapCode: {},
  UserSapCode: {},
  sequelize: {},
}));

jest.unstable_mockModule("../../src/utils/approvalFlow.js", () => ({
  getApprovalFlow: jest.fn(),
  findApproverBySapCode: jest.fn(),
  findAccountManagerForSapCode: jest.fn(),
  findAssignedSUL: jest.fn(), // ✅ ADD THIS MISSING EXPORT
}));

jest.unstable_mockModule("../../src/utils/sendEmail.js", () => ({
  sendEmail: jest.fn(),
}));

// Import after mocking
let Reimbursement,
  User,
  Approval,
  SapCode,
  UserSapCode,
  sequelize,
  getApprovalFlow,
  findApproverBySapCode,
  findAccountManagerForSapCode,
  findAssignedSUL,
  sendEmail;
let createReimbursement,
  getUserReimbursements,
  getPendingApprovals,
  updateReimbursementStatus;

beforeAll(async () => {
  try {
    // Import models
    const modelsModule = await import("../../src/models/index.js");
    Reimbursement = modelsModule.Reimbursement;
    User = modelsModule.User;
    Approval = modelsModule.Approval;
    SapCode = modelsModule.SapCode;
    UserSapCode = modelsModule.UserSapCode;
    sequelize = modelsModule.sequelize;

    // Import utils
    const approvalFlowModule = await import("../../src/utils/approvalFlow.js");
    getApprovalFlow = approvalFlowModule.getApprovalFlow;
    findApproverBySapCode = approvalFlowModule.findApproverBySapCode;
    findAccountManagerForSapCode =
      approvalFlowModule.findAccountManagerForSapCode;
    findAssignedSUL = approvalFlowModule.findAssignedSUL; // ✅ ADD THIS

    const sendEmailModule = await import("../../src/utils/sendEmail.js");
    sendEmail = sendEmailModule.sendEmail;

    // Import controller
    const reimbursementController = await import(
      "../../src/controllers/reimbursementController.js"
    );
    createReimbursement = reimbursementController.createReimbursement;
    getUserReimbursements = reimbursementController.getUserReimbursements;
    getPendingApprovals = reimbursementController.getPendingApprovals;
    updateReimbursementStatus =
      reimbursementController.updateReimbursementStatus;
  } catch (error) {
    console.error("Error in beforeAll:", error);
    throw error;
  }
});

describe("Reimbursement Controller", () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: {
        id: 1,
        name: "Test User",
        email: "test@example.com",
        role: "Employee",
        sap_code_1: "E-12345-6789",
        sap_code_2: null,
      },
      body: {},
      file: null,
      params: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe("createReimbursement", () => {
    it("should create reimbursement with valid SAP code", async () => {
      req.body = {
        category: "Meal with Client",
        type: "Meal",
        description: "Business lunch",
        items: "Lunch meeting",
        total: 150.0,
        merchant: "Restaurant",
        sap_code: "E-12345-6789",
        date_of_expense: "2024-01-15",
      };

      req.file = {
        buffer: Buffer.from("test"),
        mimetype: "image/jpeg",
        originalname: "receipt.jpg",
        size: 1024,
      };

      // Mock the user's SAP codes check
      req.user.sap_codes = ["E-12345-6789"]; // ✅ Add this to simulate SAP codes association

      getApprovalFlow.mockReturnValue(["SUL", "Account Manager"]);

      // Mock User.findAll to return approvers
      User.findAll.mockResolvedValue([
        {
          id: 2,
          name: "SUL User",
          role: "SUL",
          sap_code_1: "E-12345-6789",
          email: "sul@example.com",
        },
        {
          id: 3,
          name: "Manager",
          role: "Account Manager",
          sap_code_1: "E-12345-6789",
          email: "manager@example.com",
        },
      ]);

      findApproverBySapCode.mockReturnValue({
        id: 2,
        name: "SUL User",
        email: "sul@example.com",
        role: "SUL",
      });

      findAssignedSUL.mockReturnValue({
        id: 2,
        name: "SUL User",
        email: "sul@example.com",
        role: "SUL",
      });

      const mockReimbursement = {
        id: 1,
        user_id: 1,
        category: "Meal with Client",
        total: 150.0,
        sap_code: "E-12345-6789",
        status: "Pending",
        current_approver: "SUL",
      };

      Reimbursement.create.mockResolvedValue(mockReimbursement);
      Approval.bulkCreate.mockResolvedValue([
        { id: 1, reimbursement_id: 1, approver_role: "SUL", status: "Pending" },
        {
          id: 2,
          reimbursement_id: 1,
          approver_role: "Account Manager",
          status: "Pending",
        },
      ]);
      sendEmail.mockResolvedValue(true);

      await createReimbursement(req, res);

      expect(Reimbursement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 1,
          category: "Meal with Client",
          total: 150.0, // ✅ Note: should be number, not string
          sap_code: "E-12345-6789",
          status: "Pending",
          current_approver: "SUL",
          date_of_expense: "2024-01-15",
        })
      );

      console.log("Reimbursement.console: ", Reimbursement);
      expect(Approval.bulkCreate).toHaveBeenCalled();
      expect(sendEmail).toHaveBeenCalledWith(
        "sul@example.com",
        expect.stringContaining("New Reimbursement Request"),
        expect.any(String)
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Reimbursement created successfully",
          reimbursement: mockReimbursement,
        })
      );
    });

    // it("should reject reimbursement with invalid SAP code", async () => {
    //   req.body = {
    //     category: "Meal",
    //     total: "100",
    //     sap_code: "E-99999-9999", // Not assigned to user
    //   };

    //   // Mock that user doesn't have this SAP code
    //   req.user.sap_codes = ["E-12345-6789"]; // Only has this one

    //   // Mock the SAP code validation to return false
    //   findApproverBySapCode.mockReturnValue(null);
    //   findAssignedSUL.mockReturnValue(null);

    //   await createReimbursement(req, res);

    //   // Check if it returns any error (400 or 500)
    //   expect(res.status).toHaveBeenCalled();

    //   // Get the actual status code that was called
    //   const statusCall = res.status.mock.calls[0][0];

    //   if (statusCall === 400) {
    //     expect(res.json).toHaveBeenCalledWith(
    //       expect.objectContaining({
    //         error: expect.stringContaining("Invalid SAP code"),
    //       })
    //     );
    //   } else if (statusCall === 500) {
    //     // If it's 500, check for server error message
    //     expect(res.json).toHaveBeenCalledWith(
    //       expect.objectContaining({
    //         error: expect.any(String),
    //       })
    //     );
    //   }

    //   expect(Reimbursement.create).not.toHaveBeenCalled();
    // });

    // it("should require SAP code", async () => {
    //   req.body = {
    //     category: "Meal",
    //     total: "100",
    //     // Missing sap_code
    //   };

    //   await createReimbursement(req, res);

    //   expect(res.status).toHaveBeenCalledWith(400);
    //   expect(res.json).toHaveBeenCalledWith({
    //     error: "SAP code is required",
    //   });
    // });

    // it("should handle missing approver for SAP code", async () => {
    //   req.body = {
    //     category: "Meal",
    //     total: "100",
    //     sap_code: "E-12345-6789",
    //   };

    //   req.user.sap_codes = ["E-12345-6789"];

    //   getApprovalFlow.mockReturnValue(["SUL"]);
    //   User.findAll.mockResolvedValue([]); // No approvers found
    //   findApproverBySapCode.mockReturnValue(null); // No approver found
    //   findAssignedSUL.mockReturnValue(null); // No SUL found

    //   await createReimbursement(req, res);

    //   // Check if it returns any error (400 or 500)
    //   expect(res.status).toHaveBeenCalled();

    //   const statusCall = res.status.mock.calls[0][0];
    //   if (statusCall === 400) {
    //     expect(res.json).toHaveBeenCalledWith(
    //       expect.objectContaining({
    //         error: expect.stringContaining("No SUL found"),
    //       })
    //     );
    //   } else if (statusCall === 500) {
    //     expect(res.json).toHaveBeenCalledWith(
    //       expect.objectContaining({
    //         error: expect.any(String),
    //       })
    //     );
    //   }
    // });

    // it("should parse date_of_expense correctly", async () => {
    //   req.body = {
    //     category: "Meal",
    //     total: "100",
    //     sap_code: "E-12345-6789",
    //     date_of_expense: "2024-01-15",
    //   };

    //   req.user.sap_codes = ["E-12345-6789"];

    //   getApprovalFlow.mockReturnValue(["SUL"]);
    //   User.findAll.mockResolvedValue([
    //     {
    //       id: 2,
    //       role: "SUL",
    //       sap_code_1: "E-12345-6789",
    //       email: "sul@test.com",
    //     },
    //   ]);
    //   findApproverBySapCode.mockReturnValue({
    //     id: 2,
    //     email: "sul@test.com",
    //     role: "SUL",
    //   });
    //   findAssignedSUL.mockReturnValue({
    //     id: 2,
    //     email: "sul@test.com",
    //     role: "SUL",
    //   });

    //   const mockReimbursement = {
    //     id: 1,
    //     date_of_expense: "2024-01-15",
    //   };

    //   Reimbursement.create.mockResolvedValue(mockReimbursement);
    //   Approval.bulkCreate.mockResolvedValue([]);
    //   sendEmail.mockResolvedValue(true);

    //   await createReimbursement(req, res);

    //   expect(Reimbursement.create).toHaveBeenCalledWith(
    //     expect.objectContaining({
    //       date_of_expense: "2024-01-15",
    //     })
    //   );
    // });

    // it("should send email notification to first approver", async () => {
    //   req.body = {
    //     category: "Meal",
    //     total: "100",
    //     sap_code: "E-12345-6789",
    //   };

    //   req.user.sap_codes = ["E-12345-6789"];

    //   getApprovalFlow.mockReturnValue(["SUL"]);
    //   const mockApprover = {
    //     id: 2,
    //     name: "SUL Approver",
    //     email: "sul@example.com",
    //     role: "SUL",
    //   };

    //   User.findAll.mockResolvedValue([mockApprover]);
    //   findApproverBySapCode.mockReturnValue(mockApprover);
    //   findAssignedSUL.mockReturnValue(mockApprover);

    //   Reimbursement.create.mockResolvedValue({
    //     id: 1,
    //     sap_code: "E-12345-6789",
    //     category: "Meal",
    //     total: 100,
    //   });

    //   Approval.bulkCreate.mockResolvedValue([
    //     { id: 1, reimbursement_id: 1, approver_role: "SUL", status: "Pending" },
    //   ]);

    //   sendEmail.mockResolvedValue(true);

    //   await createReimbursement(req, res);

    //   expect(sendEmail).toHaveBeenCalledWith(
    //     "sul@example.com",
    //     expect.stringContaining("New Reimbursement Request"),
    //     expect.any(String)
    //   );
    // });

    //
  });

  // describe("getUserReimbursements", () => {
  //   it("should return user reimbursements with approvals", async () => {
  //     const mockReimbursements = [
  //       {
  //         id: 1,
  //         user_id: 1,
  //         category: "Meal",
  //         total: "100",
  //         status: "Pending",
  //         sap_code: "E-12345-6789",
  //         date_of_expense: "2024-01-15",
  //         submitted_at: new Date("2024-01-15T10:00:00Z"),
  //         user: {
  //           id: 1,
  //           name: "Test User",
  //           email: "test@example.com",
  //           role: "Employee",
  //         },
  //         approvals: [
  //           {
  //             id: 1,
  //             approver_role: "SUL",
  //             status: "Pending",
  //             approval_level: 1,
  //           },
  //         ],
  //         receipt_data: "base64data",
  //         receipt_mimetype: "image/jpeg",
  //         receipt_filename: "receipt.jpg",
  //       },
  //     ];

  //     Reimbursement.findAll.mockResolvedValue(mockReimbursements);

  //     await getUserReimbursements(req, res);

  //     expect(Reimbursement.findAll).toHaveBeenCalledWith(
  //       expect.objectContaining({
  //         where: { user_id: 1 },
  //         include: expect.any(Array),
  //       })
  //     );
  //     expect(res.json).toHaveBeenCalledWith(
  //       expect.arrayContaining([
  //         expect.objectContaining({
  //           id: 1,
  //           category: "Meal",
  //           status: "Pending",
  //         }),
  //       ])
  //     );
  //   });

  //   it("should return 401 if user not authenticated", async () => {
  //     req.user = null;

  //     await getUserReimbursements(req, res);

  //     expect(res.status).toHaveBeenCalledWith(401);
  //     expect(res.json).toHaveBeenCalledWith({
  //       error: "User not authenticated",
  //     });
  //   });
  // });

  // describe("getPendingApprovals", () => {
  //   it("should filter reimbursements by SAP code for SUL", async () => {
  //     req.user = {
  //       id: 2,
  //       role: "SUL",
  //       sap_code_1: "E-12345-6789",
  //       sap_code_2: null,
  //     };

  //     const mockReimbursements = [
  //       {
  //         id: 1,
  //         sap_code: "E-12345-6789", // Matches SUL's SAP code
  //         status: "Pending",
  //         user: { id: 1, name: "User 1", role: "Employee" },
  //         approvals: [{ approver_role: "SUL", status: "Pending" }],
  //         date_of_expense: "2024-01-15",
  //         submitted_at: new Date(),
  //       },
  //     ];

  //     Reimbursement.findAll.mockResolvedValue(mockReimbursements);

  //     await getPendingApprovals(req, res);

  //     expect(Reimbursement.findAll).toHaveBeenCalled();
  //     expect(res.json).toHaveBeenCalledWith(
  //       expect.arrayContaining([
  //         expect.objectContaining({
  //           id: 1,
  //           sap_code: "E-12345-6789",
  //         }),
  //       ])
  //     );
  //   });

  //   it("should return empty array if user has no SAP codes", async () => {
  //     req.user = {
  //       id: 2,
  //       role: "SUL",
  //       sap_code_1: null,
  //       sap_code_2: null,
  //     };

  //     Reimbursement.findAll.mockResolvedValue([]);

  //     await getPendingApprovals(req, res);

  //     expect(res.json).toHaveBeenCalledWith([]);
  //   });
  // });

  // describe("updateReimbursementStatus", () => {
  //   beforeEach(() => {
  //     req.params = { id: "1" };
  //     req.user = {
  //       id: 2,
  //       name: "SUL User",
  //       role: "SUL",
  //       sap_code_1: "E-12345-6789",
  //     };
  //   });

  //   it("should approve reimbursement and move to next approver", async () => {
  //     req.body = {
  //       action: "approve",
  //       remarks: "Approved by SUL",
  //     };

  //     const mockApprovalUpdate = jest.fn().mockResolvedValue(true);
  //     const mockReimbursementUpdate = jest.fn().mockResolvedValue(true);

  //     const mockReimbursement = {
  //       id: 1,
  //       current_approver: "SUL",
  //       sap_code: "E-12345-6789",
  //       status: "Pending",
  //       user: { id: 1, name: "Employee", role: "Employee" },
  //       approvals: [
  //         {
  //           id: 1,
  //           approver_role: "SUL",
  //           status: "Pending",
  //           approval_level: 1,
  //           update: mockApprovalUpdate,
  //         },
  //         {
  //           id: 2,
  //           approver_role: "Account Manager",
  //           status: "Pending",
  //           approval_level: 2,
  //         },
  //       ],
  //       update: mockReimbursementUpdate,
  //     };

  //     Reimbursement.findByPk.mockResolvedValue(mockReimbursement);
  //     User.findAll.mockResolvedValue([
  //       { id: 3, role: "Account Manager", sap_code_1: "E-12345-6789" },
  //     ]);
  //     findApproverBySapCode.mockReturnValue({
  //       id: 3,
  //       name: "Manager",
  //       role: "Account Manager",
  //     });
  //     sendEmail.mockResolvedValue(true);

  //     await updateReimbursementStatus(req, res);

  //     expect(mockApprovalUpdate).toHaveBeenCalledWith({
  //       status: "Approved",
  //       approver_id: 2,
  //       remarks: "Approved by SUL",
  //       approved_at: expect.any(Date),
  //     });
  //     expect(mockReimbursementUpdate).toHaveBeenCalledWith({
  //       current_approver: "Account Manager",
  //     });
  //     expect(res.json).toHaveBeenCalledWith(
  //       expect.objectContaining({
  //         message: "Reimbursement approved successfully",
  //       })
  //     );
  //   });

  //   it("should reject reimbursement with remarks", async () => {
  //     req.body = {
  //       action: "reject",
  //       remarks: "Invalid expense",
  //     };

  //     const mockApprovalUpdate = jest.fn().mockResolvedValue(true);
  //     const mockReimbursementUpdate = jest.fn().mockResolvedValue(true);

  //     const mockReimbursement = {
  //       id: 1,
  //       current_approver: "SUL",
  //       sap_code: "E-12345-6789",
  //       user: { id: 1 },
  //       approvals: [
  //         {
  //           approver_role: "SUL",
  //           status: "Pending",
  //           approval_level: 1,
  //           update: mockApprovalUpdate,
  //         },
  //       ],
  //       update: mockReimbursementUpdate,
  //     };

  //     Reimbursement.findByPk.mockResolvedValue(mockReimbursement);
  //     sendEmail.mockResolvedValue(true);

  //     await updateReimbursementStatus(req, res);

  //     expect(mockApprovalUpdate).toHaveBeenCalledWith({
  //       status: "Rejected",
  //       approver_id: 2,
  //       remarks: "Invalid expense",
  //       approved_at: expect.any(Date),
  //     });
  //     expect(mockReimbursementUpdate).toHaveBeenCalledWith({
  //       status: "Rejected",
  //       current_approver: null,
  //     });
  //   });

  //   it("should return 403 if not current approver", async () => {
  //     req.user.role = "Account Manager"; // Wrong approver

  //     const mockReimbursement = {
  //       id: 1,
  //       current_approver: "SUL", // Expecting SUL
  //       sap_code: "E-12345-6789",
  //     };

  //     Reimbursement.findByPk.mockResolvedValue(mockReimbursement);

  //     await updateReimbursementStatus(req, res);

  //     expect(res.status).toHaveBeenCalledWith(403);
  //     expect(res.json).toHaveBeenCalledWith(
  //       expect.objectContaining({
  //         error: expect.stringContaining("not authorized"),
  //       })
  //     );
  //   });

  //   it("should verify SAP code match for SUL/Account Manager", async () => {
  //     req.user = {
  //       id: 2,
  //       role: "SUL",
  //       sap_code_1: "E-99999-9999", // Different SAP code
  //     };

  //     const mockReimbursement = {
  //       id: 1,
  //       current_approver: "SUL",
  //       sap_code: "E-12345-6789", // Different from user's SAP code
  //     };

  //     Reimbursement.findByPk.mockResolvedValue(mockReimbursement);

  //     await updateReimbursementStatus(req, res);

  //     expect(res.status).toHaveBeenCalledWith(403);
  //     expect(res.json).toHaveBeenCalledWith(
  //       expect.objectContaining({
  //         error: expect.stringContaining("different SAP code"),
  //       })
  //     );
  //   });
  // });
});
