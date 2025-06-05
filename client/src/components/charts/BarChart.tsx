import { useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface BarChartProps {
  title: string;
  data: ChartData<'bar'>;
  options?: ChartOptions<'bar'>;
  height?: number;
  loading?: boolean;
}

export default function BarChart({
  title,
  data,
  options,
  height = 350,
  loading = false,
}: BarChartProps) {
  const defaultOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
          family: 'Inter',
          weight: 'bold',
        },
        padding: {
          bottom: 20,
        },
        color: '#333',
      },
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          boxWidth: 10,
          font: {
            family: 'Inter',
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleFont: {
          family: 'Inter',
        },
        bodyFont: {
          family: 'Inter',
        },
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        ticks: {
          font: {
            family: 'Inter',
          },
        },
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          font: {
            family: 'Inter',
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
    },
  };

  // Merge default options with passed options
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    plugins: {
      ...defaultOptions.plugins,
      ...options?.plugins,
    },
    scales: {
      ...defaultOptions.scales,
      ...options?.scales,
    }
  };

  if (loading) {
    return (
      <Card className="border-neutral-200 p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <Skeleton className="h-[350px] w-full rounded-lg" />
      </Card>
    );
  }

  return (
    <div className="chart-container" style={{ height: `${height}px` }}>
      <Bar options={mergedOptions} data={data} />
    </div>
  );
}
