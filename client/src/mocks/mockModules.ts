// Mock for @shared/schema
jest.mock('@shared/schema', () => ({
  insertAssetSchema: {
    parse: jest.fn(),
  },
  assets: {},
  workOrders: {},
  users: {},
  notifications: {},
  workOrderSchema: {
    parse: jest.fn(),
  },
  userSchema: {
    parse: jest.fn(),
  },
  // Add other exports from schema.ts as needed
}));

// Mock the queryClient
jest.mock('@/lib/queryClient', () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
  },
  apiRequest: jest.fn(),
}));

// Mock the store
jest.mock('@/store', () => ({
  store: {},
}));
