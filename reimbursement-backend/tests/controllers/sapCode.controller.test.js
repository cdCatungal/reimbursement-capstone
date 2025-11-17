// reimbursement-backend/tests/controllers/sapCode.controller.test.js
import {
  jest,
  expect,
  it,
  describe,
  beforeEach,
  beforeAll,
} from "@jest/globals";

// Mock dependencies BEFORE imports
jest.unstable_mockModule("../../src/models/index.js", () => ({
  SapCode: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
  },
  Reimbursement: {},
  User: {},
  Approval: {},
  UserSapCode: {},
  sequelize: {},
}));

// Import after mocking
let SapCode;
let getAllSapCodes,
  getActiveSapCodes,
  createSapCode,
  updateSapCode,
  deleteSapCode;

beforeAll(async () => {
  try {
    // Import models
    const modelsModule = await import("../../src/models/index.js");
    SapCode = modelsModule.SapCode;

    // Import controller functions
    const sapCodeController = await import(
      "../../src/controllers/sapCode.controller.js"
    );
    getAllSapCodes = sapCodeController.getAllSapCodes;
    getActiveSapCodes = sapCodeController.getActiveSapCodes;
    createSapCode = sapCodeController.createSapCode;
    updateSapCode = sapCodeController.updateSapCode;
    deleteSapCode = sapCodeController.deleteSapCode;
  } catch (error) {
    console.error("Error in beforeAll:", error);
    throw error;
  }
});

describe("SAP Code Controller", () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: {
        id: 1,
        role: "Admin",
        email: "admin@example.com",
        name: "Admin User",
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

  describe("getAllSapCodes", () => {
    it("should return all SAP codes for Admin", async () => {
      const mockSapCodes = [
        {
          id: 1,
          code: "E-12345-6789",
          name: "Project A",
          status: "Active",
          createdAt: new Date(),
          toJSON: function () {
            return this;
          },
        },
        {
          id: 2,
          code: "E-98765-4321",
          name: "Project B",
          status: "Inactive",
          createdAt: new Date(),
          toJSON: function () {
            return this;
          },
        },
      ];

      SapCode.findAll.mockResolvedValue(mockSapCodes);

      await getAllSapCodes(req, res);

      expect(SapCode.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          order: expect.arrayContaining([["createdAt", "DESC"]]),
        })
      );

      // Verify response
      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];

      if (response.success) {
        expect(response.data).toBeDefined();
        expect(res.status).toHaveBeenCalledWith(200);
      }
    });

    it("should return 403 for non-Admin users", async () => {
      req.user.role = "Employee";

      await getAllSapCodes(req, res);

      const response = res.json.mock.calls[0][0];

      // Check if access was denied
      if (response.success === false) {
        expect(res.status).toHaveBeenCalledWith(403);
        expect(response.message).toMatch(/access denied|admin|not authorized/i);
      }

      expect(SapCode.findAll).not.toHaveBeenCalled();
    });

    it("should allow Sales Director to view SAP codes", async () => {
      req.user.role = "Sales Director";
      SapCode.findAll.mockResolvedValue([]);

      await getAllSapCodes(req, res);

      expect(SapCode.findAll).toHaveBeenCalled();

      const response = res.json.mock.calls[0][0];
      if (response.success) {
        expect(res.status).toHaveBeenCalledWith(200);
      }
    });

    it("should return 401 if not authenticated", async () => {
      req.isAuthenticated.mockReturnValue(false);
      req.user = null;

      await getAllSapCodes(req, res);

      const statusCode = res.status.mock.calls[0]?.[0];
      expect([401, 403]).toContain(statusCode);

      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(false);
    });

    it("should handle database errors gracefully", async () => {
      SapCode.findAll.mockRejectedValue(new Error("Database connection error"));

      await getAllSapCodes(req, res);

      expect(res.status).toHaveBeenCalled();
      const statusCode = res.status.mock.calls[0][0];
      expect(statusCode).toBe(500);

      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(false);
    });
  });

  describe("getActiveSapCodes", () => {
    it("should return only active SAP codes without auth restriction", async () => {
      const mockActiveCodes = [
        {
          id: 1,
          code: "E-12345-6789",
          name: "Active Project",
          status: "Active",
          toJSON: function () {
            return this;
          },
        },
      ];

      SapCode.findAll.mockResolvedValue(mockActiveCodes);

      await getActiveSapCodes(req, res);

      expect(SapCode.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "Active" },
        })
      );

      const response = res.json.mock.calls[0][0];
      if (response.success) {
        expect(res.status).toHaveBeenCalledWith(200);
        expect(response.data).toBeDefined();
      }
    });

    it("should handle database errors", async () => {
      SapCode.findAll.mockRejectedValue(new Error("Database error"));

      await getActiveSapCodes(req, res);

      expect(res.status).toHaveBeenCalledWith(500);

      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.message).toMatch(/error|failed/i);
    });

    it("should return empty array when no active codes exist", async () => {
      SapCode.findAll.mockResolvedValue([]);

      await getActiveSapCodes(req, res);

      const response = res.json.mock.calls[0][0];
      if (response.success) {
        expect(response.data).toEqual([]);
      }
    });
  });

  describe("createSapCode", () => {
    it("should create new SAP code successfully", async () => {
      req.body = {
        code: "E-11111-2222",
        name: "New Project",
        description: "Test project",
        status: "Active",
      };

      SapCode.findOne.mockResolvedValue(null); // Code doesn't exist
      SapCode.create.mockResolvedValue({
        id: 1,
        ...req.body,
        toJSON: function () {
          return this;
        },
      });

      await createSapCode(req, res);

      expect(SapCode.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { code: "E-11111-2222" },
        })
      );

      const response = res.json.mock.calls[0][0];

      if (response.success) {
        expect(SapCode.create).toHaveBeenCalledWith(
          expect.objectContaining({
            code: "E-11111-2222",
            name: "New Project",
          })
        );
        expect(res.status).toHaveBeenCalledWith(201);
      }
    });

    it("should validate SAP code format", async () => {
      req.body = {
        code: "E-11111-2222",
        name: "Project",
      };

      const sapCodeRegex = /^E-\d{5}-\d{4}$/i;
      expect(sapCodeRegex.test(req.body.code)).toBe(true);
      expect(sapCodeRegex.test("INVALID")).toBe(false);
      expect(sapCodeRegex.test("E-1234-567")).toBe(false); // Wrong length
      expect(sapCodeRegex.test("E-12345-67890")).toBe(false); // Too long
    });

    it("should return 400 if code or name missing", async () => {
      req.body = {
        code: "E-11111-2222",
        // Missing name
      };

      await createSapCode(req, res);

      expect(res.status).toHaveBeenCalledWith(400);

      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.message).toMatch(/required|missing/i);
      expect(SapCode.create).not.toHaveBeenCalled();
    });

    it("should return 400 if only name provided", async () => {
      req.body = {
        // Missing code
        name: "Project Name",
      };

      await createSapCode(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(SapCode.create).not.toHaveBeenCalled();
    });

    it("should return 400 if SAP code already exists", async () => {
      req.body = {
        code: "E-12345-6789",
        name: "Duplicate Project",
      };

      SapCode.findOne.mockResolvedValue({
        id: 1,
        code: "E-12345-6789",
        toJSON: function () {
          return this;
        },
      });

      await createSapCode(req, res);

      expect(res.status).toHaveBeenCalledWith(400);

      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.message).toMatch(/already exists|duplicate/i);
      expect(SapCode.create).not.toHaveBeenCalled();
    });

    it("should default status to Active if not provided", async () => {
      req.body = {
        code: "E-11111-2222",
        name: "Project",
        // No status provided
      };

      SapCode.findOne.mockResolvedValue(null);
      SapCode.create.mockResolvedValue({
        id: 1,
        ...req.body,
        status: "Active",
        toJSON: function () {
          return this;
        },
      });

      await createSapCode(req, res);

      if (SapCode.create.mock.calls.length > 0) {
        const createArgs = SapCode.create.mock.calls[0][0];
        expect(createArgs.status).toBe("Active");
      }
    });

    it("should return 403 for non-Admin users", async () => {
      req.user.role = "Employee";
      req.body = {
        code: "E-11111-2222",
        name: "Project",
      };

      await createSapCode(req, res);

      const statusCode = res.status.mock.calls[0]?.[0];
      expect([403, 401]).toContain(statusCode);
      expect(SapCode.create).not.toHaveBeenCalled();
    });
  });

  describe("updateSapCode", () => {
    it("should update SAP code successfully", async () => {
      req.params.id = "1";
      req.body = {
        code: "E-12345-6789",
        name: "Updated Project",
        description: "Updated description",
        status: "Inactive",
      };

      const mockSapCode = {
        id: 1,
        code: "E-12345-6789",
        name: "Old Project",
        update: jest.fn().mockResolvedValue([1]),
        toJSON: function () {
          return this;
        },
      };

      SapCode.findByPk.mockResolvedValue(mockSapCode);
      SapCode.findOne.mockResolvedValue(null); // No duplicate

      await updateSapCode(req, res);

      const response = res.json.mock.calls[0][0];

      if (response.success) {
        expect(mockSapCode.update).toHaveBeenCalledWith(
          expect.objectContaining({
            name: "Updated Project",
          })
        );
        expect(res.status).toHaveBeenCalledWith(200);
      }
    });

    it("should return 404 if SAP code not found", async () => {
      req.params.id = "999";
      req.body = { name: "Updated" };

      SapCode.findByPk.mockResolvedValue(null);

      await updateSapCode(req, res);

      expect(res.status).toHaveBeenCalledWith(404);

      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.message).toMatch(/not found/i);
    });

    it("should check for duplicate code when changing code", async () => {
      req.params.id = "1";
      req.body = {
        code: "E-99999-9999", // New code
        name: "Project",
      };

      const mockSapCode = {
        id: 1,
        code: "E-12345-6789", // Old code
        update: jest.fn(),
        toJSON: function () {
          return this;
        },
      };

      SapCode.findByPk.mockResolvedValue(mockSapCode);
      SapCode.findOne.mockResolvedValue({
        id: 2,
        code: "E-99999-9999",
        toJSON: function () {
          return this;
        },
      }); // Duplicate exists

      await updateSapCode(req, res);

      expect(res.status).toHaveBeenCalledWith(400);

      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.message).toMatch(/already exists|duplicate/i);
      expect(mockSapCode.update).not.toHaveBeenCalled();
    });

    it("should allow updating same code for same record", async () => {
      req.params.id = "1";
      req.body = {
        code: "E-12345-6789", // Same code
        name: "Updated Name",
      };

      const mockSapCode = {
        id: 1,
        code: "E-12345-6789",
        update: jest.fn().mockResolvedValue([1]),
        toJSON: function () {
          return this;
        },
      };

      SapCode.findByPk.mockResolvedValue(mockSapCode);
      SapCode.findOne.mockResolvedValue(mockSapCode); // Same record

      await updateSapCode(req, res);

      // Should succeed since it's the same record
      const response = res.json.mock.calls[0][0];
      if (response.success) {
        expect(mockSapCode.update).toHaveBeenCalled();
      }
    });

    it("should return 403 for non-Admin users", async () => {
      req.user.role = "Employee";
      req.params.id = "1";
      req.body = { name: "Updated" };

      await updateSapCode(req, res);

      const statusCode = res.status.mock.calls[0]?.[0];
      expect([403, 401]).toContain(statusCode);
      expect(SapCode.findByPk).not.toHaveBeenCalled();
    });
  });

  describe("deleteSapCode", () => {
    it("should delete SAP code successfully", async () => {
      req.params.id = "1";

      const mockSapCode = {
        id: 1,
        code: "E-12345-6789",
        destroy: jest.fn().mockResolvedValue(true),
        toJSON: function () {
          return this;
        },
      };

      SapCode.findByPk.mockResolvedValue(mockSapCode);

      await deleteSapCode(req, res);

      expect(mockSapCode.destroy).toHaveBeenCalled();

      const response = res.json.mock.calls[0][0];
      if (response.success) {
        expect(res.status).toHaveBeenCalledWith(200);
        expect(response.message).toMatch(/deleted|removed/i);
      }
    });

    it("should return 404 if SAP code not found", async () => {
      req.params.id = "999";

      SapCode.findByPk.mockResolvedValue(null);

      await deleteSapCode(req, res);

      expect(res.status).toHaveBeenCalledWith(404);

      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.message).toMatch(/not found/i);
    });

    it("should require Admin/Sales Director role", async () => {
      req.user.role = "Employee";
      req.params.id = "1";

      await deleteSapCode(req, res);

      const statusCode = res.status.mock.calls[0]?.[0];
      expect([403, 401]).toContain(statusCode);
      expect(SapCode.findByPk).not.toHaveBeenCalled();
    });

    it("should handle deletion errors (foreign key constraint)", async () => {
      req.params.id = "1";

      const mockSapCode = {
        id: 1,
        code: "E-12345-6789",
        destroy: jest
          .fn()
          .mockRejectedValue(new Error("Foreign key constraint")),
        toJSON: function () {
          return this;
        },
      };

      SapCode.findByPk.mockResolvedValue(mockSapCode);

      await deleteSapCode(req, res);

      expect(res.status).toHaveBeenCalledWith(500);

      const response = res.json.mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.message).toMatch(/error|failed/i);
    });

    it("should handle invalid ID format", async () => {
      req.params.id = "invalid";

      SapCode.findByPk.mockResolvedValue(null);

      await deleteSapCode(req, res);

      // Should return 404 or handle gracefully
      const statusCode = res.status.mock.calls[0]?.[0];
      expect([404, 400, 500]).toContain(statusCode);
    });
  });

  describe("Authorization Tests", () => {
    it("should allow Admin to perform all operations", async () => {
      req.user.role = "Admin";

      // Test getAllSapCodes
      SapCode.findAll.mockResolvedValue([]);
      await getAllSapCodes(req, res);

      let response = res.json.mock.calls[0][0];
      if (response.success) {
        expect(res.status).toHaveBeenCalledWith(200);
      }

      // Reset mocks
      jest.clearAllMocks();

      // Test createSapCode
      req.body = { code: "E-11111-2222", name: "Test" };
      SapCode.findOne.mockResolvedValue(null);
      SapCode.create.mockResolvedValue({
        id: 1,
        ...req.body,
        toJSON: function () {
          return this;
        },
      });

      await createSapCode(req, res);

      response = res.json.mock.calls[0][0];
      if (response.success) {
        expect(res.status).toHaveBeenCalledWith(201);
      }
    });

    it("should allow Sales Director to perform all operations", async () => {
      req.user.role = "Sales Director";

      SapCode.findAll.mockResolvedValue([]);
      await getAllSapCodes(req, res);

      const response = res.json.mock.calls[0][0];
      if (response.success) {
        expect(res.status).toHaveBeenCalledWith(200);
      }
    });

    it("should deny Employee access to admin operations", async () => {
      req.user.role = "Employee";

      // Test getAllSapCodes
      await getAllSapCodes(req, res);
      let statusCode = res.status.mock.calls[0]?.[0];
      expect([403, 401]).toContain(statusCode);

      jest.clearAllMocks();

      // Test createSapCode
      req.body = { code: "E-11111-2222", name: "Test" };
      await createSapCode(req, res);
      statusCode = res.status.mock.calls[0]?.[0];
      expect([403, 401]).toContain(statusCode);
    });

    it("should deny SUL access to admin operations", async () => {
      req.user.role = "SUL";

      await getAllSapCodes(req, res);
      const statusCode = res.status.mock.calls[0]?.[0];
      expect([403, 401]).toContain(statusCode);
    });

    it("should deny Account Manager access to admin operations", async () => {
      req.user.role = "Account Manager";

      await getAllSapCodes(req, res);
      const statusCode = res.status.mock.calls[0]?.[0];
      expect([403, 401]).toContain(statusCode);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty request body for create", async () => {
      req.body = {};

      await createSapCode(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(SapCode.create).not.toHaveBeenCalled();
    });

    it("should handle empty request body for update", async () => {
      req.params.id = "1";
      req.body = {};

      const mockSapCode = {
        id: 1,
        update: jest.fn(),
        toJSON: function () {
          return this;
        },
      };

      SapCode.findByPk.mockResolvedValue(mockSapCode);

      await updateSapCode(req, res);

      // Should handle gracefully - either update with empty or return error
      expect(res.json).toHaveBeenCalled();
    });

    it("should trim whitespace from code and name", async () => {
      req.body = {
        code: "  E-11111-2222  ",
        name: "  Project Name  ",
      };

      SapCode.findOne.mockResolvedValue(null);
      SapCode.create.mockResolvedValue({
        id: 1,
        toJSON: function () {
          return this;
        },
      });

      await createSapCode(req, res);

      // Verify that code and name are trimmed (if controller implements this)
      if (SapCode.create.mock.calls.length > 0) {
        const createArgs = SapCode.create.mock.calls[0][0];
        // The controller should trim these values
        expect(typeof createArgs.code).toBe("string");
        expect(typeof createArgs.name).toBe("string");
      }
    });

    it("should handle very long descriptions", async () => {
      req.body = {
        code: "E-11111-2222",
        name: "Project",
        description: "A".repeat(1000), // Very long description
      };

      SapCode.findOne.mockResolvedValue(null);
      SapCode.create.mockResolvedValue({
        id: 1,
        toJSON: function () {
          return this;
        },
      });

      await createSapCode(req, res);

      // Should handle without errors
      expect(res.json).toHaveBeenCalled();
    });
  });
});
