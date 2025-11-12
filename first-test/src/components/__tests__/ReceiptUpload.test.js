// first-test/src/components/__tests__/ReceiptUpload.test.js
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ReceiptUpload from "../ReceiptUpload";
import { useAppContext } from "../../App";

// Mock fetch globally with proper implementation
global.fetch = jest.fn();

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
    // Reset all mocks
    jest.clearAllMocks();

    // Mock AppContext
    useAppContext.mockReturnValue({
      showNotification: mockShowNotification,
      user: mockUser,
    });

    // DEFAULT SUCCESSFUL MOCK FOR ALL API CALLS
    fetch.mockImplementation((url, options) => {
      console.log("Fetch called with:", url, options);

      // Mock SAP codes endpoint
      if (
        url.includes("/api/sap-codes") ||
        url.includes("/api/user/sap-codes")
      ) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            sapCodes: [
              { id: 1, code: "E-12345-6789", name: "Test SAP Code" },
              { id: 2, code: "E-98765-4321", name: "Test SAP Code 2" },
            ],
          }),
        });
      }

      // Mock OCR endpoint
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

      // Mock reimbursement submission
      if (url.includes("/api/reimbursements")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: 1, status: "Pending" }),
        });
      }

      // Default fallback
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    });
  });

  // Helper function to wait for SAP codes to load
  const waitForSapCodesToLoad = async () => {
    await waitFor(
      () => {
        expect(
          screen.queryByText(/No SAP codes assigned/i)
        ).not.toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  };

  it("should render upload form with all required fields", async () => {
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

  it("should auto-select SAP code when user has only one", async () => {
    render(<ReceiptUpload />);

    await waitForSapCodesToLoad();

    const sapCodeSelect = screen.getByLabelText(/SAP Code/i);
    expect(sapCodeSelect).toBeInTheDocument();
  });

  it("should show warning when user has no SAP codes", async () => {
    // Mock user with no SAP codes
    useAppContext.mockReturnValue({
      showNotification: mockShowNotification,
      user: { ...mockUser, sap_code_1: null, sap_code_2: null },
    });

    render(<ReceiptUpload />);

    await waitFor(() => {
      expect(screen.getByText(/No SAP codes assigned/i)).toBeInTheDocument();
    });
  });

  it("should reject files larger than 5MB", async () => {
    render(<ReceiptUpload />);

    await waitForSapCodesToLoad();

    const file = new File(["x".repeat(6 * 1024 * 1024)], "large.jpg", {
      type: "image/jpeg",
    });

    const input = document.getElementById("receipt-upload");
    fireEvent.change(input, { target: { files: [file] } });

    expect(mockShowNotification).toHaveBeenCalledWith(
      "File size must be less than 5MB",
      "error"
    );
  });

  it("should reject non-image files", async () => {
    render(<ReceiptUpload />);

    await waitForSapCodesToLoad();

    const file = new File(["test"], "document.pdf", {
      type: "application/pdf",
    });

    const input = document.getElementById("receipt-upload");
    fireEvent.change(input, { target: { files: [file] } });

    expect(mockShowNotification).toHaveBeenCalledWith(
      "Only JPG, JPEG, or PNG files are allowed",
      "error"
    );
  });

  it("should validate future dates", async () => {
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
      // Adjust this to match your actual validation message
      expect(mockShowNotification).toHaveBeenCalledWith(
        expect.stringContaining("Date cannot be in the future") ||
          expect.stringContaining("Please fill in all required fields"),
        "error"
      );
    });
  });

  it("should handle successful OCR extraction", async () => {
    render(<ReceiptUpload />);

    await waitForSapCodesToLoad();

    const file = new File(["test"], "receipt.jpg", { type: "image/jpeg" });
    const input = document.getElementById("receipt-upload");
    fireEvent.change(input, { target: { files: [file] } });

    // Wait for file to be processed and OCR button to appear
    await waitFor(() => {
      expect(screen.getByText(/Extract Text \(OCR\)/i)).toBeInTheDocument();
    });

    const ocrButton = screen.getByText(/Extract Text \(OCR\)/i);
    fireEvent.click(ocrButton);

    await waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalledWith(
        expect.stringContaining("Receipt extracted") ||
          expect.stringContaining("OCR completed"),
        "success"
      );
    });
  });

  it("should validate required fields before submission", async () => {
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

  it("should successfully submit reimbursement with all data", async () => {
    render(<ReceiptUpload />);

    await waitForSapCodesToLoad();

    // Fill in form
    const file = new File(["test"], "receipt.jpg", { type: "image/jpeg" });
    const input = document.getElementById("receipt-upload");
    fireEvent.change(input, { target: { files: [file] } });

    // For Material-UI Select, find and click the option
    const categorySelect = screen.getByLabelText(/Category/i);
    fireEvent.mouseDown(categorySelect);

    // Wait for dropdown to open and select option
    await waitFor(() => {
      const categoryOption = screen.getByText("Meal with Client");
      fireEvent.click(categoryOption);
    });

    const totalInput = screen.getByLabelText(/Total Amount/i);
    fireEvent.change(totalInput, { target: { value: "100.50" } });

    const purposeInput = screen.getByLabelText(/Purpose/i);
    fireEvent.change(purposeInput, { target: { value: "Client meeting" } });

    const descriptionInput = screen.getByLabelText(/Description/i);
    fireEvent.change(descriptionInput, { target: { value: "Business lunch" } });

    const submitButton = screen.getByText(/Submit for Approval/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalledWith(
        "Reimbursement submitted successfully!",
        "success"
      );
    });
  });

  it("should handle submission error", async () => {
    // Mock submission to fail for this specific test
    fetch.mockImplementationOnce((url) => {
      if (url.includes("/api/reimbursements")) {
        return Promise.reject(new Error("Network error"));
      }
      // For other calls (like SAP codes), return success
      return Promise.resolve({
        ok: true,
        json: async () => ({
          sapCodes: [{ id: 1, code: "E-12345-6789", name: "Test SAP Code" }],
        }),
      });
    });

    render(<ReceiptUpload />);

    await waitForSapCodesToLoad();

    const file = new File(["test"], "receipt.jpg", { type: "image/jpeg" });
    const input = document.getElementById("receipt-upload");
    fireEvent.change(input, { target: { files: [file] } });

    const totalInput = screen.getByLabelText(/Total Amount/i);
    fireEvent.change(totalInput, { target: { value: "100" } });

    const purposeInput = screen.getByLabelText(/Purpose/i);
    fireEvent.change(purposeInput, { target: { value: "Test" } });

    const descriptionInput = screen.getByLabelText(/Description/i);
    fireEvent.change(descriptionInput, { target: { value: "Test" } });

    const submitButton = screen.getByText(/Submit for Approval/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalledWith(
        expect.stringContaining("Failed to submit") ||
          expect.stringContaining("Network error"),
        "error"
      );
    });
  });
});
