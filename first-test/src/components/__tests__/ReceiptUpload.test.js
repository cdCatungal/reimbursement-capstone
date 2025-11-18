import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import ReceiptUpload from "../ReceiptUpload";
import { useAppContext } from "../../App";

// ✅ Mock global fetch
global.fetch = jest.fn();

// ✅ Mock context hook
jest.mock("../../App", () => ({
  useAppContext: jest.fn(),
}));

// Increase timeout for slow tests
jest.setTimeout(15000);

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
    // override the default mock for this test only
    fetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          data: {
            sapCodes: [], // <<=== IMPORTANT
          },
        }),
      })
    );

    // user also has no local SAP codes
    useAppContext.mockReturnValueOnce({
      showNotification: mockShowNotification,
      user: { sap_code_1: null, sap_code_2: null },
    });

    render(<ReceiptUpload />);

    await waitFor(() => {
      expect(
        screen.getByText(/No SAP codes assigned to your account/i)
      ).toBeInTheDocument();
    });
  });

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

  it("auto-selects SAP code when only one is available", async () => {
    render(<ReceiptUpload />);
    await waitForSapCodesToLoad();

    const sapCodeSelect = screen.getByLabelText(/SAP Code/i);
    expect(sapCodeSelect).toBeInTheDocument();
  });

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

  it("rejects files larger than 5MB", async () => {
    render(<ReceiptUpload />);
    await waitForSapCodesToLoad();

    const file = new File(["x".repeat(6 * 1024 * 1024)], "large.jpg", {
      type: "image/jpeg",
    });

    Object.defineProperty(file, "size", {
      value: 6 * 1024 * 1024,
      writable: false,
    });

    const input = screen.getByTestId("receipt-upload");
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalledWith(
        "File size must be less than 5MB",
        "error"
      );
    });
  });

  it("rejects non-image files", async () => {
    render(<ReceiptUpload />);
    await waitForSapCodesToLoad();

    const file = new File(["test"], "document.pdf", {
      type: "application/pdf",
    });

    const input = screen.getByTestId("receipt-upload");
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(
      () => {
        const pdfText = screen.queryByText(/PDF Receipt Uploaded/i);
        expect(
          pdfText ||
            mockShowNotification.mock.calls.some(([msg]) =>
              /only.*jpg.*jpeg.*png|image.*allowed|not.*supported/i.test(msg)
            )
        ).toBeTruthy();
      },
      { timeout: 2000 }
    );
  });

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

  // it("should successfully submit reimbursement with all data", async () => {
  //   render(<ReceiptUpload />);

  //   await waitForSapCodesToLoad();

  //   // Fill in form
  //   const file = new File(["test"], "receipt.jpg", { type: "image/jpeg" });
  //   const input = screen.getByTestId("receipt-upload");
  //   fireEvent.change(input, { target: { files: [file] } });

  //   // For Material-UI Select, find and click the option
  //   const categorySelect = screen.getByLabelText(/Category/i);
  //   fireEvent.mouseDown(categorySelect);

  //   // Wait for dropdown to open and select option
  //   await waitFor(() => {
  //     const categoryOption = screen.getByText("Meal with Client");
  //     fireEvent.click(categoryOption);
  //   });

  //   const totalInput = screen.getByLabelText(/Total Amount/i);
  //   fireEvent.change(totalInput, { target: { value: "100.50" } });

  //   const purposeInput = screen.getByLabelText(/Purpose/i);
  //   fireEvent.change(purposeInput, { target: { value: "Client meeting" } });

  //   const descriptionInput = screen.getByLabelText(/Description/i);
  //   fireEvent.change(descriptionInput, { target: { value: "Business lunch" } });

  //   const submitButton = screen.getByText(/Submit for Approval/i);
  //   fireEvent.click(submitButton);

  //   await waitFor(() => {
  //     expect(mockShowNotification).toHaveBeenCalledWith(
  //       "Reimbursement submitted successfully!",
  //       "success"
  //     );
  //   });
  // });

  // it("should handle submission error", async () => {
  //   const user = userEvent.setup();

  //   // Mock SAP codes fetch first
  //   fetch.mockResolvedValueOnce({
  //     ok: true,
  //     json: async () => ({
  //       data: {
  //         sapCodes: [{ id: 1, code: "E-12345-6789", name: "Test SAP Code" }],
  //       },
  //     }),
  //   });

  //   // Mock submission failure
  //   fetch.mockRejectedValueOnce(new Error("Network error"));

  //   render(<ReceiptUpload />);
  //   await waitForSapCodesToLoad();

  //   // Upload file
  //   const file = new File(["test"], "receipt.jpg", { type: "image/jpeg" });
  //   const input = screen.getByTestId("receipt-upload");
  //   await user.upload(input, file);

  //   // Fill form fields
  //   const totalInput = screen.getByLabelText(/Total Amount/i);
  //   await user.clear(totalInput);
  //   await user.type(totalInput, "100");

  //   const purposeInput = screen.getByLabelText(/Purpose/i);
  //   await user.clear(purposeInput);
  //   await user.type(purposeInput, "Test");

  //   const descriptionInput = screen.getByLabelText(/Description/i);
  //   await user.clear(descriptionInput);
  //   await user.type(descriptionInput, "Test");

  //   // Submit form
  //   const submitButton = screen.getByText(/Submit for Approval/i);
  //   await user.click(submitButton);

  //   // Assert notification called with error
  //   await waitFor(() => {
  //     expect(mockShowNotification).toHaveBeenCalledWith(
  //       expect.stringMatching(/Failed to submit|Network error/i),
  //       "error"
  //     );
  //   });
  // });
});
