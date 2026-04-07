// Optional: configure or set up a testing framework before each test
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Mock console.warn for tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};