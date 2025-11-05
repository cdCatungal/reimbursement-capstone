// reimbursement-backend/tests/setup.js
import { jest } from '@jest/globals';

// Setup test environment
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'test_db';
process.env.DB_USER = 'test_user';
process.env.DB_PASS = 'test_pass';
process.env.DB_HOST = 'localhost';
process.env.JWT_SECRET = 'test_secret_key';
process.env.SESSION_SECRET = 'test_session_secret';
process.env.AZURE_CLIENT_ID = 'test_client_id';
process.env.AZURE_CLIENT_SECRET = 'test_client_secret';
process.env.AZURE_TENANT_ID = 'test_tenant_id';
process.env.GEMINI_API_KEY = 'test_gemini_key';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Set longer timeout for integration tests
jest.setTimeout(10000);

export default {};