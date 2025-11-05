// first-test/src/components/__tests__/ReceiptUpload.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReceiptUpload from '../ReceiptUpload';
import { useAppContext } from '../../App';

global.fetch = jest.fn();

jest.mock('../../App', () => ({
  useAppContext: jest.fn(),
}));

describe('ReceiptUpload Component', () => {
  const mockShowNotification = jest.fn();
  const mockUser = {
    token: 'test-token',
    sap_code_1: 'E-12345-6789',
    sap_code_2: null,
  };

  beforeEach(() => {
    useAppContext.mockReturnValue({
      showNotification: mockShowNotification,
      user: mockUser,
    });

    fetch.mockClear();
    mockShowNotification.mockClear();
  });

  it('should render upload form with all required fields', () => {
    render(<ReceiptUpload />);

    expect(screen.getByText('Upload Receipt for Reimbursement')).toBeInTheDocument();
    expect(screen.getByLabelText(/SAP Code/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Total Amount/i)).toBeInTheDocument();
  });

  it('should auto-select SAP code when user has only one', () => {
    render(<ReceiptUpload />);

    const sapCodeSelect = screen.getByLabelText(/SAP Code/i);
    expect(sapCodeSelect).toHaveValue('E-12345-6789');
  });

  it('should show warning when user has no SAP codes', () => {
    useAppContext.mockReturnValue({
      showNotification: mockShowNotification,
      user: { ...mockUser, sap_code_1: null, sap_code_2: null },
    });

    render(<ReceiptUpload />);

    expect(screen.getByText(/No SAP codes assigned/i)).toBeInTheDocument();
  });

  it('should reject files larger than 5MB', () => {
    render(<ReceiptUpload />);

    const file = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', {
      type: 'image/jpeg',
    });

    const input = screen.getByLabelText(/receipt-upload/i, { selector: 'input' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(mockShowNotification).toHaveBeenCalledWith(
      'File size must be less than 5MB',
      'error'
    );
  });

  it('should reject non-image files', () => {
    render(<ReceiptUpload />);

    const file = new File(['test'], 'document.pdf', { type: 'application/pdf' });

    const input = screen.getByLabelText(/receipt-upload/i, { selector: 'input' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(mockShowNotification).toHaveBeenCalledWith(
      'Please upload an image file',
      'error'
    );
  });

  it('should validate future dates', async () => {
    render(<ReceiptUpload />);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const futureDateString = futureDate.toISOString().split('T')[0];

    const dateInput = screen.getByLabelText(/Date/i);
    fireEvent.change(dateInput, { target: { value: futureDateString } });

    const submitButton = screen.getByText(/Submit for Approval/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalledWith(
        'Please fill in all required fields',
        'error'
      );
    });
  });

  it('should handle successful OCR extraction', async () => {
    const mockOCRResponse = {
      cleanedText: 'Receipt text',
      structured: {
        date: '15/01/2024',
        merchant: 'Test Store',
        total: '100.50',
        items: [
          { description: 'Item 1', price: 50.25 },
          { description: 'Item 2', price: 50.25 },
        ],
      },
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockOCRResponse,
    });

    render(<ReceiptUpload />);

    const file = new File(['test'], 'receipt.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/receipt-upload/i, { selector: 'input' });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      const ocrButton = screen.getByText(/Extract Text \(OCR\)/i);
      fireEvent.click(ocrButton);
    });

    await waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalledWith(
        expect.stringContaining('Receipt extracted'),
        'success'
      );
    });
  });

  it('should validate required fields before submission', async () => {
    render(<ReceiptUpload />);

    const submitButton = screen.getByText(/Submit for Approval/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalledWith(
        'Please fill in all required fields',
        'error'
      );
    });
  });

  it('should successfully submit reimbursement with all data', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, status: 'Pending' }),
    });

    render(<ReceiptUpload />);

    // Fill in form
    const file = new File(['test'], 'receipt.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/receipt-upload/i, { selector: 'input' });
    fireEvent.change(input, { target: { files: [file] } });

    const categorySelect = screen.getByLabelText(/Category/i);
    fireEvent.change(categorySelect, { target: { value: 'Meal with Client' } });

    const totalInput = screen.getByLabelText(/Total Amount/i);
    fireEvent.change(totalInput, { target: { value: '100.50' } });

    const purposeInput = screen.getByLabelText(/Purpose/i);
    fireEvent.change(purposeInput, { target: { value: 'Client meeting' } });

    const descriptionInput = screen.getByLabelText(/Description/i);
    fireEvent.change(descriptionInput, { target: { value: 'Business lunch' } });

    const submitButton = screen.getByText(/Submit for Approval/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalledWith(
        'Reimbursement submitted successfully!',
        'success'
      );
    });
  });

  it('should clear form after successful submission', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1 }),
    });

    render(<ReceiptUpload />);

    // Submit form
    const file = new File(['test'], 'receipt.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/receipt-upload/i, { selector: 'input' });
    fireEvent.change(input, { target: { files: [file] } });

    const totalInput = screen.getByLabelText(/Total Amount/i);
    fireEvent.change(totalInput, { target: { value: '100.50' } });

    const purposeInput = screen.getByLabelText(/Purpose/i);
    fireEvent.change(purposeInput, { target: { value: 'Test' } });

    const descriptionInput = screen.getByLabelText(/Description/i);
    fireEvent.change(descriptionInput, { target: { value: 'Test desc' } });

    const submitButton = screen.getByText(/Submit for Approval/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(totalInput.value).toBe('');
      expect(purposeInput.value).toBe('');
    });
  });

  it('should handle submission error', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<ReceiptUpload />);

    const file = new File(['test'], 'receipt.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/receipt-upload/i, { selector: 'input' });
    fireEvent.change(input, { target: { files: [file] } });

    const totalInput = screen.getByLabelText(/Total Amount/i);
    fireEvent.change(totalInput, { target: { value: '100' } });

    const purposeInput = screen.getByLabelText(/Purpose/i);
    fireEvent.change(purposeInput, { target: { value: 'Test' } });

    const descriptionInput = screen.getByLabelText(/Description/i);
    fireEvent.change(descriptionInput, { target: { value: 'Test' } });

    const submitButton = screen.getByText(/Submit for Approval/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockShowNotification).toHaveBeenCalledWith(
        expect.stringContaining('Failed to submit'),
        'error'
      );
    });
  });
});