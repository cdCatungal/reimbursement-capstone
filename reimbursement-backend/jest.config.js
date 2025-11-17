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
      branches: 30,
      functions: 35,
      lines: 30,
      statements: 30,
    },
  },
  testTimeout: 10000,
};
