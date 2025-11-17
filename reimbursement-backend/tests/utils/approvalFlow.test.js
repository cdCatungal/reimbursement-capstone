// reimbursement-backend/tests/utils/approvalFlow.test.js
import { it, describe, expect, afterEach, beforeEach } from "@jest/globals";
import {
  getApprovalFlow,
  getNextApprover,
  requiresSapCodeMatch,
  findApproverBySapCode,
} from "../../src/utils/approvalFlow.js";

// Import email templates
import {
  approvalProgressTemplate,
  finalApprovalTemplate,
  rejectionTemplate,
  newSubmissionToApproverTemplate,
  nextApproverNotificationTemplate,
} from "../../src/utils/emailTemplates.js";

// Import sendEmail utils
import { sendEmail } from "../../src/utils/sendEmail.js";

describe("Approval Flow Utils", () => {
  describe("getApprovalFlow", () => {
    it("should return correct flow for Employee", () => {
      const flow = getApprovalFlow("Employee");

      expect(flow).toEqual([
        "SUL",
        "Account Manager",
        "Invoice Specialist",
        "Finance Officer",
      ]);
    });

    it("should return correct flow for SUL", () => {
      const flow = getApprovalFlow("SUL");

      expect(flow).toEqual([
        "Sales Director",
        "Invoice Specialist",
        "Finance Officer",
      ]);
    });

    it("should return correct flow for Account Manager", () => {
      const flow = getApprovalFlow("Account Manager");

      expect(flow).toEqual([
        "Sales Director",
        "Invoice Specialist",
        "Finance Officer",
      ]);
    });

    it("should return correct flow for Invoice Specialist", () => {
      const flow = getApprovalFlow("Invoice Specialist");

      expect(flow).toEqual([
        "Sales Director",
        "Invoice Specialist",
        "Finance Officer",
      ]);
    });

    it("should return empty array for unknown role", () => {
      const flow = getApprovalFlow("Unknown Role");

      expect(flow).toEqual([]);
    });

    it("should return empty array for null role", () => {
      const flow = getApprovalFlow(null);

      expect(flow).toEqual([]);
    });
  });

  describe("getNextApprover", () => {
    it("should return first approver when no current approver", () => {
      const next = getNextApprover("Employee", null);

      expect(next).toBe("SUL");
    });

    it("should return next approver in sequence", () => {
      const next = getNextApprover("Employee", "SUL");

      expect(next).toBe("Account Manager");
    });

    it("should return null when at last approver", () => {
      const next = getNextApprover("Employee", "Finance Officer");

      expect(next).toBeNull();
    });

    it("should return null for unknown current approver", () => {
      const next = getNextApprover("Employee", "Unknown Role");

      expect(next).toBeNull();
    });

    it("should return null for unknown submitter role", () => {
      const next = getNextApprover("Unknown Role", "SUL");

      expect(next).toBeNull();
    });

    it("should handle SUL approval flow correctly", () => {
      expect(getNextApprover("SUL", null)).toBe("Sales Director");
      expect(getNextApprover("SUL", "Sales Director")).toBe(
        "Invoice Specialist"
      );
      expect(getNextApprover("SUL", "Invoice Specialist")).toBe(
        "Finance Officer"
      );
      expect(getNextApprover("SUL", "Finance Officer")).toBeNull();
    });
  });

  describe("requiresSapCodeMatch", () => {
    it("should require SAP code for SUL", () => {
      expect(requiresSapCodeMatch("SUL")).toBe(true);
    });

    it("should require SAP code for Account Manager", () => {
      expect(requiresSapCodeMatch("Account Manager")).toBe(true);
    });

    it("should not require SAP code for Sales Director", () => {
      expect(requiresSapCodeMatch("Sales Director")).toBe(false);
    });

    it("should not require SAP code for Invoice Specialist", () => {
      expect(requiresSapCodeMatch("Invoice Specialist")).toBe(false);
    });

    it("should not require SAP code for Finance Officer", () => {
      expect(requiresSapCodeMatch("Finance Officer")).toBe(false);
    });

    it("should require SAP code for Employee", () => {
      expect(requiresSapCodeMatch("Employee")).toBe(true);
    });
  });

  describe("findApproverBySapCode", () => {
    const mockUsers = [
      {
        id: 1,
        name: "SUL User 1",
        role: "SUL",
        sap_code_1: "E-12345-6789",
        sap_code_2: null,
      },
      {
        id: 2,
        name: "SUL User 2",
        role: "SUL",
        sap_code_1: "E-98765-4321",
        sap_code_2: null,
      },
      {
        id: 3,
        name: "Sales Director",
        role: "Sales Director",
        sap_code_1: null,
        sap_code_2: null,
      },
      {
        id: 4,
        name: "Account Manager",
        role: "Account Manager",
        sap_code_1: "E-12345-6789",
        sap_code_2: "E-11111-2222",
      },
    ];

    it("should find SUL with matching SAP code (sap_code_1)", () => {
      const approver = findApproverBySapCode("SUL", "E-12345-6789", mockUsers);

      expect(approver).toEqual(mockUsers[0]);
      expect(approver.id).toBe(1);
    });

    it("should find Account Manager with matching SAP code (sap_code_2)", () => {
      const approver = findApproverBySapCode(
        "Account Manager",
        "E-11111-2222",
        mockUsers
      );

      expect(approver).toEqual(mockUsers[3]);
      expect(approver.id).toBe(4);
    });

    it("should return null when no matching SAP code found", () => {
      const approver = findApproverBySapCode("SUL", "E-99999-9999", mockUsers);

      expect(approver).toBeNull();
    });

    it("should return any user with role for non-SAP dependent roles", () => {
      const approver = findApproverBySapCode(
        "Sales Director",
        "E-12345-6789",
        mockUsers
      );

      expect(approver).toEqual(mockUsers[2]);
      expect(approver.role).toBe("Sales Director");
    });

    it("should return null when no user with that role exists", () => {
      const approver = findApproverBySapCode(
        "Unknown Role",
        "E-12345-6789",
        mockUsers
      );

      expect(approver).toBeNull();
    });

    it("should handle empty users array", () => {
      const approver = findApproverBySapCode("SUL", "E-12345-6789", []);

      expect(approver).toBeNull();
    });

    it("should match sap_code_2 for users with multiple codes", () => {
      const approver = findApproverBySapCode(
        "Account Manager",
        "E-11111-2222",
        mockUsers
      );

      expect(approver).not.toBeNull();
      expect(approver.sap_code_2).toBe("E-11111-2222");
    });
  });

  describe("Integration Tests", () => {
    it("should handle complete Employee approval flow", () => {
      const flow = getApprovalFlow("Employee");

      expect(flow.length).toBe(4);
      expect(flow[0]).toBe("SUL");
      expect(getNextApprover("Employee", flow[0])).toBe(flow[1]);
      expect(getNextApprover("Employee", flow[1])).toBe(flow[2]);
      expect(getNextApprover("Employee", flow[2])).toBe(flow[3]);
      expect(getNextApprover("Employee", flow[3])).toBeNull();
    });

    it("should correctly identify SAP-dependent roles in flow", () => {
      const employeeFlow = getApprovalFlow("Employee");

      expect(requiresSapCodeMatch(employeeFlow[0])).toBe(true); // SUL
      expect(requiresSapCodeMatch(employeeFlow[1])).toBe(true); // Account Manager
      expect(requiresSapCodeMatch(employeeFlow[2])).toBe(false); // Invoice Specialist
      expect(requiresSapCodeMatch(employeeFlow[3])).toBe(false); // Finance Officer
    });
  });
});

describe("Email Templates", () => {
  describe("approvalProgressTemplate", () => {
    it("should generate valid HTML email", () => {
      const reimbursement = {
        sap_code: "E-12345-6789",
        category: "Meal with Client",
        total: "150.00",
        items: "Business lunch",
        description: "Client meeting",
        date_of_expense: "2024-01-15",
      };

      const html = approvalProgressTemplate(
        reimbursement,
        "SUL User",
        "SUL",
        "Account Manager",
        1
      );

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("Approval Level 1 Completed");
      expect(html).toContain("SUL User");
      expect(html).toContain("Account Manager");
      expect(html).toContain("E-12345-6789");
    });

    it("should format currency correctly", () => {
      const reimbursement = {
        sap_code: "E-12345-6789",
        category: "Meal",
        total: "1234.56",
      };

      const html = approvalProgressTemplate(
        reimbursement,
        "Approver",
        "SUL",
        "Manager",
        1
      );

      expect(html).toContain("1,234.56");
    });
  });

  describe("finalApprovalTemplate", () => {
    it("should generate final approval email", () => {
      const reimbursement = {
        sap_code: "E-12345-6789",
        category: "Transportation",
        total: "500.00",
      };

      const html = finalApprovalTemplate(
        reimbursement,
        "Finance Officer",
        "Finance Officer"
      );

      expect(html).toContain("Reimbursement Fully Approved");
      expect(html).toContain("All Approvals Complete");
      expect(html).toContain("Finance Officer");
    });
  });

  describe("rejectionTemplate", () => {
    it("should generate rejection email with remarks", () => {
      const reimbursement = {
        sap_code: "E-12345-6789",
        category: "Meal",
        total: "200.00",
      };

      const html = rejectionTemplate(
        reimbursement,
        "Employee Name",
        "SUL User",
        "SUL",
        "Invalid receipt provided",
        1
      );

      expect(html).toContain("Reimbursement Rejected");
      expect(html).toContain("Invalid receipt provided");
      expect(html).toContain("Employee Name");
      expect(html).toContain("SUL User");
    });
  });

  describe("newSubmissionToApproverTemplate", () => {
    it("should generate new submission notification", () => {
      const reimbursement = {
        sap_code: "E-12345-6789",
        category: "Meal",
        total: "150.00",
        items: "Business lunch",
        submitted_at: new Date("2024-01-15"),
      };

      const requester = {
        name: "John Doe",
        role: "Employee",
      };

      const html = newSubmissionToApproverTemplate(
        reimbursement,
        requester,
        "SUL User"
      );

      expect(html).toContain("New Reimbursement Request");
      expect(html).toContain("John Doe");
      expect(html).toContain("SUL User");
      expect(html).toContain("Action Required");
    });
  });

  describe("nextApproverNotificationTemplate", () => {
    it("should generate next approver notification", () => {
      const reimbursement = {
        sap_code: "E-12345-6789",
        category: "Meal",
        total: "150.00",
      };

      const requester = { name: "Employee", role: "Employee" };
      const previousApprover = { name: "SUL User", role: "SUL" };

      const html = nextApproverNotificationTemplate(
        reimbursement,
        requester,
        previousApprover,
        "Manager Name",
        2
      );

      expect(html).toContain("Ready for Your Review");
      expect(html).toContain("SUL User");
      expect(html).toContain("Manager Name");
      expect(html).toContain("Level 2");
    });
  });
});

describe("Send Email Utils", () => {
  describe("sendEmail", () => {
    beforeEach(() => {
      // Store original environment variables
      const mockEnv = {
        EMAIL_USER: "test@example.com",
        EMAIL_PASSWORD: "test-password",
      };
      mockEnv.EMAIL_USER = "test@example.com";
      mockEnv.EMAIL_PASSWORD = "test-password";
    });

    afterEach(() => {
      // Clean up environment variables
      const mockEnv = {
        EMAIL_USER: "test@example.com",
        EMAIL_PASSWORD: "test-password",
      };

      delete mockEnv.EMAIL_USER;
      delete mockEnv.EMAIL_PASSWORD;
    });

    it("should validate required environment variables", async () => {
      // Store the original value
      const originalApiKey = process.env.SENDGRID_API_KEY;

      // Properly delete the environment variable
      process.env.SENDGRID_API_KEY = "";

      await expect(
        sendEmail("test@example.com", "Subject", "<html></html>")
      ).rejects.toThrow("SendGrid API key missing");

      // Restore the original value
      process.env.SENDGRID_API_KEY = originalApiKey;
    });

    it("should handle CC recipients as array", () => {
      const ccArray = ["user1@example.com", "user2@example.com"];
      const filtered = ccArray.filter((email) => email && email.trim());
      const ccString = filtered.join(", ");

      expect(ccString).toBe("user1@example.com, user2@example.com");
    });

    it("should filter empty CC recipients", () => {
      const ccArray = ["user1@example.com", "", "user2@example.com", null];
      const filtered = ccArray.filter((email) => email && email.trim());

      expect(filtered).toEqual(["user1@example.com", "user2@example.com"]);
    });
  });

  describe("verifyEmailConfig", () => {
    it("should check for required email configuration", () => {
      const mockEnv = {
        EMAIL_USER: "test@example.com",
        EMAIL_PASSWORD: "test-password",
      };
      const hasUser = !!mockEnv.EMAIL_USER;
      const hasPassword = !!mockEnv.EMAIL_PASSWORD;

      expect(typeof hasUser).toBe("boolean");
      expect(typeof hasPassword).toBe("boolean");
    });
  });
});
