/**
 * CJS preload — sets test env vars BEFORE any ES module is evaluated.
 * Listed first in .mocharc.cjs `require` so it runs before mocha.setup.js.
 * Must be .cjs so Node loads it synchronously in a CommonJS context.
 */
"use strict";

process.env.JWT_SECRET = "integration_test_secret_key";
process.env.JWT_EXPIRES_IN = "7d";
process.env.NODE_ENV = "test";
