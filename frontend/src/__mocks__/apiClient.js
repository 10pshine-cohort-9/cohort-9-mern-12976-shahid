// Manual mock for src/api/apiClient.js
// Jest resolves this file automatically when any module calls:
//   jest.mock('../api/apiClient') or jest.mock('../../api/apiClient')
//
// Each method is a jest.fn() so tests can do:
//   apiClient.get.mockResolvedValueOnce({ data: { ... } })

const apiClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  // Interceptors are referenced in apiClient.js itself; expose stubs so
  // the real module doesn't crash during import in interceptor tests.
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
};

export default apiClient;
