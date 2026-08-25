"use strict";

module.exports = {
  require: [
    // 1. Set env vars synchronously before ANY ESM module is evaluated
    "src/_test_/env.setup.cjs",
    // 2. Connect / clear / close MongoMemoryServer via root hooks
    "src/_test_/mocha.setup.js",
  ],

  // Discover all test files inside _test_/ recursively
  spec: "src/_test_/**/*.test.js",

  // 15 s is generous enough for MongoMemoryServer spin-up
  timeout: 15000,

  // Force Mocha to exit after all tests finish
  exit: true,
};
