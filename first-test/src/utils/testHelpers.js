// first-test/src/utils/testHelpers.js

/**
 * Create a mock file for testing file uploads
 */
export const createMockFile = (
  name = 'test.jpg',
  size = 1024,
  type = 'image/jpeg'
) => {
  const content = 'x'.repeat(size);
  return new File([content], name, { type });
};

/**
 * Create mock user data
 */
export const createMockUser = (overrides = {}) => ({
  id: 1,
  username: 'Test User',
  email: 'test@example.com',
  role: 'Employee',
  sap_code_1: 'E-12345-6789',
  sap_code_2: null,
  token: 'mock-token',
  ...overrides,
});

/**
 * Create mock reimbursement data
 */
export const createMockReimbursement = (overrides = {}) => ({
  id: 1,
  category: 'Meal with Client',
  items: 'Business lunch',
  description: 'Client meeting at restaurant',
  total: '150.00',
  date: '2024-01-15',
  merchant: 'Test Restaurant',
  status: 'Pending',
  sapCode: 'E-12345-6789',
  submittedAt: '2024-01-15T10:00:00Z',
  user: {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    role: 'Employee',
  },
  receipt: {
    data: 'base64encodedstring',
    mimetype: 'image/jpeg',
    filename: 'receipt.jpg',
  },
  approvals: [
    {
      id: 1,
      approval_level: 1,
      approver_role: 'SUL',
      status: 'Pending',
      approver: null,
      approved_at: null,
      remarks: null,
    },
  ],
  ...overrides,
});

/**
 * Create mock SAP code data
 */
export const createMockSapCode = (overrides = {}) => ({
  id: 1,
  code: 'E-12345-6789',
  name: 'Project Alpha',
  description: 'Main project code',
  status: 'Active',
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

/**
 * Mock successful fetch response
 */
export const mockFetchSuccess = (data) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(data),
    })
  );
};

/**
 * Mock failed fetch response
 */
export const mockFetchError = (error = 'Network error', status = 500) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: false,
      status,
      json: () => Promise.resolve({ error }),
    })
  );
};

/**
 * Mock fetch rejection (network failure)
 */
export const mockFetchReject = (error = 'Network error') => {
  global.fetch = jest.fn(() => Promise.reject(new Error(error)));
};

/**
 * Wait for async operations to complete
 */
export const waitForAsync = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Create mock approval flow
 */
export const createMockApprovalFlow = (levels = 2) => {
  const approvalLevels = ['SUL', 'Account Manager', 'Sales Director'];
  
  return Array.from({ length: levels }, (_, index) => ({
    id: index + 1,
    approval_level: index + 1,
    approver_role: approvalLevels[index],
    status: index === 0 ? 'Pending' : 'Pending',
    approver: null,
    approved_at: null,
    remarks: null,
  }));
};

/**
 * Validate SAP code format
 */
export const isValidSapCode = (code) => {
  const sapCodeRegex = /^E-\d{5}-\d{4}$/i;
  return sapCodeRegex.test(code);
};

/**
 * Format date to YYYY-MM-DD
 */
export const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

/**
 * Calculate date difference in days
 */
export const daysSince = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Mock context provider for testing
 */
export const mockAppContext = (overrides = {}) => ({
  darkMode: false,
  toggleTheme: jest.fn(),
  user: createMockUser(),
  setUser: jest.fn(),
  isAuthenticated: true,
  setIsAuthenticated: jest.fn(),
  isAdmin: false,
  setIsAdmin: jest.fn(),
  isSalesDirector: false,
  setIsSalesDirector: jest.fn(),
  showNotification: jest.fn(),
  ...overrides,
});

/**
 * Test data generators
 */
export const testData = {
  validSapCodes: ['E-12345-6789', 'E-98765-4321', 'E-11111-2222'],
  invalidSapCodes: ['INVALID', '12345', 'E-123-456', 'e12345-6789'],
  
  categories: [
    'Transportation (Commute)',
    'Transportation (Drive)',
    'Meal with Client',
    'Overtime Meal',
    'Accomodation',
  ],
  
  roles: [
    'Employee',
    'SUL',
    'Account Manager',
    'Invoice Specialist',
    'Finance Officer',
    'Sales Director',
    'Admin',
  ],
  
  rolesWithoutSapCodes: [
    'Admin',
    'Invoice Specialist',
    'Sales Director',
    'Finance Officer',
  ],
  
  statuses: ['Pending', 'Approved', 'Rejected'],
};

/**
 * Assertion helpers
 */
export const assertions = {
  assertValidSapCode: (code) => {
    expect(code).toMatch(/^E-\d{5}-\d{4}$/i);
  },
  
  assertValidEmail: (email) => {
    expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  },
  
  assertValidDate: (date) => {
    const d = new Date(date);
    expect(d).toBeInstanceOf(Date);
    expect(d.toString()).not.toBe('Invalid Date');
  },
  
  assertPositiveAmount: (amount) => {
    const num = parseFloat(amount);
    expect(num).toBeGreaterThan(0);
    expect(isNaN(num)).toBe(false);
  },
};

/**
 * Clean up helpers
 */
export const cleanup = {
  clearAllMocks: () => {
    jest.clearAllMocks();
  },
  
  resetFetch: () => {
    if (global.fetch && typeof global.fetch.mockClear === 'function') {
      global.fetch.mockClear();
    }
  },
  
  resetConsole: () => {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  },
};

export default {
  createMockFile,
  createMockUser,
  createMockReimbursement,
  createMockSapCode,
  mockFetchSuccess,
  mockFetchError,
  mockFetchReject,
  waitForAsync,
  createMockApprovalFlow,
  isValidSapCode,
  formatDate,
  daysSince,
  mockAppContext,
  testData,
  assertions,
  cleanup,
};