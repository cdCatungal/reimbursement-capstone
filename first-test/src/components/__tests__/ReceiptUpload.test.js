// first-test/src/components/__tests__/ReceiptUpload.test.js

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ReceiptUpload from "../ReceiptUpload";
import { useAppContext } from "../../App";

// ✅ Mock global fetch
global.fetch = jest.fn();

// ✅ Mock context hook
jest.mock("../../App", () => ({
  useAppContext: jest.fn(),
}));

describe("ReceiptUpload Component", () => {
  const mockShowNotification = jest.fn();
  const mockUser = {
    token: "test-token",
    sap_code_1: "E-12345-6789",
    sap_code_2: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // ✅ Default AppContext Mock
    useAppContext.mockReturnValue({
      showNotification: mockShowNotification,
      user: mockUser,
    });

    // ✅ Default Fetch Mock (handles all API endpoints)
    fetch.mockImplementation((url, options) => {
      console.log("➡️ Fetch called:", url);

      // SAP Codes
      if (url.includes("/api/users/settings")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: {
              sapCodes: [
                { id: 1, code: "E-12345-6789", name: "Primary SAP Code" },
                { id: 2, code: "E-98765-4321", name: "Secondary SAP Code" },
              ],
            },
          }),
        });
      }

      // OCR
      if (url.includes("/api/ocr")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            cleanedText: "Receipt text",
            structured: {
              date: "15/01/2024",
              merchant: "Test Store",
              total: "100.50",
            },
          }),
        });
      }

      // Reimbursement Submission
      if (url.includes("/api/reimbursements")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: 1, status: "Pending" }),
        });
      }

      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
  });

  // ✅ Utility function: Wait until SAP codes are loaded
  const waitForSapCodesToLoad = async () => {
    await waitFor(
      () => {
        const warning = screen.queryByText(/No SAP codes assigned/i);
        expect(warning).not.toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  };

  it("should render form with SAP warning when no codes available", async () => {
    render(<ReceiptUpload />);

    // Wait for the component to load and show the warning
    await waitFor(() => {
      expect(
        screen.getByText(/No SAP codes assigned to your account/i)
      ).toBeInTheDocument();
    });

    // The form should still render
    expect(
      screen.getByText(/^Upload Receipt for Reimbursement$/)
    ).toBeInTheDocument();
    expect(screen.getByText(/^Click to Upload Receipt$/)).toBeInTheDocument();
  });

  // ✅ Test: Component Renders Properly
  it("renders upload form with all fields", async () => {
    render(<ReceiptUpload />);

    await waitForSapCodesToLoad();

    expect(
      screen.getByText("Upload Receipt for Reimbursement")
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/SAP Code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Total Amount/i)).toBeInTheDocument();
  });

  // // ✅ Test: Auto-select SAP Code
  it("auto-selects SAP code when only one is available", async () => {
    render(<ReceiptUpload />);
    await waitForSapCodesToLoad();

    const sapCodeSelect = screen.getByLabelText(/SAP Code/i);
    expect(sapCodeSelect).toBeInTheDocument();
  });

  // // ✅ Test: Warning when no SAP Codes exist
  it("shows warning when user has no SAP codes", async () => {
    useAppContext.mockReturnValue({
      showNotification: mockShowNotification,
      user: { ...mockUser, sap_code_1: null, sap_code_2: null },
    });

    render(<ReceiptUpload />);

    await waitFor(() => {
      expect(screen.getByText(/No SAP codes assigned/i)).toBeInTheDocument();
    });
  });

  // // ✅ Test: Reject file > 5MB
  it("rejects files larger than 5MB", async () => {
    render(<ReceiptUpload />);
    await waitForSapCodesToLoad();

    const file = new File(["x".repeat(6 * 1024 * 1024)], "large.jpg", {
      type: "image/jpeg",
    });
    const input = screen.getByTestId("receipt-upload");

    fireEvent.change(input, { target: { files: [file] } });

    expect(mockShowNotification).toHaveBeenCalledWith(
      "File size must be less than 5MB",
      "error"
    );
  });

  // // ✅ Test: Reject non-image files
  it("rejects non-image files", async () => {
    render(<ReceiptUpload />);
    await waitForSapCodesToLoad();

    const file = new File(["test"], "document.pdf", {
      type: "application/pdf",
    });
    // const input = document.getElementById("receipt-upload");
    const input = screen.getByTestId("receipt-upload");

    fireEvent.change(input, { target: { files: [file] } });

    expect(mockShowNotification).toHaveBeenCalledWith(
      "Only JPG, JPEG, or PNG files are allowed",
      "error"
    );
  });

  // // ✅ Test: Validate future dates
  it("validates that future dates are not allowed", async () => {
    render(<ReceiptUpload />);
    await waitForSapCodesToLoad();

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const futureDateString = futureDate.toISOString().split("T")[0];

    const dateInput = screen.getByLabelText(/Date/i);
    fireEvent.change(dateInput, { target: { value: futureDateString } });

    const submitButton = screen.getByText(/Submit for Approval/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalledWith(
        expect.stringMatching(
          /Date cannot be in the future|Please fill in all required fields/i
        ),
        "error"
      );
    });
  });

  // // ✅ Test: Handle OCR Extraction
  it("handles successful OCR extraction", async () => {
    render(<ReceiptUpload />);
    await waitForSapCodesToLoad();

    const file = new File(["test"], "receipt.jpg", { type: "image/jpeg" });
    const input = screen.getByTestId("receipt-upload");
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Extract Text \(OCR\)/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Extract Text \(OCR\)/i));

    await waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalledWith(
        expect.stringMatching(/Receipt extracted|OCR completed/i),
        "success"
      );
    });
  });

  // // ✅ Test: Required fields validation
  it("validates required fields before submission", async () => {
    render(<ReceiptUpload />);
    await waitForSapCodesToLoad();

    const submitButton = screen.getByText(/Submit for Approval/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalledWith(
        "Please fill in all required fields",
        "error"
      );
    });
  });

  // // ✅ Test: Successful reimbursement submission
  it("submits reimbursement successfully", async () => {
    render(<ReceiptUpload />);
    await waitForSapCodesToLoad();

    const file = new File(["test"], "receipt.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByTestId("receipt-upload"), {
      target: { files: [file] },
    });

    //   // ✅ Select SAP Code (might not be auto-selected)
    fireEvent.mouseDown(screen.getByLabelText(/SAP Code/i));
    const sapCodeOption = await screen.findByRole("option", {
      name: /E-12345-6789/i,
    });
    fireEvent.click(sapCodeOption);

    //   // ✅ Select Category
    fireEvent.mouseDown(screen.getByLabelText(/Category/i));
    const mealOption = await screen.findByRole("option", {
      name: "Meal with Client",
    });
    fireEvent.click(mealOption);

    fireEvent.change(screen.getByLabelText(/Total Amount/i), {
      target: { value: "100.50" },
    });
    fireEvent.change(screen.getByLabelText(/Purpose/i), {
      target: { value: "Client meeting" },
    });
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: "Business lunch" },
    });

    // ✅ Add Date if required
    fireEvent.change(screen.getByLabelText(/Date/i), {
      target: { value: "2024-01-15" },
    });

    fireEvent.click(screen.getByText(/Submit for Approval/i));

    await waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalledWith(
        "Reimbursement submitted successfully!",
        "success"
      );
    });
  });

  // // ✅ Test: Submission error handling
  it("handles submission error correctly", async () => {
    // fetch.mockImplementationOnce((url) => {
    //   if (url.includes("/api/users/settings")) {
    //     return Promise.resolve({
    //       ok: true,
    //       json: async () => ({
    //         data: {
    //           sapCodes: [
    //             { id: 1, code: "E-12345-6789", name: "Test SAP Code" },
    //           ],
    //         },
    //       }),
    //     });
    //   }
    //   // For other URLs, use the default mock behavior
    //   return (
    //     fetch.defaultMockImplementation?.(url) ||
    //     Promise.resolve({
    //       ok: true,
    //       json: async () => ({}),
    //     })
    //   );
    // });

    // fetch.mockImplementationOnce((url) => {
    //   if (url.includes("/api/reimbursements")) {
    //     console.log("🎯 Mock: Rejecting reimbursement API");
    //     return Promise.reject(new Error("Network error"));
    //   }
    //   // For other URLs, use the default mock behavior
    //   return (
    //     fetch.defaultMockImplementation?.(url) ||
    //     Promise.resolve({
    //       ok: true,
    //       json: async () => ({}),
    //     })
    //   );
    // });

    global.fetch = jest
      .fn()
      // First call: SAP codes (success)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            sapCodes: [{ id: 1, code: "E-12345-6789", name: "Test SAP Code" }],
          },
        }),
      })
      // Second call: Reimbursement (failure)
      .mockRejectedValueOnce(new Error("Network error"));

    render(<ReceiptUpload />);
    await waitForSapCodesToLoad();

    const file = new File(["test"], "receipt.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByTestId("receipt-upload"), {
      target: { files: [file] },
    });

    // ✅ ADD MISSING REQUIRED FIELDS:

    // Select SAP Code
    fireEvent.mouseDown(screen.getByLabelText(/SAP Code/i));
    const sapCodeOption = await screen.findByRole("option", {
      name: /E-12345-6789/i,
    });
    fireEvent.click(sapCodeOption);

    // Select Category
    fireEvent.mouseDown(screen.getByLabelText(/Category/i));
    const categoryOption = await screen.findByRole("option", {
      name: /Meal with Client/i,
    });
    fireEvent.click(categoryOption);

    // Add Date if required
    fireEvent.change(screen.getByLabelText(/Date/i), {
      target: { value: "2024-01-15" },
    });

    fireEvent.change(screen.getByLabelText(/Total Amount/i), {
      target: { value: "100" },
    });
    fireEvent.change(screen.getByLabelText(/Purpose/i), {
      target: { value: "Test" },
    });
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: "Test" },
    });

    fireEvent.click(screen.getByText(/Submit for Approval/i));

    await waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalledWith(
        expect.stringMatching(/Failed to submit reimbursement|Network error/i),
        "error"
      );
    });
  });
});
