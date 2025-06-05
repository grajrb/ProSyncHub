import { useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from 'chart.js';
import { Doughnut, Chart as ReactChartJS } from 'react-chartjs-2';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Register required components
ChartJS.register(ArcElement, Tooltip, Legend);

interface GaugeChartProps {
  value: number;
  min?: number;
  max?: number;
  title: string;
  unit?: string;
  thresholds?: {
    warning: number;
    critical: number;
  };
  size?: number;
  loading?: boolean;
}

export default function GaugeChart({
  value,
  min = 0,
  max = 100,
  title,
  unit = '%',
  thresholds = { warning: 70, critical: 90 },
  size = 180,
  loading = false,
}: GaugeChartProps) {
  const chartRef = useRef<ChartJS<'doughnut'> | null>(null);

  // Calculate the angle for the gauge
  const normalizedValue = Math.min(Math.max(value, min), max);
  const percentage = ((normalizedValue - min) / (max - min)) * 100;

  // Determine color based on thresholds
  const getColor = (value: number) => {
    if (value >= thresholds.critical) return '#ef4444'; // Red for critical
    if (value >= thresholds.warning) return '#f97316'; // Orange for warning
    return '#10b981'; // Green for normal
  };

  const color = getColor(percentage);

  const data: ChartData<'doughnut'> = {
    datasets: [
      {
        data: [percentage, 100 - percentage],
        backgroundColor: [
          color,
          '#e5e7eb', // Gray for remaining
        ],
        borderWidth: 0,
        circumference: 180,
        rotation: 270,
      },
    ],
    labels: ['Value', 'Remaining'],
  };

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
      },
    },
  };

  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.update();
    }
  }, [value]);

  if (loading) {
    return (
      <Card className="border-neutral-200">
        <CardContent className="p-4 text-center">
          <Skeleton className="h-4 w-24 mx-auto mb-4" />
          <Skeleton className="h-[180px] w-[180px] rounded-full mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-neutral-200">
      <CardContent className="p-4 text-center">
        <h3 className="text-sm font-medium text-neutral-600 mb-3">{title}</h3>
        <div className="relative" style={{ height: `${size}px`, width: `${size}px`, margin: '0 auto' }}>
          <Doughnut ref={chartRef} data={data} options={options} />
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ top: '30px' }}>
            <span className="font-bold text-2xl text-neutral-900">
              {normalizedValue.toFixed(1)}
              <span className="text-sm font-medium ml-1">{unit}</span>
            </span>
            <span className="text-xs text-neutral-500 mt-1">
              {min} - {max} {unit}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
