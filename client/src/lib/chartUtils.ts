import { ChartData, ChartDataset } from 'chart.js';

export interface DataPoint {
  timestamp: string;
  value: number;
  status?: 'normal' | 'warning' | 'critical';
}

export interface TimeSeriesData {
  id: string;
  assetId: number;
  sensorId: string;
  sensorType: string;
  unit: string;
  dataPoints: DataPoint[];
  metadata?: Record<string, any>;
}

export interface SensorInfo {
  id: string;
  name: string;
  type: string;
  unit: string;
  assetId: number;
}

// Generate a consistent color based on the sensor ID
export function generateColor(id: string, opacity = 1): string {
  // Simple hash function to get a number from a string
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Convert the hash to a color
  const hue = Math.abs(hash % 360);
  return `hsla(${hue}, 70%, 50%, ${opacity})`;
}

// Format time series data for Chart.js
export function formatTimeSeriesData(
  timeSeriesData: Record<string, TimeSeriesData>,
  activeSensorIds: string[],
  sensors: SensorInfo[],
): ChartData<'line'> {
  const datasets: ChartDataset<'line'>[] = activeSensorIds
    .filter(id => timeSeriesData[id]) // Filter out any sensors without data
    .map(id => {
      const series = timeSeriesData[id];
      const sensor = sensors.find(s => s.id === id);
      const color = generateColor(id);
      
      return {
        label: sensor?.name || `Sensor ${id}`,
        data: series.dataPoints.map(point => ({
          x: new Date(point.timestamp).getTime(),
          y: point.value,
        })),
        borderColor: color,
        backgroundColor: color.replace('1)', '0.1)'),
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        tension: 0.3, // Smooth curve
      };
    });

  return {
    datasets,
  };
}

// Format time series data for comparison bar chart
export function formatComparisonData(
  timeSeriesData: Record<string, TimeSeriesData>,
  activeSensorIds: string[],
  sensors: SensorInfo[],
  compareFunction: (points: DataPoint[]) => number = points => 
    points.reduce((sum, point) => sum + point.value, 0) / points.length, // Default: average
): ChartData<'bar'> {
  const labels = activeSensorIds
    .filter(id => timeSeriesData[id])
    .map(id => {
      const sensor = sensors.find(s => s.id === id);
      return sensor?.name || `Sensor ${id}`;
    });
    
  const values = activeSensorIds
    .filter(id => timeSeriesData[id])
    .map(id => {
      const series = timeSeriesData[id];
      return compareFunction(series.dataPoints);
    });
    
  const colors = activeSensorIds
    .filter(id => timeSeriesData[id])
    .map(id => generateColor(id));

  return {
    labels,
    datasets: [
      {
        label: 'Values',
        data: values,
        backgroundColor: colors,
        borderColor: colors.map(color => color.replace('0.7', '1')),
        borderWidth: 1,
      },
    ],
  };
}

// Create a data aggregator function to reduce data points
export function aggregateTimeSeriesData(
  dataPoints: DataPoint[],
  interval: 'minute' | 'hour' | 'day' | 'week' | 'month',
): DataPoint[] {
  if (!dataPoints.length) return [];
  
  // Sort data points by timestamp
  const sortedPoints = [...dataPoints].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  // Group data points by interval
  const groupedPoints: Record<string, DataPoint[]> = {};
  
  sortedPoints.forEach(point => {
    const date = new Date(point.timestamp);
    let key: string;
    
    switch (interval) {
      case 'minute':
        key = date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
        break;
      case 'hour':
        key = date.toISOString().slice(0, 13); // YYYY-MM-DDTHH
        break;
      case 'day':
        key = date.toISOString().slice(0, 10); // YYYY-MM-DD
        break;
      case 'week':
        // Get the first day of the week (Sunday)
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().slice(0, 10);
        break;
      case 'month':
        key = date.toISOString().slice(0, 7); // YYYY-MM
        break;
      default:
        key = date.toISOString().slice(0, 10); // YYYY-MM-DD
    }
    
    if (!groupedPoints[key]) {
      groupedPoints[key] = [];
    }
    
    groupedPoints[key].push(point);
  });
  
  // Calculate average for each group
  return Object.entries(groupedPoints).map(([key, points]) => {
    const avgValue = points.reduce((sum, point) => sum + point.value, 0) / points.length;
    
    // Determine status based on the most severe status in the group
    let status: 'normal' | 'warning' | 'critical' | undefined = undefined;
    if (points.some(p => p.status === 'critical')) {
      status = 'critical';
    } else if (points.some(p => p.status === 'warning')) {
      status = 'warning';
    } else if (points.some(p => p.status === 'normal')) {
      status = 'normal';
    }
    
    return {
      timestamp: key,
      value: avgValue,
      status,
    };
  });
}
