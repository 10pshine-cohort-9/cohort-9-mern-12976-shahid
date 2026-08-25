/**
 * Mocha Root Hooks (loaded via --require in .mocharc.cjs)
 *
 * These hooks run ONCE for the entire test process, regardless of how many
 * test files are executed.  Individual test files must NOT call connectTestDB
 * / closeTestDB themselves — they only call clearTestDB in afterEach.
 *
 * See: https://mochajs.org/#root-hooks
 */

import { connectTestDB, clearTestDB, closeTestDB } from "./helpers/db.js";

// env vars (JWT_SECRET, JWT_EXPIRES_IN, NODE_ENV) are set by env.setup.cjs
// which is loaded synchronously before this ESM file is evaluated.

export const mochaHooks = {
  async beforeAll() {
    await connectTestDB();
  },

  async afterEach() {
    await clearTestDB();
  },

  async afterAll() {
    await closeTestDB();
  },
};
