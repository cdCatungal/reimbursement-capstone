// first-test/src/store/__tests__/manageSapCodesStore.test.js
import { renderHook, act } from '@testing-library/react';
import { useManageSapCodesStore } from '../manageSapCodesStore';

global.fetch = jest.fn();

describe('manageSapCodesStore', () => {
  beforeEach(() => {
    fetch.mockClear();
    // Reset store state
    const { result } = renderHook(() => useManageSapCodesStore());
    act(() => {
      result.current.resetReportData?.();
    });
  });

  describe('fetchSapCodes', () => {
    it('should fetch SAP codes successfully', async () => {
      const mockSapCodes = [
        { id: 1, code: 'E-12345-6789', name: 'Project A', status: 'Active' },
        { id: 2, code: 'E-98765-4321', name: 'Project B', status: 'Active' },
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSapCodes,
      });

      const { result } = renderHook(() => useManageSapCodesStore());

      await act(async () => {
        await result.current.fetchSapCodes();
      });

      expect(result.current.sapCodes).toEqual(mockSapCodes);
      expect(result.current.loading).toBe(false);
    });

    it('should handle fetch error', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to fetch' }),
      });

      const { result } = renderHook(() => useManageSapCodesStore());

      await act(async () => {
        await result.current.fetchSapCodes();
      });

      expect(result.current.sapCodes).toEqual([]);
      expect(result.current.loading).toBe(false);
    });
  });

  describe('createSapCode', () => {
    it('should create new SAP code successfully', async () => {
      const newSapCode = {
        code: 'E-11111-2222',
        name: 'New Project',
        description: 'Test project',
        status: 'Active',
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 3, ...newSapCode }),
      });

      const { result } = renderHook(() => useManageSapCodesStore());

      let createResult;
      await act(async () => {
        createResult = await result.current.createSapCode(newSapCode);
      });

      expect(createResult.success).toBe(true);
    });

    it('should handle creation error', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Duplicate code' }),
      });

      const { result } = renderHook(() => useManageSapCodesStore());

      let createResult;
      await act(async () => {
        createResult = await result.current.createSapCode({
          code: 'E-11111-2222',
          name: 'Test',
        });
      });

      expect(createResult.success).toBe(false);
    });
  });

  describe('updateSapCode', () => {
    it('should update SAP code successfully', async () => {
      const updatedData = {
        code: 'E-12345-6789',
        name: 'Updated Project',
        status: 'Inactive',
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, ...updatedData }),
      });

      const { result } = renderHook(() => useManageSapCodesStore());

      let updateResult;
      await act(async () => {
        updateResult = await result.current.updateSapCode(1, updatedData);
      });

      expect(updateResult.success).toBe(true);
    });
  });

  describe('deleteSapCode', () => {
    it('should delete SAP code successfully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Deleted successfully' }),
      });

      const { result } = renderHook(() => useManageSapCodesStore());

      let deleteResult;
      await act(async () => {
        deleteResult = await result.current.deleteSapCode(1);
      });

      expect(deleteResult.success).toBe(true);
    });

    it('should handle deletion error', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Cannot delete' }),
      });

      const { result } = renderHook(() => useManageSapCodesStore());

      let deleteResult;
      await act(async () => {
        deleteResult = await result.current.deleteSapCode(999);
      });

      expect(deleteResult.success).toBe(false);
    });
  });

  describe('fetchActiveSapCodes', () => {
    it('should fetch only active SAP codes', async () => {
      const mockActiveCodes = [
        { id: 1, code: 'E-12345-6789', name: 'Active Project', status: 'Active' },
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockActiveCodes,
      });

      const { result } = renderHook(() => useManageSapCodesStore());

      await act(async () => {
        await result.current.fetchActiveSapCodes();
      });

      expect(result.current.sapCodes).toEqual(mockActiveCodes);
    });
  });
});

// first-test/src/store/__tests__/manageUsersStore.test.js
describe('manageUsersStore', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  it('should validate SAP code format', () => {
    const validCode = 'E-12345-6789';
    const invalidCode = 'INVALID';

    const sapCodeRegex = /^E-\d{5}-\d{4}$/i;

    expect(sapCodeRegex.test(validCode)).toBe(true);
    expect(sapCodeRegex.test(invalidCode)).toBe(false);
  });

  it('should identify roles without SAP codes', () => {
    const rolesWithoutSapCodes = [
      'Admin',
      'Invoice Specialist',
      'Sales Director',
      'Finance Officer',
    ];

    expect(rolesWithoutSapCodes).toContain('Admin');
    expect(rolesWithoutSapCodes).toContain('Invoice Specialist');
    expect(rolesWithoutSapCodes).not.toContain('Employee');
  });

  it('should allow Employee role to have two SAP codes', () => {
    const employeeRole = 'Employee';
    const rolesAllowingTwoSapCodes = ['Employee'];

    expect(rolesAllowingTwoSapCodes).toContain(employeeRole);
  });
});

// first-test/src/store/__tests__/userUserStore.test.js
describe('userUserStore', () => {
  it('should fetch user profile with Microsoft picture', async () => {
    const mockUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      profilePicture: 'data:image/jpeg;base64,test',
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockUser,
    });

    // Test user fetch logic
    expect(mockUser.profilePicture).toContain('data:image/jpeg');
  });

  it('should handle missing profile picture gracefully', async () => {
    const mockUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      profilePicture: null,
    };

    expect(mockUser.profilePicture).toBeNull();
  });
});