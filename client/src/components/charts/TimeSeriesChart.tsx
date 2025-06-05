import { useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  ChartOptions,
  ChartData,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Register the components that Chart.js needs
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface TimeSeriesChartProps {
  title: string;
  data: ChartData<'line'>;
  options?: ChartOptions<'line'>;
  height?: number;
  loading?: boolean;
}

export default function TimeSeriesChart({
  title,
  data,
  options,
  height = 350,
  loading = false,
}: TimeSeriesChartProps) {
  const chartRef = useRef<ChartJS<'line'>>(null);

  // Default options that can be overridden via props
  const defaultOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
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
        type: 'time',
        time: {
          unit: 'day',
          tooltipFormat: 'PPP',
          displayFormats: {
            hour: 'HH:mm',
            day: 'MMM d',
            week: 'MMM d',
            month: 'MMM yyyy',
          },
        },
        ticks: {
          source: 'auto',
          maxRotation: 0,
          font: {
            family: 'Inter',
          },
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      y: {
        beginAtZero: false,
        ticks: {
          font: {
            family: 'Inter',
          },
        },
        grid: {
          display: true,
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

  useEffect(() => {
    // Update the chart when data changes
    if (chartRef.current) {
      chartRef.current.update();
    }
  }, [data]);

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
      <Line options={mergedOptions} data={data} />
    </div>
  );
}
