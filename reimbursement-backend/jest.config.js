export default {
  testEnvironment: "node",
  setupFilesAfterEnv: ["<rootDir>/tests/setup.js"],
  transform: {
    "^.+\\.js$": "babel-jest",
  },
  collectCoverageFrom: [
    "src/**/*.js",
    "config/**/*.js",
    "!src/index.js",
    "!**/*.test.js",
  ],
  coverageThreshold: {
    global: {
      branches: 20,
      functions: 20,
      lines: 20,
      statements: 20,
    },
  },
  testTimeout: 10000,
};
