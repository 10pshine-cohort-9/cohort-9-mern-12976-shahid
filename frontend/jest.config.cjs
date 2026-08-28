/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "jest-environment-jsdom",

  transform: {
    "^.+\\.[jt]sx?$": ["babel-jest", { configFile: "./babel.config.cjs" }],
  },

  // Correct Jest key: setupFilesAfterEnv (not setupFilesAfterFramework)
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup/jest.setup.js"],

  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\.(svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$":
      "<rootDir>/src/__tests__/setup/fileMock.cjs",
    "^virtual:.*$": "<rootDir>/src/__tests__/setup/fileMock.cjs",
  },

  transformIgnorePatterns: [
    "/node_modules/(?!(dompurify|@tiptap|lucide-react)/)",
  ],

  testMatch: [
    "<rootDir>/src/**/*.test.{js,jsx}",
    "<rootDir>/src/**/*.spec.{js,jsx}",
  ],

  collectCoverageFrom: [
    "src/**/*.{js,jsx}",
    "!src/main.jsx",
    "!src/index.css",
    "!src/**/*.test.{js,jsx}",
    "!src/__tests__/**",
  ],

  coverageReporters: ["lcov", "text", "clover"],

  coverageDirectory: "coverage",

  // Shim import.meta.env (Vite-specific, undefined in Node/Jest)
  globals: {
    "import.meta": {
      env: {
        VITE_API_BASE_URL: "/api",
      },
    },
  },
};
