import { render, screen } from '@testing-library/react';
import StatCard from '../app/components/dashboard/StatCard';
import { Package } from 'lucide-react';

// Mock the next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
}));

describe('StatCard Component', () => {
  it('renders the title and value correctly', () => {
    render(
      <StatCard
        title="Total Assets"
        value={42}
        icon={Package}
        status="default"
      />
    );
    
    expect(screen.getByText('Total Assets')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });
  
  it('shows loading state when isLoading is true', () => {
    render(
      <StatCard
        title="Total Assets"
        value={42}
        icon={Package}
        status="default"
        isLoading={true}
      />
    );
    
    // Check if the loading elements are present (pulse animation divs)
    expect(screen.queryByText('Total Assets')).not.toBeInTheDocument();
    expect(screen.queryByText('42')).not.toBeInTheDocument();
  });
  
  it('renders trend information when provided', () => {
    render(
      <StatCard
        title="Assets Online"
        value={36}
        icon={Package}
        status="success"
        trend={{ value: 12, isPositive: true }}
      />
    );
    
    expect(screen.getByText('Assets Online')).toBeInTheDocument();
    expect(screen.getByText('36')).toBeInTheDocument();
    expect(screen.getByText('+12%')).toBeInTheDocument();
  });
  
  it('uses the appropriate status colors', () => {
    const { container, rerender } = render(
      <StatCard
        title="Error Status"
        value={5}
        icon={Package}
        status="error"
      />
    );
    
    // Check for error status styling
    const card = container.firstChild;
    expect(card).toHaveClass('border-industrial-red/50');
    
    // Rerender with different status
    rerender(
      <StatCard
        title="Success Status"
        value={10}
        icon={Package}
        status="success"
      />
    );
    
    // Check for success status styling
    expect(card).toHaveClass('border-industrial-teal/50');
  });
});
