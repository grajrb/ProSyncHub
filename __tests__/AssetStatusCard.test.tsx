import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AssetStatusCard from '../app/components/dashboard/AssetStatusCard';
import { mockAssets } from '../app/lib/mock-data';

// Mock the next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
}));

describe('AssetStatusCard Component', () => {
  const mockAsset = mockAssets[0];
  const mockSensorData = {
    temperature: 75.5,
    vibration: 2.1,
    pressure: 8.7
  };
  
  it('renders asset information correctly', () => {
    render(
      <AssetStatusCard
        asset={mockAsset}
        sensorData={mockSensorData}
      />
    );
    
    // Check asset info is displayed
    expect(screen.getByText(mockAsset.name)).toBeInTheDocument();
    expect(screen.getByText(mockAsset.asset_tag)).toBeInTheDocument();
    
    // Check status is displayed
    expect(screen.getByText('Online')).toBeInTheDocument();
  });
  
  it('displays sensor data when provided', () => {
    render(
      <AssetStatusCard
        asset={mockAsset}
        sensorData={mockSensorData}
      />
    );
    
    // Check sensor data is displayed
    expect(screen.getByText('75.5°C')).toBeInTheDocument();
    expect(screen.getByText('2.1mm/s')).toBeInTheDocument();
    expect(screen.getByText('8.7bar')).toBeInTheDocument();
  });
  
  it('handles click events', () => {
    const handleClick = jest.fn();
    
    render(
      <AssetStatusCard
        asset={mockAsset}
        sensorData={mockSensorData}
        onClick={handleClick}
      />
    );
    
    // Find the card and click it
    const card = screen.getByRole('button');
    card.click();
    
    // Check if the click handler was called
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('handles different asset statuses correctly', () => {
    const errorAsset = {
      ...mockAsset,
      current_status: 'ERROR' as const
    };
    
    const { rerender } = render(
      <AssetStatusCard
        asset={errorAsset}
        sensorData={mockSensorData}
      />
    );
    
    // Check error status is displayed
    expect(screen.getByText('Error')).toBeInTheDocument();
    
    // Test warning status
    const warningAsset = {
      ...mockAsset,
      current_status: 'WARNING' as const
    };
    
    rerender(
      <AssetStatusCard
        asset={warningAsset}
        sensorData={mockSensorData}
      />
    );
    
    // Check warning status is displayed
    expect(screen.getByText('Warning')).toBeInTheDocument();
  });
});
