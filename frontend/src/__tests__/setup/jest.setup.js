// Extend Jest with @testing-library/jest-dom custom matchers
// (toBeInTheDocument, toHaveTextContent, etc.)
import "@testing-library/jest-dom";

// ── TextEncoder / TextDecoder ─────────────────────────────────────────────────
// react-router v7 uses the WHATWG URL API which requires TextEncoder.
// jsdom in Jest does not polyfill these by default.
import { TextEncoder, TextDecoder } from "util";
if (!global.TextEncoder) global.TextEncoder = TextEncoder;
if (!global.TextDecoder) global.TextDecoder = TextDecoder;

// ── window.matchMedia ─────────────────────────────────────────────────────────
// jsdom does not implement matchMedia. ThemeContext reads it on init.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// ── window.location ───────────────────────────────────────────────────────────
// jsdom's window.location setter triggers "Not implemented: navigation" errors.
// Suppress those by redirecting them through the console.error filter below
// (which already drops "Error: Not implemented: navigation" messages).
// We do NOT try to replace window.location here — jsdom v24+ prevents it.
// Tests that need to verify redirects spy on authStorage.removeToken instead.

// ── URL blob helpers ──────────────────────────────────────────────────────────
// Used in NoteEditorPanel and ProfilePage for image previews.
global.URL.createObjectURL = jest.fn(() => "blob:mock-object-url");
global.URL.revokeObjectURL = jest.fn();

// ── DOMParser ────────────────────────────────────────────────────────────────
// jsdom provides DOMParser, but ensure it's available on global for tests.
if (!global.DOMParser) {
  global.DOMParser = window.DOMParser;
}

// ── Suppress noisy console output ────────────────────────────────────────────
// Silence known React/Testing Library noise AND jsdom "not implemented" warnings
// so failing tests stay readable. Applied globally (not in beforeAll) so it
// catches errors that fire during test setup/teardown phases.
const originalError = console.error.bind(console);
const originalWarn = console.warn.bind(console);

const SUPPRESSED_PATTERNS = [
  "Warning: An update to",
  "inside a test was not wrapped in act",
  "Warning: ReactDOM.render",
  "Not implemented: navigation",
  "Error: Not implemented",
  "Suspense/Lazy",
];

console.error = (...args) => {
  const msg = typeof args[0] === "string" ? args[0] : String(args[0] ?? "");
  if (SUPPRESSED_PATTERNS.some((p) => msg.includes(p))) return;
  // Also suppress Error objects whose message matches
  if (args[0] instanceof Error) {
    const errMsg = args[0].message ?? "";
    if (SUPPRESSED_PATTERNS.some((p) => errMsg.includes(p))) return;
  }
  originalError(...args);
};

console.warn = (...args) => {
  const msg = typeof args[0] === "string" ? args[0] : "";
  if (msg.includes("componentWillReceiveProps") || msg.includes("act(")) return;
  originalWarn(...args);
};

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// ── Reset mocks between tests ─────────────────────────────────────────────────
afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});
