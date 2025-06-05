import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import React from 'react';

// Mock modules
jest.mock('./hooks/useAuth', () => ({
  useAuth: jest.fn()
}));

// Mock other components that might cause issues
jest.mock('./components/Sidebar', () => ({
  __esModule: true,
  default: () => <div data-testid="sidebar">Sidebar</div>
}));

jest.mock('./components/Header', () => ({
  __esModule: true,
  default: () => <div data-testid="header">Header</div>
}));

jest.mock('./pages/Dashboard', () => ({
  __esModule: true,
  default: () => <div data-testid="dashboard">Dashboard</div>
}));

jest.mock('./pages/Assets', () => ({
  __esModule: true,
  default: () => <div data-testid="assets">Assets</div>
}));

jest.mock('./pages/WorkOrders', () => ({
  __esModule: true,
  default: () => <div data-testid="work-orders">Work Orders</div>
}));

// Mock shared schema
jest.mock('@shared/schema', () => ({
  insertAssetSchema: {
    shape: {
      name: {},
      description: {},
      type: {},
      status: {},
      location: {},
      purchaseDate: {},
      purchaseCost: {},
      model: {},
      serialNumber: {},
      assignedTo: {}
    }
  }
}));

// Mock store slices
jest.mock('./store/slices/authSlice', () => ({
  ...jest.requireActual('./store/slices/authSlice'),
  default: () => ({}),
}));

jest.mock('./store/slices/assetSlice', () => ({
  ...jest.requireActual('./store/slices/assetSlice'),
  default: () => ({}),
}));

jest.mock('./store/slices/workOrderSlice', () => ({
  ...jest.requireActual('./store/slices/workOrderSlice'),
  default: () => ({}),
}));

jest.mock('./store/slices/notificationSlice', () => ({
  ...jest.requireActual('./store/slices/notificationSlice'),
  default: () => ({}),
}));

// Import the mocked module
import { useAuth } from './hooks/useAuth';

// Cast the mocked function to the correct type
const mockedUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Create a wrapper component for tests with all providers
const createTestWrapper = () => {
  // Create a new QueryClient for each test
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  // Create a proper Redux store with configureStore
  const mockStore = configureStore({
    reducer: {
      auth: () => ({}),
      assets: () => ({}),
      workOrders: () => ({}),
      notifications: () => ({}),
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
  });

  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={mockStore}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </Provider>
  );
};

describe('App', () => {
  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state', () => {
    mockedUseAuth.mockReturnValue({ 
      isAuthenticated: false, 
      isLoading: true,
      user: undefined,
      hasRole: () => false,
      hasAnyRole: () => false,
      hasAllRoles: () => false
    });
    const TestWrapper = createTestWrapper();
    render(<App />, { wrapper: TestWrapper });
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });

  it('renders landing page when not authenticated', () => {
    mockedUseAuth.mockReturnValue({ 
      isAuthenticated: false, 
      isLoading: false,
      user: undefined,
      hasRole: () => false,
      hasAnyRole: () => false,
      hasAllRoles: () => false
    });
    const TestWrapper = createTestWrapper();
    render(<App />, { wrapper: TestWrapper });
    expect(screen.getByText(/ProSync Hub/i)).toBeInTheDocument();
  });

  it('renders dashboard when authenticated', () => {
    mockedUseAuth.mockReturnValue({ 
      isAuthenticated: true, 
      isLoading: false,
      user: { id: '1', name: 'Test User' },
      hasRole: () => true,
      hasAnyRole: () => true,
      hasAllRoles: () => true
    });
    const TestWrapper = createTestWrapper();
    render(<App />, { wrapper: TestWrapper });
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });
});
